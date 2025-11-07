// ===================================================================
// Файл: public/js/testing/test-executor.js (ПОЛНАЯ ИТОГОВАЯ ВЕРСИЯ)
// Описание: Ядро процесса прохождения теста. Отвечает за загрузку 
// вопросов, инициализацию UI, сбор ответов и их отправку на сервер.
// ===================================================================

import * as api from '../common/api-client.js';
import { PENDING_RESULT_SESSION_KEY, LAST_RESULT_SESSION_KEY } from './constants.js';
import { showConfirmModal } from '../common/modals.js';
import { testState } from './test-state.js';
import { clearProgress, loadProgress } from './progress.js';
import { showTestRunnerView, showWaitingScreen, showFinalResults, showTestSelectionView } from './screens.js';
import { renderQuizLayout, generateQuestionsHTML, restoreAnswers, setupNavigator, showQuestion, updateNavigation } from './navigation.js';
import { startTimer } from './timer.js';
import { initializeTestSelection } from './test-loader.js';
// ✅ ИСПРАВЛЕНО: Путь импорта изменен на ui-manager.js
import { updateHeaderUI } from './ui-manager.js'; 

/**
 * Хранит коллекцию DOM-элементов вопросов. Экспортируется, чтобы
 * глобальные обработчики событий в test.js имели к ней доступ.
 * @type {NodeListOf<Element>}
 */
export let questionsElements = [];

/**
 * Главная функция для начала процесса тестирования.
 * @param {boolean} [continueFromSave=false] - Флаг, указывающий, нужно ли продолжать тест из сохраненного прогресса.
 */
export async function startTest(continueFromSave = false) {
    const { currentTestId, userFIO } = testState.getState();
    
    // Показываем основной экран теста и обновляем шапку
    showTestRunnerView();
    updateHeaderUI(userFIO, 'test');
    
    // Если мы не продолжаем, а начинаем заново, нужно очистить любой старый прогресс
    const savedProgress = continueFromSave ? loadProgress(currentTestId) : null;
    if (!continueFromSave && currentTestId) {
        clearProgress(currentTestId);
    }
    
    await loadAndBeginTest(savedProgress);
}

/**
 * Внутренняя функция для загрузки данных теста и инициализации UI.
 * @param {object|null} [savedProgress=null] - Объект с сохраненным прогрессом, если есть.
 */
async function loadAndBeginTest(savedProgress = null) {
    const { currentTestId: idFromState, userFIO } = testState.getState();
    const currentTestId = savedProgress?.testId || idFromState;
    let testData;

    const testContentEl = document.getElementById('testContent');
    testContentEl.innerHTML = '<div class="spinner"></div>';
    
    // Если тест начинается "с нуля", отправляем запрос на сервер для старта сессии
    if (!savedProgress) {
        try {
            await api.startTestSession(currentTestId);
        } catch (error) {
            testContentEl.innerHTML = '<p style="text-align:center; color: var(--danger);">Не удалось начать сессию теста. Попробуйте обновить страницу.</p>';
            return;
        }
    }

    // Загружаем данные теста либо из сохраненного прогресса, либо с сервера
    try {
        if (savedProgress) {
            testData = {
                questions: savedProgress.questions,
                duration: savedProgress.totalTime,
                endTime: savedProgress.endTime, // Используем старое время окончания
                answers: savedProgress.answers,
            };
            testState.setState({ currentTestName: savedProgress.testName });
            updateHeaderUI(userFIO, 'test');
        } else {
            const fetchedData = await api.fetchQuestions(currentTestId);
            if (!fetchedData || !fetchedData.questions || fetchedData.questions.length === 0) {
                showConfirmModal({ title: 'Ошибка', text: 'В этом тесте пока нет вопросов. Обратитесь к администратору.', cancelText:'' });
                setTimeout(() => {
                    testState.reset();
                    showTestSelectionView();
                    updateHeaderUI(userFIO, 'selection');
                    initializeTestSelection();
                }, 3000); 
                return;
            }
            testData = fetchedData;
        }
    } catch (error) {
        showConfirmModal({ title: 'Ошибка загрузки', text: 'Не удалось загрузить данные теста. Пожалуйста, попробуйте еще раз.', cancelText:'' });
        testState.reset();
        showTestSelectionView();
        updateHeaderUI(userFIO, 'selection');
        return;
    }
    
    // Обновляем глобальное состояние всей необходимой информацией
    testState.setState({
        started: true,
        attempted: false,
        testQuestions: testData.questions,
        totalTime: savedProgress ? (testData.duration) : (testData.duration * 60), // totalTime в секундах
        testEndTime: savedProgress ? testData.endTime : Date.now() + testData.duration * 60 * 1000,
        currentTestId: currentTestId,
        currentQuestionIndex: savedProgress?.currentQuestionIndex || 0,
    });
    
    // Рендерим весь UI для прохождения теста
    renderQuizLayout(testContentEl);
    questionsElements = generateQuestionsHTML(testState.getState().testQuestions);
    
    if (savedProgress && savedProgress.answers) {
        restoreAnswers(savedProgress.answers, questionsElements);
    }

    const { testQuestions, currentQuestionIndex } = testState.getState();
    
    // Настраиваем навигационные квадраты
    setupNavigator(testQuestions, (index) => {
        testState.setState({ currentQuestionIndex: index });
        showQuestion(index, questionsElements);
        updateNavigation(index);
    });
    
    // Показываем первый (или сохраненный) вопрос
    showQuestion(currentQuestionIndex, questionsElements);
    updateNavigation(currentQuestionIndex);
    
    // Запускаем таймер
    startTimer(processAndDisplayResults);
}

/**
 * Собирает ответы пользователя, отправляет их на сервер и отображает результат.
 * @returns {Promise<boolean>} Возвращает true, если отправка прошла успешно.
 */
export async function processAndDisplayResults() {
    const currentState = testState.getState();
    if (currentState.attempted) return true; // Предотвращаем двойную отправку
    
    testState.setState({ attempted: true });
    if (currentState.testTimerInterval) clearInterval(currentState.testTimerInterval);
    
    const userAnswers = testState.collectAnswers();
    
    // Скрываем тест и показываем экран ожидания
    document.getElementById('testContent').classList.add('hidden');
    showWaitingScreen();
    
    try {
        const result = await api.submitAnswers(currentState.currentTestId, currentState.userFIO, userAnswers);
        
        clearProgress(currentState.currentTestId);
        
        if (result.status === 'pending_review') {
            testState.setState({ pendingResultId: result.resultId });
            sessionStorage.setItem(PENDING_RESULT_SESSION_KEY, JSON.stringify({
                resultId: result.resultId,
                fio: currentState.userFIO,
                testName: currentState.currentTestName
            }));
            // Экран ожидания уже показан, так что здесь больше ничего не делаем
            return true;
        }
        
        const finalResultForUI = { ...result, testName: currentState.currentTestName };
        sessionStorage.setItem(LAST_RESULT_SESSION_KEY, JSON.stringify(finalResultForUI));
        showFinalResults(finalResultForUI);
        updateHeaderUI(currentState.userFIO, 'results');
        
        return true;
    } catch (error) {
        // Если отправка не удалась, откатываем состояние и показываем ошибку
        testState.setState({ attempted: false });
        showConfirmModal({ title: 'Ошибка отправки', text: 'Не удалось отправить результаты на сервер. Пожалуйста, проверьте ваше интернет-соединение и попробуйте снова.' });
        // Возвращаем пользователя к тесту, чтобы он мог попробовать снова
        document.getElementById('testContent').classList.remove('hidden');
        document.getElementById('checkingScreen').classList.add('hidden');
        updateNavigation(currentState.currentQuestionIndex); // Восстанавливаем кнопку "Завершить тест"
        return false;
    }
}
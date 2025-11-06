// ===================================================================
// Файл: /public/js/testing/test-executor.js (ПОЛНАЯ ИТОГОВАЯ ВЕРСИЯ)
// ===================================================================
// Этот модуль является ядром процесса прохождения теста. Он отвечает за:
// 1. Загрузку вопросов и настроек теста с сервера.
// 2. Инициализацию UI для тестирования (вопросы, навигация, таймер).
// 3. Сбор ответов, отправку их на сервер и отображение результатов.

import * as api from '../common/api-client.js';
import { PENDING_RESULT_SESSION_KEY, LAST_RESULT_SESSION_KEY } from './constants.js';
import { showConfirmModal } from '../common/modals.js';
import { testState } from './test-state.js';
import { clearProgress, loadProgress, saveProgress } from './progress.js';
import { showTestRunnerView, showQuizView, showWaitingScreen, showFinalResults, showTestSelectionView } from './screens.js';
import { renderQuizLayout, generateQuestionsHTML, restoreAnswers, setupNavigator, showQuestion, updateNavigation } from './navigation.js';
import { startTimer } from './timer.js';
import { initializeTestSelection } from './test-loader.js';

/**
 * Хранит коллекцию DOM-элементов вопросов. Экспортируется, чтобы
 * глобальные обработчики событий в script.js имели к ней доступ.
 * @type {NodeListOf<Element>}
 */
export let questionsElements = [];

/**
 * Главная функция для начала процесса тестирования.
 * @param {boolean} [continueFromSave=false] - Флаг, указывающий, нужно ли продолжать тест из сохраненного прогресса.
 */
export async function startTest(continueFromSave = false) {
    const { currentTestId, currentTestName } = testState.getState();
    showTestRunnerView(currentTestName);
    
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
    const { currentTestId: idFromState } = testState.getState();
    const currentTestId = savedProgress?.testId || idFromState;
    let testData;

    const quizCard = document.getElementById('quizForm');
    quizCard.innerHTML = '<div class="spinner"></div>';
    showQuizView();
    
    if (!savedProgress) {
        try {
            await api.startTestSession(currentTestId);
        } catch (error) {
            quizCard.innerHTML = '<p style="text-align:center; color: var(--bad);">Не удалось начать сессию теста. Попробуйте обновить страницу.</p>';
            return;
        }
    }

    try {
        if (savedProgress) {
            testData = {
                questions: savedProgress.questions,
                duration: savedProgress.totalTime,
                endTime: savedProgress.endTime, // Для сохраненного прогресса используем старый endTime
                answers: savedProgress.answers
            };
            testState.setState({ currentTestName: savedProgress.testName });
            showTestRunnerView(savedProgress.testName);
        } else {
            const fetchedData = await api.fetchQuestions(currentTestId);
            if (!fetchedData || !fetchedData.questions || fetchedData.questions.length === 0) {
                showConfirmModal({ title: 'Ошибка', text: 'В этом тесте пока нет вопросов. Обратитесь к администратору.' });
                setTimeout(() => {
                    const { userFIO } = testState.getState();
                    testState.reset();
                    showTestSelectionView(userFIO);
                    initializeTestSelection();
                }, 3000); 
                return;
            }
            testData = fetchedData;
        }
    } catch (error) {
        showConfirmModal({ title: 'Ошибка загрузки', text: 'Не удалось загрузить данные теста. Пожалуйста, попробуйте еще раз.' });
        const { userFIO } = testState.getState();
        testState.reset();
        showTestSelectionView(userFIO);
        return;
    }
    
    testState.setState({
        started: true,
        attempted: false,
        testQuestions: testData.questions,
        totalTime: testData.duration,
        // ========================================================
        // --- КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ ---
        // Клиент сам вычисляет время окончания на основе СВОИХ часов.
        // Если прогресс был сохранен, testData.endTime уже будет существовать.
        // ========================================================
        testEndTime: testData.endTime || Date.now() + testData.duration * 60 * 1000,
        currentTestId: currentTestId,
        currentQuestionIndex: savedProgress?.currentQuestionIndex || 0,
    });
    
    renderQuizLayout(quizCard);
    questionsElements = generateQuestionsHTML(testState.getState().testQuestions);
    
    if (testData.answers) {
        restoreAnswers(testData.answers);
    }

    const { testQuestions, currentQuestionIndex } = testState.getState();
    
    setupNavigator(testQuestions.length, (index) => {
        testState.setState({ currentQuestionIndex: index });
        showQuestion(index, questionsElements);
        updateNavigation(index);
    });
    
    showQuestion(currentQuestionIndex, questionsElements);
    updateNavigation(currentQuestionIndex);
    
    startTimer(processAndDisplayResults);
}

/**
 * Собирает ответы пользователя, отправляет их на сервер и отображает результат.
 * @returns {Promise<boolean>} Возвращает true, если отправка прошла успешно.
 */
export async function processAndDisplayResults() {
    const currentState = testState.getState();
    if (currentState.attempted) return true;
    
    testState.setState({ attempted: true });
    if (currentState.testTimerInterval) clearInterval(currentState.testTimerInterval);
    
    const userAnswers = testState.collectAnswers();
    
    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) {
        nextBtn.disabled = true;
        nextBtn.textContent = 'Проверка...';
    }
    
    const result = await api.submitAnswers(currentState.currentTestId, currentState.userFIO, userAnswers);

    if (result) {
        clearProgress(currentState.currentTestId);
        
        if (result.status === 'pending_review') {
            testState.setState({ pendingResultId: result.resultId });
            sessionStorage.setItem(PENDING_RESULT_SESSION_KEY, JSON.stringify({
                resultId: result.resultId,
                fio: currentState.userFIO,
                testName: currentState.currentTestName
            }));
            showWaitingScreen(currentState.userFIO);
            return true;
        }
        
        const finalResultForUI = {
            ...result,
            testName: currentState.currentTestName,
        };

        sessionStorage.setItem(LAST_RESULT_SESSION_KEY, JSON.stringify(finalResultForUI));
        showFinalResults(finalResultForUI);
        
        return true;
    } else {
        // Если отправка не удалась (например, из-за ошибки сети)
        if (nextBtn) {
            nextBtn.disabled = false;
        }
        updateNavigation(currentState.currentQuestionIndex); // Восстанавливаем кнопку "Завершить тест"
        testState.setState({ attempted: false });
        saveProgress(); // Сохраняем прогресс, чтобы пользователь не потерял ответы
        return false;
    }
}
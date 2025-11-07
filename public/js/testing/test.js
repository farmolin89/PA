// ===================================================================
// Файл: public/js/testing/test.js (ПОЛНАЯ ИТОГОВАЯ ВЕРСИЯ)
// Описание: Главный файл-дирижер клиентского приложения.
// Инициализирует приложение, настраивает глобальные обработчики
// событий и управляет состоянием UI (например, шапкой).
// ===================================================================

import * as api from '../common/api-client.js';
import { showConfirmModal } from '../common/modals.js';
import { testState } from './test-state.js';
import { saveProgress, clearProgress } from './progress.js';
import { setupWelcomeScreen, initializeTestSelection } from './test-loader.js';
import { processAndDisplayResults, questionsElements } from './test-executor.js';
import { showWelcomeScreen, showTestSelectionView, showFinalResults, showWaitingScreen } from './screens.js';
import { updateNavigation, showQuestion } from './navigation.js';
import { initializePublicSSE } from './sse-client.js';
import { PENDING_RESULT_SESSION_KEY, LAST_RESULT_SESSION_KEY } from './constants.js';
import { updateHeaderUI } from './ui-manager.js'; // <-- ИЗМЕНЕНО: Импорт из нового модуля

/**
 * Главная функция инициализации. Определяет, какой экран показать при загрузке,
 * основываясь на данных в sessionStorage.
 */
function initializeApp() {
    // Проверяем, есть ли GET-параметр ?welcome=1, чтобы принудительно сбросить сессию
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('welcome')) {
        testState.logout();
        // Убираем параметр из URL, чтобы при перезагрузке не сбрасывать сессию снова
        window.history.replaceState({}, document.title, window.location.pathname);
        showWelcomeScreen();
        updateHeaderUI(null, 'welcome');
        return;
    }

    // 1. Проверяем, есть ли результат, ожидающий ручной проверки
    const pendingResult = JSON.parse(sessionStorage.getItem(PENDING_RESULT_SESSION_KEY));
    if (pendingResult) {
        testState.setState({
            userFIO: pendingResult.fio,
            currentTestName: pendingResult.testName,
            pendingResultId: pendingResult.resultId
        });
        showWaitingScreen();
        updateHeaderUI(pendingResult.fio, 'test');
        return;
    }

    // 2. Проверяем, есть ли в сессии данные о последнем завершенном тесте
    const lastResult = JSON.parse(sessionStorage.getItem(LAST_RESULT_SESSION_KEY));
    if (lastResult) {
        testState.setState({ userFIO: lastResult.fio });
        showFinalResults(lastResult);
        updateHeaderUI(lastResult.fio, 'results');
        return;
    }
    
    // 3. Если ничего из вышеперечисленного нет, проверяем, есть ли сохраненное ФИО
    const { userFIO } = testState.getState();
    if (userFIO) {
        showTestSelectionView();
        updateHeaderUI(userFIO, 'selection');
        initializeTestSelection();
    } else {
        // Если нет даже ФИО, показываем экран приветствия
        showWelcomeScreen();
        updateHeaderUI(null, 'welcome');
    }
}

/**
 * Настраивает все глобальные обработчики событий для приложения (клики, ввод и т.д.).
 */
function setupEventHandlers() {
    document.body.addEventListener('click', (e) => {
        const target = e.target.closest('button, a');
        if (!target) return;

        // Обработка кнопок "Назад" и "Вернуться к выбору"
        if (target.id === 'backButton' || target.id === 'backToTestsBtn') {
            e.preventDefault();
            const { started, attempted } = testState.getState();
            if (started && !attempted) { // Если тест начат, но не завершен
                showConfirmModal({
                    title: 'Выйти из теста?',
                    text: 'Прогресс будет потерян. Вы уверены?',
                    onConfirm: () => {
                        clearProgress(testState.getState().currentTestId);
                        testState.reset(); // Сбрасываем состояние, но сохраняем ФИО
                        window.location.reload();
                    }
                });
            } else {
                testState.reset();
                window.location.reload();
            }
        }

        // Кнопка смены пользователя
        if (target.id === 'logoutButton') {
            e.preventDefault();
            testState.logout();
            window.location.reload();
        }
        
        // Кнопка "Предыдущий вопрос"
        if (target.id === 'prevQuestionBtn') {
            let { currentQuestionIndex } = testState.getState();
            if (currentQuestionIndex > 0) {
                currentQuestionIndex--;
                testState.setState({ currentQuestionIndex });
                showQuestion(currentQuestionIndex, questionsElements);
                updateNavigation(currentQuestionIndex);
            }
        }

        // Кнопка "Следующий вопрос"
        if (target.id === 'nextQuestionNavBtn') {
            let { currentQuestionIndex, testQuestions } = testState.getState();
            if (currentQuestionIndex < testQuestions.length - 1) {
                currentQuestionIndex++;
                testState.setState({ currentQuestionIndex });
                showQuestion(currentQuestionIndex, questionsElements);
                updateNavigation(currentQuestionIndex);
            }
        }

        // Кнопка "Завершить тест"
        if (target.id === 'finishTestBtn') {
            const { testQuestions } = testState.getState();
            const answeredCount = testState.collectAnswers().filter(a => a.answerIds.length > 0).length;

            if (answeredCount < testQuestions.length) {
                showConfirmModal({
                    title: 'Завершить тест?',
                    text: `Вы ответили не на все вопросы. Уверены, что хотите завершить?`,
                    onConfirm: processAndDisplayResults,
                    confirmText: "Да, завершить"
                });
            } else {
                // Если на все вопросы дан ответ, можно завершать без доп. подтверждения
                processAndDisplayResults();
            }
        }
    });
    
    // Обработчик для стилизации выбранных ответов
    document.body.addEventListener('change', (e) => {
        if (e.target.matches('input[type="checkbox"]')) {
            e.target.closest('.option')?.classList.toggle('selected', e.target.checked);
        }
    });

    // Обработчик для обновления навигации при любом изменении ответа
    const handleAnswerChange = () => {
        const { started, attempted, currentQuestionIndex } = testState.getState();
        if(started && !attempted) {
            updateNavigation(currentQuestionIndex);
        }
    };
    document.body.addEventListener('change', handleAnswerChange);
    document.body.addEventListener('input', handleAnswerChange); // 'input' для textarea и drag-n-drop
}

/**
 * Точка входа в приложение.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Регистрируем глобальный обработчик ошибок API
    api.registerErrorCallback((message) => {
        showConfirmModal({ title: 'Ошибка', text: message, confirmText: 'OK', cancelText: '' });
    });

    initializeApp();
    setupEventHandlers();
    setupWelcomeScreen(); 
    initializePublicSSE(); // Запускаем прослушивание серверных событий

    // Сохраняем прогресс перед закрытием или перезагрузкой страницы
    window.addEventListener('beforeunload', () => {
        saveProgress();
    });
});
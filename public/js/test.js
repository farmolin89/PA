// ===================================================================
// Файл: public/js/test.js (ПОЛНАЯ ИТОГОВАЯ ВЕРСИЯ)
// ===================================================================
// Этот файл является главной точкой входа и "оркестратором" для публичного приложения.
// Он не содержит сложной бизнес-логики, а вместо этого импортирует функциональность
// из модулей и связывает их вместе, настраивая первоначальное состояние и
// глобальные обработчики событий.

import * as api from './common/api-client.js';
import { showConfirmModal } from './common/modals.js';

import { testState } from './testing/test-state.js';
import { saveProgress, loadActiveTest } from './testing/progress.js';
import { setupWelcomeScreen, initializeTestSelection } from './testing/test-loader.js';
import { startTest, processAndDisplayResults, questionsElements } from './testing/test-executor.js';
import { showWelcomeScreen, showTestSelectionView, showTestRunnerView, showWaitingScreen, showFinalResults } from './testing/screens.js';
import { updateNavigation, showQuestion } from './testing/navigation.js';
import { initializePublicSSE } from './testing/sse-client.js';
import { PENDING_RESULT_SESSION_KEY, LAST_RESULT_SESSION_KEY } from './testing/constants.js';

/**
 * Главная функция инициализации. Определяет, какой экран показать пользователю при загрузке,
 * проверяя наличие сохраненного прогресса, ожидающих или последних результатов в сессии.
 */
function initializeApp() {
    // ПЕРВОЕ И ГЛАВНОЕ: проверяем параметр для "чистого старта"
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('welcome')) {
        // Полностью сбрасываем состояние пользователя и очищаем сессию.
        testState.logout(); 
        
        // Показываем экран ввода ФИО
        showWelcomeScreen();
        
        // Убираем параметр из URL, чтобы при перезагрузке он не сработал снова
        window.history.replaceState({}, document.title, window.location.pathname);
        return; // Завершаем выполнение, чтобы не сработала остальная логика
    }

    // Остальная логика инициализации (только если нет параметра welcome)
    const activeTestProgress = loadActiveTest();
    if (activeTestProgress) {
        // 1. Приоритет: восстановить незаконченный тест.
        testState.setState({ userFIO: activeTestProgress.fio, currentTestId: activeTestProgress.testId });
        startTest(true);

    } else if (sessionStorage.getItem(PENDING_RESULT_SESSION_KEY)) {
        // 2. Приоритет: восстановить экран ожидания ручной проверки.
        const pendingResult = JSON.parse(sessionStorage.getItem(PENDING_RESULT_SESSION_KEY));
        testState.setState({
            userFIO: pendingResult.fio,
            currentTestName: pendingResult.testName,
            pendingResultId: pendingResult.resultId
        });
        showTestRunnerView(pendingResult.testName);
        showWaitingScreen(pendingResult.fio);
    
    } else if (sessionStorage.getItem(LAST_RESULT_SESSION_KEY)) {
        // 3. Приоритет: показать последний результат в этой сессии.
        const lastResult = JSON.parse(sessionStorage.getItem(LAST_RESULT_SESSION_KEY));
        testState.setState({ userFIO: lastResult.fio });
        showTestRunnerView(lastResult.testName || 'Результаты теста');
        showFinalResults(lastResult);
    
    } else {
        // 4. Стандартный запуск: проверяем, есть ли ФИО в сессии.
        const { userFIO } = testState.getState();
        if (userFIO) {
            showTestSelectionView(userFIO);
            initializeTestSelection();
        } else {
            showWelcomeScreen();
        }
    }
}

/**
 * Настраивает все глобальные обработчики событий для приложения, используя делегирование.
 */
function setupEventHandlers() {
    // Делегирование кликов для всего body.
    document.body.addEventListener('click', (e) => {
        if (e.target.closest('#exitToSelectionBtn')) {
            e.preventDefault();
            testState.reset();
            window.location.reload();
        }

        if (e.target.closest('#changeUserBtn')) {
            e.preventDefault();
            testState.logout();
            window.location.reload();
        }

        const prevBtn = e.target.closest('#prevBtn');
        if (prevBtn) {
            let { currentQuestionIndex } = testState.getState();
            if (currentQuestionIndex > 0) {
                currentQuestionIndex--;
                testState.setState({ currentQuestionIndex });
                showQuestion(currentQuestionIndex, questionsElements);
                updateNavigation(currentQuestionIndex);
            }
        }

        const nextBtn = e.target.closest('#nextBtn');
        if (nextBtn) {
            let { currentQuestionIndex, testQuestions } = testState.getState();
            const totalQuestions = testQuestions.length;
            if (currentQuestionIndex < totalQuestions - 1) {
                currentQuestionIndex++;
                testState.setState({ currentQuestionIndex });
                showQuestion(currentQuestionIndex, questionsElements);
                updateNavigation(currentQuestionIndex);
            } else {
                const answeredCount = Array.from(questionsElements).filter(qEl => {
                    const type = qEl.dataset.questionType;
                    if (type === 'match') return true;
                    if (type === 'text_input') return !!qEl.querySelector('.free-text-input')?.value.trim();
                    return !!qEl.querySelector('input[type="checkbox"]:checked');
                }).length;

                if (answeredCount < totalQuestions) {
                    showConfirmModal({
                        title: 'Завершить тест?',
                        text: `Вы ответили не на все вопросы (пропущено ${totalQuestions - answeredCount}). Вы уверены, что хотите завершить?`,
                        onConfirm: processAndDisplayResults,
                        confirmText: 'Да, завершить',
                        cancelText: 'Вернуться к вопросам'
                    });
                } else {
                    processAndDisplayResults();
                }
            }
        }
    });

    // Единый обработчик для любого изменения ответа (клик по чекбоксу, ввод текста, перетаскивание).
    const handleAnswerChange = () => {
        const { currentQuestionIndex } = testState.getState();
        // Просто вызываем полный пересчет и перерисовку навигации.
        updateNavigation(currentQuestionIndex);
    };

    // Слушаем события, которые указывают на изменение ответа.
    document.body.addEventListener('change', handleAnswerChange);
    document.body.addEventListener('input', (e) => {
        // Дополнительная логика для авто-изменения высоты textarea.
        if (e.target.matches('#testFieldset .free-text-input')) {
            const textarea = e.target;
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
        handleAnswerChange();
    });
    // Для Sortable.js (вопросы на сопоставление) событие будет 'end',
    // но его нужно навешивать в `navigation.js` при создании экземпляра Sortable.
    // Пока что, `updateNavigation` будет срабатывать при переключении вопросов, что уже покрывает этот случай.

    // Навигация по вопросам с помощью стрелок клавиатуры.
    document.addEventListener('keydown', (e) => {
        const { started, attempted } = testState.getState();
        if (!started || attempted || e.target.tagName.toLowerCase() === 'textarea') return;

        if (e.key === 'ArrowLeft') document.getElementById('prevBtn')?.click();
        else if (e.key === 'ArrowRight') document.getElementById('nextBtn')?.click();
    });
}


/**
 * Точка входа в приложение после полной загрузки DOM.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Регистрируем глобальный обработчик ошибок API.
    api.registerErrorCallback((message) => showConfirmModal({ title: 'Ошибка', text: message }));

    // Запускаем инициализацию и настройку.
    initializeApp();
    setupWelcomeScreen();
    setupEventHandlers();
    initializePublicSSE();

    // Сохраняем прогресс перед закрытием или перезагрузкой вкладки.
    window.addEventListener('beforeunload', () => {
        saveProgress();
    });
});
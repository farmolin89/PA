// --- ФАЙЛ: client/modules/state/progress.js (ПОЛНАЯ ИТОГОВАЯ ВЕРСИЯ) ---
// Этот модуль инкапсулирует всю логику работы с localStorage и sessionStorage
// для сохранения, загрузки и очистки прогресса теста пользователя.

// ИСПРАВЛЕНО: Указан правильный относительный путь к файлу констант
import { TEST_PROGRESS_KEY, ACTIVE_TEST_SESSION_KEY } from './constants.js';
import { testState } from './test-state.js';

/**
 * Сохраняет текущий прогресс теста в localStorage.
 * Функция берет актуальные данные из модуля testState, включая ответы из DOM,
 * и сохраняет их. Вызывается, например, при закрытии вкладки.
 */
export function saveProgress() {
    const currentState = testState.getState();
    
    // Не сохраняем, если тест не был начат, уже завершен или нет ID теста.
    if (!currentState.started || currentState.attempted || !currentState.currentTestId) {
        return;
    }

    // Собираем все данные, необходимые для полного восстановления сессии.
    const progress = {
        testId: currentState.currentTestId,
        testName: currentState.currentTestName,
        fio: currentState.userFIO,
        questions: currentState.testQuestions,
        answers: testState.collectAnswers(), // Получаем актуальные ответы из DOM
        endTime: currentState.testEndTime,
        totalTime: currentState.totalTime,
        currentQuestionIndex: currentState.currentQuestionIndex,
    };
    
    // Сохраняем прогресс с привязкой к ID теста, чтобы не перезаписать прогресс другого теста.
    localStorage.setItem(`${TEST_PROGRESS_KEY}_${currentState.currentTestId}`, JSON.stringify(progress));
}

/**
 * Загружает сохраненный прогресс для конкретного теста из localStorage.
 * @param {string} testId - ID теста, прогресс которого нужно загрузить.
 * @returns {object|null} - Объект прогресса или null, если он не найден.
 */
export function loadProgress(testId) {
    if (!testId) return null;
    
    const savedProgressJSON = localStorage.getItem(`${TEST_PROGRESS_KEY}_${testId}`);
    
    if (savedProgressJSON) {
        try {
            return JSON.parse(savedProgressJSON);
        } catch (error) {
            console.error("Ошибка парсинга сохраненного прогресса:", error);
            // Если данные повреждены, удаляем их, чтобы избежать проблем в будущем.
            clearProgress(testId);
            return null;
        }
    }
    
    return null;
}

/**
 * Удаляет сохраненный прогресс для конкретного теста из localStorage и
 * также очищает маркер активного теста из sessionStorage.
 * @param {string} testId - ID теста, прогресс которого нужно очистить.
 */
export function clearProgress(testId) {
    if (testId) {
        localStorage.removeItem(`${TEST_PROGRESS_KEY}_${testId}`);
        // Также важно убрать метку, что этот тест является активным в текущей сессии.
        if (sessionStorage.getItem(ACTIVE_TEST_SESSION_KEY) === testId) {
            sessionStorage.removeItem(ACTIVE_TEST_SESSION_KEY);
        }
    }
}

/**
 * Проверяет в sessionStorage, был ли какой-то тест активен в этой сессии,
 * и если да, загружает его полный прогресс из localStorage.
 * @returns {object|null} - Объект прогресса активного теста или null.
 */
export function loadActiveTest() {
    const activeTestId = sessionStorage.getItem(ACTIVE_TEST_SESSION_KEY);
    
    if (activeTestId) {
        return loadProgress(activeTestId);
    }
    
    return null;
}
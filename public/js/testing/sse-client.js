// --- ФАЙЛ: client/modules/utils/sse-client.js (ПОЛНАЯ ИТОГОВАЯ ВЕРСИЯ) ---
// Этот модуль инкапсулирует логику работы с Server-Sent Events (SSE)
// для публичной части приложения. Он слушает события от сервера и обновляет UI в реальном времени.

import { testState } from './test-state.js';
import { showFinalResults } from './screens.js';
import { initializeTestSelection } from './test-loader.js';
// ИСПРАВЛЕНО: Указан правильный относительный путь к файлу констант
import { PENDING_RESULT_SESSION_KEY } from './constants.js';

/**
 * Инициализирует соединение Server-Sent Events для получения обновлений в реальном времени.
 */
export function initializePublicSSE() {
    // Проверяем, поддерживает ли браузер технологию SSE.
    if (typeof(EventSource) === "undefined") {
        console.warn("Server-Sent Events не поддерживаются этим браузером. Обновления в реальном времени будут недоступны.");
        return;
    }

    const eventSource = new EventSource('/api/events');

    eventSource.onopen = () => console.log('SSE соединение для публичной страницы установлено.');
    
    /**
     * Слушатель события 'tests-updated'.
     * Срабатывает, когда администратор создает, переименовывает, удаляет или публикует/снимает с публикации тест.
     * Обновляет список доступных тестов, если пользователь находится на экране выбора.
     */
    eventSource.addEventListener('tests-updated', (e) => {
        // Умная проверка: обновляем список только если пользователь его видит.
        // Это предотвращает ненужные запросы и перерисовки.
        const testSelectionScreen = document.getElementById('testSelectionScreen');
        if (testSelectionScreen && !testSelectionScreen.classList.contains('hidden')) {
            initializeTestSelection();
        }
    });

    /**
     * Слушатель события 'result-reviewed'.
     * Срабатывает, когда администратор завершает ручную проверку ответов.
     * Проверяет, относится ли результат к текущему пользователю, и если да, отображает финальный результат.
     */
    eventSource.addEventListener('result-reviewed', (e) => {
        const { resultId, finalResultData } = JSON.parse(e.data);
        const currentState = testState.getState();

        // Проверяем, ждет ли текущий пользователь именно этот результат.
        if (currentState.pendingResultId && currentState.pendingResultId === resultId) {
            sessionStorage.removeItem(PENDING_RESULT_SESSION_KEY);
            testState.setState({ pendingResultId: null });
            showFinalResults(finalResultData);
        }
    });

    /**
     * Обработчик ошибок соединения SSE.
     * В случае ошибки (например, перезапуск сервера), закрывает соединение,
     * чтобы браузер не пытался постоянно переподключиться.
     */
    eventSource.onerror = (err) => {
        console.error('Ошибка EventSource на публичной странице. Соединение будет закрыто.', err);
        eventSource.close();
    };
}
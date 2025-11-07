// ===================================================================
// Файл: public/js/testing/ui-manager.js (ПОЛНАЯ ИТОГОВАЯ ВЕРСИЯ)
// Описание: Управляет состоянием пользовательского интерфейса,
// таким как шапка страницы. Вынесен в отдельный модуль для
// устранения циклических зависимостей.
// ===================================================================

import { testState } from './test-state.js';
import { LAST_RESULT_SESSION_KEY } from './constants.js';

/**
 * Обновляет информацию о пользователе и состояние шапки страницы в зависимости от текущего экрана.
 * @param {string | null} fio - ФИО пользователя или null.
 * @param {'welcome'|'selection'|'test'|'results'} screen - Текущий экран.
 */
export function updateHeaderUI(fio, screen) {
    const mainHeader = document.getElementById('mainHeader');
    if (!mainHeader) return;

    if (fio && screen !== 'welcome') {
        mainHeader.classList.remove('hidden');
        mainHeader.querySelector('#userNameDisplay').textContent = fio;
        const initials = fio.split(' ').map(s => s.charAt(0)).slice(0, 2).join('').toUpperCase();
        mainHeader.querySelector('#userAvatar').textContent = initials || '?';
        
        // Показываем/скрываем кнопки в зависимости от экрана
        mainHeader.querySelector('#logoutButton').classList.toggle('hidden', screen !== 'selection');
        mainHeader.querySelector('#backButton').classList.toggle('hidden', screen === 'selection' || screen === 'welcome');

        // Обновляем заголовок
        const titleEl = mainHeader.querySelector('#headerTitle');
        const subtitleEl = mainHeader.querySelector('#headerSubtitle');
        if (screen === 'selection') {
            titleEl.textContent = 'Система тестирования';
            subtitleEl.textContent = 'Здесь вы можете проверить свои знания';
        } else if (screen === 'test') {
            titleEl.textContent = testState.getState().currentTestName || 'Прохождение теста';
            subtitleEl.textContent = 'Прохождение теста';
        } else if (screen === 'results') {
            const lastResult = JSON.parse(sessionStorage.getItem(LAST_RESULT_SESSION_KEY));
            titleEl.textContent = lastResult?.testName || 'Результаты тестирования';
            subtitleEl.textContent = 'Результаты тестирования';
        }

    } else {
        mainHeader.classList.add('hidden');
    }
}
// ===================================================================
// Файл: public/js/testing/test-loader.js (ПОЛНАЯ ИТОГОВАЯ ВЕРСИЯ)
// Описание: Управляет логикой загрузки тестов: от приветственного 
// экрана до выбора теста пользователем и проверки на наличие 
// сохраненного прогресса.
// ===================================================================

import * as api from '../common/api-client.js';
import { pluralize } from '../utils/utils.js';
import { showConfirmModal } from '../common/modals.js';
import { testState } from './test-state.js';
import { loadProgress, clearProgress } from './progress.js';
import { renderPublicTestList, showTestSelectionView, showTestRunnerView, showFinalResults } from './screens.js';
import { startTest } from './test-executor.js';
import { updateHeaderUI } from './ui-manager.js'; // <-- ИЗМЕНЕНО: Импорт из нового модуля

/**
 * Загружает с сервера список публичных тестов и запускает их отрисовку.
 * Учитывает ФИО пользователя для получения персонализированного статуса сдачи тестов.
 */
export async function initializeTestSelection() {
    const { userFIO } = testState.getState();
    if (!userFIO) {
        console.error("Невозможно загрузить тесты: ФИО пользователя не установлено.");
        return;
    }
    
    // Показываем спиннер на время загрузки
    const listContainer = document.getElementById('publicTestList');
    if (listContainer) {
        listContainer.innerHTML = '<div class="spinner"></div>';
    }

    try {
        const tests = await api.fetchPublicTests(userFIO);
        if (tests) {
            renderPublicTestList(tests, onTestSelect);
        }
    } catch (error) {
        // В случае ошибки показываем сообщение
        if (listContainer) {
            listContainer.innerHTML = '<p class="error-message">Не удалось загрузить список тестов. Попробуйте обновить страницу.</p>';
        }
        console.error("Ошибка при загрузке публичных тестов:", error);
    }
}

/**
 * Обработчик, вызываемый при клике на карточку теста.
 * Анализирует, сдан ли тест, и предлагает соответствующие действия.
 * @param {object} test - Объект с данными выбранного теста.
 */
async function onTestSelect(test) {
    const { id: testId, name: testName } = test;
    const { userFIO } = testState.getState();

    const startNewTest = () => {
        // Перед показом подтверждения, очищаем любой старый прогресс для этого теста
        clearProgress(testId);
        showStartConfirmation(test);
    };

    // Если у теста есть статус "сдан"
    if (test.passedStatus) {
        showConfirmModal({
            title: 'Тест уже сдан',
            text: `Вы уже успешно прошли тест "${testName}". Что вы хотите сделать?`,
            onConfirm: startNewTest, // Действие для основной кнопки "Пройти заново"
            onCancel: async () => { // Действие для дополнительной кнопки "Посмотреть результат"
                showTestRunnerView();
                updateHeaderUI(userFIO, 'results');
                try {
                    const lastResult = await api.getLastResultProtocol(testId, userFIO);
                    showFinalResults(lastResult);
                } catch (error) {
                    showConfirmModal({ title: 'Ошибка', text: 'Не удалось загрузить ваш предыдущий результат.' });
                    showTestSelectionView();
                }
            },
            confirmText: 'Пройти заново',
            cancelText: 'Посмотреть результат'
        });
    } else {
        // Если тест не сдан, сразу показываем стандартное подтверждение старта
        showStartConfirmation(test);
    }
}

/**
 * Показывает стандартное модальное окно перед стартом теста
 * и проверяет наличие незаконченного прогресса.
 * @param {object} test - Объект теста.
 */
function showStartConfirmation(test) {
    const { id: testId, name: testName, duration_minutes, questions_per_test } = test;

    // Функция, которая будет выполнена после всех проверок и подтверждений
    const proceedToTest = () => {
        // Устанавливаем текущий тест в глобальное состояние
        testState.setState({ currentTestId: testId, currentTestName: testName });
        
        // Проверяем, есть ли сохраненный прогресс для этого теста
        const savedProgress = loadProgress(testId);

        if (savedProgress) {
            // Если прогресс найден, предлагаем пользователю выбор
            showConfirmModal({
                title: 'Обнаружен незаконченный тест',
                text: `Хотите продолжить с места, где остановились?`,
                onConfirm: () => startTest(true), // Продолжить
                onCancel: () => { 
                    clearProgress(testId); // Очистить старый прогресс
                    startTest(false);      // Начать заново
                },
                confirmText: 'Продолжить',
                cancelText: 'Начать заново'
            });
        } else {
            // Если прогресса нет, просто начинаем тест
            startTest(false);
        }
    };
    
    // Показываем информационное окно с деталями теста перед стартом
    showConfirmModal({
        title: `Начать тест "${testName}"?`,
        text: `Вам будет предложено ${questions_per_test} ${pluralize(questions_per_test, 'question')}. Время на выполнение: ${duration_minutes} ${pluralize(duration_minutes, 'minute')}.`,
        onConfirm: proceedToTest,
        confirmText: 'Начать',
        cancelText: 'Отмена'
    });
}

/**
 * Настраивает обработчики событий для начального экрана приветствия, где пользователь вводит ФИО.
 */
export function setupWelcomeScreen() {
    const continueBtn = document.getElementById('continueToTestsBtn');
    const fioInput = document.getElementById('fioInputWelcome');
    if (!continueBtn || !fioInput) return;

    const proceed = () => {
        const fio = fioInput.value.trim();
        if (!fio) {
            showConfirmModal({ title: 'Внимание', text: 'Пожалуйста, введите ваше ФИО.', cancelText: '' });
            return;
        }
        testState.setState({ userFIO: fio });
        showTestSelectionView();
        updateHeaderUI(fio, 'selection');
        initializeTestSelection();
    };

    continueBtn.onclick = proceed;
    
    fioInput.onkeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            proceed();
        }
    };
}
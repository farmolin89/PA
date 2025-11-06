// --- ФАЙЛ: client/modules/test-flow/test-loader.js ---
// Этот модуль управляет логикой загрузки тестов: от приветственного экрана
// до выбора теста пользователем и проверки на наличие сохраненного прогресса.

import * as api from '../common/api-client.js';
import { pluralize } from '../utils/utils.js';
import { showConfirmModal } from '../common/modals.js';
import { testState } from './test-state.js';
import { loadProgress, clearProgress } from './progress.js';
import { renderPublicTestList, showTestSelectionView, showTestRunnerView, showFinalResults } from './screens.js';
import { startTest } from './test-executor.js';

/**
 * Загружает с сервера список публичных тестов и запускает их отрисовку.
 * Учитывает ФИО пользователя для получения статуса сдачи тестов.
 */
export async function initializeTestSelection() {
    // Получаем текущего пользователя из состояния
    const { userFIO } = testState.getState();
    
    // Вызываем API, передавая ФИО, чтобы сервер вернул персонализированный список
    const tests = await api.fetchPublicTests(userFIO);
    
    if (tests) {
        renderPublicTestList(tests, onTestSelect);
    }
}

/**
 * Обработчик, вызываемый при клике на карточку теста.
 * @param {object} test - Объект с данными выбранного теста.
 */
async function onTestSelect(test) {
    const { id: testId, name: testName } = test;
    const { userFIO } = testState.getState();

    if (test.passedStatus) {
        // Если тест уже сдан, показываем модальное окно с выбором
        showConfirmModal({
            title: 'Тест уже сдан',
            text: `Вы уже успешно прошли тест "${testName}". Что вы хотите сделать?`,
            confirmText: 'Пройти заново',
            cancelText: 'Посмотреть результат',
            onConfirm: () => {
                // Запускаем тест заново, принудительно очистив старый прогресс
                clearProgress(testId);
                // Показываем стандартное окно подтверждения перед стартом
                showStartConfirmation(test);
            },
            onCancel: async () => {
                // Показываем экран загрузки
                showTestRunnerView('Загрузка результата...');
                try {
                    // Запрашиваем протокол последнего успешного результата
                    const lastResult = await api.fetchLastResultProtocol(testId, userFIO);
                    showFinalResults(lastResult);
                } catch (error) {
                    // В случае ошибки, возвращаем на экран выбора
                    showConfirmModal({ title: 'Ошибка', text: 'Не удалось загрузить ваш предыдущий результат.' });
                    showTestSelectionView(userFIO);
                }
            }
        });
    } else {
        // Если тест не сдан, запускаем обычную логику
        showStartConfirmation(test);
    }
}

/**
 * Вспомогательная функция, которая показывает стандартное модальное окно перед стартом теста
 * и проверяет наличие незаконченного прогресса.
 * @param {object} test - Объект теста.
 */
function showStartConfirmation(test) {
    const { id: testId, name: testName, duration_minutes, questions_per_test } = test;

    const proceedToTest = () => {
        testState.setState({ currentTestId: testId, currentTestName: testName });
        const savedProgress = loadProgress(testId);

        if (savedProgress) {
            showConfirmModal({
                title: 'Обнаружен незаконченный тест',
                text: `Хотите продолжить с места, где остановились?`,
                onConfirm: () => startTest(true),
                onCancel: () => { 
                    clearProgress(testId);
                    startTest(false);
                },
                confirmText: 'Продолжить',
                cancelText: 'Начать заново'
            });
        } else {
            startTest(false);
        }
    };
    
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

    const proceed = () => {
        const fio = fioInput.value.trim();
        if (!fio) {
            showConfirmModal({ title: 'Внимание', text: 'Пожалуйста, введите ваше ФИО.' });
            return;
        }
        testState.setState({ userFIO: fio });
        showTestSelectionView(fio);
        initializeTestSelection();
    };

    if (continueBtn) {
        continueBtn.onclick = proceed;
    }
    
    if (fioInput) {
        fioInput.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                proceed();
            }
        };
    }
}
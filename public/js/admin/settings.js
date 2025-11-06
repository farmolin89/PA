// ===================================================================
// ФАЙЛ: public/js/admin/settings.js (ПОЛНАЯ ИТОГОВАЯ ВЕРСИЯ, АДАПТИРОВАННАЯ ПОД НОВЫЙ ДИЗАЙН)
// ===================================================================
// Этот модуль управляет логикой вкладки "Настройки" в панели администратора.

import { showToast } from './ui.js';
import { fetchTestSettings, saveTestSettings, updateTestStatus, fetchTests } from '../common/api-client.js';

let currentTestId = null;
let onStatusChangeCallback = () => {}; // Коллбэк для обновления UI в сайдбаре

/**
 * Загружает настройки для текущего теста с сервера и отображает их в форме.
 */
async function loadSettings() {
    try {
        // Загружаем основные настройки
        const settings = await fetchTestSettings(currentTestId);
        document.getElementById('durationInput').value = settings.duration_minutes;
        document.getElementById('passingScoreInput').value = settings.passing_score;
        document.getElementById('questionsCountInput').value = settings.questions_per_test;
        
        // Загружаем статус публикации
        const allTests = await fetchTests();
        const currentTest = allTests.find(t => t.id === currentTestId);
        if (currentTest) {
            document.getElementById('publishToggle').checked = !!currentTest.is_active;
        }

    } catch (error)
    {
        // Ошибка будет отображена глобальным обработчиком.
        console.error("Не удалось загрузить настройки:", error);
        const inputs = document.querySelectorAll('#tab-settings input, #tab-settings button');
        inputs.forEach(input => input.disabled = true);
        showToast('Не удалось загрузить настройки теста.', 'error');
    }
}

/**
 * Собирает данные из формы, валидирует их и отправляет на сервер для сохранения.
 */
async function handleSaveSettings() {
    const saveBtn = document.getElementById('saveSettingsBtn');
    const originalBtnContent = saveBtn.innerHTML;

    const settingsData = {
        duration_minutes: parseInt(document.getElementById('durationInput').value, 10),
        passing_score: parseInt(document.getElementById('passingScoreInput').value, 10),
        questions_per_test: parseInt(document.getElementById('questionsCountInput').value, 10)
    };

    // Клиентская валидация перед отправкой
    if (isNaN(settingsData.duration_minutes) || isNaN(settingsData.passing_score) || isNaN(settingsData.questions_per_test) ||
        settingsData.duration_minutes <= 0 || settingsData.passing_score <= 0 || settingsData.questions_per_test <= 0) {
        showToast('Все поля должны быть заполнены положительными числами.', 'error');
        return;
    }
    
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Сохранение...';

    try {
        await saveTestSettings(currentTestId, settingsData);
        showToast('Настройки теста успешно сохранены!', 'success');
    } catch (error) {
        // Глобальный обработчик покажет ошибку, здесь просто логируем для отладки.
        console.error("Не удалось сохранить настройки:", error);
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalBtnContent;
    }
}

/**
 * Обрабатывает изменение статуса публикации теста (вкл/выкл).
 * @param {Event} e - Событие изменения состояния переключателя.
 */
async function handlePublishToggle(e) {
    const isChecked = e.target.checked;
    const toggle = e.target;

    toggle.disabled = true;
    
    try {
        await updateTestStatus(currentTestId, isChecked);
        
        showToast(isChecked ? 'Тест опубликован!' : 'Тест снят с публикации.', 'success');
        
        // Вызываем коллбэк для обновления индикатора в сайдбаре
        if (onStatusChangeCallback) {
            onStatusChangeCallback(isChecked);
        }

    } catch (error) {
        // Глобальный обработчик покажет ошибку. Здесь мы откатываем состояние переключателя.
        console.error("Не удалось изменить статус теста:", error);
        toggle.checked = !isChecked;
    } finally {
        toggle.disabled = false;
    }
}

/**
 * Инициализирует модуль настроек для конкретного теста.
 * Создает HTML-структуру и навешивает обработчики событий.
 * @param {string} testId - ID теста, для которого загружаются настройки.
 * @param {function} callback - Функция для вызова при изменении статуса публикации.
 */
export function initSettingsModule(testId, callback) {
    currentTestId = testId;
    onStatusChangeCallback = callback;
    
    const container = document.getElementById('tab-settings');
    
    container.innerHTML = `
      <div class="card">
        <h3 class="section-subtitle">Основные параметры</h3>
        <div class="settings-form">
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label" for="durationInput">Время на тест (в минутах)</label>
                    <input type="number" class="form-control" id="durationInput" min="1" max="180">
                </div>
                <div class="form-group">
                    <label class="form-label" for="questionsCountInput">Количество вопросов в тесте</label>
                    <input type="number" class="form-control" id="questionsCountInput" min="1" max="100">
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label" for="passingScoreInput">Правильных ответов для сдачи</label>
                <input type="number" class="form-control" id="passingScoreInput" min="1" max="100">
            </div>
            
            <button id="saveSettingsBtn" class="btn">
                <i class="fas fa-save"></i> Сохранить настройки
            </button>
        </div>
      </div>

      <div class="card">
        <h3 class="section-subtitle">Публикация</h3>
        <div class="toggle-label">
            <div>
                <strong>Статус публикации</strong>
                <p style="font-size: 0.9rem; color: var(--gray);">
                    (Тест виден пользователям, если переключатель активен)
                </p>
            </div>
            <label class="toggle-switch">
                <input type="checkbox" id="publishToggle">
                <span class="toggle-slider"></span>
            </label>
        </div>
      </div>
    `;

    // Навешиваем обработчики на созданные элементы
    document.getElementById('saveSettingsBtn').addEventListener('click', handleSaveSettings);
    document.getElementById('publishToggle').addEventListener('change', handlePublishToggle);
    
    // Загружаем начальные данные
    loadSettings();
}
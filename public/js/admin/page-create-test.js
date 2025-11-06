// ===================================================================
// Файл: public/js/admin/page-create-test.js (ПОЛНАЯ ИТОГОВАЯ ВЕРСИЯ)
// ===================================================================
// Этот модуль отвечает за рендеринг и логику страницы "Создать тест".

import { createTest } from '../common/api-client.js';
import { showToast } from './ui.js';

/**
 * Обрабатывает отправку формы создания теста.
 * @param {Event} e - Событие отправки формы.
 */
async function handleCreateTestSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnContent = submitBtn.innerHTML;

    // Собираем ВСЕ данные из формы
    const testData = {
        name: form.querySelector('#new-test-name').value.trim(),
        description: form.querySelector('#new-test-description').value.trim(),
        duration_minutes: parseInt(form.querySelector('#new-test-duration').value, 10),
        questions_per_test: parseInt(form.querySelector('#new-test-questions-count').value, 10),
        passing_score: parseInt(form.querySelector('#new-test-passing-score').value, 10)
    };

    if (!testData.name) {
        showToast('Название теста не может быть пустым.', 'error');
        return;
    }
    
    // Простая валидация числовых полей
    if (isNaN(testData.duration_minutes) || isNaN(testData.questions_per_test) || isNaN(testData.passing_score) ||
        testData.duration_minutes <= 0 || testData.questions_per_test <= 0 || testData.passing_score <= 0) {
        showToast('Числовые поля должны быть заполнены положительными значениями.', 'error');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Создание...';

    try {
        // Отправляем полный объект с данными
        const result = await createTest(testData);
        showToast(`Тест "${testData.name}" успешно создан!`, 'success');
        
        // После успешного создания, переключаемся на страницу "Мои тесты"
        // Имитируем клик по навигационной ссылке
        document.querySelector('.nav-link[data-page="tests"]').click();

    } catch (error) {
        console.error("Ошибка при создании теста:", error);
        // Ошибка уже будет показана глобальным обработчиком
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnContent;
    }
}


/**
 * Инициализирует страницу "Создать тест".
 * @param {HTMLElement} container - Главный контейнер для контента страницы.
 */
export function initCreateTestPage(container) {
    // Добавляем ID к полям ввода
    container.innerHTML = `
        <h2 class="section-title">Создание нового теста</h2>
        <div class="card">
            <div class="form-container">
                <form id="create-test-form">
                    <div class="form-group">
                        <label class="form-label" for="new-test-name">Название теста</label>
                        <input type="text" id="new-test-name" class="form-control" placeholder="Введите название теста" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label" for="new-test-description">Описание теста</label>
                        <textarea id="new-test-description" class="form-control" rows="3" placeholder="Введите краткое описание (опционально)"></textarea>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label" for="new-test-duration">Время на тест (минут)</label>
                            <input type="number" id="new-test-duration" class="form-control" value="10" min="1">
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="new-test-questions-count">Количество вопросов</label>
                            <input type="number" id="new-test-questions-count" class="form-control" value="20" min="1">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label" for="new-test-passing-score">Проходной балл (%)</label>
                        <input type="number" id="new-test-passing-score" class="form-control" value="70" min="1" max="100">
                    </div>
                    
                    <button type="submit" class="btn" style="background-color: var(--success);">
                        <i class="fas fa-save"></i> Создать и перейти к вопросам
                    </button>
                </form>
            </div>
        </div>
    `;

    const form = document.getElementById('create-test-form');
    form.addEventListener('submit', handleCreateTestSubmit);
}
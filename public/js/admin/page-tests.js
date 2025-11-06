// ===================================================================
// Файл: public/js/admin/page-tests.js (ПОЛНАЯ ФИНАЛЬНАЯ ВЕРСИЯ БЕЗ СОКРАЩЕНИЙ)
// ===================================================================

import { fetchTests, deleteTest } from '../common/api-client.js';
import { escapeHTML, pluralize } from '../utils/utils.js';
import { showTestDashboard } from './main-content.js';
import { showConfirmModal } from '../common/modals.js';
import { showToast } from './ui.js';

/**
 * Рендерит карточки тестов на основе полученных данных.
 * @param {Array<object>} tests - Массив объектов тестов.
 * @param {HTMLElement} container - DOM-контейнер для вставки карточек.
 */
function renderTestCards(tests, container) {
    if (!tests || tests.length === 0) {
        container.innerHTML = `<div class="empty-state-message"><i class="fas fa-folder-open"></i><span>Тестов пока нет. Создайте первый!</span></div>`;
        return;
    }

    const cardsHTML = tests.map(test => {
        const questionsCount = test.questions_count || 0;
        const duration = test.duration_minutes || 0;

        return `
            <div class="test-card" data-id="${test.id}" data-name="${escapeHTML(test.name)}">
                
                <button class="btn-icon delete-test-btn" title="Удалить тест">
                    <i class="fas fa-trash-alt"></i>
                </button>
                
                <div class="test-header">
                    <div class="test-header-content">
                        <h3 class="test-title">${escapeHTML(test.name)}</h3>
                        <div class="test-info">
                            <span><i class="fas fa-question-circle"></i> ${questionsCount} ${pluralize(questionsCount, 'question')}</span>
                            <span><i class="fas fa-clock"></i> ${duration} ${pluralize(duration, 'minute')}</span>
                        </div>
                    </div>
                </div>
                <div class="test-body">
                    <div class="test-stats">
                        <div class="test-stat">
                            <div class="stat-value">${test.attemptsCount || 0}</div>
                            <div class="stat-label">Попыток</div>
                        </div>
                        <div class="test-stat">
                            <div class="stat-value">${test.passRate || 0}%</div>
                            <div class="stat-label">Сдача</div>
                        </div>
                        <div class="test-stat">
                            <div class="stat-value">${test.avgScore || 0}%</div>
                            <div class="stat-label">Средний балл</div>
                        </div>
                    </div>
                    <div class="test-actions">
                        <button class="btn btn-show-dashboard">
                            <i class="fas fa-chart-pie"></i> Обзор и управление
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `<div class="test-cards">${cardsHTML}</div>`;
}

/**
 * Инициализирует страницу "Мои тесты".
 * @param {HTMLElement} container - Главный контейнер для контента страницы.
 */
export async function initTestsPage(container) {
    container.innerHTML = `
        <div class="action-bar">
            <h2 class="section-title">Мои тесты</h2>
        </div>
        <div id="test-cards-container"><div class="spinner"></div></div>
    `;

    const cardsContainer = document.getElementById('test-cards-container');
    
    async function loadAndRenderTests() {
        sessionStorage.removeItem('/api/admin/tests');
        try {
            const tests = await fetchTests();
            renderTestCards(tests, cardsContainer);
        } catch (error) {
            cardsContainer.innerHTML = `<div class="empty-state-message"><i class="fas fa-exclamation-triangle"></i><span>Не удалось загрузить список тестов.</span></div>`;
            console.error("Ошибка загрузки тестов:", error);
        }
    }
    
    await loadAndRenderTests();

    cardsContainer.addEventListener('click', (e) => {
        const dashboardButton = e.target.closest('.btn-show-dashboard');
        const deleteButton = e.target.closest('.delete-test-btn');
        
        if (dashboardButton) {
            const card = dashboardButton.closest('.test-card');
            if (card) {
                showTestDashboard({ id: card.dataset.id, name: card.dataset.name });
            }
            return;
        }
        
        if (deleteButton) {
            const card = deleteButton.closest('.test-card');
            if (!card) return;

            const testId = card.dataset.id;
            const testName = card.dataset.name;
            
            showConfirmModal({
                title: 'Удалить тест?',
                text: `Вы уверены, что хотите удалить тест "${testName}"? Это действие необратимо.`,
                confirmText: 'Да, удалить',
                onConfirm: async () => {
                    try {
                        await deleteTest(testId);
                        showToast(`Тест "${testName}" успешно удален.`, 'success');
                        await loadAndRenderTests();
                    } catch (error) {
                        console.error("Ошибка при удалении теста:", error);
                    }
                },
                isInput: false // Явно указываем, что поле ввода не нужно
            });
        }
    });
}
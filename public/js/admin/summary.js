// ===================================================================
// Файл: public/js/admin/summary.js (ПОЛНАЯ ИТОГОВАЯ ВЕРСИЯ С ИСПРАВЛЕНИЯМИ)
// ===================================================================

import { fetchTestAnalytics } from '../common/api-client.js';
import { escapeHTML, pluralize } from '../utils/utils.js';

/**
 * Генерирует HTML для всей вкладки "Сводка".
 * @param {object} data - Данные аналитики с сервера.
 */
function renderSummary(data) {
    // === УЛУЧШЕНИЕ: Проверяем наличие данных в самом начале ===
    if (!data || !data.summaryStats || data.summaryStats.totalAttempts === 0) {
        return `<div class="empty-state-message">
                    <i class="fas fa-chart-bar"></i>
                    <span>Для этого теста пока нет завершенных результатов, чтобы построить аналитику.</span>
                </div>`;
    }

    const { summaryStats, mostDifficultQuestions, topPerformers, worstPerformers, scoreDistribution } = data;

    // --- 1. Карточки со статистикой ---
    const statsCards = `
        <div class="cards-container">
            <div class="card analytics-card">
                <div class="card-header">
                    <h3 class="card-title">Всего попыток</h3>
                    <div class="card-icon" style="background-color: #e0e7ff; color: #4361ee;">
                        <i class="fas fa-chart-line"></i>
                    </div>
                </div>
                <p class="card-value">${summaryStats.totalAttempts}</p>
                <p class="card-description">Общее количество попыток тестирования</p>
            </div>
            <div class="card analytics-card">
                <div class="card-header">
                    <h3 class="card-title">Процент сдачи</h3>
                    <div class="card-icon" style="background-color: #fef3c7; color: #f59e0b;">
                        <i class="fas fa-percentage"></i>
                    </div>
                </div>
                <p class="card-value">${summaryStats.passRate}%</p>
                <p class="card-description">Процент успешно сданных тестов</p>
            </div>
            <div class="card analytics-card">
                <div class="card-header">
                    <h3 class="card-title">Средний балл</h3>
                    <div class="card-icon" style="background-color: #dcfce7; color: #22c55e;">
                        <i class="fas fa-star"></i>
                    </div>
                </div>
                <p class="card-value">${summaryStats.averagePercentage}%</p>
                <p class="card-description">Средний результат по всем тестам</p>
            </div>
        </div>
    `;

    // --- 2. Списки результатов ---
    let topPerformersHtml = '<div class="empty-state-message" style="padding: 1rem;">Нет данных.</div>';
    if (topPerformers && topPerformers.length > 0) {
        topPerformersHtml = topPerformers.map(p => `
            <div class="result-item">
                <span class="result-name">${escapeHTML(p.fio)}</span>
                <span class="score-badge">${p.maxPercentage}%</span>
            </div>
        `).join('');
    }
    
    let worstPerformersHtml = '<div class="empty-state-message" style="padding: 1rem;">Нет данных.</div>';
    if (worstPerformers && worstPerformers.length > 0) {
        worstPerformersHtml = worstPerformers.map(p => `
             <div class="result-item">
                <span class="result-name">${escapeHTML(p.fio)}</span>
                <span class="score-badge score-badge-danger">${p.minPercentage}%</span>
            </div>
        `).join('');
    }
    
    let difficultQuestionsHtml = '<div class="empty-state-message" style="padding: 1rem;">Нет данных.</div>';
    if (mostDifficultQuestions && mostDifficultQuestions.length > 0) {
        difficultQuestionsHtml = mostDifficultQuestions.map((q, index) => `
            <div class="result-item">
                <span class="result-name">${index + 1}. ${escapeHTML(q.text)}</span>
            </div>
        `).join('');
    }

    // --- 3. Распределение баллов (ИСПРАВЛЕНА ЛОГИКА ОТОБРАЖЕНИЯ ПРИ ПУСТЫХ ДАННЫХ) ---
    const validCounts = (scoreDistribution || []).map(d => (d && typeof d.count === 'number') ? d.count : 0);
    const totalDistributionCount = validCounts.reduce((sum, count) => sum + count, 0);
    let distributionChartHtml = '';

    if (totalDistributionCount === 0) {
        distributionChartHtml = '<div class="empty-state-message" style="padding: 1rem; margin-top: 1rem;">Нет данных для построения графика.</div>';
    } else {
        const maxCount = Math.max(...validCounts, 1);
        distributionChartHtml = (scoreDistribution || []).map((bucket) => {
            if (!bucket || typeof bucket.count !== 'number' || typeof bucket.label !== 'string') return '';

            const hasAttempts = bucket.count > 0;
            const normalizedHeight = hasAttempts ? Math.max((bucket.count / maxCount) * 100, 8) : 0;
            const labelText = bucket.label.includes('99') ? '90-100' : bucket.label.replace('-', '–');

            return `
                <div class="score-item" title="${bucket.count} ${pluralize(bucket.count, 'attempt')}">
                    <div class="score-bar">
                        <div class="score-fill${hasAttempts ? ' has-data' : ''}" style="height: ${normalizedHeight}%;"></div>
                    </div>
                    <div class="score-value">${labelText}</div>
                </div>
            `;
        }).join('');
    }


    // --- 4. Сборка всего HTML ---
    return `
        ${statsCards}
        <div class="card">
            <h3 class="card-title">Распределение баллов</h3>
            <div class="score-distribution">
                ${distributionChartHtml}
            </div>
        </div>
        <div class="card">
            <h3 class="card-title">Самые сложные вопросы</h3>
            <div class="top-results">
                ${difficultQuestionsHtml}
            </div>
        </div>
        <div class="cards-grid-half">
            <div class="card">
                <h3 class="card-title">Лучшие результаты</h3>
                <div class="top-results">
                    ${topPerformersHtml}
                </div>
            </div>
            <div class="card">
                <h3 class="card-title">Области для улучшения (худшие результаты)</h3>
                <div class="top-results">
                    ${worstPerformersHtml}
                </div>
            </div>
        </div>
    `;
}


/**
 * Инициализирует модуль "Сводка".
 * @param {string} testId - ID текущего теста.
 */
export async function initSummaryModule(testId) {
    const container = document.getElementById('tab-summary');
    if (!container) return;
    container.innerHTML = '<div class="spinner"></div>';
    
    try {
        const analyticsData = await fetchTestAnalytics(testId);
        container.innerHTML = renderSummary(analyticsData);
    } catch (error) {
        container.innerHTML = '<div class="empty-state-message"><i class="fas fa-exclamation-triangle"></i><span>Не удалось загрузить аналитическую сводку.</span></div>';
        console.error("Ошибка загрузки аналитики:", error);
    }
}
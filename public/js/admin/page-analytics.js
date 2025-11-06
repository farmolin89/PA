// ===================================================================
// Файл: public/js/admin/page-analytics.js (ФИНАЛЬНАЯ ВЕРСИЯ С 6 КАРТОЧКАМИ И ГРАФИКОМ)
// ===================================================================

import { apiFetch } from '../common/api-client.js';

/**
 * Отрисовывает график активности с помощью Chart.js.
 */
function renderActivityChart(chartData) {
    const canvas = document.getElementById('activityChart');
    if (!canvas || !chartData || typeof Chart === 'undefined') return;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, 250);
    gradient.addColorStop(0, 'rgba(42, 111, 219, 0.4)');
    gradient.addColorStop(1, 'rgba(42, 111, 219, 0)');

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.labels.map(label => new Date(label).toLocaleDateString('ru-RU', {day: 'numeric', month: 'short'})),
            datasets: [{
                label: 'Количество тестов',
                data: chartData.data,
                borderColor: '#2a6fdb', // ИЗМЕНЕНО: Явный синий цвет
                backgroundColor: gradient,
                borderWidth: 2.5,
                pointBackgroundColor: '#2a6fdb', // ИЗМЕНЕНО: Точки стали синими
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, ticks: { precision: 0 } }, // Только целые числа на оси Y
                x: { grid: { display: false } }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    // === ИЗМЕНЕНИЯ ДЛЯ ОТСТУПОВ ===
                    padding: 12,
                    titleSpacing: 6, 
                    // === КОНЕЦ ИЗМЕНЕНИЙ ===
                    callbacks: {
                        title: (tooltipItems) => `Активность за ${tooltipItems[0].label}`
                    }
                }
            }
        }
    });
}

/**
 * Рендерит карточку статистики.
 */
function createStatCard({ title, value, change, description, icon, changeText, valueSuffix = '' }) {
    const isPositive = change >= 0;
    const changeClass = isPositive ? 'positive' : 'negative';
    const changeIcon = isPositive ? 'fa-arrow-up' : 'fa-arrow-down';
    
    return `
        <div class="card analytics-card">
            <div class="card-header">
                <h3 class="card-title">${title}</h3>
                <div class="card-icon" style="background-color: ${icon.bg}; color: ${icon.color};">
                    <i class="fas ${icon.name}"></i>
                </div>
            </div>
            <p class="card-value">${value.toLocaleString('ru-RU')}${valueSuffix}</p>
            <p class="card-change ${changeClass}">
                <i class="fas ${changeIcon}"></i>
                <span>${isPositive ? '+' : ''}${change.toLocaleString('ru-RU')} ${changeText}</span>
            </p>
            <p class="card-description">${description}</p>
        </div>
    `;
}

/**
 * Рендерит основное содержимое страницы аналитики.
 */
function renderAnalyticsPageLayout(data, container) {
    const cardsData = [
        { title: 'Всего попыток', value: data.totalAttempts, change: data.attemptsChange, description: 'Общее количество попыток тестирования', icon: { name: 'fa-chart-line', bg: '#e0e7ff', color: '#4361ee' }, changeText: 'за 30 дней' },
        { title: 'Успешные попытки', value: data.successfulAttempts, change: data.successfulAttemptsChange, description: 'Количество сданных тестов', icon: { name: 'fa-check-circle', bg: '#dcfce7', color: '#22c55e' }, changeText: 'за 30 дней' },
        { title: 'Общий процент сдачи', value: data.overallPassRate, valueSuffix: '%', change: data.passRateChange, description: 'Средний процент успешно сданных тестов', icon: { name: 'fa-chart-pie', bg: '#fef3c7', color: '#f59e0b' }, changeText: 'изменение' },
        { title: 'Средний балл', value: data.overallAvgScore, valueSuffix: '%', change: data.avgScoreChange, description: 'Средний результат по всем тестам', icon: { name: 'fa-star-half-alt', bg: '#ffe4e6', color: '#f72585' }, changeText: 'изменение' },
        { title: 'Активные тесты', value: data.activeTests, change: data.activeTestsChange, description: 'Тесты, доступные для прохождения', icon: { name: 'fa-fire', bg: '#ffedd5', color: '#f97316' }, changeText: 'новых' },
        { title: 'Среднее время', value: data.averageTime, valueSuffix: ' мин', change: data.averageTimeChange, description: 'Среднее время прохождения теста', icon: { name: 'fa-clock', bg: '#dbeafe', color: '#3b82f6' }, changeText: 'мин изменение' },
    ];
    
    container.innerHTML = `
        <h2 class="section-title">Аналитика и отчеты</h2>
        <div class="cards-container">
            ${cardsData.map(createStatCard).join('')}
        </div>
        <div class="card">
            <h3 class="card-title">Активность по тестам за 30 дней</h3>
            <div class="chart-container">
                <canvas id="activityChart"></canvas>
            </div>
        </div>
    `;
}

/**
 * Инициализирует страницу "Аналитика".
 */
export async function initAnalyticsPage(container) {
    container.innerHTML = '<div class="spinner"></div>';
    try {
        const [overallData, chartData] = await Promise.all([
            apiFetch('/api/admin/analytics/overall'),
            apiFetch('/api/admin/analytics/activity')
        ]);
        renderAnalyticsPageLayout(overallData, container);
        renderActivityChart(chartData);
    } catch (error) {
        container.innerHTML = `<div class="empty-state-message"><i class="fas fa-exclamation-triangle"></i><span>Не удалось загрузить данные аналитики.</span></div>`;
        console.error("Ошибка загрузки аналитики:", error);
    }
}
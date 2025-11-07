// ===================================================================
// Файл: public/js/trips/stats/chartRenderer.js (НОВЫЙ ФАЙЛ: Рендерер графиков)
// ===================================================================

import { utils } from '../trip-helpers.js';

let monthlyChartInstance = null;
let transportChartInstance = null;
let geographyChartInstance = null;

/**
 * Уничтожает экземпляры графиков.
 * @param {'all'|'geography'|'monthly'} type - Тип уничтожаемого графика.
 */
export function destroyCharts(type) {
    if (type === 'all' || type === 'monthly') {
        if (monthlyChartInstance) { monthlyChartInstance.destroy(); monthlyChartInstance = null; }
        // [ИСПРАВЛЕНО]: Логика для транспорта теперь тоже в 'monthly'/'all'
        if (transportChartInstance) { transportChartInstance.destroy(); transportChartInstance = null; }
    }
    if (type === 'all' || type === 'geography') {
        if (geographyChartInstance) { geographyChartInstance.destroy(); geographyChartInstance = null; }
    }
}

// --- ГРАФИК ПО МЕСЯЦАМ ---
export function renderMonthlyChart(monthlyData) {
    destroyCharts('monthly');
    const ctx = document.getElementById('monthlyChart')?.getContext('2d');
    if (!ctx) return;
    monthlyChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
            datasets: [{
                label: 'Кол-во командировок',
                data: monthlyData,
                borderColor: 'rgba(59, 130, 246, 1)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 3, tension: 0.4, fill: true, pointRadius: 5,
                pointBackgroundColor: 'rgba(59, 130, 246, 1)', pointBorderColor: '#fff', pointBorderWidth: 2,
                pointHoverRadius: 8, pointHoverBackgroundColor: '#fff', pointHoverBorderColor: 'rgba(59, 130, 246, 1)',
            }]
        },
        options: { 
            responsive: true, maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } }
            },
            plugins: {
                legend: { position: 'top', labels: { padding: 20, boxWidth: 15, font: { size: 14, weight: '500' } } },
                 tooltip: {
                    padding: 12, boxPadding: 4, titleFont: { size: 14, weight: 'bold' }, bodyFont: { size: 13 },
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed.y || 0;
                            const unit = utils.getPluralizedUnit(value, 'командировка', 'командировки', 'командировок');
                            return ` ${value} ${unit}`;
                        }
                    }
                }
            }
        }
    });
}

// --- ГРАФИК ТРАНСПОРТА ---
export function renderTransportChart(transportData) {
    destroyCharts('transport');
    const ctx = document.getElementById('transportChart')?.getContext('2d');
    if (!ctx) return;

    // [ИСПРАВЛЕНО]: Проверка, что контекст Canvas доступен
    if (!Chart || !ctx) {
        console.error("Chart.js не загружен или контекст Canvas недоступен.");
        return;
    }

    const gradientPlane = ctx.createLinearGradient(0, 0, 0, 300);
    gradientPlane.addColorStop(0, '#7dd3fc'); gradientPlane.addColorStop(1, '#3b82f6');
    const gradientTrain = ctx.createLinearGradient(0, 0, 0, 300);
    gradientTrain.addColorStop(0, '#6ee7b7'); gradientTrain.addColorStop(1, '#10b981');
    const gradientCar = ctx.createLinearGradient(0, 0, 0, 300);
    gradientCar.addColorStop(0, '#fca5a5'); gradientCar.addColorStop(1, '#ef4444');

    transportChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Самолет', 'Поезд', 'Автомобиль'],
            datasets: [{
                data: [transportData.plane, transportData.train, transportData.car],
                backgroundColor: [gradientPlane, gradientTrain, gradientCar],
                borderColor: '#ffffff', borderWidth: 4, hoverOffset: 20
            }]
        },
        options: { 
            responsive: true, maintainAspectRatio: false, cutout: '70%',
            plugins: {
                legend: { position: 'top', labels: { padding: 20, boxWidth: 15, font: { size: 14, weight: '500' } } },
                tooltip: {
                    padding: 12, boxPadding: 4, titleFont: { size: 14, weight: 'bold' }, bodyFont: { size: 13 },
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed || 0;
                            const allData = context.chart.data.datasets[0].data;
                            const total = allData.reduce((sum, current) => sum + current, 0);
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            const unit = utils.getPluralizedUnit(value, 'поездка', 'поездки', 'поездок');
                            
                            return ` ${value} ${unit} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// --- ГРАФИК ГЕОГРАФИИ ---
export function renderGeographyChart(chartData) {
    destroyCharts('geography');
    const ctx = document.getElementById('geographyChart')?.getContext('2d');
    if (!ctx) return;

    // [ИСПРАВЛЕНО]: Проверка, что контекст Canvas доступен
    if (!Chart || !ctx) {
        console.error("Chart.js не загружен или контекст Canvas недоступен.");
        return;
    }

    const labels = chartData.map(c => c.city);
    const visitCounts = chartData.map(c => c.visits);

    geographyChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Кол-во визитов',
                data: visitCounts,
                backgroundColor: [
                    'rgba(54, 162, 235, 0.8)', 'rgba(75, 192, 192, 0.8)', 'rgba(153, 102, 255, 0.8)',
                    'rgba(255, 206, 86, 0.8)', 'rgba(255, 159, 64, 0.8)'
                ],
                borderRadius: 5,
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, indexAxis: 'x',
            scales: { y: { beginAtZero: true, ticks: { stepSize: 5 } } },
            plugins: {
                legend: { display: false },
                tooltip: {
                    padding: 10, boxPadding: 4,
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed.y || 0;
                            const unit = utils.getPluralizedUnit(value, 'визит', 'визита', 'визитов');
                            return ` ${value} ${unit}`;
                        }
                    }
                }
            }
        }
    });
}
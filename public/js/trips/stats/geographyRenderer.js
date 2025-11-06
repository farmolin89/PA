// ===================================================================
// Файл: public/js/trips/stats/geographyRenderer.js (ФИНАЛЬНАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ)
// ===================================================================
import { renderGeographyChart, destroyCharts } from './chartRenderer.js';
import { utils } from '../trip-helpers.js';
import { state } from '../state.js'; // Импортируем state для доступа к списку сотрудников

// --- ФУНКЦИЯ СОЗДАНИЯ РАЗМЕТКИ ---

export function createGeographyLayout() {
    const geographyModalBody = document.getElementById('geography-modal-body');

    // Генерируем опции для нашего кастомного списка
    const employeeOptions = state.employees
        .map(emp => `<li class="custom-option" data-value="${emp.id}">${emp.lastName} ${emp.firstName}</li>`)
        .join('');

    // --- ИЗМЕНЕНО: Заменяем <select> на кастомную структуру ---
    geographyModalBody.innerHTML = `
        <div class="filters">
            <div class="filter-group">
                <label for="geoEmployeeFilter">Сотрудник:</label>
                <!-- Кастомный выпадающий список -->
                <div class="custom-select-wrapper">
                    <div class="custom-select" id="geoEmployeeFilter" data-value="all">
                        <div class="custom-select__trigger">
                            <span>Все сотрудники</span>
                            <div class="arrow"></div>
                        </div>
                        <div class="custom-options">
                            <li class="custom-option selected" data-value="all">Все сотрудники</li>
                            ${employeeOptions}
                        </div>
                    </div>
                </div>
                <!-- Конец кастомного выпадающего списка -->
            </div>
        </div>
        <div class="geo-layout">
            <div class="geo-chart-container">
                <canvas id="geographyChart"></canvas>
            </div>
            <div class="geo-ranking-container">
                <div class="geo-ranking-list" id="geoRankingList">
                    <!-- Список будет сгенерирован JS -->
                </div>
            </div>
        </div>
        <div class="geo-fact" id="geoFact">
            <!-- Факт будет сгенерирован JS -->
        </div>
    `;

    // --- ДОБАВЛЕНО: Логика для работы кастомного списка ---
    const customSelect = geographyModalBody.querySelector('.custom-select');
    if (!customSelect) return;
    
    const trigger = customSelect.querySelector('.custom-select__trigger');
    const options = customSelect.querySelector('.custom-options');

    // 1. Открытие/закрытие списка по клику
    trigger.addEventListener('click', () => {
        customSelect.classList.toggle('open');
    });

    // 2. Выбор опции и закрытие списка
    options.addEventListener('click', (e) => {
        const targetOption = e.target.closest('.custom-option');
        if (targetOption) {
            // Убираем класс 'selected' у старой опции
            const previouslySelected = options.querySelector('.selected');
            if (previouslySelected) {
                previouslySelected.classList.remove('selected');
            }
            
            // Добавляем класс 'selected' новой
            targetOption.classList.add('selected');
            
            // Обновляем текст в "триггере"
            trigger.querySelector('span').textContent = targetOption.textContent;
            
            // Закрываем список
            customSelect.classList.remove('open');
            
            // Имитируем событие 'change', чтобы сработала фильтрация
            const changeEvent = new Event('custom-change', { bubbles: true });
            customSelect.dataset.value = targetOption.dataset.value; // Сохраняем выбранное значение
            customSelect.dispatchEvent(changeEvent);
        }
    });

    // 3. Закрытие списка при клике вне его
    document.addEventListener('click', (e) => {
        if (customSelect && !customSelect.contains(e.target)) {
            customSelect.classList.remove('open');
        }
    });
}

// --- ФУНКЦИЯ ОБНОВЛЕНИЯ ДАННЫХ ---

export function updateGeographyData(data) {
    const listContainer = document.getElementById('geoRankingList');
    const factContainer = document.getElementById('geoFact');

    if (!listContainer || !factContainer) return;

    if (data.topCities && data.topCities.length > 0) {
        listContainer.innerHTML = data.topCities.map((city, index) => `
            <div class="geo-ranking-item pos-${index + 1}">
                <div class="geo-position">${index + 1}</div>
                <div class="geo-city-info">
                    <i class="fas fa-city"></i>
                    <span class="geo-city-name">${city.city}</span>
                </div>
                <div class="geo-visits">
                    ${city.visits} <span>${utils.getPluralizedUnit(city.visits, 'визит', 'визита', 'визитов')}</span>
                </div>
            </div>
        `).join('');

        const topCity = data.topCities[0];
        const percentage = data.totalTrips > 0 
            ? ((topCity.visits / data.totalTrips) * 100).toFixed(0) 
            : 0;
        
        factContainer.innerHTML = `
            <i class="fas fa-info-circle"></i>
            <strong>Интересный факт:</strong>
            ${topCity.city} является самым посещаемым городом с ${topCity.visits} командировками, что составляет около ${percentage}% от общего количества поездок.
        `;

        const chartData = data.topCities.slice(0, 5);
        renderGeographyChart(chartData);

    } else {
        listContainer.innerHTML = '<div style="text-align:center; padding: 50px;">Нет данных для отображения географии.</div>';
        factContainer.innerHTML = '';
        destroyCharts('geography');
    }
}
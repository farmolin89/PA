// ===================================================================
// Файл: public/js/trips/tripHistoryModal.js (ИТОГОВАЯ ВЕРСИЯ ПОСЛЕ РЕФАКТОРИНГА)
// ===================================================================

import { state } from './state.js';
import { utils } from './trip-helpers.js';
import { openModal } from './modals/modalManager.js';

const modal = document.getElementById('trip-history-modal');
const titleEl = document.getElementById('trip-history-title');
const listEl = document.getElementById('trip-history-list');
const summaryEl = document.getElementById('trip-history-summary');
const statusFilter = document.getElementById('history-status-filter');
const yearFilter = document.getElementById('history-year-filter');

let allTrips = []; // Хранилище для всех поездок сотрудника в этом окне

// --- Вспомогательные функции formatDate и getTripStatus удалены, так как теперь они в utils.js ---

// Функция рендеринга одной командировки
export function renderTripListItem(trip) {
    // Используем функции из общего модуля utils
    const status = utils.getTripStatusForList(trip);
    const date = utils.formatTripDateForList(trip.startDate, trip.endDate);
    
    const organization = state.organizations.find(o => o.id === trip.organizationId);
    
    let partnerText = 'Без напарника';
    if (trip.participants.length > 1) {
        partnerText = `С напарником (${trip.participants.length - 1})`;
    }
    
    let statusText = status.text.toUpperCase();

    let transportHtml = '';
    if (trip.transport) {
        const transportMap = {
            plane: { icon: 'fa-plane', text: 'Самолет' },
            train: { icon: 'fa-train', text: 'Поезд' },
            car: { icon: 'fa-car', text: 'Автомобиль' },
        };
        const transportInfo = transportMap[trip.transport];
        if (transportInfo) {
            transportHtml = `
                <div class="trip-transport-info">
                    <i class="fas ${transportInfo.icon}"></i>
                    <span>${transportInfo.text}</span>
                </div>
            `;
        }
    }

    return `
        <div class="trip-list-item status-${status.key}">
            <div class="trip-date">
                <div class="month">${date.month}</div>
                <div class="days">${date.days}</div>
                <div class="year">${date.year}</div>
            </div>
            <div class="trip-details-wrapper">
                <div class="trip-info">
                    <div class="organization">${organization?.name || 'Не указана'}</div>
                    <div class="destination">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${trip.destination}</span>
                    </div>
                    ${transportHtml} 
                </div>
                <div class="trip-partners">
                    <i class="fas fa-users icon"></i>
                    <span>${partnerText}</span>
                </div>
                <div class="trip-status-badge status-${status.key}">
                    ${statusText}
                </div>
            </div>
        </div>
    `;
}

// Функция рендеринга списка командировок
function renderTrips(tripsToRender) {
    if (tripsToRender.length === 0) {
        listEl.innerHTML = '<p style="text-align:center; padding: 20px;">Командировки не найдены.</p>';
    } else {
        listEl.innerHTML = tripsToRender.map(trip => renderTripListItem(trip)).join('');
    }
    summaryEl.innerHTML = `Всего отображается ${tripsToRender.length} из ${allTrips.length} командировок.`;
}

// Логика фильтрации
function applyFilters() {
    const selectedStatus = statusFilter.value;
    const selectedYear = yearFilter.value;

    const filteredTrips = allTrips.filter(trip => {
        const tripYear = new Date(trip.startDate).getFullYear().toString();
        const tripStatus = utils.getTripStatusForList(trip).key; // <-- Используем utils

        const yearMatch = selectedYear === 'all' || tripYear === selectedYear;
        const statusMatch = selectedStatus === 'all' || tripStatus === selectedStatus;
        
        return yearMatch && statusMatch;
    });

    renderTrips(filteredTrips);
}

// Главная функция инициализации
export function initTripHistoryModal(employeeId, employeeName) {
    titleEl.textContent = `Все командировки: ${employeeName}`;
    listEl.innerHTML = '<p style="text-align:center; padding: 20px;">Загрузка...</p>';
    summaryEl.textContent = '';
    
    openModal('trip-history-modal');

    // Получаем полные данные из локального состояния
    allTrips = utils.getEmployeeTrips(employeeId)
                   .sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
    
    const years = [...new Set(allTrips.map(trip => new Date(trip.startDate).getFullYear()))];
    yearFilter.innerHTML = '<option value="all">Все годы</option>';
    years.sort((a, b) => b - a).forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearFilter.appendChild(option);
    });

    statusFilter.value = 'all';
    yearFilter.value = 'all';
    
    renderTrips(allTrips);
}

// Навешиваем обработчики на изменение каждого фильтра
statusFilter.addEventListener('change', applyFilters);
yearFilter.addEventListener('change', applyFilters);
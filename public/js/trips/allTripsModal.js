// ===================================================================
// Файл: public/js/trips/allTripsModal.js (ФИНАЛЬНАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ)
// ===================================================================

import { api } from '../common/api-client.js';
import { openModal } from './modals/modalManager.js';
import { state } from './state.js';
import { utils } from './trip-helpers.js';

const modal = document.getElementById('all-trips-modal');
const titleEl = document.getElementById('all-trips-title');
const listEl = document.getElementById('all-trips-list');
const summaryEl = document.getElementById('all-trips-summary');
const employeeFilter = document.getElementById('all-trips-employee-filter'); // Теперь это наш div.custom-select
const statusFilter = document.getElementById('all-trips-status-filter'); // Это остался <select>

let allUniqueCompanyTrips = []; // Хранилище для УНИКАЛЬНЫХ поездок компании

// --- Функция для инициализации кастомного селекта ---
function setupCustomSelect(selectElement, applyFiltersCallback) {
    if (!selectElement) return;
    const trigger = selectElement.querySelector('.custom-select__trigger');
    const options = selectElement.querySelector('.custom-options');

    if (!trigger || !options) return;

    trigger.addEventListener('click', () => selectElement.classList.toggle('open'));

    options.addEventListener('click', (e) => {
        const targetOption = e.target.closest('.custom-option');
        if (targetOption) {
            const previouslySelected = options.querySelector('.selected');
            if (previouslySelected) previouslySelected.classList.remove('selected');
            
            targetOption.classList.add('selected');
            trigger.querySelector('span').textContent = targetOption.textContent;
            selectElement.classList.remove('open');
            selectElement.dataset.value = targetOption.dataset.value;
            
            if (typeof applyFiltersCallback === 'function') {
                applyFiltersCallback();
            }
        }
    });

    document.addEventListener('click', (e) => {
        if (!selectElement.contains(e.target)) {
            selectElement.classList.remove('open');
        }
    });
}


function renderAllTripsListItem(trip) {
    const status = utils.getTripStatusForList(trip);
    const date = utils.formatTripDateForList(trip.startDate, trip.endDate);
    
    const organization = state.organizations.find(o => o.id === trip.organizationId);
    
    const participantsNames = trip.participants
        .map(id => state.employees.find(e => e.id === id))
        .filter(Boolean) // Отфильтровываем, если сотрудник не найден
        .map(e => `${e.lastName} ${e.firstName[0]}.`)
        .join(', ');

    const statusText = status.text.toUpperCase();

    let transportHtml = '';
    if (trip.transport) {
        const transportMap = { plane: { icon: 'fa-plane', text: 'Самолет' }, train: { icon: 'fa-train', text: 'Поезд' }, car: { icon: 'fa-car', text: 'Автомобиль' } };
        const transportInfo = transportMap[trip.transport];
        if (transportInfo) { transportHtml = `<div class="trip-transport-info"><i class="fas ${transportInfo.icon}"></i><span>${transportInfo.text}</span></div>`; }
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
                    <span>${participantsNames || 'Нет участников'}</span>
                </div>
                <div class="trip-status-badge status-${status.key}">
                    ${statusText}
                </div>
            </div>
        </div>
    `;
}

function renderTrips(tripsToRender) {
    if (listEl) {
        if (tripsToRender.length === 0) {
            listEl.innerHTML = '<p style="text-align:center; padding: 20px;">Командировки не найдены.</p>';
        } else {
            listEl.innerHTML = tripsToRender.map(renderAllTripsListItem).join('');
        }
    }
    if (summaryEl) {
        summaryEl.innerHTML = `Отображается ${tripsToRender.length} из ${allUniqueCompanyTrips.length} командировок.`;
    }
}

function applyFilters() {
    const selectedStatus = statusFilter.value;
    const selectedEmployeeId = employeeFilter.dataset.value;

    const filtered = allUniqueCompanyTrips.filter(trip => {
        const tripStatus = utils.getTripStatusForList(trip).key;
        const statusMatch = selectedStatus === 'all' || tripStatus === selectedStatus;
        const employeeMatch = selectedEmployeeId === 'all' || trip.participants.includes(parseInt(selectedEmployeeId, 10));
        return statusMatch && employeeMatch;
    });
    renderTrips(filtered);
}

export async function initAllTripsModal(year) {
    if (titleEl) titleEl.textContent = `Все командировки за ${year} г.`;
    if (listEl) listEl.innerHTML = '<p style="text-align:center; padding: 20px;">Загрузка...</p>';
    if (summaryEl) summaryEl.textContent = '';
    
    if (employeeFilter) {
        const optionsContainer = employeeFilter.querySelector('.custom-options');
        if (optionsContainer) {
            let employeeOptionsHTML = `<li class="custom-option selected" data-value="all">Все сотрудники</li>`;
            state.employees.forEach(emp => {
                employeeOptionsHTML += `<li class="custom-option" data-value="${emp.id}">${emp.lastName} ${emp.firstName}</li>`;
            });
            optionsContainer.innerHTML = employeeOptionsHTML;
        }
        
        employeeFilter.dataset.value = 'all';
        const triggerSpan = employeeFilter.querySelector('.custom-select__trigger span');
        if (triggerSpan) triggerSpan.textContent = 'Все сотрудники';
    }
    
    openModal('all-trips-modal');

    try {
        // Данные уже должны быть в state.trips с полным списком участников
        const allTripsForYear = state.trips
            .filter(trip => new Date(trip.startDate).getFullYear() == year);
        
        // --- ИЗМЕНЕНИЕ: Дедупликация поездок по groupId ---
        const uniqueTripsMap = new Map();
        allTripsForYear.forEach(trip => {
            // Используем groupId как ключ, чтобы каждая поездка (группа) была в мапе только один раз
            if (!uniqueTripsMap.has(trip.groupId)) {
                uniqueTripsMap.set(trip.groupId, trip);
            }
        });
        
        allUniqueCompanyTrips = Array.from(uniqueTripsMap.values())
                                     .sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
        
        if (statusFilter) statusFilter.value = 'all';
        renderTrips(allUniqueCompanyTrips);

    } catch (error) {
        if (listEl) listEl.innerHTML = `<p style="text-align:center; padding: 20px; color: red;">Ошибка отображения: ${error.message}</p>`;
    }
}

// Устанавливаем обработчики один раз
if (employeeFilter) setupCustomSelect(employeeFilter, applyFilters);
if (statusFilter) statusFilter.addEventListener('change', applyFilters);
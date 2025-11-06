// ===================================================================
// File: public/js/trips/calendarInteractivity.js (ИСПРАВЛЕННАЯ ВЕРСЯ)
// ===================================================================
import { state } from './state.js';
import { renderCalendar, renderMonthPicker } from './calendar.js';
import { showTooltip, hideTooltip, updateTooltipPosition, showVacationTooltip } from './tooltip.js';
import { openModal } from './modals/modalManager.js';
import { renderEmployeeCard } from './modals/employeeCardModal.js';
import { utils } from './trip-helpers.js';

const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const scheduleBody = document.getElementById('schedule-body-grid');
const monthPickerTrigger = document.getElementById('month-picker-trigger');
const monthYearPicker = document.getElementById('month-year-picker');
const pickerPrevYearBtn = document.getElementById('picker-prev-year');
const pickerNextYearBtn = document.getElementById('picker-next-year');
const pickerMonthsGrid = document.getElementById('picker-months-grid');

export function setupCalendarInteractivity() {
    let pickerYear = state.currentDate.getFullYear();

    prevMonthBtn.addEventListener('click', () => {
        state.currentDate.setMonth(state.currentDate.getMonth() - 1);
        renderCalendar();
    });
    nextMonthBtn.addEventListener('click', () => {
        state.currentDate.setMonth(state.currentDate.getMonth() + 1);
        renderCalendar();
    });

    monthPickerTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!monthYearPicker.classList.contains('visible')) {
            pickerYear = state.currentDate.getFullYear();
            renderMonthPicker(pickerYear);
        }
        monthYearPicker.classList.toggle('visible');
    });

    pickerPrevYearBtn.addEventListener('click', () => { pickerYear--; renderMonthPicker(pickerYear); });
    pickerNextYearBtn.addEventListener('click', () => { pickerYear++; renderMonthPicker(pickerYear); });

    pickerMonthsGrid.addEventListener('click', (e) => {
        const monthEl = e.target.closest('.picker-month');
        if (monthEl) {
            state.currentDate = new Date(pickerYear, parseInt(monthEl.dataset.month, 10), 1);
            renderCalendar();
            monthYearPicker.classList.remove('visible');
        }
    });

    document.addEventListener('click', (e) => {
        if (!monthPickerTrigger.contains(e.target) && !monthYearPicker.contains(e.target)) {
            monthYearPicker.classList.remove('visible');
        }
    });

    scheduleBody.addEventListener('click', (event) => {
        const employeeNameElement = event.target.closest('.employee-name-full');
        if (employeeNameElement) {
            const employeeId = parseInt(employeeNameElement.getAttribute('data-employee-id'), 10);
            if (employeeId) {
                renderEmployeeCard(employeeId);
                openModal('employee-card-modal');
            }
            return;
        }
        
        const itemElement = event.target.closest('.trip-item');
        if (itemElement) {
            const modal = document.getElementById('trip-actions-modal');
            const titleEl = document.getElementById('trip-details-title');
            const subtitleEl = document.getElementById('trip-details-subtitle');
            const orgLabelEl = document.getElementById('trip-details-org-label');
            const orgValueEl = document.getElementById('trip-details-organization');
            const startDateEl = document.getElementById('trip-details-start-date');
            const endDateEl = document.getElementById('trip-details-end-date');
            
            if (itemElement.dataset.tripId) {
                const tripId = parseInt(itemElement.dataset.tripId, 10);
                const trip = state.trips.find(t => t.id === tripId);
                if (!trip) return;
                
                const organization = state.organizations.find(o => o.id === trip.organizationId);
                
                titleEl.textContent = `Командировка: ${trip.destination}`;
                subtitleEl.textContent = 'Информация о командировке';
                orgLabelEl.textContent = 'Заказчик';
                orgValueEl.textContent = organization ? organization.name : 'Не указана';
                startDateEl.textContent = new Date(trip.startDate).toLocaleDateString('ru-RU');
                endDateEl.textContent = new Date(trip.endDate).toLocaleDateString('ru-RU');

                modal.dataset.context = 'trip';
                modal.dataset.id = trip.id;

            } else if (itemElement.dataset.vacationId) {
                const vacationId = parseInt(itemElement.dataset.vacationId, 10);
                const employeeRow = itemElement.closest('.employee-row');
                const employeeId = parseInt(employeeRow.querySelector('.employee-name-full').dataset.employeeId, 10);
                const employee = state.employees.find(e => e.id === employeeId);
                const vacation = employee?.vacations.find(v => v.id === vacationId);
                if (!vacation || !employee) return;

                titleEl.textContent = 'Отпуск сотрудника';
                subtitleEl.textContent = 'Информация об отпуске';
                orgLabelEl.textContent = 'Сотрудник';
                orgValueEl.textContent = `${employee.lastName} ${employee.firstName}`;
                startDateEl.textContent = new Date(vacation.startDate).toLocaleDateString('ru-RU');
                endDateEl.textContent = new Date(vacation.endDate).toLocaleDateString('ru-RU');

                modal.dataset.context = 'vacation';
                modal.dataset.id = vacation.id;
                modal.dataset.employeeId = employee.id;
            }
            
            openModal('trip-actions-modal');
            return;
        }
    });
    
    // Обработчики для всплывающей подсказки
    scheduleBody.addEventListener('mouseover', (event) => {
        const itemElement = event.target.closest('.trip-item');
        if (!itemElement) return;

        if (itemElement.dataset.vacationId) {
            const employeeRow = itemElement.closest('.employee-row');
            const employeeId = parseInt(employeeRow.querySelector('.employee-name-full').dataset.employeeId, 10);
            const employee = state.employees.find(e => e.id === employeeId);
            const vacationId = parseInt(itemElement.dataset.vacationId, 10);
            const vacationData = employee.vacations.find(v => v.id === vacationId);

            if (vacationData) showVacationTooltip(vacationData, event);

        } else if (itemElement.dataset.tripId) {
            // ИСПРАВЛЕНИЕ: Берем данные для тултипа напрямую из DOM-элемента,
            // где они были сохранены в `calendar.js`.
            const tripDataForTooltip = itemElement.tripDataForTooltip;
            
            if (tripDataForTooltip) {
                showTooltip(tripDataForTooltip, event);
            }
        }
    });

    scheduleBody.addEventListener('mouseout', (event) => {
        if (event.target.closest('.trip-item')) {
            hideTooltip();
        }
    });

    scheduleBody.addEventListener('mousemove', (event) => {
        if (event.target.closest('.trip-item')) {
            updateTooltipPosition(event);
        }
    });
}
// ===================================================================
// File: public/js/trips/calendar.js (ВЕРСИЯ С ИНДИВИДУАЛЬНЫМИ КОМАНДИРОВКАМИ)
// ===================================================================

import { state } from './state.js';
import { utils } from './trip-helpers.js';

/**
 * Форматирует ФИО в формат "Фамилия И. О.".
 * @param {string} lastName - Фамилия.
 * @param {string} firstName - Имя.
 * @param {string} patronymic - Отчество (может быть пустым).
 * @returns {string} - Отформатированное ФИО.
 */
function formatNameToInitials(lastName, firstName, patronymic) {
    if (!lastName || !firstName) {
        return `${lastName || ''} ${firstName || ''}`.trim();
    }
    const firstNameInitial = firstName.charAt(0).toUpperCase();
    if (patronymic) {
        const patronymicInitial = patronymic.charAt(0).toUpperCase();
        return `${lastName} ${firstNameInitial}. ${patronymicInitial}.`;
    }
    return `${lastName} ${firstNameInitial}.`;
}

// --- ЭЛЕМЕНТЫ DOM ---
const currentMonthDiv = document.querySelector('.current-month');
const scheduleHeader = document.getElementById('schedule-header-grid');
const pickerYearEl = document.getElementById('picker-year');
const pickerMonthsGrid = document.getElementById('picker-months-grid');

/**
 * Рендерит шапку календаря с названием месяца и днями недели.
 */
function renderCalendarHeader() {
    const year = state.currentDate.getFullYear();
    const month = state.currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    const monthYearString = state.currentDate.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
    if(currentMonthDiv) currentMonthDiv.textContent = monthYearString;
    
    if(!scheduleHeader) return;

    scheduleHeader.innerHTML = '';
    const headerFragment = document.createDocumentFragment();

    const firstHeaderCell = document.createElement('div');
    firstHeaderCell.className = 'schedule-header-cell';
    firstHeaderCell.innerHTML = '<div>Сотрудник/Дата</div>';
    headerFragment.appendChild(firstHeaderCell);

    for (let i = 1; i <= daysInMonth; i++) {
        const dayDate = new Date(year, month, i);
        const dayName = dayDate.toLocaleString('ru-RU', { weekday: 'short' });
        const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
        const isToday = today.toDateString() === dayDate.toDateString();
        
        const dayCell = document.createElement('div');
        dayCell.className = 'schedule-header-cell';
        if (isWeekend) dayCell.classList.add('weekend');
        if (isToday) dayCell.classList.add('today');
        dayCell.innerHTML = `<div class="day-number">${i}</div><div class="day-name">${dayName}</div>`;
        headerFragment.appendChild(dayCell);
    }

    scheduleHeader.appendChild(headerFragment);
    scheduleHeader.style.gridTemplateColumns = `200px repeat(${daysInMonth}, minmax(35px, 1fr))`;
}

/**
 * Рендерит одну строку в календаре для одного сотрудника со всеми его командировками и отпусками.
 * @param {object} employee - Объект сотрудника.
 * @returns {HTMLElement} - Сгенерированный DOM-элемент строки.
 */
function renderEmployeeRow(employee) {
    const year = state.currentDate.getFullYear();
    const month = state.currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month, daysInMonth);
    const today = new Date();

    const row = document.createElement('div');
    row.className = 'employee-row';
    row.style.gridTemplateColumns = `200px repeat(${daysInMonth}, minmax(35px, 1fr))`;
    
    const nameCell = document.createElement('div');
    nameCell.className = 'employee-cell';

    const fullName = `${employee.lastName} ${employee.firstName} ${employee.patronymic || ''}`.trim();
    const formattedName = formatNameToInitials(employee.lastName, employee.firstName, employee.patronymic);

    const nameDiv = document.createElement('div');
    nameDiv.className = 'employee-name-full';
    nameDiv.setAttribute('data-employee-id', employee.id);
    nameDiv.setAttribute('data-full-name', fullName); 
    nameDiv.textContent = formattedName; 
    
    const positionDiv = document.createElement('div');
    positionDiv.className = 'employee-position';
    positionDiv.textContent = employee.position;
    
    nameCell.appendChild(nameDiv);
    nameCell.appendChild(positionDiv);
    row.appendChild(nameCell);
    
    for (let i = 1; i <= daysInMonth; i++) {
        const dayDate = new Date(year, month, i);
        const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
        const isToday = today.toDateString() === dayDate.toDateString();
        const dayCell = document.createElement('div');
        dayCell.className = 'day-cell';
        if (isWeekend) dayCell.classList.add('weekend');
        if (isToday) dayCell.classList.add('today');
        row.appendChild(dayCell);
    }
    
    // --- ОТРИСОВКА ОТПУСКОВ (логика не меняется) ---
    const employeeVacations = (employee.vacations || []).filter(vacation => {
        const vacStart = new Date(vacation.startDate);
        const vacEnd = new Date(vacation.endDate);
        return vacStart <= lastDayOfMonth && vacEnd >= firstDayOfMonth;
    });

    employeeVacations.forEach(vacation => {
        const startDate = new Date(vacation.startDate);
        const endDate = new Date(vacation.endDate);
        const visibleStart = Math.max(1, startDate.getMonth() === month ? startDate.getDate() : 1);
        const visibleEnd = Math.min(daysInMonth, endDate.getMonth() === month ? endDate.getDate() : daysInMonth);
        const duration = visibleEnd - visibleStart + 1;

        if (duration > 0) {
            const vacationItem = document.createElement('div');
            vacationItem.className = 'trip-item vacation-item';
            vacationItem.innerHTML = `<i class="fas fa-umbrella-beach"></i> Отпуск`;
            vacationItem.style.gridColumn = `${visibleStart + 1} / span ${duration}`;
            vacationItem.dataset.vacationId = vacation.id;

            const startsInThisMonth = startDate.getMonth() === month;
            const endsInThisMonth = endDate.getMonth() === month;
            if (!startsInThisMonth) vacationItem.classList.add('starts-before');
            if (!endsInThisMonth) vacationItem.classList.add('ends-after');
    
            const dynamicStatus = utils.getVacationDynamicStatus(vacation);
            vacationItem.classList.add(dynamicStatus.className);
            
            row.appendChild(vacationItem);
        }
    });

    // --- ОТРИСОВКА КОМАНДИРОВОК (логика адаптирована) ---
    // 1. Получаем все ИНДИВИДУАЛЬНЫЕ поездки этого сотрудника
    const employeeTrips = utils.getEmployeeTrips(employee.id).filter(trip => {
        const tripStart = new Date(trip.startDate);
        const tripEnd = new Date(trip.endDate);
        return tripStart <= lastDayOfMonth && tripEnd >= firstDayOfMonth;
    });
    
    // 2. Отрисовываем каждую индивидуальную поездку
    employeeTrips.forEach(trip => {
        // ИЗМЕНЕНИЕ: Теперь, чтобы отобразить всех участников в подсказке,
        // мы должны найти все поездки с таким же groupId.
        // Мы делаем это здесь, а не в `utils`, чтобы не засорять кэш.
        const allParticipants = trip.groupId 
            ? state.trips.filter(t => t.groupId === trip.groupId).map(t => t.employeeId)
            : [trip.employeeId];
        
        // Создаем "виртуальный" объект поездки, похожий на старый, для передачи в tooltip
        const virtualTripForTooltip = { ...trip, participants: allParticipants };

        const startDate = new Date(trip.startDate);
        const endDate = new Date(trip.endDate);
        const startsInThisMonth = startDate.getMonth() === month;
        const endsInThisMonth = endDate.getMonth() === month;
        const visibleStart = startsInThisMonth ? startDate.getDate() : 1;
        const visibleEnd = endsInThisMonth ? endDate.getDate() : daysInMonth;
        const duration = visibleEnd - visibleStart + 1;

        if (duration > 0) {
            const organization = state.organizations.find(o => o.id === trip.organizationId);
            const tripItem = document.createElement('div');
            tripItem.className = 'trip-item';

            if (!startsInThisMonth) tripItem.classList.add('starts-before');
            if (!endsInThisMonth) tripItem.classList.add('ends-after');

            let transportIconHtml = '';
            if (trip.transport) {
                const icons = { car: 'fa-car', train: 'fa-train', plane: 'fa-plane' };
                if (icons[trip.transport]) {
                    transportIconHtml = `<i class="fas ${icons[trip.transport]}"></i>`;
                }
            }
            
            tripItem.innerHTML = `<div class="trip-item__content">${transportIconHtml}<span>${trip.destination}</span></div>`;
            tripItem.style.backgroundColor = organization ? organization.color : '#3498db';
            tripItem.style.gridColumn = `${visibleStart + 1} / span ${duration}`;
            
            // КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: Сохраняем ID ИНДИВИДУАЛЬНОЙ поездки
            tripItem.dataset.tripId = trip.id; 
            // Сохраняем и groupId для возможного использования в будущем
            if (trip.groupId) {
                tripItem.dataset.groupId = trip.groupId;
            }
            
            // Передаем виртуальный объект в обработчик тултипа
            tripItem.tripDataForTooltip = virtualTripForTooltip;

            const dynamicStatus = utils.getTripDynamicStatus(trip);
            tripItem.classList.add(dynamicStatus.className);
            row.appendChild(tripItem);
        }
    });
    
    return row;
}

/**
 * Основная функция рендеринга всего календаря.
 */
export function renderCalendar() {
    renderCalendarHeader();
    
    const scheduleBody = document.getElementById('schedule-body-grid');
    if (!scheduleBody) return;

    const fragment = document.createDocumentFragment();

    if (state.employees.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.style.textAlign = 'center';
        emptyMessage.style.padding = '50px';
        emptyMessage.style.gridColumn = '1 / -1';
        emptyMessage.textContent = 'Нет сотрудников для отображения.';
        fragment.appendChild(emptyMessage);
    } else {
        state.employees.forEach(employee => {
            const row = renderEmployeeRow(employee);
            fragment.appendChild(row);
        });
    }

    scheduleBody.innerHTML = '';
    scheduleBody.appendChild(fragment);
}


/**
 * Обновляет одну конкретную строку сотрудника, не перерисовывая весь календарь.
 * @param {number} employeeId - ID сотрудника для обновления.
 */
export function updateEmployeeRow(employeeId) {
    const employee = state.employees.find(e => e.id === employeeId);
    if (!employee) return;

    const scheduleBody = document.getElementById('schedule-body-grid');
    if (!scheduleBody) return;

    const existingRow = scheduleBody.querySelector(`[data-employee-id="${employeeId}"]`)?.closest('.employee-row');
    const newRow = renderEmployeeRow(employee);
    
    if (existingRow) {
        existingRow.replaceWith(newRow);
    } else {
        scheduleBody.appendChild(newRow);
    }
}

/**
 * Отрисовывает содержимое выпадающего списка выбора месяца.
 * @param {number} year - Год для отображения.
 */
export function renderMonthPicker(year) {
    if(!pickerYearEl || !pickerMonthsGrid) return;

    pickerYearEl.textContent = year;
    pickerMonthsGrid.innerHTML = '';
    const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
    
    const currentYear = state.currentDate.getFullYear();
    const currentMonth = state.currentDate.getMonth();

    months.forEach((monthName, index) => {
        const monthEl = document.createElement('div');
        monthEl.className = 'picker-month';
        monthEl.textContent = monthName;
        monthEl.dataset.month = index;
        
        if (index === currentMonth && year === currentYear) {
            monthEl.classList.add('active');
        }
        
        pickerMonthsGrid.appendChild(monthEl);
    });
}
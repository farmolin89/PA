// ===================================================================
// Файл: public/js/trips/utils.js (ФИНАЛЬНАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ)
// Этот файл содержит вспомогательные функции, используемые на клиентской стороне
// ===================================================================

import { state } from './state.js';

export const utils = {
    /**
     * Возвращает все командировки для указанного сотрудника из локального состояния.
     * Использует кэширование для повышения производительности.
     * @param {number} employeeId - ID сотрудника.
     * @returns {Array<object>} - Массив объектов командировок.
     */
    getEmployeeTrips: function(employeeId) {
        if (!state._employeeTripsCache.has(employeeId)) {
            // ИСПРАВЛЕНО: Логика адаптирована под новую структуру данных.
            // Теперь мы фильтруем по прямому совпадению `employeeId`.
            const employeeTrips = state.trips.filter(trip => trip.employeeId === employeeId);
            state._employeeTripsCache.set(employeeId, employeeTrips);
        }
        return state._employeeTripsCache.get(employeeId);
    },
    
    /**
     * Находит текущую командировку сотрудника на основе текущей даты.
     * @param {number} employeeId - ID сотрудника.
     * @returns {object|undefined} - Объект текущей командировки или undefined.
     */
    getCurrentTrip: function(employeeId) {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return this.getEmployeeTrips(employeeId).find(trip => {
            const start = new Date(trip.startDate);
            const end = new Date(trip.endDate);
            start.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);
            return now >= start && now <= end;
        });
    },

    /**
     * Возвращает отсортированный по дате начала список будущих командировок сотрудника.
     * @param {number} employeeId - ID сотрудника.
     * @returns {Array<object>} - Массив будущих командировок.
     */
    getFutureTrips: function(employeeId) {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return this.getEmployeeTrips(employeeId)
            .filter(trip => {
                const start = new Date(trip.startDate);
                start.setHours(0, 0, 0, 0);
                return start > now;
            })
            .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    },
    
    /**
     * Находит текущий отпуск сотрудника на основе текущей даты.
     * @param {number} employeeId - ID сотрудника.
     * @returns {object|undefined} - Объект текущего отпуска или undefined.
     */
    getCurrentVacation: function(employeeId) {
        const employee = state.employees.find(e => e.id === employeeId);
        if (!employee || !employee.vacations) return undefined;

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        return employee.vacations.find(vacation => {
            const start = new Date(vacation.startDate);
            const end = new Date(vacation.endDate);
            start.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);
            return now >= start && now <= end;
        });
    },
    
    /**
     * Возвращает отсортированный по дате начала список будущих отпусков сотрудника.
     * @param {number} employeeId - ID сотрудника.
     * @returns {Array<object>} - Массив будущих отпусков.
     */
    getFutureVacations: function(employeeId) {
        const employee = state.employees.find(e => e.id === employeeId);
        if (!employee || !employee.vacations) return [];
        
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        return employee.vacations
            .filter(vacation => {
                const start = new Date(vacation.startDate);
                start.setHours(0, 0, 0, 0);
                return start > now;
            })
            .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    },

    /**
     * Проверяет, находится ли сотрудник в отпуске в указанный день, и возвращает данные отпуска.
     * @param {number} employeeId - ID сотрудника.
     * @param {Date} date - Дата для проверки.
     * @returns {object|undefined} - Объект отпуска или undefined.
     */
    getVacationOnDate: function(employeeId, date) {
        const employee = state.employees.find(e => e.id === employeeId);
        if (!employee || !employee.vacations) return undefined;

        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);

        return employee.vacations.find(vacation => {
            const startDate = new Date(vacation.startDate);
            const endDate = new Date(vacation.endDate);
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(0, 0, 0, 0);
            return checkDate >= startDate && checkDate <= endDate;
        });
    },

    /**
     * Определяет текущую активность сотрудника (командировка, отпуск или свободен).
     * @param {number} employeeId - ID сотрудника.
     * @returns {{type: string, data: object|null}} - Объект, описывающий текущую активность.
     */
    getCurrentActivity: function(employeeId) {
        const currentTrip = this.getCurrentTrip(employeeId);
        if (currentTrip) {
            return { type: 'trip', data: currentTrip };
        }

        const currentVacation = this.getCurrentVacation(employeeId);
        if (currentVacation) {
            return { type: 'vacation', data: currentVacation };
        }
        
        return { type: 'free', data: null };
    },

    /**
     * Находит следующее ближайшее событие (командировку или отпуск).
     * @param {number} employeeId - ID сотрудника.
     * @returns {{type: string, data: object}|null} - Объект, описывающий следующее событие, или null.
     */
    getUpcomingEvent: function(employeeId) {
        const futureTrips = this.getFutureTrips(employeeId);
        const futureVacations = this.getFutureVacations(employeeId);

        const nextTrip = futureTrips.length > 0 ? futureTrips[0] : null;
        const nextVacation = futureVacations.length > 0 ? futureVacations[0] : null;

        if (!nextTrip && !nextVacation) {
            return null;
        }
        if (nextTrip && !nextVacation) {
            return { type: 'trip', data: nextTrip };
        }
        if (!nextTrip && nextVacation) {
            return { type: 'vacation', data: nextVacation };
        }
        
        const tripDate = new Date(nextTrip.startDate);
        const vacationDate = new Date(nextVacation.startDate);

        if (tripDate <= vacationDate) {
            return { type: 'trip', data: nextTrip };
        } else {
            return { type: 'vacation', data: nextVacation };
        }
    },

    /**
     * Определяет динамический статус командировки (прошла, идет, будет) для UI календаря.
     * @param {object} trip - Объект командировки.
     * @returns {{text: string, className: string}}
     */
    getTripDynamicStatus: function(trip) {
        const now = new Date();
        const startDate = new Date(trip.startDate);
        const endDate = new Date(trip.endDate);
        now.setHours(0, 0, 0, 0);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);

        if (now < startDate) {
            return { text: 'Запланирована', className: 'status-pending' };
        } else if (now >= startDate && now <= endDate) {
            return { text: 'В работе', className: 'status-in-progress' };
        } else {
            return { text: 'Завершена', className: 'status-completed' };
        }
    },

    /**
     * Определяет динамический статус отпуска (прошел, идет, будет) для UI.
     * @param {object} vacation - Объект отпуска.
     * @returns {{text: string, className: string}}
     */
    getVacationDynamicStatus: function(vacation) {
        const now = new Date();
        const startDate = new Date(vacation.startDate);
        const endDate = new Date(vacation.endDate);
        now.setHours(0, 0, 0, 0);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);

        if (now < startDate) {
            return { text: 'Запланирован', className: 'status-pending' };
        } else if (now >= startDate && now <= endDate) {
            return { text: 'В отпуске', className: 'status-in-progress' };
        } else {
            return { text: 'Завершён', className: 'status-completed' };
        }
    },
    
    /**
     * Рассчитывает количество дней до окончания текущего события.
     * @param {string} endDateStr - Дата окончания в виде строки.
     * @returns {number|null} - Количество дней или null.
     */
    getDaysUntilEnd: function(endDateStr) {
        if (!endDateStr) return null;
        const endDate = new Date(endDateStr);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);

        const diffTime = endDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        
        return diffDays >= 0 ? diffDays : null;
    },

    /**
     * Рассчитывает количество дней до начала будущего события.
     * @param {string} startDateStr - Дата начала в виде строки.
     * @returns {number|null} - Количество дней или null.
     */
    getDaysUntilStart: function(startDateStr) {
        if (!startDateStr) return null;
        const startDate = new Date(startDateStr);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        startDate.setHours(0, 0, 0, 0);

        const diffTime = startDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        
        return diffDays > 0 ? diffDays : null;
    },

    /**
     * Блокирует или разблокирует поля формы.
     * @param {boolean} disabled - `true` для блокировки, `false` для разблокировки.
     */
    setTripFormDisabledState: function(disabled) {
        document.getElementById('employees-container').classList.toggle('disabled', disabled);
    },

    /**
     * Форматирует диапазон дат для отображения в списках.
     * @param {string} startDate - Дата начала.
     * @param {string} endDate - Дата окончания.
     * @returns {{month: string, days: string, year: number}}
     */
    formatTripDateForList(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const months = ['ЯНВ.', 'ФЕВ.', 'МАР.', 'АПР.', 'МАЯ', 'ИЮНЯ', 'ИЮЛЯ', 'АВГ.', 'СЕН.', 'ОКТ.', 'НОЯ.', 'ДЕК.'];
        
        if (start.getMonth() === end.getMonth()) {
            return {
                month: months[start.getMonth()],
                days: `${start.getDate()}-${end.getDate()}`,
                year: start.getFullYear()
            };
        } else {
            return {
                month: `${months[start.getMonth()]} - ${months[end.getMonth()]}`,
                days: `${start.getDate()} - ${end.getDate()}`,
                year: start.getFullYear()
            };
        }
    },

    /**
     * Определяет статус командировки для модальных окон со списками.
     * @param {object} trip - Объект командировки.
     * @returns {{key: string, text: string}}
     */
    getTripStatusForList(trip) {
        const now = new Date();
        const start = new Date(trip.startDate);
        const end = new Date(trip.endDate);
        now.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        if (end < now) return { key: 'completed', text: 'Завершена' };
        if (now >= start && now <= end) return { key: 'current', text: 'Текущая' };
        return { key: 'upcoming', text: 'Предстоящая' };
    },

    /**
     * Возвращает правильное склонение слова в зависимости от числа.
     * @param {number} value - Число.
     * @param {string} unitSingular - Ед. число (1 день).
     * @param {string} unitPlural24 - Мн. число для 2-4 (2 дня).
     * @param {string} unitPlural50 - Мн. число для 5-0 (5 дней).
     * @returns {string}
     */
    getPluralizedUnit(value, unitSingular, unitPlural24, unitPlural50) {
        const v = Math.floor(value);
        const lastDigit = v % 10;
        const lastTwoDigits = v % 100;
        if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return unitPlural50;
        if (lastDigit === 1) return unitSingular;
        if (lastDigit >= 2 && lastDigit <= 4) return unitPlural24;
        return unitPlural50;
    },
};
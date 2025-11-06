// ===================================================================
// Файл: public/js/trips/state.js (ВЕРСИЯ С ИНДИВИДУАЛЬНЫМИ КОМАНДИРОВКАМИ)
// ===================================================================

// --- СОСТОЯНИЕ ПРИЛОЖЕНИЯ ---
export const state = {
    currentDate: new Date(),
    employees: [],
    organizations: [],
    
    // ИЗМЕНЕНИЕ: Теперь trips - это плоский массив индивидуальных поездок.
    // Каждая поездка имеет employeeId и groupId.
    trips: [], 
    
    currentProfile: {
        employeeId: null,
    },

    _employeeTripsCache: new Map(),

    selectedEmployees: [], // Это состояние по-прежнему нужно для формы создания

    empManagement: {
        searchQuery: '',
    },
    orgManagement: {
        searchQuery: '',
    },
};

// --- ФУНКЦИИ-МУТАЦИИ ДЛЯ ИЗМЕНЕНИЯ СОСТОЯНИЯ ---
export const mutations = {
    invalidateEmployeeCache(employeeIds) {
        if (Array.isArray(employeeIds)) {
            employeeIds.forEach(id => state._employeeTripsCache.delete(id));
        } else if (employeeIds) {
            state._employeeTripsCache.delete(employeeIds);
        }
    },

    invalidateAllCaches() {
        state._employeeTripsCache.clear();
    },

    setEmployees(employees) {
        state.employees = employees.sort((a, b) => a.lastName.localeCompare(b.lastName));
        this.invalidateAllCaches();
    },
    setOrganizations(organizations) {
        state.organizations = organizations.sort((a, b) => a.name.localeCompare(b.name));
    },
    setTrips(trips) {
        // ИЗМЕНЕНИЕ: Преобразование больше не нужно, API возвращает чистый массив.
        state.trips = trips;
        this.invalidateAllCaches();
    },

    addEmployee(employeeData) {
        state.employees.push(employeeData);
        state.employees.sort((a, b) => a.lastName.localeCompare(b.lastName));
    },
    
    updateEmployee(updatedEmployeeData) {
        const index = state.employees.findIndex(emp => emp.id === updatedEmployeeData.id);
        if (index !== -1) {
            const existingVacations = state.employees[index].vacations;
            state.employees[index] = { ...updatedEmployeeData, vacations: existingVacations };
            state.employees.sort((a, b) => a.lastName.localeCompare(b.lastName));
            this.invalidateEmployeeCache(updatedEmployeeData.id);
        }
    },

    removeEmployee(employeeId) {
        state.employees = state.employees.filter(emp => emp.id !== employeeId);
        this.invalidateEmployeeCache(employeeId);
    },

    addOrganization(orgData) {
        state.organizations.push(orgData);
        state.organizations.sort((a,b) => a.name.localeCompare(b.name));
    },

    removeOrganization(orgId) {
        state.organizations = state.organizations.filter(org => org.id !== orgId);
    },
    
    // ИЗМЕНЕНИЕ: Функция теперь принимает МАССИВ командировок (по одной для каждого участника).
    addTrip(addedTrips) {
        state.trips.push(...addedTrips);
        // Инвалидируем кэш для всех затронутых сотрудников
        const affectedEmployees = [...new Set(addedTrips.map(t => t.employeeId))];
        this.invalidateEmployeeCache(affectedEmployees);
    },
    
    // ИЗМЕНЕНИЕ: Функция обновляет одну конкретную командировку.
    updateTrip(updatedTripData) {
        const index = state.trips.findIndex(trip => trip.id === updatedTripData.id);
        if (index !== -1) {
            // Инвалидируем кэш для сотрудника, чья поездка была изменена.
            this.invalidateEmployeeCache(updatedTripData.employeeId);
            state.trips[index] = updatedTripData;
        }
    },

    // ИЗМЕНЕНИЕ: Функция удаляет одну конкретную командировку.
    removeTrip(tripId) {
        const tripIndex = state.trips.findIndex(trip => trip.id === tripId);
        if (tripIndex !== -1) {
            const removedTrip = state.trips[tripIndex];
            state.trips.splice(tripIndex, 1);
            // Инвалидируем кэш для сотрудника, чья поездка была удалена.
            this.invalidateEmployeeCache(removedTrip.employeeId);
        }
    },
    
    setEmployeeVacations(employeeId, vacations) {
        const employee = state.employees.find(e => e.id === employeeId);
        if (employee) {
            employee.vacations = vacations || [];
        }
    }
};
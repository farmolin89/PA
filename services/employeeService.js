// ===================================================================
// File: services/employeeService.js (ФИНАЛЬНАЯ ВЕРСИЯ С РЕАЛИЗОВАННЫМИ АЧИВКАМИ)
// ===================================================================
const { knex } = require('../config/database');
const { BADGES, REGIONS } = require('./employeeConstants');

// --- БЛОК КЭШИРОВАНИЯ ---
let globalRecordsCache = { data: null, timestamp: 0 };
const CACHE_DURATION_MS = 10 * 60 * 1000;

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---
const getRegion = (destination) => REGIONS[destination.toLowerCase().split(',')[0].trim()] || 'Другой';
const getPluralizedUnit = (value, unitSingular, unitPlural24, unitPlural50) => { const v = Math.floor(value); const lastDigit = v % 10; const lastTwoDigits = v % 100; if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return unitPlural50; if (lastDigit === 1) return unitSingular; if (lastDigit >= 2 && lastDigit <= 4) return unitPlural24; return unitPlural50; };
const getTotalDays = (trips) => { const now = new Date(); const msInDay = 1000 * 60 * 60 * 24; return trips.reduce((sum, trip) => { const start = new Date(trip.startDate); const end = new Date(trip.endDate); const utcStart = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate()); const utcEnd = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()); const utcNow = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()); if (utcEnd < utcNow) return sum + Math.floor((utcEnd - utcStart) / msInDay) + 1; if (utcStart <= utcNow && utcEnd >= utcNow) return sum + Math.floor((utcNow - utcStart) / msInDay) + 1; return sum; }, 0); };
const calculateLevel = (totalDays) => { if (typeof totalDays !== 'number' || isNaN(totalDays) || totalDays < 0) { totalDays = 0; } const levels = [ { min: 0, max: 44, name: 'Стажер полевых измерений' }, { min: 45, max: 88, name: 'Специалист выездной поверки' }, { min: 89, max: 132, name: 'Опытный полевик' }, { min: 133, max: 176, name: 'Мастер полевой поверки' }, { min: 177, max: Infinity, name: 'Ветеран командировок' } ]; for (let i = 0; i < levels.length; i++) { if (totalDays >= levels[i].min && totalDays <= levels[i].max) { const isMaxLevel = i === levels.length - 1; const progress = totalDays - levels[i].min + (levels[i].min > 0 ? 1 : totalDays > 0 ? 1: 0); const max = isMaxLevel ? 9999 : levels[i].max - levels[i].min + 1; return { level: i + 1, name: levels[i].name, progress, max, totalDays }; } } return { level: 1, name: 'Стажер полевых измерений', progress: 0, max: 44, totalDays: 0 }; };
const calculateTenure = (hireDateStr) => { if (!hireDateStr) return { value: 'Н/Д', unit: '' }; const diffDays = Math.ceil((new Date() - new Date(hireDateStr)) / (1000 * 60 * 60 * 24)); if (diffDays >= 365) { const years = (diffDays / 365.25); return { value: years.toFixed(1), unit: getPluralizedUnit(years, 'год', 'года', 'лет') }; } if (diffDays >= 30) { const months = Math.floor(diffDays / 30.44); return { value: months, unit: getPluralizedUnit(months, 'месяц', 'месяца', 'месяцев') }; } return { value: diffDays, unit: getPluralizedUnit(diffDays, 'день', 'дня', 'дней') }; };

// --- Базовые CRUD-операции ---
const normalizeNamePart = (value) => {
    if (value === undefined || value === null) {
        return null;
    }
    if (typeof value !== 'string') {
        return value;
    }
    return value.trim();
};

const getAll = () => knex('employees').orderBy(['lastName', 'firstName']);
const findById = (id) => knex('employees').where({ id }).first();
const findByFio = (lastName, firstName, patronymic) => {
    return knex('employees')
        .where({
            lastName: normalizeNamePart(lastName),
            firstName: normalizeNamePart(firstName),
            patronymic: normalizeNamePart(patronymic)
        })
        .first();
};
const findDuplicateByFio = (id, lastName, firstName, patronymic) => {
    return knex('employees')
        .where({
            lastName: normalizeNamePart(lastName),
            firstName: normalizeNamePart(firstName),
            patronymic: normalizeNamePart(patronymic)
        })
        .whereNot({ id })
        .first();
};
const create = async (employeeData) => {
    const dataToInsert = {
        ...employeeData,
        lastName: normalizeNamePart(employeeData.lastName),
        firstName: normalizeNamePart(employeeData.firstName),
        patronymic: normalizeNamePart(employeeData.patronymic)
    };

    const insertResult = await knex('employees').insert(dataToInsert);
    const inserted = Array.isArray(insertResult) ? insertResult[0] : insertResult;
    const newId = typeof inserted === 'object' ? inserted?.id : inserted;

    if (newId === undefined || newId === null) {
        return findByFio(dataToInsert.lastName, dataToInsert.firstName, dataToInsert.patronymic);
    }

    return findById(newId);
};
const update = async (id, employeeData) => {
    const dataToUpdate = {
        ...employeeData,
        lastName: normalizeNamePart(employeeData.lastName),
        firstName: normalizeNamePart(employeeData.firstName),
        patronymic: normalizeNamePart(employeeData.patronymic)
    };

    const updatedRows = await knex('employees').where({ id }).update(dataToUpdate);
    if (updatedRows === 0) {
        return null;
    }
    return findById(id);
};
const deleteById = (id) => knex('employees').where({ id }).del();


// ===================================================================
// +++ НАЧАЛО БЛОКА ИСПРАВЛЕНИЙ: РЕАЛИЗАЦИЯ ЛОГИКИ АЧИВОК +++
// ===================================================================

/**
 * Рассчитывает все метрики для сотрудника и проверяет его достижения.
 */
const checkEmployeeBadges = (employeeId, allTripsForEmployee, globalRecords) => {
    const now = new Date();
    const msInDay = 1000 * 60 * 60 * 24;
    
    // 1. Фильтруем только завершенные командировки для большинства расчетов
    const completedTrips = allTripsForEmployee.filter(t => new Date(t.endDate) < now);

    if (completedTrips.length === 0) {
        // Если нет завершенных командировок, ачивок быть не может.
        // Возвращаем все бейджи с нулевым прогрессом.
        const emptyMetrics = { regions: new Set(), completedTrips: 0, totalDaysCompleted: 0, maxDuration: 0, uniqueDestinations: 0, maxTripsToSingleOrg: 0, maxStreak: 0, maxTripsInMonth: 0, uniqueTripMonths: 0, isMonthlyRecord: false, isYearlyDaysRecord: false };
        return BADGES.map(badge => ({
            ...badge,
            ...badge.check(emptyMetrics)
        }));
    }

    // 2. Сортируем для расчета серий
    completedTrips.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    // 3. Рассчитываем метрики
    const metrics = {
        completedTrips: completedTrips.length,
        totalDaysCompleted: 0,
        maxDuration: 0,
        uniqueDestinations: new Set(),
        regions: new Set(),
        tripsByOrg: {},
        maxStreak: 0,
        tripsByMonth: {},
        uniqueTripMonths: new Set(),
        // Рекорды пока не трогаем для простоты
        isMonthlyRecord: false, 
        isYearlyDaysRecord: false,
    };
    
    let currentStreak = 0;
    for (let i = 0; i < completedTrips.length; i++) {
        const trip = completedTrips[i];
        const start = new Date(trip.startDate);
        const end = new Date(trip.endDate);
        const duration = Math.floor((end - start) / msInDay) + 1;

        metrics.totalDaysCompleted += duration;
        if (duration > metrics.maxDuration) metrics.maxDuration = duration;
        
        metrics.uniqueDestinations.add(trip.destination);
        metrics.regions.add(getRegion(trip.destination));
        
        metrics.tripsByOrg[trip.organizationId] = (metrics.tripsByOrg[trip.organizationId] || 0) + 1;
        
        const monthKey = `${start.getFullYear()}-${start.getMonth()}`;
        metrics.tripsByMonth[monthKey] = (metrics.tripsByMonth[monthKey] || 0) + 1;
        metrics.uniqueTripMonths.add(monthKey);

        // Расчет серий
        if (i > 0) {
            const prevTripEnd = new Date(completedTrips[i - 1].endDate);
            const gap = Math.floor((start - prevTripEnd) / msInDay);
            if (gap < 3) {
                currentStreak++;
            } else {
                currentStreak = 1;
            }
        } else {
            currentStreak = 1;
        }
        if (currentStreak > metrics.maxStreak) metrics.maxStreak = currentStreak;
    }

    metrics.uniqueDestinations = metrics.uniqueDestinations.size;
    metrics.maxTripsToSingleOrg = Object.keys(metrics.tripsByOrg).length > 0 ? Math.max(...Object.values(metrics.tripsByOrg)) : 0;
    metrics.maxTripsInMonth = Object.keys(metrics.tripsByMonth).length > 0 ? Math.max(...Object.values(metrics.tripsByMonth)) : 0;
    metrics.uniqueTripMonths = metrics.uniqueTripMonths.size;

    // 4. Проверяем каждый бейдж на основе собранных метрик
    const processedBadges = BADGES.map(badge => {
        const checkResult = badge.check(metrics);
        return {
            ...badge, // id, name, icon, description
            isEarned: checkResult.isEarned,
            progress: checkResult.progress,
            goal: checkResult.goal
        };
    });

    return processedBadges;
};

// ===================================================================
// --- КОНЕЦ БЛОКА ИСПРАВЛЕНИЙ ---
// ===================================================================


// --- Основные функции сервиса (без изменений, так как они не были частью проблемы) ---
const getFullEmployeeProfile = async (employeeId) => {
    const employee = await findById(employeeId);
    if (!employee) return null;
    const allTrips = await knex('trips as t').select('t.*', knex.raw(`(SELECT GROUP_CONCAT(t2.employeeId) FROM trips AS t2 WHERE t2.groupId = t.groupId) as participants`));
    const allTripsProcessed = allTrips.map(trip => ({ ...trip, participants: trip.participants ? trip.participants.split(',').map(Number) : [trip.employeeId] }));
    const allEmployees = await knex('employees').select('id');
    const employeeScores = allEmployees.map(emp => ({ id: emp.id, totalDays: getTotalDays(allTripsProcessed.filter(t => t.employeeId === emp.id)) }));
    employeeScores.sort((a, b) => b.totalDays - a.totalDays);
    const rank = employeeScores.findIndex(score => score.id === employeeId) + 1;
    const employeeTrips = allTripsProcessed.filter(t => t.employeeId === employee.id);
    const globalRecords = {}; // Пока оставляем пустым
    const totalDays = getTotalDays(employeeTrips);
    const tenure = calculateTenure(employee.hireDate);
    const levelInfo = calculateLevel(totalDays);
    
    // Вот здесь вызывается наша новая, исправленная функция
    const badges = checkEmployeeBadges(employee.id, employeeTrips, globalRecords);
    
    const vacations = await knex('vacations').where({ employeeId });
    return { ...employee, rank, tenure, levelInfo, badges, vacations, stats: { totalTrips: employeeTrips.length, totalDays } };
};

const getTripsForEmployee = async (employeeId) => { const rows = await knex('trips as t').select('t.id', 't.destination', 't.startDate', 't.endDate', 't.status', 't.groupId', 't.transport', 't.organizationId', 'o.name as organizationName', knex.raw(`(SELECT GROUP_CONCAT(t2.employeeId) FROM trips AS t2 WHERE t2.groupId = t.groupId) as participants`)).leftJoin('organizations as o', 't.organizationId', 'o.id').where('t.employeeId', employeeId).orderBy('t.startDate', 'desc'); return rows.map(trip => ({ ...trip, participants: trip.participants ? trip.participants.split(',').map(Number) : [employeeId] }));};
const invalidateGlobalRecordsCache = () => { globalRecordsCache = { data: null, timestamp: 0 }; console.log('[Cache] Кэш глобальных рекордов был принудительно очищен.'); };


// --- ЭКСПОРТ ВСЕХ МЕТОДОВ СЕРВИСА ---
module.exports = {
    getAll, findById, findByFio, findDuplicateByFio, create, update, deleteById,
    getFullEmployeeProfile, getTripsForEmployee, invalidateGlobalRecordsCache,
    calculateLevel, calculateTenure, getPluralizedUnit, getRegion, getTotalDays
};

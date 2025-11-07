// ===================================================================
// Файл: services/geographyStatsService.js (ФИНАЛЬНАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ)
// ===================================================================
const { knex } = require('../config/database');

exports.calculateGeographyStats = async (year, employeeId) => {
    const yearParam = [year];

    // --- 1. Запрос для получения 50 самых популярных городов ---
    const topCitiesQuery = knex('trips')
        .select('destination as city')
        .count('id as visits') // Считаем по ID из таблицы trips
        .whereRaw("strftime('%Y', startDate) = ?", yearParam)
        .groupBy('destination')
        .orderBy('visits', 'desc')
        .limit(50);

    // --- 2. Запрос для получения общего количества поездок ---
    const totalTripsQuery = knex('trips')
        .whereRaw("strftime('%Y', startDate) = ?", yearParam)
        .count('id as totalTrips') // Считаем по ID из таблицы trips
        .first();

    // --- ЕСЛИ ПЕРЕДАН ID СОТРУДНИКА, МОДИФИЦИРУЕМ ЗАПРОСЫ ---
    if (employeeId) {
        // ИСПРАВЛЕНО: Убран join, добавлено прямое условие where
        topCitiesQuery.where('employeeId', employeeId);
        totalTripsQuery.where('employeeId', employeeId);
    }
    
    // Выполняем оба запроса параллельно
    const [topCities, totalTripsData] = await Promise.all([
        topCitiesQuery,
        totalTripsQuery
    ]);

    // Возвращаем структурированный объект
    return {
        year,
        topCities: topCities || [],
        totalTrips: totalTripsData ? totalTripsData.totalTrips : 0
    };
};
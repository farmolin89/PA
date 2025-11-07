// ===================================================================
// File: services/statsService.js (ФИНАЛЬНАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ)
// ===================================================================
const { knex } = require('../config/database');

// Вспомогательная функция для форматирования ФИО
const formatName = (emp) => {
    if (!emp) return '';
    return `${emp.lastName} ${emp.firstName[0]}. ${emp.patronymic ? emp.patronymic[0] + '.' : ''}`.trim();
};

exports.calculateGlobalStats = async (year) => {
    // Получаем сегодняшнюю дату для корректного расчета дней
    const today = new Date().toISOString().split('T')[0];

    // --- БЛОК 1: ОСНОВНЫЕ ПОКАЗАТЕЛИ ---
    const summaryPromises = {
        totalTrips: knex('trips').whereRaw("strftime('%Y', startDate) = ?", [year]).count('id as count').first(),
        totalCities: knex('trips').whereRaw("strftime('%Y', startDate) = ?", [year]).countDistinct('destination as count').first(),
        
        // ========================================================
        // --- НАЧАЛО БЛОКА ИСПРАВЛЕНИЙ ---
        // ========================================================
        
        // СТАРЫЙ ПОКАЗАТЕЛЬ: Переименовываем для ясности. Считает уникальных сотрудников за весь год.
        uniqueEmployeesForYear: knex('trips').whereRaw("strftime('%Y', startDate) = ?", [year]).countDistinct('employeeId as count').first(),
        
        // НОВЫЙ ПОКАЗАТЕЛЬ: Считает уникальных сотрудников, которые в командировке ПРЯМО СЕЙЧАС.
        activeEmployeesNow: knex('trips')
            .where('startDate', '<=', today)
            .andWhere('endDate', '>=', today)
            .countDistinct('employeeId as count')
            .first(),

        // ========================================================
        // --- КОНЕЦ БЛОКА ИСПРАВЛЕНИЙ ---
        // ========================================================

        avgDuration: knex('trips').whereRaw("strftime('%Y', startDate) = ?", [year]).avg({ avg: knex.raw('JULIANDAY(endDate) - JULIANDAY(startDate) + 1') }).first(),
    };

    // --- БЛОК 2: РЕЙТИНГ (С ИСПРАВЛЕННЫМ ПОДСЧЕТОМ ДНЕЙ) ---
    const rankingQuery = knex('employees as e')
        .join('trips as t', 'e.id', 't.employeeId')
        .whereRaw("strftime('%Y', t.startDate) = ?", [year])
        .groupBy('e.id')
        .select('e.id', 'e.lastName', 'e.firstName', 'e.patronymic')
        .count('t.id as totalTrips')
        .countDistinct('t.destination as totalCities')
        .sum({
            totalDays: knex.raw(`
                CASE
                    WHEN t.startDate <= ? THEN CAST(JULIANDAY(MIN(t.endDate, ?)) - JULIANDAY(t.startDate) + 1 AS INTEGER)
                    ELSE 0
                END
            `, [today, today])
        })
        .orderBy('totalDays', 'desc')
        .limit(10);

    // --- БЛОК 3: РЕКОРДЫ ---
    
    const buildDurationRecordQuery = async (aggFunction, valueAlias) => {
        const subqueryResult = await knex('trips')
            .whereRaw("strftime('%Y', startDate) = ?", [year])
            .select(knex.raw(`${aggFunction}(JULIANDAY(endDate) - JULIANDAY(startDate) + 1) as val`))
            .first();

        const targetValue = subqueryResult?.val;
        if (!targetValue) return [];

        return knex('trips as t')
            .join('employees as e', 't.employeeId', 'e.id')
            .whereRaw("strftime('%Y', t.startDate) = ?", [year])
            .select('t.destination', 'e.lastName', 'e.firstName', 'e.patronymic')
            .select({ [valueAlias]: knex.raw('JULIANDAY(t.endDate) - JULIANDAY(t.startDate) + 1') })
            .groupBy('t.id')
            .having(knex.raw('JULIANDAY(t.endDate) - JULIANDAY(t.startDate) + 1'), '=', targetValue);
    };

    const buildCountRecordQuery = async (countColumn, valueAlias, groupByFields) => {
        const subqueryResult = await knex('trips as t')
            .whereRaw("strftime('%Y', startDate) = ?", [year])
            .groupBy(...groupByFields)
            .countDistinct({ c: countColumn })
            .orderBy('c', 'desc')
            .first();

        const targetValue = subqueryResult?.c;
        if (!targetValue) return [];

        return knex('trips as t')
            .join('employees as e', 't.employeeId', 'e.id')
            .whereRaw("strftime('%Y', t.startDate) = ?", [year])
            .groupBy(...groupByFields)
            .select('e.lastName', 'e.firstName', 'e.patronymic')
            .countDistinct({ [valueAlias]: countColumn })
            .having(valueAlias, '=', targetValue);
    };

    const recordPromises = {
        longestTrip: buildDurationRecordQuery('max', 'duration'),
        shortestTrip: buildDurationRecordQuery('min', 'duration'),
        mostTrips: buildCountRecordQuery('t.id', 'tripCount', ['t.employeeId']),
        mostCities: buildCountRecordQuery('t.destination', 'cityCount', ['t.employeeId']),
        monthlySprinter: (async () => {
            const subqueryResult = await knex('trips as t_inner').whereRaw("strftime('%Y', t_inner.startDate) = ?", [year]).groupBy('t_inner.employeeId', knex.raw("strftime('%Y-%m', t_inner.startDate)")).count('t_inner.id as c').orderBy('c', 'desc').first();
            const targetValue = subqueryResult?.c;
            if (!targetValue) return [];
            return knex('trips as t').join('employees as e', 't.employeeId', 'e.id').whereRaw("strftime('%Y', t.startDate) = ?", [year]).groupBy('t.employeeId', knex.raw("strftime('%Y-%m', t.startDate)")).select('e.lastName', 'e.firstName', 'e.patronymic', knex.raw("strftime('%m', t.startDate) as month")).count('t.id as monthlyCount').having('monthlyCount', '=', targetValue);
        })(),
        keyPartner: (async () => {
            const subqueryResult = await knex('trips as t_inner').whereRaw("strftime('%Y', t_inner.startDate) = ?", [year]).groupBy('t_inner.employeeId', 't_inner.organizationId').count('t_inner.id as c').orderBy('c', 'desc').first();
            const targetValue = subqueryResult?.c;
            if (!targetValue) return [];
            return knex('trips as t').join('employees as e', 't.employeeId', 'e.id').join('organizations as o', 't.organizationId', 'o.id').whereRaw("strftime('%Y', t.startDate) = ?", [year]).groupBy('t.employeeId', 't.organizationId').select('e.lastName', 'e.firstName', 'e.patronymic', 'o.name as organizationName').count('t.id as orgTripCount').having('orgTripCount', '=', targetValue);
        })(),
        transportChampions: (async () => {
            const results = {};
            for (const transport of ['plane', 'train', 'car']) {
                const subqueryResult = await knex('trips as t_inner').where({ transport }).whereRaw("strftime('%Y', t_inner.startDate) = ?", [year]).groupBy('t_inner.employeeId').count('t_inner.id as c').orderBy('c', 'desc').first();
                const targetValue = subqueryResult?.c;
                if (targetValue) {
                    results[transport] = await knex('trips as t').join('employees as e', 't.employeeId', 'e.id').where({ transport }).whereRaw("strftime('%Y', t.startDate) = ?", [year]).groupBy('t.employeeId').select('e.lastName', 'e.firstName', 'e.patronymic').count('t.id as count').having('count', '=', targetValue);
                } else {
                    results[transport] = [];
                }
            }
            return results;
        })()
    };

    // --- ОБЪЕДИНЕНИЕ РЕЗУЛЬТАТОВ ---
    const [summaryResults, ranking, transportRows, monthlyRows] = await Promise.all([
        Promise.all(Object.values(summaryPromises)),
        rankingQuery,
        knex('trips').select('transport').count('id as count').whereRaw("strftime('%Y', startDate) = ?", [year]).whereNotNull('transport').groupBy('transport'),
        knex('trips').select(knex.raw("strftime('%m', startDate) as month")).count('id as count').whereRaw("strftime('%Y', startDate) = ?", [year]).groupBy('month')
    ]);

    const recordResults = await Promise.all(Object.values(recordPromises));
    
    const [summaryTrips, summaryCities, summaryUniqueEmployees, summaryActiveEmployees, summaryDuration] = summaryResults;
    const [longestTrip, shortestTrip, mostTrips, mostCities, monthlySprinter, keyPartner, transportChampions] = recordResults;
    
    // --- ПОДГОТОВКА ДАННЫХ ДЛЯ ОТВЕТА ---
    const transport = {
        plane: transportRows.find(r => r.transport === 'plane')?.count || 0,
        train: transportRows.find(r => r.transport === 'train')?.count || 0,
        car: transportRows.find(r => r.transport === 'car')?.count || 0,
    };
    
    const monthly = Array(12).fill(0);
    monthlyRows.forEach(row => { monthly[parseInt(row.month, 10) - 1] = row.count; });

    const formatRecord = (results, valueKey) => {
        if (!results || results.length === 0) return null;
        return {
            value: results[0][valueKey],
            winners: results.map(r => ({ ...r, employeeName: formatName(r) }))
        };
    };
    
    const formatTransportChampions = (results) => {
        if (!results || results.length === 0) return null;
        return {
            value: results[0].count,
            winners: results.map(r => ({ employeeName: formatName(r) }))
        };
    };

    return {
        year,
        summary: {
            totalTrips: summaryTrips.count || 0,
            totalCities: summaryCities.count || 0,
            totalEmployees: summaryActiveEmployees.count || 0,
            uniqueEmployeesForYear: summaryUniqueEmployees.count || 0,
            avgDuration: (summaryDuration.avg || 0).toFixed(1),
        },
        ranking: ranking.map((emp, index) => ({ position: index + 1, name: formatName(emp), ...emp })),
        transport,
        monthly,
        records: {
            longestTrip: formatRecord(longestTrip, 'duration'),
            shortestTrip: formatRecord(shortestTrip, 'duration'),
            mostTrips: formatRecord(mostTrips, 'tripCount'),
            mostCities: formatRecord(mostCities, 'cityCount'),
            monthlySprinter: formatRecord(monthlySprinter, 'monthlyCount'),
            keyPartner: formatRecord(keyPartner, 'orgTripCount'),
            transportChampions: {
                plane: formatTransportChampions(transportChampions.plane),
                train: formatTransportChampions(transportChampions.train),
                car: formatTransportChampions(transportChampions.car),
            }
        }
    };
};
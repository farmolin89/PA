// ===================================================================
// Файл: services/tripService.js (ИСПРАВЛЕННАЯ ВЕРСИЯ ПОД АКТУАЛЬНУЮ СХЕМУ)
// ===================================================================
const { knex } = require('../config/database');

/**
 * Проверяет, занят ли кто-либо из указанных сотрудников в заданный период времени.
 * @param {number[]} participants - Массив ID сотрудников.
 * @param {string} startDate - Дата начала.
 * @param {string} endDate - Дата окончания.
 * @param {object} options - Опции для исключения записей.
 * @returns {Promise<object|null>} - Объект с данными сотрудника в случае конфликта, иначе null.
 */
const findConflictingEmployee = async (participants, startDate, endDate, options = {}) => {
    const { excludeTripId = null, excludeVacationId = null, db = knex } = options;

    // --- ИСПРАВЛЕНО: Запрос теперь ищет конфликты в правильных таблицах ---
    const tripQuery = db('trips as t')
        .join('trip_participants as tp', 't.id', 'tp.tripId') // Соединяем с участниками
        .join('employees as e', 'tp.employeeId', 'e.id')     // Соединяем с сотрудниками
        .whereIn('tp.employeeId', participants)
        .where(function() {
            this.where('t.startDate', '<=', endDate)
                .andWhere('t.endDate', '>=', startDate);
        })
        .select('e.lastName', 'e.firstName')
        .first();

    if (excludeTripId) {
        tripQuery.whereNot('t.id', excludeTripId);
    }
    
    const conflictingTripEmployee = await tripQuery;
    if (conflictingTripEmployee) {
        return conflictingTripEmployee;
    }

    const vacationQuery = db('vacations as v')
        .join('employees as e', 'v.employeeId', 'e.id')
        .whereIn('v.employeeId', participants)
        .where(function() {
            this.where('v.startDate', '<=', endDate)
                .andWhere('v.endDate', '>=', startDate);
        })
        .select('e.lastName', 'e.firstName')
        .first();
    
    if (excludeVacationId) {
        vacationQuery.whereNot('v.id', excludeVacationId);
    }
        
    const conflictingVacationEmployee = await vacationQuery;
    if (conflictingVacationEmployee) {
        return conflictingVacationEmployee;
    }

    return null;
};

/**
 * Получает все командировки с агрегацией участников.
 * @param {object} filters - Объект с фильтрами, например { year }.
 * @returns {Promise<Array<object>>}
 */
const getAll = async (filters = {}) => {
    const { year } = filters;
    
    // --- ИСПРАВЛЕНО: Запрос получает участников из таблицы 'trip_participants' ---
    const query = knex('trips as t')
        .select(
            't.*',
            knex.raw(`(SELECT GROUP_CONCAT(tp.employeeId) FROM trip_participants AS tp WHERE tp.tripId = t.id) as participants_str`)
        )
        .orderBy('t.startDate', 'desc');

    if (year && /^\d{4}$/.test(year)) {
        query.whereRaw("strftime('%Y', t.startDate) = ?", [year]);
    }

    const tripsRaw = await query;
    return tripsRaw.map(trip => {
        const { participants_str, ...rest } = trip;
        return {
            ...rest,
            participants: participants_str ? participants_str.split(',').map(Number) : []
        };
    });
};

/**
 * Создает новую командировку и связывает с ней участников.
 * @param {object} tripData - Данные о командировке.
 * @returns {Promise<object>} - Созданный объект командировки.
 */
const create = async (tripData) => {
    const { participants, ...tripDetails } = tripData;
    let newTripId;

    await knex.transaction(async (trx) => {
        // --- ИСПРАВЛЕНО: Логика создания ---
        // 1. Вставляем ОДНУ запись в таблицу 'trips'
        const [trip] = await trx('trips').insert(tripDetails).returning('id');
        newTripId = trip.id;

        if (participants && participants.length > 0) {
            // 2. Готовим записи для связующей таблицы 'trip_participants'
            const participantsToInsert = participants.map(employeeId => ({
                tripId: newTripId,
                employeeId: employeeId
            }));
            // 3. Вставляем всех участников одной командой
            await trx('trip_participants').insert(participantsToInsert);
        }
    });

    // Возвращаем полную, только что созданную запись
    const newTrip = await knex('trips').where({ id: newTripId }).first();
    return {
        ...newTrip,
        participants: participants || []
    };
};

/**
 * Обновляет командировку и ее участников.
 * @param {number} tripId - ID командировки.
 * @param {object} tripData - Данные для обновления.
 * @returns {Promise<object|null>} - Обновленный объект командировки.
 */
const update = async (tripId, tripData) => {
    const { participants, ...tripDetails } = tripData;

    await knex.transaction(async (trx) => {
        // --- ИСПРАВЛЕНО: Логика обновления ---
        // 1. Обновляем основную информацию в таблице 'trips'
        await trx('trips').where({ id: tripId }).update(tripDetails);

        // 2. Полностью заменяем список участников
        // Сначала удаляем всех старых участников этой командировки
        await trx('trip_participants').where({ tripId }).del();

        // Затем добавляем новый список участников (если он есть)
        if (participants && participants.length > 0) {
            const participantsToInsert = participants.map(employeeId => ({
                tripId: tripId,
                employeeId: employeeId
            }));
            await trx('trip_participants').insert(participantsToInsert);
        }
    });
    
    const updatedTrip = await knex('trips').where({ id: tripId }).first();
    if (!updatedTrip) return null;

    return {
        ...updatedTrip,
        participants: participants || []
    };
};

/**
 * Удаляет командировку по ID.
 * @param {number} id - ID командировки.
 * @returns {Promise<number>} - Количество удаленных строк.
 */
const deleteById = (id) => {
    // Эта функция работает правильно благодаря 'ON DELETE CASCADE' в вашей миграции.
    // При удалении командировки из 'trips', база данных сама удалит связанные записи из 'trip_participants'.
    return knex('trips').where({ id }).del();
};

module.exports = {
    findConflictingEmployee,
    getAll,
    create,
    update,
    deleteById,
};
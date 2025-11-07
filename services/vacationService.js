// ===================================================================
// Файл: services/vacationService.js (НОВЫЙ ФАЙЛ)
// ===================================================================
// Сервис для инкапсуляции всей логики работы с отпусками.

const { knex } = require('../config/database');

/**
 * Получает все записи об отпусках.
 * @returns {Promise<Array<object>>}
 */
const getAll = () => {
    return knex('vacations').select('*');
};

/**
 * Получает все отпуска для конкретного сотрудника.
 * @param {number} employeeId - ID сотрудника.
 * @returns {Promise<Array<object>>}
 */
const getForEmployee = (employeeId) => {
    return knex('vacations').where({ employeeId });
};

/**
 * Находит отпуск по ID.
 * @param {number} id - ID отпуска.
 * @returns {Promise<object|undefined>}
 */
const findById = (id) => {
    return knex('vacations').where({ id }).first();
};

/**
 * Создает новую запись об отпуске.
 * @param {object} vacationData - Данные { employeeId, startDate, endDate }.
 * @returns {Promise<object>} - Созданный объект отпуска.
 */
const create = async (vacationData) => {
    const [id] = await knex('vacations').insert(vacationData);
    return findById(id);
};

/**
 * Обновляет запись об отпуске.
 * @param {number} id - ID отпуска.
 * @param {object} vacationData - Данные { startDate, endDate }.
 * @returns {Promise<object|null>} - Обновленный объект или null, если запись не найдена.
 */
const update = async (id, vacationData) => {
    const updatedCount = await knex('vacations').where({ id }).update(vacationData);
    if (updatedCount === 0) return null;
    return findById(id);
};

/**
 * Удаляет отпуск по ID.
 * @param {number} id - ID отпуска.
 * @returns {Promise<number>} - Количество удаленных строк.
 */
const deleteById = (id) => {
    return knex('vacations').where({ id }).del();
};

module.exports = {
    getAll,
    getForEmployee,
    findById,
    create,
    update,
    deleteById,
};
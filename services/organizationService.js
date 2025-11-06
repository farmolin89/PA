// ===================================================================
// Файл: services/organizationService.js (НОВЫЙ ФАЙЛ)
// ===================================================================
// Сервис для инкапсуляции всей бизнес-логики, связанной с организациями.

const { knex } = require('../config/database');

/**
 * Получает все организации, отсортированные по названию.
 * @returns {Promise<Array<object>>}
 */
const getAll = () => {
    return knex('organizations').orderBy('name');
};

/**
 * Находит организацию по названию (без учета регистра).
 * @param {string} name - Название организации.
 * @returns {Promise<object|undefined>}
 */
const findByName = (name) => {
    return knex('organizations').whereRaw('lower(name) = lower(?)', [name]).first();
};

/**
 * Проверяет, используется ли организация в каких-либо командировках.
 * @param {number} id - ID организации.
 * @returns {Promise<boolean>}
 */
const isUsedInTrips = async (id) => {
    const trip = await knex('trips').where({ organizationId: id }).first();
    return !!trip;
};

/**
 * Создает новую организацию.
 * @param {object} orgData - Данные для создания { name, color }.
 * @returns {Promise<object>}
 */
const create = async (orgData) => {
    const [id] = await knex('organizations').insert(orgData);
    return knex('organizations').where({ id }).first();
};

/**
 * Удаляет организацию по ID.
 * @param {number} id - ID организации.
 * @returns {Promise<number>} - Количество удаленных строк.
 */
const deleteById = (id) => {
    return knex('organizations').where({ id }).del();
};

module.exports = {
    getAll,
    findByName,
    isUsedInTrips,
    create,
    deleteById,
};
// ===================================================================
// File: migrations/20251028133002_create_digital_signatures_table.js
// Description: Миграция Knex для создания таблицы электронных подписей.
// ===================================================================

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  // Метод up() выполняется при применении миграции
  return knex.schema.createTable('digital_signatures', (table) => {
    // ID записи, первичный ключ, автоинкремент
    table.increments('id').primary();

    // ФИО сотрудника, обязательное поле
    table.string('fio').notNullable();

    // Ключ должности (для связи или фильтрации), например 'metrology-engineer'
    table.string('position_key').notNullable();

    // Человекочитаемое название должности, обязательное поле
    table.string('position_name').notNullable();

    // ИНН сотрудника, строка до 12 символов, обязательное поле
    table.string('inn', 12).notNullable();

    // Серийный номер или идентификатор ЭЦП, обязательное и уникальное поле
    table.string('ecp_number').notNullable().unique();

    // Дата начала действия сертификата, обязательное поле
    table.date('date_from').notNullable();

    // Дата окончания действия сертификата, обязательное поле
    table.date('date_to').notNullable();

    // Название CSS-класса для цвета аватара (для фронтенда)
    table.string('avatar_color');

    // Автоматически добавляет поля created_at и updated_at
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  // Метод down() выполняется при откате миграции
  return knex.schema.dropTable('digital_signatures');
};
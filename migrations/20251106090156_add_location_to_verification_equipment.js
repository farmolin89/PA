// migrations/YYYYMMDDHHMMSS_add_location_to_verification_equipment.js

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  // Эта функция добавляет новую колонку в существующую таблицу
  return knex.schema.table('verification_equipment', function(table) {
    // Добавляем текстовую колонку 'location'
    // .notNullable() - поле не может быть пустым
    // .defaultTo('office') - для всех существующих записей будет установлено значение 'office'
    table.string('location').notNullable().defaultTo('office');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  // Эта функция нужна для отката миграции, она удаляет добавленную колонку
  return knex.schema.table('verification_equipment', function(table) {
    table.dropColumn('location');
  });
};

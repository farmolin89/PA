// migrations/YYYYMMDDHHMMSS_add_time_spent_to_results.js

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  // Команда "up" добавляет новую колонку в таблицу 'results'
  return knex.schema.alterTable('results', function(table) {
    // Добавляем целочисленную колонку 'time_spent'.
    // Она может быть null, если для старых записей времени нет.
    table.integer('time_spent');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  // Команда "down" откатывает изменения, сделанные в "up".
  return knex.schema.alterTable('results', function(table) {
    // Удаляем колонку 'time_spent', если она существует.
    table.dropColumn('time_spent');
  });
};
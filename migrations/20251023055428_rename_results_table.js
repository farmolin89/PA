// migrations/20251023055428_rename_results_table.js

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  // Эта функция остаётся пустой, так как миграция уже была применена в прошлом.
  // Нам просто нужен этот файл, чтобы Knex был доволен.
  return Promise.resolve();
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  // Эта функция тоже может быть пустой.
  return Promise.resolve();
};
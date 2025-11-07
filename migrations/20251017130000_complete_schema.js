// migrations/20251017130000_complete_schema.js

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    // --- Таблица пользователей системы ---
    .createTable('users', function (table) {
      table.increments('id').primary();
      table.string('name').notNullable().unique();
      table.string('position').notNullable();
      table.string('password').notNullable();
      table.string('resetToken').nullable();
      table.bigInteger('resetTokenExpiry').nullable();
    })
    // --- Таблица сотрудников ---
    .createTable('employees', function (table) {
      table.increments('id').primary();
      table.string('lastName').notNullable();
      table.string('firstName').notNullable();
      table.string('patronymic').nullable();
      table.string('position').notNullable();
      table.string('phone').nullable();
      table.string('email').nullable();
      table.string('hireDate').nullable();
      // Уникальный индекс для ФИО
      table.unique(['lastName', 'firstName', 'patronymic']);
    })
    // --- Таблица организаций-партнеров ---
    .createTable('organizations', function (table) {
      table.increments('id').primary();
      table.string('name').notNullable().unique();
      table.string('color').notNullable();
    })
    // --- Таблица командировок ---
    .createTable('trips', function (table) {
      table.increments('id').primary();
      table.integer('organizationId').notNullable().index();
      table.string('startDate').notNullable();
      table.string('endDate').notNullable();
      table.string('destination').notNullable();
      table.string('status').nullable();
      table.string('transport').nullable(); // Добавлено в миграции
    })
    // --- Связующая таблица для участников командировок ---
    .createTable('trip_participants', function (table) {
      table.increments('id').primary();
      table.integer('tripId').unsigned().references('id').inTable('trips').onDelete('CASCADE').index();
      table.integer('employeeId').unsigned().references('id').inTable('employees').onDelete('CASCADE').index();
    })
    // --- Таблица отпусков ---
    .createTable('vacations', function (table) {
      table.increments('id').primary();
      table.integer('employeeId')
           .unsigned()
           .notNullable()
           .references('id')
           .inTable('employees')
           .onDelete('CASCADE')
           .index();
      table.date('startDate').notNullable();
      table.date('endDate').notNullable();
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('vacations')
    .dropTableIfExists('trip_participants')
    .dropTableIfExists('trips')
    .dropTableIfExists('organizations')
    .dropTableIfExists('employees')
    .dropTableIfExists('users');
};
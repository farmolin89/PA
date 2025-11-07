// ===================================================================
// Файл: migrations/YYYYMMDDHHMMSS_add_testing_schema.js (ИТОГОВАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ)
// ===================================================================

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    // Таблица для хранения тестов
    .createTable('tests', table => {
      table.uuid('id').primary();
      table.string('name').notNullable();
      table.boolean('is_active').defaultTo(false);
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })
    // Таблица для настроек тестов (1 к 1 с tests)
    .createTable('test_settings', table => {
      table.uuid('test_id').primary().references('id').inTable('tests').onDelete('CASCADE');
      table.integer('duration_minutes').defaultTo(30);
      table.integer('passing_score').defaultTo(1);
      table.integer('questions_per_test').defaultTo(10);
    })
    // Таблица для хранения вопросов
    .createTable('questions', table => {
      table.uuid('id').primary();
      table.uuid('test_id').references('id').inTable('tests').onDelete('CASCADE');
      table.text('text').notNullable();
      table.text('explain');
      table.string('type').defaultTo('checkbox'); // типы: checkbox, match, text_input
      table.json('correct_option_key').defaultTo('[]');
      table.json('match_prompts').defaultTo('[]');
      table.json('match_answers').defaultTo('[]');
    })
    // Таблица для вариантов ответов (для вопросов типа checkbox)
    .createTable('options', table => {
      table.string('id').primary(); // Составной ключ "questionId-shortKey"
      table.uuid('question_id').references('id').inTable('questions').onDelete('CASCADE');
      table.text('text').notNullable();
    })
    // ИСПРАВЛЕНО: Таблица для хранения общих результатов прохождения тестов
    .createTable('results', table => {
      table.increments('id').primary();
      table.uuid('test_id').references('id').inTable('tests').onDelete('SET NULL');
      table.string('fio').notNullable();
      table.integer('score').notNullable();
      table.integer('total').notNullable();
      table.integer('percentage').notNullable();
      table.string('status').defaultTo('completed'); // completed, pending_review
      table.boolean('passed').defaultTo(false);
      table.timestamp('date').defaultTo(knex.fn.now());
    })
    // ИСПРАВЛЕНО: Таблица для хранения конкретных ответов пользователя на каждый вопрос
    .createTable('answers', table => {
      table.increments('id').primary();
      // ИСПРАВЛЕНО: Ссылка на правильное имя таблицы 'results'
      table.integer('result_id').unsigned().references('id').inTable('results').onDelete('CASCADE');
      table.uuid('question_id').references('id').inTable('questions').onDelete('SET NULL');
      table.json('user_answer');
      table.boolean('is_correct');
      table.string('review_status').defaultTo('auto'); // auto, pending, manual_correct, manual_incorrect
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  // ИСПРАВЛЕНО: Удаляем таблицы в обратном порядке с правильными именами
  return knex.schema
    .dropTableIfExists('answers')
    .dropTableIfExists('results')
    .dropTableIfExists('options')
    .dropTableIfExists('questions')
    .dropTableIfExists('test_settings')
    .dropTableIfExists('tests');
};
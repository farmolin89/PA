/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  // Функция 'up' отвечает за создание таблиц и применение изменений к схеме базы данных.
  return knex.schema
    // 1. Создаем основную таблицу для оборудования ('equipment')
    .createTable('equipment', function(table) {
      // 'id' - автоинкрементируемый первичный ключ (1, 2, 3...)
      table.increments('id').primary(); 
      
      // 'name' - наименование оборудования, текстовое поле, не может быть пустым
      table.string('name').notNullable();
      
      // 'serial' - заводской номер, текстовое поле, не может быть пустым и должно быть уникальным
      table.string('serial').notNullable().unique();
      
      // 'startDate' - дата ввода в эксплуатацию, текстовое поле, не может быть пустым
      table.string('startDate').notNullable(); 
      
      // Добавляет поля 'created_at' и 'updated_at' с автоматическим заполнением
      table.timestamps(true, true); 
    })
    // 2. Создаем таблицу для видов ТО ('maintenance_services'), связанную с оборудованием
    .createTable('maintenance_services', function(table) {
      // 'id' - автоинкрементируемый первичный ключ
      table.increments('id').primary();
      
      // 'equipment_id' - внешний ключ для связи с таблицей 'equipment'
      table.integer('equipment_id')
           .unsigned() // Гарантирует, что ID будет положительным числом
           .notNullable()
           .references('id') // Указывает, что это поле ссылается на поле 'id'
           .inTable('equipment') // в таблице 'equipment'
           .onDelete('CASCADE'); // При удалении записи в 'equipment', все связанные записи здесь удалятся автоматически
      
      // 'work' - описание работ, текстовое поле (может быть длинным), не может быть пустым
      table.text('work').notNullable();
      
      // 'frequency' - периодичность, текстовое поле, не может быть пустым
      table.string('frequency').notNullable();
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  // Функция 'down' отвечает за откат изменений, сделанных в 'up'.
  // Порядок удаления таблиц важен: сначала удаляются зависимые таблицы, потом основные.
  return knex.schema
    // Сначала удаляем таблицу 'maintenance_services', так как она зависит от 'equipment'
    .dropTableIfExists('maintenance_services')
    // Затем удаляем основную таблицу 'equipment'
    .dropTableIfExists('equipment');
};
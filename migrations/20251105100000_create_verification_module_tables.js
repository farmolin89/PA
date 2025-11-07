// migrations/20251105100000_create_verification_module_tables.js
exports.up = function(knex) {
  return knex.schema.createTable('verification_equipment', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.string('equipment_type').notNullable(); // 'si', 'etalon', 'vo'
    
    // Общие поля
    table.string('modification').nullable(); // Для СИ/Эталонов
    table.json('reg_numbers').nullable(); // Для хранения рег. номеров в формате JSON
    table.string('serial_number').notNullable();
    table.string('inventory_number').notNullable().unique();
    table.string('year_manufactured').notNullable();
    table.date('commission_date').nullable(); // Для СИ/Эталонов
    table.date('last_verification_date').notNullable();
    table.date('next_verification_date').notNullable();
    table.string('city').notNullable();
    table.string('responsible').nullable(); // Для СИ/Эталонов
    table.text('notes').nullable();
    
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('verification_equipment');
};
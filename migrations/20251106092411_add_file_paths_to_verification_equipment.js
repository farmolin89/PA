// migrations/YYYYMMDDHHMMSS_add_file_paths_to_verification_equipment.js
exports.up = function(knex) {
  return knex.schema.table('verification_equipment', function(table) {
    table.string('certificate_path').nullable();
    table.string('invoice_path').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.table('verification_equipment', function(table) {
    table.dropColumn('certificate_path');
    table.dropColumn('invoice_path');
  });
};
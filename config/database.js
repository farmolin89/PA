// ===================================================================
// Файл: config/database.js (ФИНАЛЬНАЯ ВЕРСИЯ С НОВОЙ КОНФИГУРАЦИЕЙ)
// ===================================================================
// Этот файл инициализирует и экспортирует единое подключение к БД,
// используя централизованный файл конфигурации.

const knex = require('knex');
// Импортируем нашу новую централизованную конфигурацию
const config = require('./config');

console.log(`[Database] Инициализация Knex в режиме: ${config.env}`);

// --- Инициализация и экспорт экземпляра Knex ---
// Передаем в knex конфигурацию базы данных для текущего окружения
const knexInstance = knex(config.db);

// --- Включение поддержки внешних ключей для SQLite ---
// Это критически важно для целостности данных в режимах development и test
if (config.db.client === 'sqlite3') {
    knexInstance.client.pool.on('createSuccess', (eventId, resource) => {
        resource.run('PRAGMA foreign_keys = ON', (err) => {
            if (err) {
                console.error("Критическая ошибка: не удалось включить поддержку внешних ключей для SQLite.", err);
            }
        });
    });
}

// --- Экспорт единственного экземпляра Knex ---
module.exports = {
  knex: knexInstance,
};
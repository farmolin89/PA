// ===================================================================
// Файл: config/config.js (ФИНАЛЬНАЯ ВЕРСИЯ С АБСОЛЮТНЫМИ ПУТЯМИ)
// ===================================================================

require('dotenv').config();
const path = require('path'); // === КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ 2.2: Импортируем 'path' ===

const environment = process.env.NODE_ENV || 'development';

const common = {
    env: environment,
    port: process.env.PORT || 3000,
    sessionSecret: process.env.SESSION_SECRET,
    csrfSecret: process.env.CSRF_SECRET,
    appBaseUrl: process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
};

const environments = {
    development: {
        db: {
            client: 'sqlite3',
            connection: {
                // Используем абсолютный путь, чтобы избежать проблем с рабочим каталогом
                filename: path.resolve(__dirname, '..', 'database.db')
            },
            useNullAsDefault: true,
            migrations: {
                // === КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ 2.2: Используем абсолютный путь ===
                directory: path.resolve(__dirname, '..', 'migrations')
            }
        }
    },
    test: {
        db: {
            client: 'sqlite3',
            connection: {
                filename: ':memory:'
            },
            useNullAsDefault: true,
            migrations: {
                directory: path.resolve(__dirname, '..', 'migrations')
            },
            seeds: {
                directory: path.resolve(__dirname, '..', 'seeds')
            }
        }
    },
    production: {
        db: {}
    }
};

module.exports = {
    ...common,
    ...environments[environment]
};
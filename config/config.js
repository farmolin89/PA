// ===================================================================
// Файл: config/config.js (ФИНАЛЬНАЯ ВЕРСИЯ)
// ===================================================================
// Этот файл управляет конфигурацией приложения для разных окружений.
// Он читает переменные из .env и предоставляет их в структурированном виде.

require('dotenv').config();

const environment = process.env.NODE_ENV || 'development';

// Общая конфигурация, применяемая ко всем окружениям
const common = {
    env: environment,
    port: process.env.PORT || 3000,
    sessionSecret: process.env.SESSION_SECRET,
    csrfSecret: process.env.CSRF_SECRET,
    appBaseUrl: process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
};

// Конфигурация для разных окружений
const environments = {
    development: {
        db: {
            client: 'sqlite3',
            connection: {
                // Используем относительный путь для надежности
                filename: './database.db'
            },
            useNullAsDefault: true,
            migrations: {
                directory: './migrations'
            }
        }
    },
    test: {
        db: {
            client: 'sqlite3',
            connection: {
                filename: ':memory:' // Использовать БД в оперативной памяти для тестов
            },
            useNullAsDefault: true,
            migrations: {
                directory: './migrations'
            },
            seeds: {
                directory: './seeds' // Директория для тестовых данных
            }
        }
    },
    production: {
        // Здесь в будущем будет конфигурация для боевого сервера
        // Например, с PostgreSQL
        db: {
            // client: 'pg',
            // connection: process.env.DATABASE_URL,
        }
    }
};

// Экспортируем объединенную конфигурацию для текущего окружения
module.exports = {
    ...common,
    ...environments[environment]
};
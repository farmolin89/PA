// ===================================================================
// Файл: server.js (ФИНАЛЬНАЯ ИТОГОВАЯ ВЕРСИЯ С CSRF-ПАТЧЕМ)
// Описание: Главный файл сервера, настроенный для стабильной работы
// с корректной инициализацией всех модулей и защит.
// ===================================================================
require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const csrf = require('tiny-csrf');
const os = require('os');

const { knex } = require('./config/database');
const viewRoutes = require('./routes/viewRoutes');
const apiRoutes = require('./routes/apiRoutes');
const { initializeSSE } = require('./event-emitter');
const publicTestRoutes = require('./routes/public.routes')(knex);
const adminTestRoutes = require('./routes/admin-tests.routes')(knex);

// --- Критические проверки безопасности при старте ---
if (!process.env.SESSION_SECRET) {
    if (process.env.NODE_ENV === 'test') {
        process.env.SESSION_SECRET = 'test-session-secret';
        console.warn('SESSION_SECRET отсутствует. Используется временное значение для тестовой среды.');
    } else {
        console.error('КРИТИЧЕСКАЯ ОШИБКА: Секретный ключ сессии (SESSION_SECRET) не определен в .env файле.');
        process.exit(1);
    }
}
let csrfSecret = process.env.CSRF_SECRET;
if (!csrfSecret || csrfSecret.length !== 32) {
    if (process.env.NODE_ENV === 'test') {
        csrfSecret = '12345678901234567890123456789012';
        process.env.CSRF_SECRET = csrfSecret;
        console.warn('CSRF_SECRET отсутствует или имеет неверную длину. Используется временное значение для тестовой среды.');
    } else {
        console.error('КРИТИЧЕСКАЯ ОШИБКА: Ключ CSRF_SECRET должен быть определен и иметь длину 32 символа.');
        process.exit(1);
    }
}

const app = express();
const port = process.env.PORT || 3000;

app.set('trust proxy', 1);

function getLocalIPv4() {
  const ifs = os.networkInterfaces();
  for (const name of Object.keys(ifs)) {
    for (const addr of ifs[name]) {
      if (addr.family === 'IPv4' && !addr.internal) return addr.address;
    }
  }
  return '127.0.0.1';
}

// --- Базовая настройка middleware (в правильном порядке) ---
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.SESSION_SECRET));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: 'auto', 
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: 'lax' 
    }
}));

initializeSSE(app);

// ===================================================================
// +++ НАЧАЛО ПАТЧА: Мост из заголовка x-csrf-token в тело req.body._csrf +++
// ===================================================================
app.use((req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    if (!req.body || typeof req.body !== 'object') req.body = {};
    const hdr = req.get('x-csrf-token');
    if (hdr && !req.body._csrf) {
        req.body._csrf = hdr;
    }
  }
  next();
});
// ===================================================================
// +++ КОНЕЦ ПАТЧА +++
// ===================================================================

// --- Настройка CSRF-защиты ---
if (process.env.NODE_ENV !== 'test') {
    const csrfProtection = csrf(
        process.env.CSRF_SECRET,
        ['POST', 'PUT', 'DELETE'],
        [
            '/api/login',
            '/api/register',
            '/api/forgot-password',
            '/api/reset-password',
            /^\/api\/public\/.*/ 
        ]
    );
    app.use(csrfProtection);
    console.log('CSRF защита активирована для окружения:', process.env.NODE_ENV);
} else {
    console.log('CSRF защита отключена для тестовой среды');
}

// Универсальный middleware для генерации CSRF-токена на GET-запросах страниц
app.use((req, res, next) => {
    if (req.method === 'GET' && !req.originalUrl.startsWith('/api/')) {
        if (typeof req.csrfToken === 'function') {
            req.csrfToken();
        }
    }
    next();
});

// --- Подключение статических файлов и маршрутов ---
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', viewRoutes);
app.use('/api', apiRoutes); // Здесь уже есть маршрут /api/csrf-token
app.use('/api', publicTestRoutes);
app.use('/api/admin', adminTestRoutes);

// --- Централизованный обработчик ошибок ---
app.use((err, req, res, next) => {
    // Усиленная проверка на CSRF-ошибку
    if (err.code === 'EBADCSRFTOKEN' || /invalid csrf token/i.test(err.message)) {
        console.warn(`[Security] Обнаружена недействительная попытка CSRF-запроса с IP: ${req.ip} для ${req.originalUrl}`);
        return res.status(403).json({ errors: [{ message: 'Недействительный токен безопасности. Пожалуйста, обновите страницу и попробуйте снова.' }] });
    }
    if (err.code === 'SQLITE_CONSTRAINT') {
        if (err.message.includes('UNIQUE constraint failed')) {
            console.warn(`[Database] Конфликт данных (UNIQUE): ${err.message}`);
            return res.status(409).json({ errors: [{ message: 'Запись с такими данными уже существует.' }] });
        }
        if (err.message.includes('FOREIGN KEY constraint failed')) {
            console.warn(`[Database] Конфликт целостности данных (FOREIGN KEY): ${err.message}`);
            return res.status(409).json({ errors: [{ message: 'Невозможно выполнить действие из-за связанных данных.' }] });
        }
    }
    if (Array.isArray(err.errors)) {
        console.warn(`[Validation] Ошибка валидации: ${JSON.stringify(err.errors)}`);
        return res.status(400).json({ errors: err.errors });
    }
    console.error('Необработанная ошибка:', err.stack || err);
    res.status(500).json({
        errors: [{ message: 'Внутренняя ошибка сервера. Пожалуйста, попробуйте позже.' }],
        ...(process.env.NODE_ENV !== 'production' && { internal_error: err.message })
    });
});

// --- Обработчик 404 для всех остальных маршрутов ---
app.use('*', (req, res) => {
    if (req.originalUrl.startsWith('/api/')) {
        return res.status(404).json({ errors: [{ message: 'API маршрут не найден' }] });
    }
    res.status(404).sendFile(path.join(__dirname, 'views', '404.html'));
});

// --- Запуск сервера ---
const host = '0.0.0.0';
if (require.main === module) {
    app.listen(port, host, () => {
        console.log(`Сервер успешно запущен!`);
        console.log(`-------------------------------------------------`);
        console.log(`-> Локальный доступ:    http://localhost:${port}`);
        console.log(`-> Доступ из сети:      http://${getLocalIPv4()}:${port}`);
        console.log(`-------------------------------------------------`);
        console.log(`Текущий режим: ${process.env.NODE_ENV || 'development'}`);
        console.log(`CSRF защита: ${process.env.NODE_ENV === 'test' ? 'ОТКЛЮЧЕНА (тесты)' : 'АКТИВИРОВАНА'}`);
    });
}

module.exports = app;

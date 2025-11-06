// ===================================================================
// Файл: routes/public.routes.js (ИТОГОВАЯ ВЕРСИЯ)
// ===================================================================
// Этот файл содержит все публичные маршруты для взаимодействия с тестами.

const express = require('express');
const router = express.Router();
const testPublicController = require('../controllers/testPublicController');

module.exports = (db) => {
    // --- Инициализация сервисов ---
    const protocolService = require('../services/protocolService')(db);
    const testTakingService = require('../services/testTakingService')(db);

    // --- Middleware для добавления `db` в объект `req` ---
    // Это позволяет контроллеру получать доступ к базе данных, не импортируя её напрямую.
    router.use((req, res, next) => {
        req.db = db;
        next();
    });

    // =================================================================
    // --- МАРШРУТЫ ДЛЯ ВЗАИМОДЕЙСТВИЯ С ТЕСТАМИ ---
    // =================================================================
    
    // Получает список всех активных тестов с указанием, сдан ли он уже пользователем.
    router.get('/public/tests', testPublicController.getPublicTests(db));

    // Получает протокол последнего успешно сданного теста для конкретного пользователя.
    router.get('/public/results/last', testPublicController.getLastResultProtocol(protocolService));

    // Начинает сессию теста, записывая время старта в сессию пользователя.
    router.post('/public/tests/:testId/start', testPublicController.startTestSession());

    // Получает случайный набор вопросов и настройки для теста.
    router.get('/public/tests/:testId/questions', testPublicController.getTestQuestions(testTakingService));

    // Принимает ответы, проверяет время, обрабатывает и сохраняет результат.
    router.post('/public/tests/:testId/submit', testPublicController.submitTest(testTakingService));

    return router;
};
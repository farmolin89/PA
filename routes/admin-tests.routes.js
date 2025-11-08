// ===================================================================
// Файл: routes/admin-tests.routes.js (ПОЛНАЯ ИТОГОВАЯ ВЕРСИЯ)
// Описание: Маршруты для администрирования тестов. Выполняет роль
// контроллера, вызывая бизнес-логику из сервисного слоя и отправляя
// real-time уведомления клиентам через SSE.
// ===================================================================

const express = require('express');
const { handleValidationErrors, testCreationValidation, testSettingsValidation, bulkDeleteValidation, reviewBatchValidation } = require('../middleware/validationMiddleware');
const { sendEvent } = require('../event-emitter'); // Импортируем функцию отправки событий

module.exports = (knex) => {
    const router = express.Router();

    // --- Инициализация всех необходимых сервисов ---
    const testService = require('../services/testService')(knex);
    const questionService = require('../services/questionService')(knex);
    const resultService = require('../services/resultService')(knex);
    const protocolService = require('../services/protocolService')(knex);
    const reviewService = require('../services/reviewService')(knex);
    const analyticsService = require('../services/analyticsService')(knex);

    // ==================================================
    // 1. УПРАВЛЕНИЕ ТЕСТАМИ (Tests)
    // ==================================================

    router.get('/tests', async (req, res, next) => {
        try {
            const tests = await testService.getAllTests();
            res.json(tests);
        } catch (error) { next(error); }
    });

    router.post('/tests', testCreationValidation, handleValidationErrors, async (req, res, next) => {
        try {
            const newTest = await testService.createTest(req.body);
            sendEvent({}, 'tests-updated'); // Уведомляем клиентов о новом тесте
            res.status(201).json({ message: 'Тест успешно создан', test: newTest });
        } catch (error) { next(error); }
    });
    
    router.delete('/tests/:testId', async (req, res, next) => {
        try {
            await testService.deleteTest(req.params.testId);
            sendEvent({}, 'tests-updated'); // Уведомляем клиентов об удалении
            res.status(204).send();
        } catch (error) {
            if (error.message.includes('не найден')) return res.status(404).json({ errors: [{ message: error.message }] });
            next(error);
        }
    });
    
    router.put('/tests/:testId/rename', async (req, res, next) => {
        const { name } = req.body;
        if (!name || !name.trim()) return res.status(400).json({ errors: [{ message: 'Название не может быть пустым.'}]});
        try {
            await testService.renameTest(req.params.testId, name);
            sendEvent({}, 'tests-updated'); // Уведомляем клиентов о переименовании
            res.status(200).json({ message: 'Название обновлено' });
        } catch(error) { next(error); }
    });

    router.put('/tests/:testId/status', async (req, res, next) => {
        const isActive = req.body.isActive !== undefined ? req.body.isActive : req.body.is_active;
        if (isActive === undefined) return res.status(400).json({ errors: [{ message: 'Отсутствует параметр is_active.' }] });
        try {
            await testService.updateTestStatus(req.params.testId, isActive);
            sendEvent({}, 'tests-updated'); // Уведомляем клиентов об изменении статуса
            res.status(200).json({ message: 'Статус обновлен.' });
        } catch (error) { next(error); }
    });

    // ==================================================
    // 2. УПРАВЛЕНИЕ НАСТРОЙКАМИ ТЕСТА (Settings)
    // ==================================================

    router.get('/tests/:testId/settings', async (req, res, next) => {
        try {
            const settings = await testService.getTestSettings(req.params.testId);
            res.json(settings);
        } catch (error) {
            if (error.message.includes('не найдены')) return res.status(404).json({ errors: [{ message: error.message }] });
            next(error); 
        }
    });
    
    router.post('/tests/:testId/settings', testSettingsValidation, handleValidationErrors, async (req, res, next) => {
        try {
            await testService.saveTestSettings(req.params.testId, req.body);
            sendEvent({}, 'tests-updated'); // Настройки (кол-во вопросов, время) тоже влияют на отображение
            res.status(200).json({ message: 'Настройки сохранены.' });
        } catch (error) { next(error); }
    });

    // ==================================================
    // 3. УПРАВЛЕНИЕ ВОПРОСАМИ (Questions)
    // ==================================================

    router.get('/tests/:testId/questions', async (req, res, next) => {
        try {
            const questions = await questionService.getAllForTest(req.params.testId);
            res.json(questions);
        } catch (error) { next(error); }
    });
    
    router.post('/tests/:testId/questions/add', async (req, res, next) => {
        try {
            await questionService.create(req.params.testId, req.body);
            res.status(201).json({ message: 'Вопрос добавлен' });
        } catch (error) { next(error); }
    });

    router.post('/questions/update', async (req, res, next) => {
        try {
            await questionService.update(req.body);
            res.status(200).json({ message: 'Вопрос обновлен' });
        } catch (error) { 
            if (error.message.includes('не предоставлен')) return res.status(400).json({ errors: [{ message: error.message }] });
            next(error); 
        }
    });

    router.post('/questions/delete-bulk', bulkDeleteValidation, handleValidationErrors, async (req, res, next) => {
        try {
            await questionService.deleteByIds(req.body.ids);
            res.status(204).send();
        } catch (error) { next(error); }
    });

    // ==================================================
    // 4. УПРАВЛЕНИЕ РЕЗУЛЬТАТАМИ И ПРОВЕРКОЙ (Results & Review)
    // ==================================================

    router.get('/tests/:testId/results', async (req, res, next) => {
        try {
            const resultsData = await resultService.getPaginatedResults(req.params.testId, req.query);
            res.json(resultsData);
        } catch (error) { next(error); }
    });
    
    router.post('/results/delete-bulk', bulkDeleteValidation, handleValidationErrors, async (req, res, next) => {
        try {
            await resultService.deleteByIds(req.body.ids);
            res.status(204).send();
        } catch (error) {
            // Передаем ошибку в централизованный обработчик
            next(error);
        }
    });
    
    router.get('/results/:resultId/protocol', async(req, res, next) => {
        try {
            const resultId = parseInt(req.params.resultId, 10);
            if (isNaN(resultId)) {
                return res.status(400).json({ errors: [{ message: 'Некорректный ID результата.' }] });
            }
            const protocolData = await protocolService.getProtocol(resultId);
            res.json(protocolData);
        } catch(error) { 
            if (error.message.includes('не найден')) return res.status(404).json({ errors: [{ message: error.message }] });
            next(error); 
        }
    });

    router.get('/results/:resultId/review', async(req, res, next) => {
        try {
            const resultId = parseInt(req.params.resultId, 10);
            if (isNaN(resultId)) {
                return res.status(400).json({ errors: [{ message: 'Некорректный ID результата.' }] }); 
            } 
            const questions = await reviewService.getPending(resultId);          
            res.json(questions);
        } catch(error) { next(error); }
    });

    router.post('/review/submit-batch', reviewBatchValidation, handleValidationErrors, async(req, res, next) => {
        try {
            await reviewService.submitBatch(req.body.verdicts);
            res.status(200).json({ message: 'Проверка завершена' });
        } catch(error) { 
            if (error.message.includes('не найден')) return res.status(404).json({ errors: [{ message: error.message }] });
            next(error); 
        }
    });

    // ==================================================
    // 5. МАРШРУТЫ ДЛЯ АНАЛИТИКИ (Analytics)
    // ==================================================

     router.get('/analytics/overall', async (req, res, next) => {
        try {
            const stats = await analyticsService.getOverallAnalytics();
            res.json(stats);
        } catch (error) { next(error); }
    });
    
    router.get('/analytics/activity', async (req, res, next) => {
        try {
            const chartData = await analyticsService.getActivityChartData();
            res.json(chartData);
        } catch (error) { next(error); }
    });

    router.get('/tests/summary', async (req, res, next) => {
        try {
            const summary = await testService.getTestingSummary();
            res.json(summary);
        } catch (error) { next(error); }
    });

    router.get('/tests/:testId/analytics', async (req, res, next) => {
        try {
            const analytics = await testService.getTestAnalytics(req.params.testId);
            res.json(analytics);
        } catch (error) { next(error); }
    });

    // ==================================================
    // 6. ДРУГИЕ МАРШРУТЫ
    // ==================================================

    router.get('/invite-link', (req, res) => {
        const link = `${req.protocol}://${req.get('host')}/test.html?welcome=1`;
        res.json({ link });
    });

    return router;
};
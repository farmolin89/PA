// ===================================================================
// Файл: controllers/testPublicController.js (ФИНАЛЬНАЯ ВЕРСИЯ С ГАРАНТИЕЙ СОХРАНЕНИЯ СЕССИИ)
// ===================================================================

/**
 * Получает список всех активных тестов для публичной части.
 */
exports.getPublicTests = (db) => async (req, res, next) => {
    const { fio } = req.query;
    try {
        const activeTests = await db('tests')
            .join('test_settings', 'tests.id', '=', 'test_settings.test_id')
            .select('tests.id', 'tests.name', 'test_settings.questions_per_test', 'test_settings.passing_score', 'test_settings.duration_minutes')
            .where('tests.is_active', true)
            .orderBy('tests.created_at', 'desc');

        if (!fio) {
            return res.json(activeTests);
        }

        const testIds = activeTests.map(test => test.id);
        let resultsByTest = new Map();

        if (testIds.length > 0) {
            const userResults = await db('results')
                .whereIn('test_id', testIds)
                .andWhere({ fio })
                .orderBy('date', 'desc');

            resultsByTest = userResults.reduce((acc, result) => {
                if (!acc.has(result.test_id)) {
                    acc.set(result.test_id, result);
                }
                return acc;
            }, new Map());
        }

        const testsWithStatus = activeTests.map(test => {
            const lastResult = resultsByTest.get(test.id);

            let status = 'not_started';
            let passedStatus = false;
            let score = null;
            let total = null;

            if (lastResult) {
                if (lastResult.status === 'pending_review') {
                    status = 'pending';
                } else if (lastResult.passed) {
                    status = 'passed';
                    passedStatus = true;
                } else {
                    status = 'failed';
                }
                score = lastResult.score;
                total = lastResult.total;
            }

            return { ...test, status, passedStatus, score, total };
        });
        res.json(testsWithStatus);
    } catch (error) {
        next(error);
    }
};

/**
 * Получает протокол последнего результата теста для пользователя.
 */
exports.getLastResultProtocol = (protocolService) => async (req, res, next) => {
    const { testId, fio } = req.query;
    try {
        const lastResult = await protocolService.findLastResult(testId, fio);
        if (!lastResult) return res.status(404).json({ message: 'Результат не найден.' });
        
        // Получаем от сервиса стандартный (вложенный) формат протокола
        const protocolData = await protocolService.getProtocol(lastResult.id);

        // =================================================================
        // ИСПРАВЛЕНИЕ: Преобразуем вложенный объект в "плоский" специально 
        // для публичной страницы, чтобы она работала корректно.
        // =================================================================
        const flatResponse = {
            ...protocolData.summary,         // Копируем все поля из summary (score, total, passed и т.д.)
            protocolData: protocolData.protocol, // Переименовываем ключ 'protocol' в 'protocolData'
        };

        res.json(flatResponse);
    } catch (error) {
        next(error);
    }
};


/**
 * Начинает сессию теста, записывая время старта в сессию Express.
 */
exports.startTestSession = () => (req, res, next) => {
    const { testId } = req.params;
    if (!req.session.testAttempts) {
        req.session.testAttempts = {};
    }
    req.session.testAttempts[testId] = { startTime: Date.now() };
    
    req.session.save((err) => {
        if (err) {
            console.error("Критическая ошибка сохранения сессии:", err);
            return next(err);
        }
        res.status(200).json({ success: true });
    });
};

/**
 * Получает вопросы и настройки для конкретного теста.
 */
exports.getTestQuestions = (testTakingService) => async (req, res, next) => {
    const { testId } = req.params;
    if (!req.session.testAttempts?.[testId]) {
        return res.status(403).json({ message: 'Сессия теста не была начата или истекла.' });
    }
    try {
        const testData = await testTakingService.getTestForPassing(testId);
        res.json(testData);
    } catch (error) {
        next(error);
    }
};

/**
 * Принимает ответы, обрабатывает их и сохраняет результат.
 */
exports.submitTest = (testTakingService) => async (req, res, next) => {
    const { testId } = req.params;
    const { fio, userAnswers } = req.body;
    const sessionAttempt = req.session.testAttempts?.[testId];

    if (!sessionAttempt) {
        return res.status(403).json({ message: 'Сессия теста не была начата или истекла.' });
    }

    try {
        const result = await testTakingService.processAndSaveResults({
            testId,
            fio,
            userAnswers,
            startTime: sessionAttempt.startTime
        });
        
        delete req.session.testAttempts[testId];
        
        req.session.save((err) => {
            if (err) console.error("Ошибка сохранения сессии после завершения теста:", err);
            res.json(result);
        });
    } catch (error) {
        next(error);
    }
};
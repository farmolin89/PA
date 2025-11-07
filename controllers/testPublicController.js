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
            let normalizedResult = null;

            if (lastResult) {
                if (lastResult.status === 'pending_review') {
                    status = 'pending';
                } else if (lastResult.passed) {
                    status = 'passed';
                    passedStatus = true;
                } else {
                    status = 'failed';
                }

                normalizedResult = {
                    score: lastResult.score,
                    total: lastResult.total,
                    percentage: lastResult.percentage,
                    passed: lastResult.passed,
                    status: lastResult.status,
                    date: lastResult.date
                };
            }

            return { ...test, status, passedStatus, lastResult: normalizedResult };
        });
        res.json(testsWithStatus);
    } catch (error) {
        next(error);
    }
};

/**
 * Получает протокол последнего сданного теста для пользователя.
 */
exports.getLastResultProtocol = (protocolService) => async (req, res, next) => {
    const { testId, fio } = req.query;
    try {
        const result = await protocolService.findLastPassedProtocol(testId, fio);
        if (!result) return res.status(404).json({ message: 'Результат не найден.' });
        res.json(result);
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
    
    // КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: Принудительно сохраняем сессию перед отправкой ответа.
    req.session.save((err) => {
        if (err) {
            console.error("Критическая ошибка сохранения сессии:", err);
            return next(err);
        }
        // Ответ клиенту отправляется ТОЛЬКО ПОСЛЕ успешного сохранения.
        res.status(200).json({ success: true });
    });
};

/**
 * Получает вопросы и настройки для конкретного теста.
 */
exports.getTestQuestions = (testTakingService) => async (req, res, next) => {
    const { testId } = req.params;
    // Проверяем наличие сессии
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
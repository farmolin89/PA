// ===================================================================
// Файл: controllers/testPublicController.js (ИСПРАВЛЕННАЯ ВЕРСИЯ)
// ===================================================================

/**
 * Получает список всех активных тестов для публичной части.
 * Если передан параметр `fio`, для каждого теста добавляется флаг `passedStatus`.
 */
exports.getPublicTests = (db) => async (req, res) => {
    const { fio } = req.query;
    try {
        const activeTests = await db('tests')
            .join('test_settings', 'tests.id', '=', 'test_settings.test_id')
            .select(
                'tests.id',
                'tests.name',
                'test_settings.questions_per_test',
                'test_settings.passing_score',
                'test_settings.duration_minutes'
            )
            .where('tests.is_active', true)
            .orderBy('tests.created_at', 'desc');

        if (!fio) {
            return res.json(activeTests);
        }

        const testsWithStatus = await Promise.all(activeTests.map(async (test) => {
            const passedResult = await db('results')
                .where({
                    test_id: test.id,
                    fio: fio,
                    passed: true
                })
                .first();

            return {
                ...test,
                passedStatus: !!passedResult
            };
        }));

        res.json(testsWithStatus);

    } catch (error) {
        console.error('Ошибка при получении публичных тестов:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера' });
    }
};

/**
 * Получает протокол последнего сданного теста для пользователя.
 */
exports.getLastResultProtocol = (protocolService) => async (req, res) => {
    const { testId, fio } = req.query;
    try {
        const result = await protocolService.findLastPassedProtocol(testId, fio);
        if (!result) {
            return res.status(404).json({ message: 'Результат не найден.' });
        }
        res.json(result);
    } catch (error) {
        console.error('Ошибка при получении протокола последнего результата:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера' });
    }
};

/**
 * Начинает сессию теста, записывая время старта в сессию Express.
 */
exports.startTestSession = () => (req, res) => {
    const { testId } = req.params;
    if (!req.session.testAttempts) {
        req.session.testAttempts = {};
    }
    req.session.testAttempts[testId] = { startTime: Date.now() };
    
    // ИЗМЕНЕНО: Отправляем 200 OK с телом, чтобы клиент получил "truthy" значение.
    res.status(200).json({ success: true });
};

/**
 * Получает вопросы и настройки для конкретного теста.
 */
exports.getTestQuestions = (testTakingService) => async (req, res) => {
    const { testId } = req.params;
    const sessionAttempt = req.session.testAttempts?.[testId];

    if (!sessionAttempt) {
        return res.status(403).json({ message: 'Сессия теста не была начата.' });
    }

    try {
        const testData = await testTakingService.getTestForPassing(testId, sessionAttempt.startTime);
        res.json(testData);
    } catch (error) {
        console.error(`Ошибка при получении вопросов для теста ${testId}:`, error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера' });
    }
};

/**
 * Принимает ответы, обрабатывает их и сохраняет результат.
 */
exports.submitTest = (testTakingService) => async (req, res) => {
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

        res.json(result);
    } catch (error) {
        console.error(`Ошибка при обработке результатов теста ${testId}:`, error);
        res.status(500).json({ message: error.message || 'Внутренняя ошибка сервера' });
    }
};
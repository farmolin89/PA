const normalizeResult = (result) => {
    if (!result) {
        return null;
    }

    return {
        id: result.id,
        score: result.score,
        total: result.total,
        percentage: result.percentage,
        passed: Boolean(result.passed),
        status: result.status,
        date: result.date,
    };
};

const resolveStatus = (result) => {
    if (!result) {
        return { status: 'not_started', passedStatus: false };
    }

    if (result.status === 'pending_review') {
        return { status: 'pending', passedStatus: false };
    }

    if (result.passed) {
        return { status: 'passed', passedStatus: true };
    }

    return { status: 'failed', passedStatus: false };
};

exports.getPublicTests = (db) => async (req, res, next) => {
    const { fio } = req.query;

    try {
        const tests = await db('tests')
            .join('test_settings', 'tests.id', 'test_settings.test_id')
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
            return res.json(tests);
        }

        const testIds = tests.map((test) => test.id);
        if (testIds.length === 0) {
            return res.json(tests);
        }

        const rawResults = await db('results')
            .whereIn('test_id', testIds)
            .andWhere({ fio })
            .orderBy('date', 'desc');

        const latestResultsByTest = new Map();
        for (const result of rawResults) {
            if (!latestResultsByTest.has(result.test_id)) {
                latestResultsByTest.set(result.test_id, result);
            }
        }

        const payload = tests.map((test) => {
            const latestResult = latestResultsByTest.get(test.id);
            const { status, passedStatus } = resolveStatus(latestResult);

            return {
                ...test,
                status,
                passedStatus,
                lastResult: normalizeResult(latestResult),
            };
        });

        return res.json(payload);
    } catch (error) {
        return next(error);
    }
};

exports.getLastResultProtocol = (protocolService) => async (req, res, next) => {
    const { testId, fio } = req.query;

    try {
        const result = await protocolService.findLastPassedProtocol(testId, fio);
        if (!result) {
            return res.status(404).json({ message: 'Результат не найден.' });
        }

        return res.json(result);
    } catch (error) {
        return next(error);
    }
};

exports.startTestSession = () => (req, res, next) => {
    const { testId } = req.params;

    if (!req.session.testAttempts) {
        req.session.testAttempts = {};
    }

    req.session.testAttempts[testId] = { startTime: Date.now() };

    req.session.save((error) => {
        if (error) {
            return next(error);
        }

        return res.status(200).json({ success: true });
    });
};

exports.getTestQuestions = (testTakingService) => async (req, res, next) => {
    const { testId } = req.params;

    if (!req.session.testAttempts?.[testId]) {
        return res.status(403).json({ message: 'Сессия теста не была начата или истекла.' });
    }

    try {
        const testData = await testTakingService.getTestForPassing(testId);
        return res.json(testData);
    } catch (error) {
        return next(error);
    }
};

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
            startTime: sessionAttempt.startTime,
        });

        delete req.session.testAttempts[testId];

        req.session.save((error) => {
            if (error) {
                return next(error);
            }

            return res.json(result);
        });
    } catch (error) {
        return next(error);
    }
};

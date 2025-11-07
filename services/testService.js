// ===================================================================
// Файл: services/testService.js (ПОЛНАЯ ФИНАЛЬНАЯ ВЕРСИЯ С ИСПРАВЛЕНИЯМИ СОВМЕСТИМОСТИ)
// ===================================================================

const { v4: uuidv4 } = require('uuid');

const DEFAULT_DURATION_MINUTES = 10;
const DEFAULT_QUESTIONS_PER_TEST = 20;

function getQuestionsCount(value) {
    const numericValue = Number(value);
    return Number.isInteger(numericValue) && numericValue > 0 ? numericValue : DEFAULT_QUESTIONS_PER_TEST;
}

function getNormalizedPassingScore(rawScore, questionsCount) {
    const fallback = Math.max(1, Math.ceil(questionsCount * 0.7));
    const numericScore = Number(rawScore);
    if (!Number.isInteger(numericScore) || numericScore <= 0) {
        return fallback;
    }
    return Math.max(1, Math.min(numericScore, questionsCount));
}

/**
 * Фабричная функция для создания сервиса управления тестами.
 * @param {object} db - Экземпляр Knex.js.
 * @returns {object} - Объект с методами сервиса.
 */
module.exports = (db) => {
    return {
        /**
         * Получает все тесты с корректно агрегированной статистикой.
         */
        getAllTests: async () => {
            const questionCounts = db('questions')
                .select('test_id', db.raw('COUNT(id) as questions_count'))
                .groupBy('test_id')
                .as('q_counts');

            const resultStats = db('results')
                .select(
                    'test_id',
                    db.raw('COUNT(id) as "attemptsCount"'),
                    db.raw("SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as \"completedCount\""),
                    db.raw("SUM(CASE WHEN status = 'completed' AND passed = true THEN 1 ELSE 0 END) as \"passedCount\""),
                    db.raw("SUM(CASE WHEN status = 'completed' THEN percentage ELSE 0 END) as \"sumPercentage\"")
                )
                .groupBy('test_id')
                .as('r_stats');

            const testsRaw = await db('tests')
                .leftJoin('test_settings', 'tests.id', 'test_settings.test_id')
                .leftJoin(questionCounts, 'tests.id', 'q_counts.test_id')
                .leftJoin(resultStats, 'tests.id', 'r_stats.test_id')
                .select(
                    'tests.id', 'tests.name', 'tests.is_active',
                    'test_settings.duration_minutes',
                    'test_settings.questions_per_test',
                    'test_settings.passing_score',
                    db.raw('COALESCE(q_counts.questions_count, 0) as questions_count'),
                    db.raw('COALESCE(r_stats."attemptsCount", 0) as "attemptsCount"'),
                    db.raw('COALESCE(r_stats."completedCount", 0) as "completedCount"'),
                    db.raw('COALESCE(r_stats."passedCount", 0) as "passedCount"'),
                    db.raw('COALESCE(r_stats."sumPercentage", 0) as "sumPercentage"')
                )
                .orderBy('tests.created_at', 'desc');

            return testsRaw.map(test => {
                const attemptsCount = Number(test.attemptsCount) || 0;
                const completedCount = Number(test.completedCount) || 0;
                const passedCount = Number(test.passedCount) || 0;
                const sumPercentage = Number(test.sumPercentage) || 0;

                const avgScore = completedCount > 0 ? Math.round(sumPercentage / completedCount) : 0;
                const passRate = completedCount > 0 ? Math.round((passedCount / completedCount) * 100) : 0;

                return {
                    id: test.id,
                    name: test.name,
                    is_active: !!test.is_active,
                    duration_minutes: Number(test.duration_minutes) || 0,
                    questions_count: Number(test.questions_count) || 0,
                    questions_per_test: Number(test.questions_per_test) || 0,
                    passing_score: Number(test.passing_score) || 0,
                    attemptsCount,
                    avgScore,
                    passRate,
                };
            });
        },

        /**
         * Создает новый тест и связанные с ним настройки по умолчанию.
         */
        createTest: async (testData) => {
            const { name, description, duration_minutes, questions_per_test, passing_score } = testData;
            const testId = uuidv4();
            let newTest;

            await db.transaction(async trx => {
                // === КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ 2.1: Убран .returning('*'), несовместимый с SQLite. ===
                // Мы сначала вставляем данные, а затем надежно получаем их отдельным запросом.
                await trx('tests').insert({
                    id: testId,
                    name,
                    description: description || null,
                });

                // Получаем только что созданный тест, чтобы вернуть его клиенту
                newTest = await trx('tests').where('id', testId).first();

                const questionsCount = getQuestionsCount(questions_per_test);
                const normalizedPassingScore = getNormalizedPassingScore(passing_score, questionsCount);

                await trx('test_settings').insert({
                    test_id: testId,
                    duration_minutes: Number(duration_minutes) > 0 ? Number(duration_minutes) : DEFAULT_DURATION_MINUTES,
                    questions_per_test: questionsCount,
                    passing_score: normalizedPassingScore
                });
            });

            return newTest;
        },
        
        /**
         * Удаляет тест по его ID.
         */
        deleteTest: async (testId) => {
            const deletedRows = await db('tests').where({ id: testId }).del();
            if (deletedRows === 0) {
                throw new Error(`Тест с ID ${testId} не найден.`);
            }
            return deletedRows;
        },

        /**
         * Переименовывает тест.
         */
        renameTest: async (testId, newName) => {
            return db('tests').where({ id: testId }).update({ name: newName });
        },
        
        /**
         * Обновляет статус публикации теста.
         */
        updateTestStatus: async (testId, isActive) => {
            return db('tests').where({ id: testId }).update({ is_active: !!isActive });
        },

        /**
         * Получает настройки для конкретного теста.
         */
        getTestSettings: async (testId) => {
            const settings = await db('test_settings').where({ test_id: testId }).first();
            if (!settings) {
                const questionsCount = DEFAULT_QUESTIONS_PER_TEST;
                const defaultSettings = {
                    test_id: testId,
                    duration_minutes: DEFAULT_DURATION_MINUTES,
                    questions_per_test: questionsCount,
                    passing_score: getNormalizedPassingScore(null, questionsCount)
                };
                await db('test_settings').insert(defaultSettings);
                return defaultSettings;
            }

            const questionsCount = getQuestionsCount(settings.questions_per_test);
            const normalizedPassingScore = getNormalizedPassingScore(settings.passing_score, questionsCount);

            if (
                settings.questions_per_test !== questionsCount ||
                settings.passing_score !== normalizedPassingScore
            ) {
                await db('test_settings').where({ test_id: testId }).update({
                    questions_per_test: questionsCount,
                    passing_score: normalizedPassingScore
                });
                return {
                    ...settings,
                    questions_per_test: questionsCount,
                    passing_score: normalizedPassingScore
                };
            }

            return settings;
        },

        /**
         * Сохраняет настройки для конкретного теста.
         */
        saveTestSettings: async (testId, settingsData) => {
            const existingSettings = await db('test_settings').where({ test_id: testId }).first();

            const mergedSettings = {
                duration_minutes: Number(settingsData.duration_minutes ?? existingSettings?.duration_minutes ?? DEFAULT_DURATION_MINUTES),
                questions_per_test: getQuestionsCount(settingsData.questions_per_test ?? existingSettings?.questions_per_test),
                passing_score: settingsData.passing_score ?? existingSettings?.passing_score
            };

            const normalizedPassingScore = getNormalizedPassingScore(
                mergedSettings.passing_score,
                mergedSettings.questions_per_test
            );

            const payload = {
                duration_minutes: mergedSettings.duration_minutes,
                questions_per_test: mergedSettings.questions_per_test,
                passing_score: normalizedPassingScore
            };

            if (existingSettings) {
                return db('test_settings').where({ test_id: testId }).update(payload);
            }

            return db('test_settings').insert({ test_id: testId, ...payload });
        },

        /**
         * Собирает детальную аналитику для вкладки "Сводка" конкретного теста.
         */
        getTestAnalytics: async (testId) => {
            const totalAttemptsRow = await db('results')
                .where({ test_id: testId })
                .count('id as totalAttempts')
                .first() || { totalAttempts: 0 };

            const completedStatsRow = await db('results')
                .where({ test_id: testId, status: 'completed' })
                .count('id as completedCount')
                .avg('percentage as averagePercentage')
                .sum({ passedCount: db.raw('CASE WHEN passed = true THEN 1 ELSE 0 END') })
                .first() || { completedCount: 0, averagePercentage: null, passedCount: 0 };

            const completedCount = Number(completedStatsRow.completedCount) || 0;
            const passedCount = Number(completedStatsRow.passedCount) || 0;

            const totalAttemptsAllStatuses = Number(totalAttemptsRow.totalAttempts) || 0;

            const summaryStats = {
                totalAttempts: completedCount,
                totalAttemptsAllStatuses,
                averagePercentage: completedCount > 0 && completedStatsRow.averagePercentage ? Math.round(completedStatsRow.averagePercentage) : 0,
                passRate: completedCount > 0 ? Math.round((passedCount / completedCount) * 100) : 0,
            };

            const mostDifficultQuestionsRaw = await db('answers')
                .join('results', 'answers.result_id', 'results.id')
                .join('questions', 'answers.question_id', 'questions.id')
                .where('questions.test_id', testId)
                .andWhere('results.status', 'completed')
                .select('questions.text')
                .count('answers.id as totalAnswers')
                .sum({ correctAnswers: db.raw('CASE WHEN answers.is_correct = true THEN 1 ELSE 0 END')})
                .groupBy('questions.id', 'questions.text')
                .orderByRaw('CAST(correctAnswers AS REAL) / totalAnswers ASC')
                .limit(5);

            const mostDifficultQuestions = mostDifficultQuestionsRaw.map(question => ({
                text: question.text,
                totalAnswers: Number(question.totalAnswers) || 0,
                correctAnswers: Number(question.correctAnswers) || 0,
            }));

            const topPerformers = (await db('results')
                .where({ test_id: testId, status: 'completed' })
                .select('fio', 'percentage as maxPercentage')
                .orderBy('percentage', 'desc')
                .limit(5))
                .map(row => ({ fio: row.fio, maxPercentage: Number(row.maxPercentage) || 0 }));

            const worstPerformers = (await db('results')
                .where({ test_id: testId, status: 'completed' })
                .select('fio', 'percentage as minPercentage')
                .orderBy('percentage', 'asc')
                .limit(5))
                .map(row => ({ fio: row.fio, minPercentage: Number(row.minPercentage) || 0 }));

            const scoreDistributionRaw = await db('results')
                .where({ test_id: testId, status: 'completed' })
                .select(db.raw("MIN(CAST(percentage / 10 AS INTEGER) * 10, 90) as bucket"))
                .count('id as count')
                .groupBy('bucket');

            const scoreDistributionMap = new Map(
                scoreDistributionRaw.map(item => [Number(item.bucket), Number(item.count)])
            );
            const scoreDistribution = Array.from({ length: 10 }, (_, i) => {
                const bucketStart = i * 10;
                const bucketEnd = bucketStart + 9;
                return {
                    label: `${bucketStart}-${bucketEnd === 99 ? '100' : bucketEnd}`,
                    count: Number(scoreDistributionMap.get(bucketStart) || 0),
                };
            });

            return {
                summaryStats,
                mostDifficultQuestions,
                topPerformers,
                worstPerformers,
                scoreDistribution
            };
        },

        /**
         * Собирает краткую сводку для дашборда.
         */
        getTestingSummary: async () => {
            const summary = await db('results')
                .where({ status: 'completed' })
                .sum({ passedTests: db.raw('CASE WHEN passed = true THEN 1 ELSE 0 END') })
                .avg('percentage as avgResult')
                .first();

            const totalTests = await db('tests').count('id as total').first();
            const needsReview = await db('results').where('status', 'pending_review').count('id as count').first();

            return {
                totalTests: Number(totalTests.total) || 0,
                passedTests: Number(summary.passedTests) || 0,
                avgResult: summary.avgResult ? Math.round(summary.avgResult) : 0,
                needsReview: Number(needsReview.count) || 0,
            };
        },
    };
};

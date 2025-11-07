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
                    db.raw('CAST(COALESCE(ROUND(AVG(percentage)), 0) AS INTEGER) as "avgScore"'),
                    db.raw('CAST(COALESCE(ROUND(SUM(CASE WHEN passed = true THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(id), 0)), 0) AS INTEGER) as "passRate"')
                )
                .groupBy('test_id')
                .as('r_stats');

            const tests = await db('tests')
                .leftJoin('test_settings', 'tests.id', 'test_settings.test_id')
                .leftJoin(questionCounts, 'tests.id', 'q_counts.test_id')
                .leftJoin(resultStats, 'tests.id', 'r_stats.test_id')
                .select(
                    'tests.id', 'tests.name', 'tests.is_active',
                    'test_settings.duration_minutes',
                    db.raw('COALESCE(q_counts.questions_count, 0) as questions_count'),
                    db.raw('COALESCE(r_stats."attemptsCount", 0) as "attemptsCount"'),
                    db.raw('COALESCE(r_stats."avgScore", 0) as "avgScore"'),
                    db.raw('COALESCE(r_stats."passRate", 0) as "passRate"')
                )
                .orderBy('tests.created_at', 'desc');

            return tests;
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
            const summaryStatsRes = await db('results')
                .where({ test_id: testId })
                .count('id as totalAttempts')
                .avg('percentage as averagePercentage')
                .sum({ passedCount: db.raw('CASE WHEN passed = true THEN 1 ELSE 0 END') })
                .first();
            
            const summaryStats = {
                totalAttempts: Number(summaryStatsRes.totalAttempts),
                averagePercentage: summaryStatsRes.averagePercentage ? Math.round(summaryStatsRes.averagePercentage) : 0,
                passRate: Number(summaryStatsRes.totalAttempts) > 0 ? Math.round((Number(summaryStatsRes.passedCount) / Number(summaryStatsRes.totalAttempts)) * 100) : 0,
            };

            const mostDifficultQuestions = await db('answers')
                .join('questions', 'answers.question_id', 'questions.id')
                .where('questions.test_id', testId)
                .select('questions.text')
                .count('answers.id as totalAnswers')
                .sum({ correctAnswers: db.raw('CASE WHEN answers.is_correct = true THEN 1 ELSE 0 END')})
                .groupBy('questions.id', 'questions.text')
                .orderByRaw('CAST(correctAnswers AS REAL) / totalAnswers ASC')
                .limit(5);

            const topPerformers = await db('results')
                .where({ test_id: testId })
                .select('fio', 'percentage as maxPercentage')
                .orderBy('percentage', 'desc')
                .limit(5);

            const worstPerformers = await db('results')
                .where({ test_id: testId })
                .select('fio', 'percentage as minPercentage')
                .orderBy('percentage', 'asc')
                .limit(5);

            const scoreDistributionRaw = await db('results')
                .where({ test_id: testId })
                .select(db.raw("CAST(FLOOR(percentage / 10) * 10 AS INTEGER) as bucket"))
                .count('id as count')
                .groupBy('bucket');

            const scoreDistributionMap = new Map(scoreDistributionRaw.map(item => [item.bucket, item.count]));
            const scoreDistribution = Array.from({ length: 10 }, (_, i) => {
                const bucketStart = i * 10;
                const bucketEnd = bucketStart + 9;
                return {
                    label: `${bucketStart}-${bucketEnd === 99 ? '100' : bucketEnd}`,
                    count: scoreDistributionMap.get(bucketStart) || 0,
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
                .count('id as passedTests')
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
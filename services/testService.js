// ===================================================================
// Файл: services/testService.js (ПОЛНАЯ ИТОГОВАЯ ВЕРСИЯ С ИСПРАВЛЕНИЯМИ)
// ===================================================================

const { v4: uuidv4 } = require('uuid');

/**
 * Фабричная функция для создания сервиса управления тестами.
 * @param {object} db - Экземпляр Knex.js.
 * @returns {object} - Объект с методами сервиса.
 */
module.exports = (db) => {
    return {
        /**
         * ИСПРАВЛЕННЫЙ МЕТОД
         * Получает все тесты с корректно агрегированной статистикой, используя подзапросы
         * для избежания дублирования данных при множественных JOIN'ах.
         */
        getAllTests: async () => {
            // Подзапрос для подсчета вопросов
            const questionCounts = db('questions')
                .select('test_id', db.raw('COUNT(id) as questions_count'))
                .groupBy('test_id')
                .as('q_counts');

            // Подзапрос для статистики по результатам
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
                    'tests.id',
                    'tests.name',
                    'tests.is_active',
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
         * @param {object} testData - Данные для создания теста.
         */
        createTest: async (testData) => {
            const { name, description, duration_minutes, questions_per_test, passing_score } = testData;
            const testId = uuidv4();
            let newTest;

            await db.transaction(async trx => {
                [newTest] = await trx('tests')
                    .insert({
                        id: testId,
                        name,
                        description: description || null,
                    })
                    .returning('*');

                await trx('test_settings').insert({
                    test_id: testId,
                    duration_minutes: duration_minutes || 10,
                    questions_per_test: questions_per_test || 20,
                    passing_score: passing_score || 70
                });
            });

            return newTest;
        },
        
        /**
         * Удаляет тест по его ID.
         * @param {string} testId - ID теста для удаления.
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
         * @param {string} testId - ID теста.
         * @param {string} newName - Новое имя.
         */
        renameTest: async (testId, newName) => {
            return db('tests').where({ id: testId }).update({ name: newName });
        },
        
        /**
         * Обновляет статус публикации теста.
         * @param {string} testId - ID теста.
         * @param {boolean} isActive - Новый статус.
         */
        updateTestStatus: async (testId, isActive) => {
            return db('tests').where({ id: testId }).update({ is_active: !!isActive });
        },

        /**
         * Получает настройки для конкретного теста.
         * @param {string} testId - ID теста.
         */
        getTestSettings: async (testId) => {
            const settings = await db('test_settings').where({ test_id: testId }).first();
            if (!settings) {
                // Если настроек нет, создаем их с параметрами по умолчанию
                const defaultSettings = {
                    test_id: testId,
                    duration_minutes: 10,
                    questions_per_test: 20,
                    passing_score: 70
                };
                await db('test_settings').insert(defaultSettings);
                return defaultSettings;
            }
            return settings;
        },

        /**
         * Сохраняет настройки для конкретного теста.
         * @param {string} testId - ID теста.
         * @param {object} settingsData - Объект с новыми настройками.
         */
        saveTestSettings: async (testId, settingsData) => {
            const { test_id, ...dataToUpdate } = settingsData;
            return db('test_settings').where({ test_id: testId }).update(dataToUpdate);
        },

        /**
         * Собирает детальную аналитику для вкладки "Сводка" конкретного теста.
         * @param {string} testId - ID теста.
         */
        getTestAnalytics: async (testId) => {
            // 1. Основная статистика
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

            // 2. Самые сложные вопросы
            const mostDifficultQuestions = await db('answers')
                .join('questions', 'answers.question_id', 'questions.id')
                .where('questions.test_id', testId)
                .select('questions.text')
                .count('answers.id as totalAnswers')
                .sum({ correctAnswers: db.raw('CASE WHEN answers.is_correct = true THEN 1 ELSE 0 END')})
                .groupBy('questions.id', 'questions.text')
                .orderByRaw('CAST(correctAnswers AS REAL) / totalAnswers ASC')
                .limit(5);

            // 3. Лучшие и худшие результаты
            const allPerformers = await db('results')
                .where({ test_id: testId })
                .select('fio')
                .max('percentage as maxPercentage')
                .min('percentage as minPercentage')
                .groupBy('fio');
            
            const topPerformers = [...allPerformers].sort((a, b) => b.maxPercentage - a.maxPercentage).slice(0, 5);
            const worstPerformers = [...allPerformers].sort((a, b) => a.minPercentage - b.minPercentage).slice(0, 5);

            // 4. Распределение баллов
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
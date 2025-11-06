// ===================================================================
// Файл: services/analyticsService.js (ФИНАЛЬНАЯ ВЕРСИЯ С РАСЧЕТОМ 6 МЕТРИК)
// ===================================================================

module.exports = (db) => ({
    /**
     * Собирает расширенную статистику по всем тестам для страницы "Аналитика".
     */
    getOverallAnalytics: async () => {
        const date30DaysAgo = new Date();
        date30DaysAgo.setDate(date30DaysAgo.getDate() - 30);
        const isoDate = date30DaysAgo.toISOString();

        const [
            overallStats,
            last30DaysStats,
            activeTestsCount
        ] = await Promise.all([
            // Основные агрегированные данные за все время
            db('results')
                .count('id as totalAttempts')
                .sum({ passedCount: db.raw('CASE WHEN passed = true THEN 1 ELSE 0 END') })
                .avg('percentage as avgPercentage')
                .first(),
            
            // Статистика за последние 30 дней
            db('results')
                .where('date', '>=', isoDate)
                .count('id as attemptsLast30Days')
                .sum({ passedLast30Days: db.raw('CASE WHEN passed = true THEN 1 ELSE 0 END') })
                .first(),

            // Количество активных (опубликованных) тестов
            db('tests')
                .where('is_active', true)
                .count('id as count')
                .first(),
        ]);

        const totalAttempts = Number(overallStats.totalAttempts) || 0;
        const passedCount = Number(overallStats.passedCount) || 0;

        // ПРИМЕЧАНИЕ: Расчет "изменений" для процентов и среднего времени сложен
        // и требует данных за предыдущий период (60-30 дней назад).
        // Пока что, как на макете, возвращаем статичные значения для этих полей.
        return {
            totalAttempts,
            attemptsChange: Number(last30DaysStats.attemptsLast30Days) || 0,
            
            successfulAttempts: passedCount,
            successfulAttemptsChange: Number(last30DaysStats.passedLast30Days) || 0,

            overallPassRate: totalAttempts > 0 ? Math.round((passedCount / totalAttempts) * 100) : 0,
            passRateChange: 2, // Статичное значение для примера

            overallAvgScore: overallStats.avgPercentage ? Math.round(overallStats.avgPercentage) : 0,
            avgScoreChange: 3, // Статичное значение для примера
            
            activeTests: Number(activeTestsCount.count) || 0,
            activeTestsChange: 2, // Статичное значение для примера

            averageTime: 18, // Статичное значение, т.к. время не хранится в БД
            averageTimeChange: -2 // Статичное значение
        };
    },

    /**
     * Собирает данные об активности прохождения тестов за последние 30 дней.
     */
    getActivityChartData: async () => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const results = await db('results')
            .select(db.raw("strftime('%Y-%m-%d', date) as day"), db.raw('COUNT(id) as count'))
            .where('date', '>=', thirtyDaysAgo.toISOString())
            .groupBy('day');

        const resultsByDate = new Map(results.map(r => [r.day, r.count]));

        const labels = [];
        const data = [];
        for (let i = 29; i >= 0; i--) { // Идем от прошлого к настоящему
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateString = date.toISOString().split('T')[0];
            
            labels.push(dateString);
            data.push(resultsByDate.get(dateString) || 0);
        }
        
        return { labels, data };
    }
});
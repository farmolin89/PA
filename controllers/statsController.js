// ===================================================================
// Файл: controllers/statsController.js (ФИНАЛЬНАЯ ВЕРСИЯ ПОСЛЕ РЕФАКТОРИНГА)
// ===================================================================
// Контроллер переведен на стиль "фабрики функций".
// ===================================================================

module.exports = (statsService, geographyStatsService) => ({
    /**
     * Получает общую статистику по командировкам.
     */
    getStats: async (req, res, next) => {
        try {
            const year = req.query.year || new Date().getFullYear().toString();

            if (!/^\d{4}$/.test(year)) {
                return res.status(400).json({ errors: [{ message: "Параметр 'year' должен быть четырехзначным числом." }] });
            }

            const stats = await statsService.calculateGlobalStats(year);
            res.json(stats);
        } catch (error) {
            console.error("Ошибка при получении статистики:", error);
            next(error);
        }
    },

    /**
     * Получает статистику по географии поездок.
     */
    getGeographyStats: async (req, res, next) => {
        try {
            const year = req.query.year || new Date().getFullYear().toString();
            const employeeId = req.query.employeeId || null;

            if (!/^\d{4}$/.test(year)) {
                return res.status(400).json({ errors: [{ message: "Параметр 'year' должен быть четырехзначным числом." }] });
            }

            const stats = await geographyStatsService.calculateGeographyStats(year, employeeId);
            res.json(stats);
        } catch (error) {
            console.error("Ошибка при получении географической статистики:", error);
            next(error);
        }
    }
});
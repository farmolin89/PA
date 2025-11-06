// ===================================================================
// Файл: services/resultService.js (ИТОГОВАЯ ВЕРСИЯ)
// ===================================================================
// Этот сервис инкапсулирует всю логику для получения и управления результатами тестов.

module.exports = (db) => {
    return {
        /**
         * Получает отфильтрованные, отсортированные и пагинированные результаты для конкретного теста.
         * @param {string} testId - ID теста.
         * @param {object} options - Опции { search, sort, order, page, limit }.
         * @returns {Promise<object>} - Объект с результатами и информацией о пагинации.
         */
        async getPaginatedResults(testId, options = {}) {
            const { search = '', sort = 'date', order = 'desc', page = 1, limit = 10 } = options;

            // --- Защита от SQL-инъекций в ORDER BY ---
            // Создаем "белый список" колонок, по которым разрешена сортировка.
            const allowedSortColumns = {
                fio: 'fio',
                score: 'score',
                percentage: 'percentage',
                date: 'date',
                status: 'status'
            };
            const sortColumn = allowedSortColumns[sort] || 'date'; // Используем 'date' по умолчанию.
            const sortOrder = order.toLowerCase() === 'asc' ? 'asc' : 'desc'; // Разрешаем только 'asc' или 'desc'.
            
            const offset = (page - 1) * limit;

            // Создаем базовый запрос для подсчета и выборки
            let query = db('results').where({ test_id: testId });

            if (search) {
                query = query.andWhere('fio', 'like', `%${search}%`);
            }

            // Сначала получаем общее количество записей для пагинации
            const totalResult = await query.clone().count('id as total').first();
            const totalResults = Number(totalResult.total);
            const totalPages = Math.ceil(totalResults / limit);

            // Теперь получаем сами результаты с сортировкой и пагинацией
            const results = await query
                .orderBy(sortColumn, sortOrder)
                .limit(limit)
                .offset(offset);

            return {
                results,
                totalPages: Math.max(1, totalPages), // Гарантируем, что будет хотя бы 1 страница
                currentPage: parseInt(page, 10),
                totalResults
            };
        },

        /**
         * Удаляет результаты тестов по массиву их ID.
         * @param {Array<number>} ids - Массив ID результатов для удаления.
         * @returns {Promise<number>} - Количество удаленных строк.
         */
        async deleteByIds(ids) {
            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                throw new Error('Не предоставлены ID для удаления.');
            }
            
            return db('results').whereIn('id', ids).del();
        }
    };
};
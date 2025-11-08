// ===================================================================
// Файл: services/resultService.js (ПОЛНАЯ ИТОГОВАЯ ВЕРСИЯ)
// Описание: Сервис для управления результатами тестов. Содержит
// корректную логику для получения данных с пагинацией и каскадного
// удаления результатов вместе со связанными ответами.
// ===================================================================

module.exports = (db) => {
    return {
        /**
         * Получает результаты с пагинацией, сортировкой и поиском.
         * @param {string} testId - ID теста, для которого запрашиваются результаты.
         * @param {object} options - Параметры запроса (search, sort, order, page, limit).
         * @returns {Promise<object>} Объект с результатами и информацией о пагинации.
         */
        getPaginatedResults: async (testId, { search, sort, order, page, limit }) => {
            const pageNum = parseInt(page, 10) || 1;
            const limitNum = parseInt(limit, 10) || 10;
            const offset = (pageNum - 1) * limitNum;

            const totalQuery = db('results').where({ test_id: testId });
            const resultsQuery = db('results').where({ test_id: testId });

            if (search) {
                const searchTerm = `%${search}%`;
                totalQuery.where('fio', 'like', searchTerm);
                resultsQuery.where('fio', 'like', searchTerm);
            }

            const totalResult = await totalQuery.count('id as count').first();
            const totalCount = Number(totalResult.count) || 0;
            
            // --- НОВАЯ ИСПРАВЛЕННАЯ ЛОГИКА СОРТИРОВКИ ---
            const allowedSortColumns = {
                fio: 'fio',
                score: 'score',
                status: 'status',
                percentage: 'percentage',
                date: 'date'
            };
            const sortColumn = allowedSortColumns[sort] || 'date';
            const sortDirection = order === 'asc' ? 'asc' : 'desc';

            if (sortColumn === 'status') {
                // Если пользователь выбрал сортировку по СТАТУСУ,
                // используем единое правило с тремя уровнями приоритета.
                resultsQuery.orderByRaw(`
                    CASE 
                        WHEN status = 'pending_review' THEN 0 
                        WHEN passed = 0 THEN 1
                        WHEN passed = 1 THEN 2
                        ELSE 3 
                    END ${sortDirection}
                `);
            } else {
                // Если пользователь выбрал ЛЮБУЮ ДРУГУЮ колонку,
                // сначала принудительно выносим "На проверке" наверх,
                // а потом уже сортируем по выбранной колонке.
                resultsQuery.orderByRaw(`CASE WHEN status = 'pending_review' THEN 0 ELSE 1 END ASC`);
                resultsQuery.orderBy(sortColumn, sortDirection);
            }

            // В любом случае, в конце добавляем сортировку по дате как "запасную",
            // чтобы результаты с одинаковыми параметрами не "прыгали".
            resultsQuery.orderBy('date', 'desc');

            const results = await resultsQuery
                .limit(limitNum)
                .offset(offset);

            return {
                results,
                totalPages: Math.ceil(totalCount / limitNum),
                currentPage: pageNum,
            };
        },

        /**
         * Удаляет результаты по их ID, обеспечивая каскадное удаление связанных ответов.
         * @param {Array<number|string>} ids - Массив ID результатов для удаления.
         * @returns {Promise<void>}
         */
        deleteByIds: async (ids) => {
            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                console.warn("Попытка удаления результатов с пустым или некорректным массивом ID.");
                return;
            }

            return db.transaction(async (trx) => {
                await trx('answers').whereIn('result_id', ids).del();
                await trx('results').whereIn('id', ids).del();
            });
        }
    };
};
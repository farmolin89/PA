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
            // Приводим параметры страницы и лимита к числам, устанавливая значения по умолчанию
            const pageNum = parseInt(page, 10) || 1;
            const limitNum = parseInt(limit, 10) || 10;
            const offset = (pageNum - 1) * limitNum;

            // Базовый запрос для получения общего количества записей (для пагинации)
            const totalQuery = db('results').where({ test_id: testId });
            // Базовый запрос для получения самих данных
            const resultsQuery = db('results').where({ test_id: testId });

            // Если есть поисковый запрос, добавляем условие WHERE
            if (search) {
                const searchTerm = `%${search}%`;
                totalQuery.where('fio', 'like', searchTerm);
                resultsQuery.where('fio', 'like', searchTerm);
            }

            const allowedSortColumns = {
                fio: 'fio',
                score: 'score',
                status: 'status',
                percentage: 'percentage',
                date: 'date'
            };

            const sortColumn = allowedSortColumns[sort] || 'date';
            const sortDirection = order === 'asc' ? 'asc' : 'desc';

            // Выполняем запросы
            const totalResult = await totalQuery.count('id as count').first();
            const totalCount = Number(totalResult.count) || 0;

            if (sortColumn === 'status') {
                const statusOrderExpression = `CASE status WHEN 'pending_review' THEN 0 WHEN 'completed' THEN 1 ELSE 2 END`;
                resultsQuery
                    .orderByRaw(`${statusOrderExpression} ${sortDirection === 'asc' ? 'ASC' : 'DESC'}`)
                    .orderBy('date', 'desc');
            } else {
                resultsQuery
                    .orderBy(sortColumn, sortDirection)
                    .orderBy('date', 'desc');
            }

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
                // Если ID не предоставлены, просто выходим, чтобы избежать ошибок.
                console.warn("Попытка удаления результатов с пустым или некорректным массивом ID.");
                return;
            }

            // ИСПОЛЬЗУЕМ ТРАНЗАКЦИЮ для обеспечения целостности данных.
            // Если одна из операций (удаление ответов или результатов) провалится,
            // все изменения в рамках транзакции будут отменены.
            return db.transaction(async (trx) => {
                // ШАГ 1: Сначала удаляем все связанные "дочерние" записи из таблицы 'answers'.
                // Это необходимо из-за ограничения внешнего ключа (foreign key constraint).
                await trx('answers').whereIn('result_id', ids).del();

                // ШАГ 2: После успешного удаления ответов, можно безопасно удалить
                // "родительские" записи из таблицы 'results'.
                await trx('results').whereIn('id', ids).del();
            });
        }
    };
};
// ===================================================================
// Файл: services/questionService.js (ИТОГОВАЯ ВЕРСИЯ)
// ===================================================================
// Этот сервис содержит всю бизнес-логику для управления вопросами.

const { v4: uuidv4 } = require('uuid');

/**
 * Фабричная функция для создания сервиса вопросов.
 * @param {object} db - Экземпляр базы данных knex.
 * @returns {object} - Объект с методами сервиса.
 */
module.exports = (db) => {
    return {
        /**
         * Получает все вопросы для указанного теста, включая их варианты ответов.
         * @param {string} testId - UUID теста.
         * @returns {Promise<Array<object>>} Массив объектов вопросов.
         */
        getAllForTest: async (testId) => {
            const questions = await db('questions').where('test_id', testId);
            
            // N+1 проблема решена: получаем все опции для всех вопросов одним запросом
            const questionIds = questions.map(q => q.id);
            if (questionIds.length === 0) {
                return [];
            }
            const allOptions = await db('options').whereIn('question_id', questionIds);
            
            // Группируем опции по ID вопроса для быстрого доступа
            const optionsByQuestionId = allOptions.reduce((acc, option) => {
                if (!acc[option.question_id]) {
                    acc[option.question_id] = [];
                }
                acc[option.question_id].push(option);
                return acc;
            }, {});

            // Собираем итоговую структуру
            return questions.map(q => ({
                ...q,
                options: q.type === 'checkbox' ? (optionsByQuestionId[q.id] || []) : undefined,
                correct: JSON.parse(q.correct_option_key || '[]'),
                match_prompts: JSON.parse(q.match_prompts || '[]'),
                match_answers: JSON.parse(q.match_answers || '[]'),
            }));
        },

        /**
         * Создает новый вопрос в базе данных.
         * @param {string} testId - ID теста, к которому относится вопрос.
         * @param {object} questionData - Объект с данными вопроса.
         * @returns {Promise<void>}
         */
        create: async (testId, questionData) => {
            const { type, text, explain, options, correct, match_prompts, match_answers } = questionData;
            
            await db.transaction(async trx => {
                const questionId = uuidv4();
                await trx('questions').insert({
                    id: questionId,
                    test_id: testId,
                    type,
                    text,
                    explain: explain || null,
                    correct_option_key: JSON.stringify(correct || []),
                    match_prompts: JSON.stringify(match_prompts || []),
                    match_answers: JSON.stringify(match_answers || [])
                });

                if (type === 'checkbox' && options && options.length > 0) {
                    const optionsToInsert = options.map(opt => ({
                        // Генерируем ID для новых опций, как это делает фронтенд
                        id: `${questionId}-${uuidv4().slice(0,4)}`,
                        question_id: questionId,
                        text: opt.text
                    }));
                    if (optionsToInsert.length > 0) {
                        await trx('options').insert(optionsToInsert);
                    }
                }
            });
        },

        /**
         * Обновляет существующий вопрос в базе данных.
         * @param {object} questionData - Объект с данными вопроса, должен содержать `id`.
         * @returns {Promise<void>}
         */
        update: async (questionData) => {
            const { id, type, text, explain, options, correct, match_prompts, match_answers } = questionData;
            if (!id) throw new Error('ID вопроса не предоставлен для обновления.');

            await db.transaction(async trx => {
                await trx('questions').where('id', id).update({
                    type, text, explain,
                    correct_option_key: JSON.stringify(correct || []),
                    match_prompts: JSON.stringify(match_prompts || []),
                    match_answers: JSON.stringify(match_answers || [])
                });

                if (type === 'checkbox') {
                    // Полностью заменяем опции: сначала удаляем старые, потом вставляем новые
                    await trx('options').where('question_id', id).del();
                    
                    if (options && options.length > 0) {
                         const optionsToInsert = options.map(opt => ({
                            // КЛЮЧЕВАЯ ЛОГИКА: Сохраняем старые ID или генерируем новые для опций, добавленных на фронтенде.
                            id: opt.id && !opt.id.startsWith('new-') ? opt.id : `${id}-${uuidv4().slice(0,4)}`,
                            question_id: id,
                            text: opt.text
                        }));
                        await trx('options').insert(optionsToInsert);
                    }
                }
            });
        },

        /**
         * Удаляет вопросы по их ID.
         * @param {Array<string>} ids - Массив UUID вопросов для удаления.
         * @returns {Promise<void>}
         */
        deleteByIds: async (ids) => {
            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                throw new Error('Не предоставлены ID для удаления.');
            }
            await db('questions').whereIn('id', ids).del();
        }
    };
};
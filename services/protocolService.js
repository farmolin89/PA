// ===================================================================
// Файл: services/protocolService.js (ПОЛНАЯ ФИНАЛЬНАЯ ВЕРСИЯ)
// ===================================================================

/**
 * Фабричная функция для создания сервиса работы с протоколами.
 * @param {object} db - Экземпляр Knex.js.
 * @returns {object} - Объект с методами сервиса.
 */
module.exports = (db) => {
  return {
    /**
     * Находит самый последний результат теста для указанного пользователя.
     * @param {string} testId - ID теста.
     * @param {string} fio - ФИО пользователя.
     * @returns {Promise<object|null>} - Объект результата или null, если ничего не найдено.
     */
    findLastResult: async (testId, fio) => {
      return db('results')
        .where({ test_id: testId, fio })
        .orderBy('date', 'desc')
        .first();
    },

    /**
     * Получает полный протокол для конкретного результата.
     * @param {number} resultId - ID результата.
     * @param {object} [trx=db] - Опциональный объект транзакции Knex.
     */
    getProtocol: async (resultId, trx = db) => {
        // Теперь все запросы внутри этой функции будут использовать либо транзакцию (trx),
        // либо обычное подключение (db), если транзакция не передана.
        const summary = await trx('results')
            .join('tests', 'results.test_id', 'tests.id')
            .select('results.*', 'tests.name as testName')
            .where('results.id', resultId)
            .first();

        if (!summary) throw new Error('Результат не найден');

        const answers = await trx('answers')
            .join('questions', 'answers.question_id', 'questions.id')
            .leftJoin('options', function() {
                this.on('answers.question_id', '=', 'options.question_id');
            })
            .select(
                'questions.id as questionId', 
                'questions.text as questionText',
                'questions.explain',
                'questions.type as questionType',
                'questions.correct_option_key',
                'questions.match_prompts',
                'questions.match_answers as correct_answers_match',
                'answers.user_answer', 
                'answers.is_correct',
                db.raw("json_group_array(json_object('id', options.id, 'text', options.text)) as options")
            )
            .where('answers.result_id', resultId)
            .groupBy('questions.id');

        const protocol = answers.map(answer => {
            const options = JSON.parse(answer.options || '[]');
            const userAnswers = JSON.parse(answer.user_answer || '[]');

            let chosenAnswerText = 'Ответ не дан';
            let correctAnswerText = 'N/A';
            
            if (answer.questionType === 'text_input') {
                chosenAnswerText = userAnswers[0] || 'Ответ не дан';
                correctAnswerText = 'Требуется проверка';
            } else if (answer.questionType === 'match') {
                correctAnswerText = JSON.parse(answer.correct_answers_match || '[]');
            } else { // checkbox
                const optionsMap = new Map(options.map(o => [o.id, o.text]));
                const correctKeys = new Set(JSON.parse(answer.correct_option_key || '[]'));
                
                chosenAnswerText = userAnswers.length > 0 
                    ? userAnswers.map(id => optionsMap.get(id)).join(', ') 
                    : 'Ответ не дан';
                
                correctAnswerText = options
                    .filter(o => correctKeys.has(o.id.split('-').pop()))
                    .map(o => o.text)
                    .join(', ');
            }
            
            return {
                questionText: answer.questionText,
                explain: answer.explain,
                type: answer.questionType,
                chosenAnswerText: chosenAnswerText,
                correctAnswerText: correctAnswerText,
                isCorrect: answer.is_correct,
                match_prompts: JSON.parse(answer.match_prompts || '[]'),
                chosen_answers_match: answer.questionType === 'match' ? userAnswers : [],
                correct_answers_match: answer.questionType === 'match' ? correctAnswerText : [],
            };
        });

        return {
            summary: {
                id: summary.id,
                testId: summary.test_id,
                testName: summary.testName,
                fio: summary.fio,
                score: summary.score,
                total: summary.total,
                percentage: summary.percentage,
                passed: summary.passed,
                date: summary.date,
                status: summary.status,
                time_spent: summary.time_spent,
            },
            protocol: protocol
        };
    },
  };
};
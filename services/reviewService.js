// ===================================================================
// Файл: services/reviewService.js (ПОЛНАЯ ИТОГОВАЯ ВЕРСИЯ С ИСПРАВЛЕНИЕМ)
// ===================================================================

const { sendEvent } = require('../event-emitter');
const protocolService = require('./protocolService');

module.exports = (db) => {
  const ps = protocolService(db);

  return {
    /**
     * Получает все ответы, ожидающие ручной проверки, для конкретного результата.
     * @param {number} resultId - ID результата.
     * @returns {Promise<Array<object>>}
     */
    getPending: async (resultId) => {
      const answersToReview = await db('answers')
        .join('questions', 'answers.question_id', 'questions.id')
        .select(
          'answers.id as answerId',
          'questions.text as questionText',
          db.raw("json_extract(answers.user_answer, '$[0]') as userAnswer")
        )
        .where('answers.result_id', resultId)
        .andWhere('answers.review_status', 'pending');
      
      return answersToReview;
    },

    /**
     * Обрабатывает пачку вердиктов, пересчитывает результат и уведомляет клиентов.
     * @param {Array<{answerId: number, isCorrect: boolean}>} verdicts - Массив вердиктов.
     * @returns {Promise<void>}
     */
    submitBatch: async (verdicts) => {
      if (!verdicts || verdicts.length === 0) {
        throw new Error('Массив вердиктов не может быть пустым.');
      }

      let resultId = null;

      await db.transaction(async (trx) => {
        const firstAnswer = await trx('answers').where('id', verdicts[0].answerId).select('result_id').first();
        if (!firstAnswer) {
            throw new Error('Ответ для проверки не найден в базе данных.');
        }
        resultId = firstAnswer.result_id;
        
        for (const verdict of verdicts) {
            await trx('answers').where('id', verdict.answerId).update({
                is_correct: verdict.isCorrect,
                review_status: 'manual_' + (verdict.isCorrect ? 'correct' : 'incorrect')
            });
        }
        
        const totalResult = await trx('answers').where('result_id', resultId).count('id as total').first();
        const scoreResult = await trx('answers').where({ result_id: resultId, is_correct: true }).count('id as score').first();
        const resultInfo = await trx('results').where('id', resultId).select('test_id').first();
        const testSettings = await trx('test_settings').where('test_id', resultInfo.test_id).select('passing_score').first();
        
        const total = Number(totalResult.total);
        const score = Number(scoreResult.score);

        // === КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ ЗДЕСЬ ===
        // 1. Рассчитываем итоговый процент.
        const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
        // 2. Сравниваем ПРОЦЕНТ с `passing_score`.
        const passed = percentage >= (testSettings.passing_score || 70);

        await trx('results').where('id', resultId).update({ 
            score, 
            total, 
            percentage, 
            passed, 
            status: 'completed' 
        });
      });
      
      if (resultId) {
          const finalResultData = await db('results').where('id', resultId).first();
          sendEvent({ resultId, finalResultData }, 'result-reviewed');
      }
    },
  };
};
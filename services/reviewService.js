// ===================================================================
// Файл: services/reviewService.js (ПОЛНАЯ, ФИНАЛЬНАЯ, ЭТАЛОННАЯ ВЕРСЯ)
// Описание: Этот сервис управляет процессом ручной проверки ответов.
// Он получает вопросы для проверки, принимает вердикты от администратора,
// пересчитывает итоговый результат и уведомляет пользователя о завершении.
// ===================================================================

const { sendEvent } = require('../event-emitter');
const protocolService = require('./protocolService');

/**
 * Фабричная функция для создания сервиса ручной проверки.
 * @param {object} db - Экземпляр Knex.js.
 * @returns {object} - Объект с методами сервиса.
 */
module.exports = (db) => {
  // Инициализируем сервис протоколов, так как он понадобится для отправки финального результата.
  const ps = protocolService(db);

  return {
    /**
     * Получает все ответы, ожидающие ручной проверки, для конкретного результата.
     * @param {number} resultId - ID результата.
     * @returns {Promise<Array<object>>} - Массив объектов с данными для проверки.
     */
    getPending: async (resultId) => {
      const answersToReview = await db('answers')
        .join('questions', 'answers.question_id', 'questions.id')
        .select(
          'answers.id as answerId',
          'questions.text as questionText',
          // Извлекаем текстовый ответ пользователя из JSON-массива
          db.raw("json_extract(answers.user_answer, '$[0]') as userAnswer")
        )
        .where('answers.result_id', resultId)
        .andWhere('answers.review_status', 'pending');
      
      return answersToReview;
    },

    /**
     * Обрабатывает пачку вердиктов от администратора, обновляет ответы,
     * пересчитывает итоговый результат и отправляет SSE-уведомление пользователю.
     * @param {Array<{answerId: number, isCorrect: boolean}>} verdicts - Массив вердиктов.
     * @returns {Promise<void>}
     */
    submitBatch: async (verdicts) => {
      if (!verdicts || verdicts.length === 0) {
        throw new Error('Массив вердиктов не может быть пустым.');
      }

      let resultId = null;
      let finalPayload = null;

      // Вся логика обновления должна быть в транзакции, чтобы гарантировать целостность данных.
      await db.transaction(async (trx) => {
        // 1. Определяем ID результата по первому ответу.
        const firstAnswer = await trx('answers').where('id', verdicts[0].answerId).select('result_id').first();
        if (!firstAnswer) {
            throw new Error('Ответ для проверки не найден в базе данных.');
        }
        resultId = firstAnswer.result_id;
        
        // 2. Обновляем каждый ответ согласно вердикту.
        for (const verdict of verdicts) {
            await trx('answers').where('id', verdict.answerId).update({
                is_correct: verdict.isCorrect,
                review_status: 'manual_' + (verdict.isCorrect ? 'correct' : 'incorrect')
            });
        }
        
        // 3. Пересчитываем итоговые метрики.
        const totalResult = await trx('answers').where('result_id', resultId).count('id as total').first();
        const scoreResult = await trx('answers').where({ result_id: resultId, is_correct: true }).count('id as score').first();
        
        // 4. Получаем проходной балл для теста.
        const resultInfo = await trx('results').where('id', resultId).select('test_id').first();
        const testSettings = await trx('test_settings').where('test_id', resultInfo.test_id).select('passing_score').first();
        
        const total = Number(totalResult.total);
        const score = Number(scoreResult.score);
        const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
        const passed = percentage >= (testSettings.passing_score || 70); // Используем 70% как fallback

        // 5. Обновляем запись в таблице results.
        await trx('results').where('id', resultId).update({ 
            score, 
            total, 
            percentage, 
            passed, 
            status: 'completed' 
        });

        // === КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: Готовим данные для SSE ВНУТРИ транзакции ===
        // Это гарантирует, что мы отправим клиенту самые актуальные данные.
        const finalResultSummary = await trx('results').where('id', resultId).first();
        const testInfo = await trx('tests').where('id', finalResultSummary.test_id).first();
        
        // Передаем транзакцию `trx` в сервис протоколов.
        const { protocol } = await ps.getProtocol(resultId, trx);

        finalPayload = {
            ...finalResultSummary,
            testName: testInfo.name,
            protocolData: protocol,
        };
      });
      
      // 6. Отправляем событие ПОСЛЕ успешного завершения транзакции.
      if (resultId && finalPayload) {
          // Отправляем событие 'result-reviewed'. Клиентский sse-client.js его поймает.
          sendEvent({ resultId, finalResultData: finalPayload }, 'result-reviewed');
      }
    },
  };
};
// ===================================================================
// Файл: services/testTakingService.js (ПОЛНАЯ ФИНАЛЬНАЯ ВЕРСИЯ С ИСПРАВЛЕНИЯМИ СОВМЕСТИМОСТИ)
// ===================================================================

const { sendEvent } = require('../event-emitter');
const protocolService = require('./protocolService');

/**
 * Фабричная функция для создания сервиса прохождения тестов.
 * @param {object} db - Экземпляр Knex.js.
 * @returns {object} - Объект с методами сервиса.
 */
module.exports = (db) => {
  const ps = protocolService(db);

  return {
    /**
     * Подготавливает данные для прохождения теста.
     */
    async getTestForPassing(testId) {
      const settings = await db('test_settings').where({ test_id: testId }).first();
      if (!settings) {
        throw new Error('Настройки для теста не найдены.');
      }

      // === КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ 1.1: Убран FILTER, несовместимый с SQLite. Используется подзапрос. ===
      const questions = await db('questions as q')
        .select(
          'q.id', 'q.text', 'q.type', 'q.match_prompts', 'q.match_answers',
          db.raw(`(
            SELECT json_group_array(json_object('id', o.id, 'text', o.text))
            FROM options o
            WHERE o.question_id = q.id
          ) as options`)
        )
        .where('q.test_id', testId)
        .orderByRaw('RANDOM()')
        .limit(settings.questions_per_test);

      return {
        questions: questions.map(q => ({
          ...q,
          options: q.options ? JSON.parse(q.options) : [],
          match_prompts: q.match_prompts ? JSON.parse(q.match_prompts) : [],
          match_answers: q.match_answers ? JSON.parse(q.match_answers) : [],
        })),
        duration: settings.duration_minutes,
      };
    },

    /**
     * Обрабатывает ответы пользователя и сохраняет результат.
     */
    async processAndSaveResults({ testId, fio, userAnswers, startTime }) {
        const settings = await db('test_settings').where({ test_id: testId }).first();
        const test = await db('tests').where({ id: testId }).first();
        if (!settings || !test) throw new Error('Тест или его настройки не найдены.');

        const endTime = Date.now(); // Засекаем время окончания
        const timeLimit = settings.duration_minutes * 60 * 1000;
        if (endTime > startTime + timeLimit + 5000) { // Проверяем с endTime
            throw new Error('Время на выполнение теста истекло.');
        }
        
        // === НОВОЕ: Вычисляем и добавляем время прохождения в секундах ===
        const timeSpentSeconds = Math.round((endTime - startTime) / 1000);

        const questionIds = userAnswers.map(a => a.questionId);
        const questionsFromDb = await db('questions').whereIn('id', questionIds);
        const questionsMap = new Map(questionsFromDb.map(q => [q.id, q]));

        let score = 0;
        let hasPendingReview = false;
        const answersToSave = [];

        for (const userAnswer of userAnswers) {
            const question = questionsMap.get(userAnswer.questionId);
            if (!question) continue;

            let isCorrect = false;
            let reviewStatus = 'auto';

            if (question.type === 'text_input') {
                reviewStatus = userAnswer.answerIds.length > 0 ? 'pending' : 'auto';
                hasPendingReview = reviewStatus === 'pending' || hasPendingReview;
            } else if (question.type === 'match') {
                const correctAnswers = JSON.parse(question.match_answers || '[]');
                isCorrect = JSON.stringify(correctAnswers) === JSON.stringify(userAnswer.answerIds);
                if (isCorrect) score++;
            } else {
                const correctKeys = new Set(JSON.parse(question.correct_option_key || '[]'));
                const userKeys = new Set(userAnswer.answerIds.map(id => id.split('-').pop()));
                isCorrect = correctKeys.size === userKeys.size && [...correctKeys].every(key => userKeys.has(key));
                if (isCorrect) score++;
            }
            
            answersToSave.push({
                question_id: question.id,
                user_answer: JSON.stringify(userAnswer.answerIds),
                is_correct: isCorrect,
                review_status: reviewStatus,
            });
        }

        const total = userAnswers.length;
        const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

        const questionsTarget = Math.max(1, settings.questions_per_test || total || 1);
        const defaultPassingScore = Math.ceil(questionsTarget * 0.7);
        const normalizedPassingScore = Math.max(
            1,
            Math.min(settings.passing_score || defaultPassingScore, questionsTarget)
        );

        const passed = !hasPendingReview && (score >= normalizedPassingScore);

        const resultData = {
            test_id: testId,
            fio,
            score,
            total,
            percentage,
            passed,
            status: hasPendingReview ? 'pending_review' : 'completed',
            date: new Date(endTime).toISOString(), // Используем endTime для даты
            time_spent: timeSpentSeconds, // <-- ВОТ ОНО, НОВОЕ ПОЛЕ!
        };
        
        const newResultId = await db.transaction(async (trx) => {
            const [insertedId] = await trx('results').insert(resultData);
            const resultId = insertedId; 

            if (answersToSave.length > 0) {
                await trx('answers').insert(answersToSave.map(a => ({ ...a, result_id: resultId })));
            }
            return resultId;
        });
        
        const eventName = hasPendingReview ? 'new-pending-result' : 'new-result';
        const eventData = { testId, testName: test.name, fio, id: newResultId };
        sendEvent(eventData, eventName);

        if (hasPendingReview) {
            return { status: 'pending_review', resultId: newResultId };
        }
        
        const finalProtocolData = await ps.getProtocol(newResultId);
        
        return {
            status: 'completed',
            fio: finalProtocolData.summary.fio,
            score: finalProtocolData.summary.score,
            total: finalProtocolData.summary.total,
            percentage: finalProtocolData.summary.percentage,
            passed: finalProtocolData.summary.passed,
            protocolData: finalProtocolData.protocol,
        };
    }
  };
};
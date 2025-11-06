// ===================================================================
// Файл: services/testTakingService.js (ПОЛНАЯ ИТОГОВАЯ ВЕРСИЯ С ИСПРАВЛЕНИЕМ)
// ===================================================================
const { sendEvent } = require('../event-emitter');
const protocolService = require('./protocolService');

module.exports = (db) => {
  const ps = protocolService(db);

  return {
    /**
     * Подготавливает данные для прохождения теста.
     */
    async getTestForPassing(testId, startTime) {
      const settings = await db('test_settings').where({ test_id: testId }).first();
      if (!settings) {
        throw new Error('Настройки для теста не найдены.');
      }

      const questions = await db('questions')
        .leftJoin('options', 'questions.id', 'options.question_id')
        .select(
          'questions.id', 'questions.text', 'questions.type',
          'questions.match_prompts', 'questions.match_answers',
          db.raw("json_group_array(json_object('id', options.id, 'text', options.text)) FILTER (WHERE options.id IS NOT NULL) as options")
        )
        .where('questions.test_id', testId)
        .groupBy('questions.id')
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
     * Обрабатывает ответы пользователя, сохраняет результат и возвращает данные для отображения.
     */
    async processAndSaveResults({ testId, fio, userAnswers, startTime }) {
        const settings = await db('test_settings').where({ test_id: testId }).first();
        const test = await db('tests').where({ id: testId }).first();
        if (!settings || !test) throw new Error('Тест или его настройки не найдены.');

        const timeLimit = settings.duration_minutes * 60 * 1000;
        if (Date.now() > startTime + timeLimit + 5000) { // 5 секунд погрешности
            throw new Error('Время на выполнение теста истекло.');
        }

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
            } else { // checkbox
                const correctKeys = new Set(JSON.parse(question.correct_option_key || '[]'));
                // ID опции приходит в формате "questionId-shortKey", нам нужен только shortKey
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
        // === КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ ЗДЕСЬ ===
        // 1. Рассчитываем процент правильных ответов.
        const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
        // 2. Сравниваем ПРОЦЕНТ с `passing_score`, который тоже является процентом.
        const passed = !hasPendingReview && (percentage >= settings.passing_score);

        const resultData = {
            test_id: testId,
            fio,
            score,
            total,
            // Если есть ручная проверка, итоговый процент пока 0.
            percentage: hasPendingReview ? 0 : percentage,
            passed: passed,
            status: hasPendingReview ? 'pending_review' : 'completed',
        };
        
        const newResultId = await db.transaction(async (trx) => {
            const [inserted] = await trx('results').insert(resultData).returning('id');
            const resultId = typeof inserted === 'object' ? inserted.id : inserted;
            if (answersToSave.length > 0) {
                await trx('answers').insert(answersToSave.map(a => ({ ...a, result_id: resultId })));
            }
            return resultId;
        });
        
        sendEvent({ testId, testName: test.name, fio, id: newResultId }, 'new-result');

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
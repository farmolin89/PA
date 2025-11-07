// ===================================================================
// Файл: services/protocolService.js (ПОЛНАЯ ФИНАЛЬНАЯ ВЕРСИЯ С ИСПРАВЛЕНИЕМ СОРТИРОВКИ)
// ===================================================================

/**
 * Безопасный парсер JSON.
 */
function safeJsonParse(jsonString, defaultValue = []) {
    try {
        if (!jsonString) return defaultValue;
        return JSON.parse(jsonString);
    } catch (e) {
        console.warn(`[safeJsonParse] Ошибка парсинга JSON: "${jsonString}".`);
        return defaultValue;
    }
}

/**
 * Внутренняя функция для сборки протокола.
 */
async function buildProtocol(resultId, db) {
    const summary = await db('results').where({ id: resultId }).first();
    if (!summary) {
        throw new Error(`Результат с ID ${resultId} для формирования протокола не найден.`);
    }

    const answersFromDb = await db('answers')
        .join('questions', 'answers.question_id', 'questions.id')
        .where('result_id', resultId)
        .select(
            'questions.text as questionText', 'questions.type', 'questions.explain as explanation', 
            'questions.correct_option_key', 'questions.match_answers', 'answers.user_answer', 
            'answers.is_correct as isCorrect', 'questions.id as questionId', 'questions.match_prompts'
        );

    const questionIds = answersFromDb.map(a => a.questionId);
    const allOptions = questionIds.length > 0 ? await db('options').whereIn('question_id', questionIds) : [];
    
    const optionsByQuestion = allOptions.reduce((acc, opt) => {
        if (!acc[opt.question_id]) acc[opt.question_id] = [];
        acc[opt.question_id].push(opt);
        return acc;
    }, {});

    const protocol = answersFromDb.map((ans) => {
        let chosenAnswerText = '—';
        let correctAnswerText = '—';
        
        const userAnswerIds = safeJsonParse(ans.user_answer, []);

        if (ans.type === 'checkbox') {
            const questionOptions = optionsByQuestion[ans.questionId] || [];
            const correctOptionKeys = new Set(safeJsonParse(ans.correct_option_key, []));
            
            chosenAnswerText = questionOptions
                .filter(opt => userAnswerIds.includes(opt.id))
                .map(opt => opt.text)
                .join(', ') || '—';

            correctAnswerText = questionOptions
                .filter(opt => {
                    const shortKey = opt.id.substring(opt.id.lastIndexOf('-') + 1);
                    return correctOptionKeys.has(shortKey);
                })
                .map(opt => opt.text)
                .join(', ') || '—';

        } else if (ans.type === 'text_input') {
            chosenAnswerText = userAnswerIds[0] || '—';
            correctAnswerText = 'Требует ручной проверки';
        
        } else if (ans.type === 'match') {
            const correctAnswersMatch = safeJsonParse(ans.match_answers, []);
            chosenAnswerText = userAnswerIds.join(', ') || '—';
            correctAnswerText = correctAnswersMatch.join(', ') || '—';
        }

        return {
            questionText: ans.questionText,
            explanation: ans.explanation,
            isCorrect: ans.isCorrect,
            chosenAnswerText,
            correctAnswerText,
            type: ans.type,
            match_prompts: safeJsonParse(ans.match_prompts, []),
            chosen_answers_match: ans.type === 'match' ? userAnswerIds : [],
            correct_answers_match: ans.type === 'match' ? safeJsonParse(ans.match_answers, []) : [],
        };
    });

    return { summary, protocol };
}

/**
 * Фабричная функция, которая создает и экспортирует объект сервиса.
 */
module.exports = (db) => {
    return {
        /**
         * Публичный метод для получения протокола.
         */
        getProtocol: async (resultId, trx = db) => {
            return buildProtocol(resultId, trx);
        },
        
        /**
         * Находит протокол последнего УСПЕШНО сданного теста для конкретного пользователя.
         */
        findLastPassedProtocol: async (testId, fio) => {
            // === КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ 2.1: Заменено 'created_at' на 'date' ===
            const lastPassedResult = await db('results')
                .where({ test_id: testId, fio: fio, passed: true })
                .orderBy('date', 'desc') // Сортируем по реальной колонке 'date'
                .first();

            if (!lastPassedResult) {
                return null;
            }
            
            const { protocol, summary } = await buildProtocol(lastPassedResult.id, db);
            const test = await db('tests').where('id', summary.test_id).first();

            return {
                ...summary,
                testName: test ? test.name : 'Неизвестный тест',
                protocolData: protocol,
            };
        }
    };
};
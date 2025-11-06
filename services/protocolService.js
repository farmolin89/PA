// ===================================================================
// Файл: services/protocolService.js (ПОЛНАЯ, ФИНАЛЬНАЯ, ПРОВЕРЕННАЯ ВЕРСИЯ)
// ===================================================================

/**
 * Безопасный парсер JSON, который возвращает значение по умолчанию в случае ошибки.
 * Это защищает приложение от падения, если в базе данных окажутся некорректные данные.
 * @param {string} jsonString - Строка для парсинга.
 * @param {any} [defaultValue=[]] - Значение, которое вернется в случае ошибки.
 * @returns {any}
 */
function safeJsonParse(jsonString, defaultValue = []) {
    try {
        if (!jsonString) return defaultValue;
        return JSON.parse(jsonString);
    } catch (e) {
        console.warn(`[safeJsonParse] Ошибка парсинга JSON: ${e.message}. Использовано значение по умолчанию.`);
        return defaultValue;
    }
}

/**
 * Внутренняя функция для сборки протокола. Вынесена отдельно и оптимизирована.
 * @param {number} resultId - ID результата.
 * @param {object} db - Экземпляр Knex.
 */
async function buildProtocol(resultId, db) {
    // 1. Получаем основную информацию о результате (сводку)
    const summary = await db('results').where({ id: resultId }).first();
    if (!summary) {
        throw new Error(`Результат с ID ${resultId} для формирования протокола не найден.`);
    }

    // 2. Получаем все ответы и данные по соответствующим вопросам одним запросом
    const answersFromDb = await db('answers')
        .join('questions', 'answers.question_id', 'questions.id')
        .where('result_id', resultId)
        .select(
            'questions.text as questionText', 
            'questions.type', 
            'questions.explain as explanation', 
            'questions.correct_option_key',
            'questions.match_answers',
            'answers.user_answer', 
            'answers.is_correct as isCorrect',
            'questions.id as questionId',
            'questions.match_prompts'
        );

    // 3. ОПТИМИЗАЦИЯ: Получаем все варианты ответов для всех вопросов одним запросом
    const questionIds = answersFromDb.map(a => a.questionId);
    const allOptions = questionIds.length > 0 ? await db('options').whereIn('question_id', questionIds) : [];
    
    // Группируем опции по ID вопроса для быстрого доступа
    const optionsByQuestion = allOptions.reduce((acc, opt) => {
        if (!acc[opt.question_id]) acc[opt.question_id] = [];
        acc[opt.question_id].push(opt);
        return acc;
    }, {});

    // 4. Форматируем каждый ответ в удобный для клиента вид (теперь без await внутри цикла)
    const protocol = await Promise.all(answersFromDb.map(async (ans) => {
        let chosenAnswerText = '—';
        let correctAnswerText = '—';
        
        const userAnswer = safeJsonParse(ans.user_answer, []);

        if (ans.type === 'checkbox') {
            const questionOptions = optionsByQuestion[ans.questionId] || [];
            const correctKeys = safeJsonParse(ans.correct_option_key, []);
            
            chosenAnswerText = questionOptions
                .filter(opt => userAnswer.includes(opt.id))
                .map(opt => opt.text)
                .join(', ') || '—';

            correctAnswerText = questionOptions
                .filter(opt => correctKeys.includes(opt.id.substring(opt.id.lastIndexOf('-') + 1)))
                .map(opt => opt.text)
                .join(', ');

        } else if (ans.type === 'text_input') {
            chosenAnswerText = userAnswer[0] || '—';
            correctAnswerText = 'Требует ручной проверки';
        
        } else if (ans.type === 'match') {
            const match_prompts = safeJsonParse(ans.match_prompts, []);
            const correct_answers_match = safeJsonParse(ans.match_answers, []);
            const chosen_answers_match = userAnswer;

            chosenAnswerText = match_prompts.map((prompt, index) => 
                `${prompt} → ${chosen_answers_match[index] || '—'}`
            ).join('; ');

            correctAnswerText = match_prompts.map((prompt, index) => 
                `${prompt} → ${correct_answers_match[index] || '—'}`
            ).join('; ');
        }

        return {
            questionText: ans.questionText,
            explanation: ans.explanation,
            isCorrect: ans.isCorrect,
            chosenAnswerText,
            correctAnswerText,
            // Данные для match-вопросов оставляем для фронтенда
            type: ans.type,
            match_prompts: safeJsonParse(ans.match_prompts, []),
            chosen_answers_match: ans.type === 'match' ? userAnswer : [],
            correct_answers_match: ans.type === 'match' ? safeJsonParse(ans.match_answers, []) : [],
        };
    }));

    return { summary, protocol };
}

// Фабричная функция, которая создает и экспортирует объект сервиса
module.exports = (db) => {
    return {
        /**
         * Публичный метод для получения протокола.
         * @param {number} resultId - ID результата.
         * @param {object} [trx=db] - Опциональный объект транзакции Knex.
         */
        getProtocol: async (resultId, trx = db) => {
            return buildProtocol(resultId, trx);
        },
        
        /**
         * Находит протокол последнего УСПЕШНО сданного теста для пользователя.
         * @param {string} testId - UUID теста.
         * @param {string} fio - ФИО пользователя.
         */
        findLastPassedProtocol: async (testId, fio) => {
            const lastPassedResult = await db('results')
                .where({ test_id: testId, fio: fio, passed: true })
                .orderBy('date', 'desc')
                .first();

            if (!lastPassedResult) {
                return null;
            }
            
            const { protocol } = await buildProtocol(lastPassedResult.id, db);

            // Формируем итоговый объект, который ожидает клиент
            return {
                ...lastPassedResult,
                protocolData: protocol,
            };
        }
    };
};
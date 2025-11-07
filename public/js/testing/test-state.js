// ===================================================================
// Файл: public/js/testing/test-state.js (ПОЛНАЯ ИТОГОВАЯ ВЕРСИЯ)
// Описание: Единственный источник правды для состояния приложения.
// Адаптирован для сбора ответов из новой HTML-структуры.
// ===================================================================

import { 
    FIO_SESSION_KEY, 
    ACTIVE_TEST_SESSION_KEY, 
    LAST_RESULT_SESSION_KEY, 
    PENDING_RESULT_SESSION_KEY 
} from './constants.js';

class TestState {
    /**
     * Инициализирует начальное состояние, пытаясь загрузить ФИО из sessionStorage.
     */
    constructor() {
        this.state = {
            userFIO: sessionStorage.getItem(FIO_SESSION_KEY) || null,
            currentTestId: null,
            currentTestName: null,
            started: false,
            attempted: false,
            currentQuestionIndex: 0,
            testQuestions: [],
            testTimerInterval: null,
            totalTime: 0, // Общее время теста в секундах
            testEndTime: 0, // Временная метка окончания теста (timestamp)
            pendingResultId: null,
        };
    }

    /**
     * Возвращает копию текущего состояния, чтобы предотвратить прямое изменение извне.
     * @returns {object} - Текущее состояние приложения.
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Обновляет глобальное состояние и сохраняет необходимые данные в sessionStorage.
     * @param {object} newState - Объект с новыми значениями для состояния.
     */
    setState(newState) {
        Object.assign(this.state, newState);
        
        // Централизованное и явное управление sessionStorage для ФИО.
        if (Object.prototype.hasOwnProperty.call(newState, 'userFIO')) {
            if (newState.userFIO) {
                sessionStorage.setItem(FIO_SESSION_KEY, newState.userFIO);
            } else {
                sessionStorage.removeItem(FIO_SESSION_KEY);
            }
        }

        // Если тест был начат, помечаем его ID как активный в сессии.
        if (newState.started === true && newState.currentTestId) {
            sessionStorage.setItem(ACTIVE_TEST_SESSION_KEY, newState.currentTestId);
        }
    }

    /**
     * Собирает ответы пользователя из DOM в правильном формате (массив объектов),
     * который ожидает сервер.
     * @returns {Array<object>} - Массив ответов, готовый к отправке.
     */
    collectAnswers() {
        const userAnswers = [];
        // Используем NodeList, который мы сохраняем при генерации вопросов
        const questionsElements = document.querySelectorAll('.question');
        
        questionsElements.forEach(questionDiv => {
            const questionId = questionDiv.dataset.questionId;
            if (!questionId) return;

            const type = questionDiv.dataset.questionType;
            let collectedAnswerIds = [];
    
            if (type === 'match') {
                const optionElements = questionDiv.querySelectorAll('.match-item.option');
                // Бэкенд (testTakingService.js) ожидает массив строк с текстом ответов 
                // в том порядке, в котором их расположил пользователь.
                collectedAnswerIds = Array.from(optionElements).map(el => el.textContent.trim());
            } else if (type === 'text_input') {
                const answerText = questionDiv.querySelector('.text-answer-input').value.trim();
                // Отправляем ответ только если он не пустой
                if (answerText) {
                    collectedAnswerIds = [answerText];
                }
            } else { // 'checkbox' - тип по умолчанию
                collectedAnswerIds = Array.from(questionDiv.querySelectorAll(`input:checked`)).map(cb => cb.value);
            }
            
            userAnswers.push({
                questionId: questionId,
                answerIds: collectedAnswerIds
            });
        });
        
        return userAnswers;
    }
    
    /**
     * Сбрасывает состояние теста после его завершения, но сохраняет ФИО пользователя.
     */
    reset() {
        const currentUserFIO = this.state.userFIO;
        
        if (this.state.testTimerInterval) {
            clearInterval(this.state.testTimerInterval);
        }
        
        // Создаем новый "чистый" объект состояния, чтобы не осталось старых полей
        const initialState = new TestState().getState();
        this.state = {
            ...initialState,
            userFIO: currentUserFIO // Восстанавливаем ФИО
        };

        // Гарантированно очищаем sessionStorage от данных о последнем тесте.
        sessionStorage.removeItem(ACTIVE_TEST_SESSION_KEY);
        sessionStorage.removeItem(LAST_RESULT_SESSION_KEY);
        sessionStorage.removeItem(PENDING_RESULT_SESSION_KEY);
    }
    
    /**
     * Полностью сбрасывает сессию пользователя, включая ФИО.
     */
    logout() {
        this.reset();
        // Теперь этот вызов гарантированно очистит и состояние, и sessionStorage
        this.setState({ userFIO: null });
    }
}

// Экспортируем единственный экземпляр класса (паттерн Singleton),
// чтобы все модули работали с одним и тем же состоянием.
export const testState = new TestState();
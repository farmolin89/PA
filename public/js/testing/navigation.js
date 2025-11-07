// ===================================================================
// Файл: public/js/testing/navigation.js (ПОЛНАЯ ИТОГОВАЯ ВЕРСИЯ)
// Описание: Управляет UI на экране прохождения теста: рендеринг
// вопросов, навигации, кнопок и обновление их состояния.
// ===================================================================

import { testState } from './test-state.js';
import { escapeHTML } from '../utils/utils.js';

/**
 * Вспомогательная функция для перемешивания массива (алгоритм Фишера — Йетса).
 * @param {Array} array - Массив для перемешивания.
 * @returns {Array} - Тот же массив, но перемешанный.
 */
function shuffleArray(array) {
    // Создаем копию, чтобы не изменять исходный массив
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

/**
 * Создает базовую HTML-структуру (каркас) для экрана прохождения теста.
 * @param {HTMLElement} testContentElement - DOM-элемент, в который будет вставлена разметка.
 */
export function renderQuizLayout(testContentElement) {
    if (!testContentElement) return;
    
    testContentElement.innerHTML = `
        <div class="timer-container">
            <div class="timer" id="timer">
                <svg class="timer-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="2"/>
                    <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span class="timer-text" id="timerText">Осталось времени: 00:00</span>
            </div>
        </div>
        <div class="progress-text" id="progressText">Вопрос 1 из N</div>
        <div class="progress-container">
            <div class="progress-bar" id="progressBar" style="width: 0%"></div>
        </div>
        <div class="questions-navigation" id="questionsNavigation"></div>
        <div id="questionContainer">
            <!-- Сюда будут рендериться сами вопросы -->
        </div>
        <div class="test-actions">
            <div class="nav-buttons-group">
                <button class="nav-btn" id="prevQuestionBtn" disabled>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"></path></svg>
                    Предыдущий вопрос
                </button>
            </div>
            <div class="nav-buttons-group">
                <button class="nav-btn" id="nextQuestionNavBtn">
                    Следующий вопрос
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"></path></svg>
                </button>
                <button class="submit-btn hidden" id="finishTestBtn">Завершить тест</button>
            </div>
        </div>
    `;
}

/**
 * Генерирует HTML-разметку для всех вопросов и вставляет ее в #questionContainer.
 * @param {Array<object>} testQuestions - Массив объектов вопросов.
 * @returns {NodeListOf<Element>} - Коллекция созданных DOM-элементов вопросов.
 */
export function generateQuestionsHTML(testQuestions) {
    const questionContainer = document.getElementById('questionContainer');
    if (!questionContainer) {
        console.error('Критическая ошибка: Элемент #questionContainer не найден!');
        return [];
    }
    
    questionContainer.innerHTML = '';

    testQuestions.forEach((qData, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question';
        questionDiv.dataset.questionId = qData.id;
        questionDiv.dataset.questionType = qData.type || 'checkbox';
        questionDiv.style.display = 'none'; // По умолчанию все вопросы скрыты

        let optionsHTML = '';
        if (qData.type === 'match') {
            const shuffledAnswers = shuffleArray(qData.match_answers || []);
            const promptsHtml = (qData.match_prompts || []).map(p => `<div class="match-item stem">${escapeHTML(p)}</div>`).join('');
            const answersHtml = shuffledAnswers.map(a => `<div class="match-item option" draggable="true">${escapeHTML(a)}</div>`).join('');

            optionsHTML = `
                <div class="match-container-grid">
                    <div class="match-column prompts-column">${promptsHtml}</div>
                    <div class="match-column options-column">${answersHtml}</div>
                </div>`;
            
        } else if (qData.type === 'text_input') {
            optionsHTML = `<textarea class="text-answer-input" placeholder="Введите ваш ответ..."></textarea>`;
        } else { // 'checkbox' - основной тип
            optionsHTML = `<div class="options">
                ${shuffleArray(qData.options).map(option => `
                    <label class="option">
                        <input type="checkbox" name="${qData.id}" value="${option.id}">
                        <span class="checkmark"></span>
                        <span class="option-text">${escapeHTML(option.text)}</span>
                    </label>
                `).join('')}
            </div>`;
        }

        questionDiv.innerHTML = `
            <div class="question-title">${index + 1}. ${escapeHTML(qData.text)}</div>
            <div class="question-options">${optionsHTML}</div>`;
        questionContainer.appendChild(questionDiv);
    });

    // Инициализация перетаскивания для вопросов на сопоставление
    document.querySelectorAll('.options-column').forEach(container => {
        if (typeof Sortable !== 'undefined') {
            new Sortable(container, {
                animation: 150,
                ghostClass: 'dragging',
                group: `match-group-${Math.random()}`, // Уникальная группа для каждого вопроса
                onEnd: function() {
                    const event = new Event('input', { bubbles: true, cancelable: true });
                    container.dispatchEvent(event);
                }
            });
        } else {
            console.warn('Библиотека Sortable.js не загружена. Функционал Drag-and-drop для вопросов "на соответствие" не будет работать.');
        }
    });

    return document.querySelectorAll('.question');
}

/**
 * Восстанавливает выбранные ответы из сохраненной сессии.
 * @param {Array<object>} answers - Массив с ответами.
 * @param {NodeListOf<Element>} questionsElements - Коллекция всех элементов вопросов.
 */
export function restoreAnswers(answers, questionsElements) {
    questionsElements.forEach(questionDiv => {
        const questionId = questionDiv.dataset.questionId;
        const answerData = answers.find(a => a.questionId === questionId);
        if (!answerData || !Array.isArray(answerData.answerIds)) return;

        const answerIds = answerData.answerIds;
        const type = questionDiv.dataset.questionType;

        if (type === 'text_input') {
            const textarea = questionDiv.querySelector('.text-answer-input');
            if (textarea) textarea.value = answerIds[0] || '';
        } else if (type === 'match') {
            const optionsColumn = questionDiv.querySelector('.options-column');
            if (!optionsColumn) return;

            // Собираем все доступные DOM-элементы ответов в карту для быстрого поиска
            const availableOptions = new Map();
            optionsColumn.querySelectorAll('.match-item.option').forEach(opt => {
                availableOptions.set(opt.textContent.trim(), opt);
            });

            optionsColumn.innerHTML = ''; // Очищаем контейнер

            // Восстанавливаем элементы в сохраненном порядке
            answerIds.forEach(savedText => {
                const optionElement = availableOptions.get(savedText.trim());
                if (optionElement) {
                    optionsColumn.appendChild(optionElement); // Физически перемещаем элемент
                }
            });

        } else { // checkbox
             answerIds.forEach(answerId => {
                const checkbox = questionDiv.querySelector(`input[value="${answerId}"]`);
                if (checkbox) {
                    checkbox.checked = true;
                    checkbox.closest('.option')?.classList.add('selected');
                }
            });
        }
    });
}

/**
 * Показывает вопрос с указанным индексом и скрывает остальные.
 * @param {number} index - Индекс вопроса для показа.
 * @param {NodeListOf<Element>} questionsElements - Коллекция всех элементов вопросов.
 */
export function showQuestion(index, questionsElements) {
    questionsElements.forEach((q, i) => {
        q.style.display = (i === index) ? 'block' : 'none';
    });
}

/**
 * Централизованно обновляет все навигационные элементы.
 * @param {number} currentIndex - Индекс текущего вопроса.
 */
export function updateNavigation(currentIndex) {
    const { testQuestions } = testState.getState();
    const totalQuestions = testQuestions.length;
    if (totalQuestions === 0) return;

    const navSquares = document.querySelectorAll('.question-number');
    const currentAnswers = testState.collectAnswers();
    
    navSquares.forEach((square) => {
        const index = parseInt(square.dataset.index, 10);
        const questionId = testQuestions[index]?.id;
        const answer = currentAnswers.find(a => a.questionId === questionId);
        const isAnswered = answer && Array.isArray(answer.answerIds) && answer.answerIds.length > 0;
        
        square.classList.toggle('answered', isAnswered);
        square.classList.toggle('current', index === currentIndex);
    });

    document.getElementById('progressBar').style.width = `${((currentIndex + 1) / totalQuestions) * 100}%`;
    document.getElementById('progressText').textContent = `Вопрос ${currentIndex + 1} из ${totalQuestions}`;

    document.getElementById('prevQuestionBtn').disabled = (currentIndex === 0);
    const isLastQuestion = (currentIndex === totalQuestions - 1);
    document.getElementById('nextQuestionNavBtn').classList.toggle('hidden', isLastQuestion);
    document.getElementById('finishTestBtn').classList.toggle('hidden', !isLastQuestion);
}

/**
 * Создает панель навигации по вопросам (квадраты).
 * @param {Array<object>} questions - Массив вопросов.
 * @param {function} onNavClick - Коллбэк, вызываемый при клике.
 */
export function setupNavigator(questions, onNavClick) {
    const navContainer = document.getElementById('questionsNavigation');
    if (!navContainer) return;
    navContainer.innerHTML = '';

    questions.forEach((q, i) => {
        const square = document.createElement('div');
        square.className = 'question-number';
        square.textContent = i + 1;
        square.dataset.index = i;
        navContainer.appendChild(square);
    });

    navContainer.addEventListener('click', (e) => {
        const target = e.target.closest('.question-number');
        if (target) {
            onNavClick(parseInt(target.dataset.index, 10));
        }
    });
}
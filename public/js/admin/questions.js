// ===================================================================
// ФАЙЛ: public/js/admin/questions.js (ПОЛНАЯ, ФИНАЛЬНАЯ, ЭТАЛОННАЯ ВЕРСИЯ)
// Описание: Управляет всей логикой вкладки "Банк вопросов", включая
// отображение, создание, редактирование и удаление вопросов всех типов.
// ===================================================================

import { showToast } from './ui.js';
import { pluralize, escapeHTML } from '../utils/utils.js';
import { showConfirmModal, openModal, closeModal } from '../common/modals.js';
import { fetchAllQuestions, addQuestion, updateQuestion, deleteQuestions } from '../common/api-client.js';

let currentTestId = null;
let allQuestions = [];
let isQuestionFormDirty = false;
let tempOptionIdCounter = 0;

/**
 * Загружает все вопросы для текущего теста с сервера и инициирует их отображение.
 */
async function loadQuestions() {
    const container = document.getElementById('questionsListContainer');
    if (!container) return;
    container.innerHTML = '<div class="spinner"></div>';

    try {
        allQuestions = await fetchAllQuestions(currentTestId);
        const titleElement = document.querySelector('#tab-questions .admin-controls h2');
        if (titleElement) {
            const count = allQuestions.length;
            titleElement.textContent = `Банк Вопросов (${count} ${pluralize(count, 'question')})`;
        }
        renderQuestionsList(allQuestions);
    } catch (error) {
        container.innerHTML = `<div class="empty-state-message"><i class="fas fa-exclamation-triangle"></i><span>Не удалось загрузить вопросы.</span></div>`;
        console.error("Ошибка при загрузке вопросов:", error);
    }
}

/**
 * Отрисовывает HTML-список вопросов.
 */
function renderQuestionsList(questions) {
    const container = document.getElementById('questionsListContainer');
    if (!container) return;

    if (questions.length === 0) {
        container.innerHTML = `<div class="empty-state-message"><i class="fas fa-question-circle"></i><span>В этом тесте пока нет вопросов. Создайте первый!</span></div>`;
        updateBulkActionsUI();
        return;
    }

    const listHTML = questions.map((q, index) => `
        <div class="question-item" data-id="${q.id}" tabindex="0" role="button" aria-label="Редактировать вопрос ${index + 1}">
            <input type="checkbox" class="question-checkbox question-item-checkbox" data-id="${q.id}">
            <div class="question-text">
                <span class="question-number">${index + 1}.</span>
                ${escapeHTML(q.text)}
            </div>
            <div class="question-item-actions">
                <button type="button" class="btn-icon delete" data-id="${q.id}" title="Удалить">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        </div>
    `).join('');

    container.innerHTML = `<div class="questions-list">${listHTML}</div>`;
    updateBulkActionsUI();
}

/**
 * Обновляет UI для кнопок массовых действий.
 */
function updateBulkActionsUI() {
    const checkedCount = document.querySelectorAll('.question-item-checkbox:checked').length;
    const deleteBtn = document.getElementById('deleteSelectedQuestionsBtn');
    if (!deleteBtn) return;
    deleteBtn.textContent = `Удалить выбранные (${checkedCount})`;
    deleteBtn.classList.toggle('visible', checkedCount > 0);
}

/**
 * Выполняет API-запрос на удаление вопросов и обновляет UI.
 */
async function performDelete(idsToDelete) {
    if (idsToDelete.length === 0) return;
    try {
        await deleteQuestions(idsToDelete);
        showToast(`${idsToDelete.length} ${pluralize(idsToDelete.length, 'question')} удалено.`, 'success');
        await loadQuestions(); // Перезагружаем список
    } catch (error) {
        console.error("Ошибка при удалении вопросов:", error);
        // Глобальный обработчик в api-client.js покажет ошибку пользователю
    }
}

/**
 * Показывает модальное окно для подтверждения удаления вопросов.
 */
function confirmAndDeleteQuestions(idsToDelete) {
    if (idsToDelete.length === 0) return;
    const count = idsToDelete.length;
    showConfirmModal({
        title: `Удалить ${count} ${pluralize(count, 'question')}?`,
        text: 'Это действие необратимо.',
        confirmText: 'Да, удалить',
        onConfirm: () => performDelete(idsToDelete)
    });
}

/**
 * Показывает/скрывает блоки формы в зависимости от выбранного типа вопроса.
 */
function renderSpecificForm(type) {
    document.getElementById('optionsContainerWrapper').style.display = (type === 'checkbox') ? 'block' : 'none';
    document.getElementById('matchContainer').style.display = (type === 'match') ? 'block' : 'none';
    document.getElementById('textInputContainerWrapper').style.display = (type === 'text_input') ? 'block' : 'none';
}

/**
 * Подготавливает и открывает модальное окно для создания нового вопроса.
 */
function prepareAddQuestion() {
    tempOptionIdCounter = 0;
    document.getElementById('questionModalTitle').textContent = 'Добавить новый вопрос';
    document.getElementById('questionForm').reset();
    document.getElementById('questionIdInput').value = '';
    
    document.querySelectorAll('.type-selector-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.type-selector-btn[data-type="checkbox"]').classList.add('active');
    
    renderSpecificForm('checkbox');
    renderOptionsForm([], []);
    renderMatchForm([], []);
    isQuestionFormDirty = false;
    openModal(document.getElementById('questionModal'));
}

/**
 * Подготавливает и открывает модальное окно для редактирования существующего вопроса.
 */
function prepareEditQuestion(questionId) {
    tempOptionIdCounter = 0;
    const questionData = allQuestions.find(q => q.id === questionId);
    if (!questionData) return;

    document.getElementById('questionModalTitle').textContent = `Редактировать вопрос`;
    document.getElementById('questionIdInput').value = questionData.id;
    document.getElementById('questionTextInput').value = questionData.text;
    document.getElementById('questionExplainInput').value = questionData.explain || '';
    
    const questionType = questionData.type || 'checkbox';
    document.querySelectorAll('.type-selector-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === questionType);
    });
    
    renderSpecificForm(questionType);
    renderOptionsForm(questionData.options, questionData.correct);
    renderMatchForm(questionData.match_prompts, questionData.match_answers);
    
    const correctTextInput = document.getElementById('correctTextInput');
    correctTextInput.value = (questionType === 'text_input' && questionData.correct) ? questionData.correct[0] || '' : '';

    isQuestionFormDirty = false;
    openModal(document.getElementById('questionModal'));
}

function renderOptionsForm(options = [], correctOptionKeys = []) {
    const container = document.getElementById('optionsContainer');
    container.innerHTML = '';
    const correctSet = new Set(correctOptionKeys);
    (options.length > 0 ? options : [{ id: `temp_${++tempOptionIdCounter}`, text: '' }, { id: `temp_${++tempOptionIdCounter}`, text: '' }])
        .forEach(opt => {
            const shortKey = opt.id.substring(opt.id.lastIndexOf('-') + 1);
            addOptionToForm(shortKey, opt.text, correctSet.has(shortKey));
        });
}

function addOptionToForm(shortKey, text, isChecked) {
    const container = document.getElementById('optionsContainer');
    const optionHTML = `
        <div class="option-edit-item" data-key="${shortKey}">
            <input type="checkbox" name="correctOption" value="${shortKey}" id="cb_${shortKey}" ${isChecked ? 'checked' : ''}>
            <label for="cb_${shortKey}" class="option-label-char">${String.fromCharCode(65 + container.children.length)}</label>
            <textarea class="form-control" placeholder="Текст варианта ответа" rows="1">${escapeHTML(text)}</textarea>
            <button type="button" class="btn-icon delete-option"><i class="fas fa-trash-alt"></i></button>
        </div>`;
    container.insertAdjacentHTML('beforeend', optionHTML);
}

function renderMatchForm(prompts = [], answers = []) {
    const container = document.getElementById('matchPairsContainer');
    container.innerHTML = '';
    const pairs = prompts.map((prompt, i) => ({ prompt, answer: answers[i] || '' }));
    while (pairs.length < 2) pairs.push({ prompt: '', answer: '' });
    pairs.forEach(p => addMatchPairToForm(p.prompt, p.answer));
}

function addMatchPairToForm(prompt = '', answer = '') {
    const container = document.getElementById('matchPairsContainer');
    const div = document.createElement('div');
    div.className = 'match-pair-item';
    div.innerHTML = `
        <div><input type="text" class="form-control match-prompt-input" placeholder="Левая часть" value="${escapeHTML(prompt)}"></div>
        <div class="pair-separator"><i class="fas fa-arrows-alt-h"></i></div>
        <div><input type="text" class="form-control match-answer-input" placeholder="Правая часть" value="${escapeHTML(answer)}"></div>
        <button type="button" class="btn-icon delete-match-pair"><i class="fas fa-trash-alt"></i></button>`;
    container.appendChild(div);
}

function attemptToCloseQuestionModal() {
    if (isQuestionFormDirty) {
        showConfirmModal({ 
            title: 'Несохраненные изменения', 
            text: 'Вы уверены, что хотите закрыть окно без сохранения?', 
            onConfirm: () => closeModal(document.getElementById('questionModal'))
        });
    } else {
        closeModal(document.getElementById('questionModal'));
    }
}

async function handleSaveQuestion(event) {
    event.preventDefault();
    const form = event.target;
    const saveBtn = form.querySelector('#questionModalSaveBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Сохранение...';

    const type = document.querySelector('.type-selector-btn.active').dataset.type;
    const questionData = {
        id: document.getElementById('questionIdInput').value || null,
        type,
        text: document.getElementById('questionTextInput').value.trim(),
        explain: document.getElementById('questionExplainInput').value.trim()
    };

    if (!questionData.text) {
        showToast('Текст вопроса не может быть пустым.', 'error');
        saveBtn.disabled = false; saveBtn.textContent = 'Сохранить'; return;
    }

    if (type === 'checkbox') {
        questionData.options = Array.from(document.querySelectorAll('.option-edit-item')).map(item => ({ 
            id: `${questionData.id || 'new'}-${item.dataset.key}`, 
            text: item.querySelector('textarea').value.trim() 
        }));
        questionData.correct = Array.from(document.querySelectorAll('input[name="correctOption"]:checked')).map(cb => cb.value);
        if (questionData.options.filter(opt => opt.text).length < 2 || questionData.correct.length === 0) {
            showToast('Нужно как минимум 2 варианта и 1 правильный ответ.', 'error');
            saveBtn.disabled = false; saveBtn.textContent = 'Сохранить'; return;
        }
    } else if (type === 'match') {
        questionData.match_prompts = Array.from(document.querySelectorAll('.match-prompt-input')).map(i => i.value.trim());
        questionData.match_answers = Array.from(document.querySelectorAll('.match-answer-input')).map(i => i.value.trim());
        const filledPairs = questionData.match_prompts.filter((p, i) => p && questionData.match_answers[i]).length;
        if (filledPairs < 2) {
            showToast('Нужно заполнить как минимум две полные пары.', 'error');
            saveBtn.disabled = false; saveBtn.textContent = 'Сохранить'; return;
        }
    } else if (type === 'text_input') {
        const correctAnswer = document.getElementById('correctTextInput').value.trim();
        questionData.correct = correctAnswer ? [correctAnswer] : [];
    }

    try {
        questionData.id ? await updateQuestion(questionData) : await addQuestion(currentTestId, questionData);
        closeModal(document.getElementById('questionModal'));
        isQuestionFormDirty = false;
        showToast('Вопрос успешно сохранен!', 'success');
        await loadQuestions();
    } catch (error) { /* Ошибка будет обработана глобально */ } 
    finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Сохранить';
    }
}

let isModalInitialized = false;

export function initQuestionsModule(testId) {
    currentTestId = testId;
    const container = document.getElementById('tab-questions');
    container.innerHTML = `
        <div class="card">
            <div class="admin-controls">
                <h2>Банк Вопросов</h2>
                <div class="admin-actions">
                    <button id="deleteSelectedQuestionsBtn" class="btn btn-danger">Удалить выбранные</button>
                    <button id="addQuestionBtn" class="btn"><i class="fas fa-plus"></i> Добавить вопрос</button>
                </div>
            </div>
            <div id="questionsListContainer"><div class="spinner"></div></div>
        </div>`;

    if (!isModalInitialized) {
        isModalInitialized = true;
        const questionForm = document.getElementById('questionForm');
        questionForm.innerHTML = `
            <div class="question-form-body">
                <input type="hidden" id="questionIdInput">
                <div class="form-group"><label class="form-label">Тип вопроса</label><div class="question-type-selector-wrap">
                    <button type="button" class="type-selector-btn btn btn-outline" data-type="checkbox"><i class="fas fa-check-square"></i> Выбор вариантов</button>
                    <button type="button" class="type-selector-btn btn btn-outline" data-type="match"><i class="fas fa-exchange-alt"></i> На соответствие</button>
                    <button type="button" class="type-selector-btn btn btn-outline" data-type="text_input"><i class="fas fa-pencil-alt"></i> Открытый ответ</button>
                </div></div>
                <div class="form-group"><label for="questionTextInput" class="form-label">Текст вопроса</label><textarea id="questionTextInput" class="form-control" rows="3" required></textarea></div>
                <div id="optionsContainerWrapper" style="display:none;"><label class="form-label">Варианты ответов (отметьте правильные)</label><div id="optionsContainer"></div><button type="button" id="addOptionBtn" class="btn btn-outline" style="margin-top: 1rem;">Добавить вариант</button></div>
                <div id="matchContainer" style="display:none;"><label class="form-label">Пары для соответствия</label><div id="matchPairsContainer"></div><button type="button" id="addMatchPairBtn" class="btn btn-outline" style="margin-top: 1rem;">Добавить пару</button></div>
                <div id="textInputContainerWrapper" style="display:none;"><label for="correctTextInput" class="form-label">Эталонный ответ</label><input type="text" id="correctTextInput" class="form-control"></div>
                <div class="form-group" style="margin-top: 1.5rem;"><label for="questionExplainInput" class="form-label">Объяснение (показывается в протоколе)</label><textarea id="questionExplainInput" class="form-control" rows="2"></textarea></div>
            </div>
            <div class="question-form-footer"><div class="modal-actions">
                <button id="questionModalCancelBtn" type="button" class="btn btn-outline">Отмена</button>
                <button id="questionModalSaveBtn" type="submit" class="btn">Сохранить</button>
            </div></div>`;
        
        questionForm.onsubmit = handleSaveQuestion;
        questionForm.addEventListener('input', () => { isQuestionFormDirty = true; });
        
        document.querySelector('.question-type-selector-wrap').addEventListener('click', e => {
            const selectedBtn = e.target.closest('.type-selector-btn');
            if (selectedBtn) {
                document.querySelectorAll('.type-selector-btn').forEach(btn => btn.classList.remove('active'));
                selectedBtn.classList.add('active');
                renderSpecificForm(selectedBtn.dataset.type);
                isQuestionFormDirty = true;
            }
        });
        
        document.getElementById('questionModalCancelBtn').onclick = attemptToCloseQuestionModal;
        
        document.getElementById('questionModal').addEventListener('click', e => {
            if (e.target.id === 'addOptionBtn') addOptionToForm(`temp_${++tempOptionIdCounter}`, '', false);
            if (e.target.id === 'addMatchPairBtn') addMatchPairToForm();
            const deleteOptionBtn = e.target.closest('.delete-option');
            if (deleteOptionBtn && document.querySelectorAll('.option-edit-item').length > 2) deleteOptionBtn.closest('.option-edit-item').remove();
            const deleteMatchBtn = e.target.closest('.delete-match-pair');
            if (deleteMatchBtn && document.querySelectorAll('.match-pair-item').length > 2) deleteMatchBtn.closest('.match-pair-item').remove();
        });
    }

    container.addEventListener('click', (e) => {
        const target = e.target;
        if (target.closest('#addQuestionBtn')) prepareAddQuestion();
        if (target.closest('#deleteSelectedQuestionsBtn')) confirmAndDeleteQuestions(Array.from(document.querySelectorAll('.question-item-checkbox:checked')).map(cb => cb.dataset.id));
        if (target.matches('.question-item-checkbox')) updateBulkActionsUI();
        const deleteBtn = target.closest('.btn-icon.delete');
        if (deleteBtn) confirmAndDeleteQuestions([deleteBtn.dataset.id]);
        const questionRow = target.closest('.question-item');
        if (questionRow && !target.closest('.question-item-actions') && !target.closest('.question-checkbox')) {
            prepareEditQuestion(questionRow.dataset.id);
        }
    });

    container.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        if (e.target.matches('.question-checkbox, .btn-icon')) return;
        const focusedRow = e.target.closest('.question-item');
        if (!focusedRow) return;
        e.preventDefault();
        prepareEditQuestion(focusedRow.dataset.id);
    });

    loadQuestions();
}
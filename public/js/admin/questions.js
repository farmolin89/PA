// ===================================================================
// ФАЙЛ: public/js/admin/questions.js (ПОЛНАЯ ИТОГОВАЯ ВЕРСЯ, АДАПТИРОВАННАЯ ПОД НОВЫЙ ДИЗАЙН)
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
 * Отрисовывает HTML-список вопросов в новом стиле.
 */
function renderQuestionsList(questions) {
    const container = document.getElementById('questionsListContainer');
    if (!container) return;

    if (questions.length === 0) {
        container.innerHTML = `<div class="empty-state-message"><i class="fas fa-question-circle"></i><span>В этом тесте пока нет вопросов. Создайте первый!</span></div>`;
        updateBulkActionsUI();
        return;
    }

    const listContainer = document.createElement('div');
    listContainer.className = 'questions-list';

    questions.forEach((q, index) => {
        const questionItem = document.createElement('div');
        questionItem.className = 'question-item';
        questionItem.dataset.id = q.id;
        
        questionItem.innerHTML = `
            <input type="checkbox" class="question-checkbox question-item-checkbox" data-id="${q.id}">
            <div class="question-text">
                <span class="question-number">${index + 1}.</span>
                ${escapeHTML(q.text)}
            </div>
            <div class="question-item-actions">
                <button type="button" class="btn-icon edit" data-id="${q.id}" title="Редактировать">
                    <i class="fas fa-pen"></i>
                </button>
                <button type="button" class="btn-icon delete" data-id="${q.id}" title="Удалить">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>`;
        listContainer.appendChild(questionItem);
    });

    container.innerHTML = ''; // Очищаем спиннер
    container.appendChild(listContainer);
    updateBulkActionsUI();
}

/**
 * Обновляет UI для массовых действий.
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
    const count = idsToDelete.length;
    const textForm = pluralize(count, 'question');
    const deleteBtn = document.getElementById('deleteSelectedQuestionsBtn');
    if (deleteBtn) deleteBtn.disabled = true;

    try {
        await deleteQuestions(idsToDelete);
        showToast(`${count} ${textForm} удалено.`, 'success');
        await loadQuestions();
    } catch (error) {
        console.error("Ошибка при удалении вопросов:", error);
    } finally {
        if (deleteBtn) deleteBtn.disabled = false;
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
        onConfirm: () => performDelete(idsToDelete),
        isInput: false // Явно указываем, что поле ввода не нужно
    });
}

/**
 * Показывает/скрывает блоки формы в зависимости от выбранного типа вопроса.
 */
function renderSpecificForm(type) {
    document.getElementById('optionsContainerWrapper').style.display = (type === 'checkbox') ? 'block' : 'none';
    document.getElementById('matchContainer').style.display = (type === 'match') ? 'block' : 'none';
    document.getElementById('textInputContainerWrapper').style.display = 'none'; // Всегда скрываем, т.к. не используется
}

/**
 * Подготавливает и открывает модальное окно для создания нового вопроса.
 */
function prepareAddQuestion() {
    tempOptionIdCounter = 0;
    document.getElementById('questionModalTitle').textContent = 'Добавить новый вопрос';
    document.getElementById('questionIdInput').value = '';
    document.getElementById('questionTextInput').value = '';
    document.getElementById('questionExplainInput').value = '';
    
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
    isQuestionFormDirty = false;
    openModal(document.getElementById('questionModal'));
}

function renderOptionsForm(options, correctOptionKeys) {
    const optionsContainer = document.getElementById('optionsContainer');
    optionsContainer.innerHTML = '';
    const optionsToRender = (!options || options.length === 0) ? [{ id: `temp_${++tempOptionIdCounter}`, text: '' }, { id: `temp_${++tempOptionIdCounter}`, text: '' }] : options;
    const correctSet = new Set(correctOptionKeys);
    optionsToRender.forEach(opt => {
        const keySuffix = opt.id.substring(opt.id.lastIndexOf('-') + 1);
        addOptionToForm(keySuffix, opt.text, correctSet.has(keySuffix));
    });
}

function addOptionToForm(shortKey, text, isChecked) {
    const optionsContainer = document.getElementById('optionsContainer');
    const checkedAttr = isChecked ? 'checked' : '';
    const optionHTML = `
        <div class="option-edit-item" data-key="${shortKey}">
            <input type="checkbox" name="correctOption" value="${shortKey}" id="cb_${shortKey}" ${checkedAttr}>
            <label for="cb_${shortKey}" class="option-label-char">${String.fromCharCode(65 + optionsContainer.children.length)}</label>
            <textarea class="form-control" placeholder="Текст варианта ответа" rows="1">${escapeHTML(text)}</textarea>
            <button type="button" class="btn-icon delete-option" aria-label="Удалить вариант"><i class="fas fa-trash-alt"></i></button>
        </div>`;
    optionsContainer.insertAdjacentHTML('beforeend', optionHTML);
}

function renderMatchForm(prompts = [], answers = []) {
    const container = document.getElementById('matchPairsContainer');
    container.innerHTML = '';
    const pairs = prompts.map((prompt, i) => ({ prompt, answer: answers[i] || '' }));
    if (pairs.length < 2) {
        for (let i = pairs.length; i < 2; i++) pairs.push({ prompt: '', answer: '' });
    }
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
        <button type="button" class="btn-icon delete-match-pair" aria-label="Удалить пару"><i class="fas fa-trash-alt"></i></button>`;
    container.appendChild(div);
}

function attemptToCloseQuestionModal() {
    if (isQuestionFormDirty) {
        showConfirmModal({ 
            title: 'Несохраненные изменения', 
            text: 'Вы уверены, что хотите закрыть окно без сохранения?', 
            onConfirm: () => closeModal(document.getElementById('questionModal')),
            isInput: false // Явно указываем, что поле ввода не нужно
        });
    } else {
        closeModal(document.getElementById('questionModal'));
    }
}

async function handleSaveQuestion(event) {
    event.preventDefault();
    const questionText = document.getElementById('questionTextInput').value.trim();
    if (!questionText) {
        showToast('Текст вопроса не может быть пустым.', 'error');
        document.getElementById('questionTextInput').focus();
        return;
    }

    const saveBtn = document.getElementById('questionModalSaveBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Сохранение...';

    const questionId = document.getElementById('questionIdInput').value || null;
    const type = document.querySelector('.type-selector-btn.active').dataset.type;
    const questionData = { 
        id: questionId, 
        type, 
        text: questionText, 
        explain: document.getElementById('questionExplainInput').value.trim() 
    };

    if (type === 'match') {
        questionData.match_prompts = Array.from(document.querySelectorAll('.match-prompt-input')).map(i => i.value.trim());
        questionData.match_answers = Array.from(document.querySelectorAll('.match-answer-input')).map(i => i.value.trim());
        const filledPairs = questionData.match_prompts.filter((p, i) => p && questionData.match_answers[i]).length;
        if (filledPairs < 2) {
            showToast('Нужно заполнить как минимум две полные пары для соответствия.', 'error');
            saveBtn.disabled = false; saveBtn.textContent = 'Сохранить'; return;
        }
    } else if (type === 'checkbox') {
        questionData.correct = Array.from(document.querySelectorAll('input[name="correctOption"]:checked')).map(cb => cb.value);
        questionData.options = Array.from(document.querySelectorAll('.option-edit-item')).map(item => ({ 
            id: `${questionId || 'new'}-${item.dataset.key}`, 
            text: item.querySelector('textarea').value.trim() 
        }));
        if (questionData.options.filter(opt => opt.text).length < 2) {
            showToast('Нужно заполнить как минимум два варианта ответа.', 'error');
            saveBtn.disabled = false; saveBtn.textContent = 'Сохранить'; return;
        }
        if (questionData.correct.length === 0) {
            showToast('Выберите хотя бы один правильный ответ.', 'error');
            saveBtn.disabled = false; saveBtn.textContent = 'Сохранить'; return;
        }
    }

    try {
        questionId ? await updateQuestion(questionData) : await addQuestion(currentTestId, questionData);
        closeModal(document.getElementById('questionModal'));
        isQuestionFormDirty = false;
        showToast('Вопрос успешно сохранен!', 'success');
        await loadQuestions();
    } catch (error) {
        console.error("Не удалось сохранить вопрос:", error);
    } finally {
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
                    <button id="addQuestionBtn" class="btn">
                        <i class="fas fa-plus"></i> Добавить вопрос
                    </button>
                </div>
            </div>
            <div id="questionsListContainer">
                <div class="spinner"></div>
            </div>
        </div>`;

    if (!isModalInitialized) {
        const questionForm = document.getElementById('questionForm');
        questionForm.innerHTML = `
            <div class="question-form-body">
                <input type="hidden" id="questionIdInput">
                <div class="form-group">
                    <label class="form-label">Тип вопроса</label>
                    <div class="question-type-selector-wrap">
                        <button type="button" class="type-selector-btn btn btn-outline" data-type="checkbox"><i class="fas fa-check-square"></i> Выбор вариантов</button>
                        <button type="button" class="type-selector-btn btn btn-outline" data-type="match"><i class="fas fa-exchange-alt"></i> На соответствие</button>
                        <button type="button" class="type-selector-btn btn btn-outline" data-type="text_input"><i class="fas fa-pencil-alt"></i> Открытый ответ</button>
                    </div>
                </div>
                <div class="form-group">
                    <label for="questionTextInput" class="form-label">Текст вопроса</label>
                    <textarea id="questionTextInput" class="form-control" rows="3" required></textarea>
                </div>
                <div id="optionsContainerWrapper" style="display:none;">
                    <label class="form-label">Варианты ответов (отметьте правильные)</label>
                    <div id="optionsContainer"></div>
                    <button type="button" id="addOptionBtn" class="btn btn-outline" style="margin-top: 1rem;">Добавить вариант</button>
                </div>
                <div id="matchContainer" style="display:none;">
                    <label class="form-label">Пары для соответствия</label>
                    <div id="matchPairsContainer"></div>
                    <button type="button" id="addMatchPairBtn" class="btn btn-outline" style="margin-top: 1rem;">Добавить пару</button>
                </div>
                <div id="textInputContainerWrapper" style="display:none;">
                     <label class="form-label">Правильный ответ (регистр не учитывается)</label>
                     <input type="text" class="form-control" placeholder="Введите единственно верный ответ">
                </div>
                <div class="form-group" style="margin-top: 1.5rem;">
                    <label for="questionExplainInput" class="form-label">Объяснение (показывается в протоколе)</label>
                    <textarea id="questionExplainInput" class="form-control" rows="2"></textarea>
                </div>
            </div>
            <div class="question-form-footer">
                <div class="modal-actions">
                    <button id="questionModalCancelBtn" type="button" class="btn btn-outline">Отмена</button>
                    <button id="questionModalSaveBtn" type="submit" class="btn">Сохранить</button>
                </div>
            </div>`;
        isModalInitialized = true;

        // Навешиваем обработчики на форму и ее элементы
        questionForm.onsubmit = handleSaveQuestion;
        questionForm.addEventListener('input', () => { isQuestionFormDirty = true; });
        
        document.querySelector('.question-type-selector-wrap').addEventListener('click', (e) => {
            const selectedBtn = e.target.closest('.type-selector-btn');
            if (!selectedBtn) return;
            document.querySelectorAll('.type-selector-btn').forEach(btn => btn.classList.remove('active'));
            selectedBtn.classList.add('active');
            renderSpecificForm(selectedBtn.dataset.type);
            isQuestionFormDirty = true;
        });
        
        document.getElementById('questionModalCancelBtn').onclick = attemptToCloseQuestionModal;
        
        document.getElementById('questionModal').addEventListener('click', (e) => {
            if (e.target.id === 'addOptionBtn') { addOptionToForm(`temp_${++tempOptionIdCounter}`, '', false); }
            if (e.target.id === 'addMatchPairBtn') { addMatchPairToForm(); }
            const deleteOptionBtn = e.target.closest('.delete-option');
            if (deleteOptionBtn) {
                if (document.querySelectorAll('.option-edit-item').length > 2) {
                    deleteOptionBtn.closest('.option-edit-item').remove();
                } else {
                    showToast('Должно быть как минимум два варианта.', 'info');
                }
            }
            const deleteMatchBtn = e.target.closest('.delete-match-pair');
            if (deleteMatchBtn) {
                if (document.querySelectorAll('.match-pair-item').length > 2) {
                    deleteMatchBtn.closest('.match-pair-item').remove();
                } else {
                    showToast('Должно быть как минимум две пары.', 'info');
                }
            }
        });
    }

    container.addEventListener('click', (e) => {
        const target = e.target;
        const targetBtn = e.target.closest('button');

        if (target.closest('#addQuestionBtn')) { prepareAddQuestion(); }
        if (target.closest('#deleteSelectedQuestionsBtn')) {
            const ids = Array.from(document.querySelectorAll('.question-item-checkbox:checked')).map(cb => cb.dataset.id);
            confirmAndDeleteQuestions(ids);
        }
        if (target.matches('.question-item-checkbox')) {
            updateBulkActionsUI();
        }
        
        if (targetBtn && targetBtn.classList.contains('edit')) {
            prepareEditQuestion(targetBtn.dataset.id);
        }
        if (targetBtn && targetBtn.classList.contains('delete')) {
            confirmAndDeleteQuestions([targetBtn.dataset.id]);
        }
    });

    loadQuestions();
}
// ===================================================================
// Файл: public/js/admin/results.js (ПОЛНАЯ, ФИНАЛЬНАЯ, ЭТАЛОННАЯ ВЕРСИЯ)
// Описание: Управляет всей логикой вкладки "Результаты": загрузка,
// отображение, пагинация, сортировка, поиск, удаление и открытие
// модальных окон для протокола или ручной проверки.
// ===================================================================

import { pluralize, escapeHTML } from '../utils/utils.js';
import { showToast } from './ui.js';
import { showConfirmModal, openModal, closeModal } from '../common/modals.js';
import { fetchResults, deleteResults, fetchProtocol, fetchQuestionsForReview, submitBatchReview } from '../common/api-client.js';

// --- Состояние модуля ---
let currentTestId = null;
let currentSearch = '';
let currentSort = { column: 'date', order: 'desc' };
let currentPage = 1;
let debounceTimer;
let selectedResultIds = new Set();
const RESULTS_PER_PAGE = 10;
let reviewClickHandler;

/**
 * Обрабатывает поступление нового результата в реальном времени от SSE.
 */
export function prependNewResultRow(result) {
    console.log('📥 Функция prependNewResultRow вызвана с данными:', result);
    
    const isViewingAnyTestDashboard = document.querySelector('.test-dashboard');
    if (!isViewingAnyTestDashboard) {
        console.log('ℹ️ Пользователь не находится на странице дашборда конкретного теста. Обновление таблицы не требуется.');
        return;
    }

    const isViewingCorrectTest = document.querySelector(`#tab-results.active`) && String(currentTestId) === String(result.testId);
    
    if (isViewingCorrectTest && currentPage === 1 && currentSearch === '' && currentSort.column === 'date' && currentSort.order === 'desc') {
        console.log('✅ Условия совпадают. Перезагружаем таблицу результатов...');
        loadResults();
    } else {
        console.log('ℹ️ Условия для немедленной перезагрузки не совпадают. Помечаем вкладку как требующую обновления.');
        const tabButton = document.querySelector('.tab-button[data-tab="results"]');
        if (tabButton) {
            tabButton.classList.add('has-update');
            console.log('✅ Вкладка "Результаты" помечена классом has-update.');
        }
    }
}

// --- Функции управления состоянием UI ---
function saveUiState() {
    if (!currentTestId) return;
    sessionStorage.setItem(`resultsState_${currentTestId}`, JSON.stringify({ search: currentSearch, sort: currentSort, page: currentPage }));
}

function loadUiState() {
    if (!currentTestId) return null;
    const savedState = sessionStorage.getItem(`resultsState_${currentTestId}`);
    return savedState ? JSON.parse(savedState) : null;
}

/**
 * Основная функция для загрузки и отображения результатов.
 */
export async function loadResults() {
    const container = document.getElementById('resultsTableContainer');
    if (!container) return;
    saveUiState();
    container.innerHTML = '<div class="spinner"></div>';
    selectedResultIds.clear();
    updateBulkActionsUI();

    try {
        const data = await fetchResults(currentTestId, { search: currentSearch, sort: currentSort.column, order: currentSort.order, page: currentPage, limit: RESULTS_PER_PAGE });
        if (!data || !data.results) {
            throw new Error("Получены некорректные данные с сервера.");
        }
        if (data.results.length === 0 && data.currentPage > 1) {
            currentPage = data.totalPages > 0 ? data.totalPages : 1;
            loadResults();
            return;
        }
        renderResultsTable(data.results);
        renderPagination(data.totalPages, data.currentPage);
    } catch (error) {
        container.innerHTML = `<div class="empty-state-message"><i class="fas fa-exclamation-triangle"></i><span>Не удалось загрузить результаты.</span></div>`;
        console.error("Ошибка при загрузке результатов:", error);
    }
}

/**
 * Рендерит HTML-таблицу с результатами.
 */
function renderResultsTable(results) {
    const container = document.getElementById('resultsTableContainer');
    if (results.length === 0) {
        const message = currentSearch ? `По запросу "${escapeHTML(currentSearch)}" ничего не найдено.` : 'Для этого теста пока нет результатов.';
        container.innerHTML = `<div class="empty-state-message"><i class="fas fa-folder-open"></i><span>${message}</span></div>`;
        return;
    }

    const sortIndicator = (column) => (column !== currentSort.column) ? '' : (currentSort.order === 'asc' ? ' ▲' : ' ▼');
    
    const tableHeader = `
        <thead>
            <tr>
                <th><input type="checkbox" id="selectAllResultsCheckbox" title="Выбрать все на странице"></th>
                <th class="sortable" data-sort="fio">ФИО${sortIndicator('fio')}</th>
                <th class="sortable" data-sort="score">Результат${sortIndicator('score')}</th>
                <th class="sortable" data-sort="status">Статус${sortIndicator('status')}</th>
                <th class="sortable" data-sort="percentage">Процент${sortIndicator('percentage')}</th>
                <th class="sortable" data-sort="date">Дата и время${sortIndicator('date')}</th>
                <th>Действия</th>
            </tr>
        </thead>`;

    const tableBody = results.map(result => {
        let statusClass, statusText;
        if (result.status === 'pending_review') {
            statusClass = 'status-pending';
            statusText = 'На проверке';
        } else {
            statusClass = result.passed ? 'status-pass' : 'status-fail';
            statusText = result.passed ? 'СДАН' : 'НЕ СДАН';
        }
        
        const rowClass = result.status === 'pending_review' ? 'needs-review' : '';
        const rowTitle = result.status === 'pending_review' ? "Нажмите для ручной проверки" : "Нажмите для просмотра протокола";

        return `
            <tr data-id="${result.id}" data-fio="${escapeHTML(result.fio)}" class="${rowClass}" style="cursor: pointer;" title="${rowTitle}">
                <td><input type="checkbox" class="result-checkbox" data-id="${result.id}"></td>
                <td>${escapeHTML(result.fio)}</td>
                <td>${result.score}/${result.total}</td>
                <td><span class="status-label ${statusClass}">${statusText}</span></td>
                <td>${result.percentage}%</td>
                <td>${new Date(result.date).toLocaleString('ru-RU')}</td>
                <td class="actions-cell">
                    <button type="button" class="btn-icon delete" data-id="${result.id}" title="Удалить"><i class="fas fa-trash-alt"></i></button>
                </td>
            </tr>
        `;
    }).join('');
        
    container.innerHTML = `<div class="table-container"><table class="admin-table">${tableHeader}<tbody>${tableBody}</tbody></table></div>`;
}

/**
 * Рендерит пагинацию.
 */
function renderPagination(totalPages, currentPageNum) {
    const container = document.getElementById('paginationContainer');
    if (!container || totalPages <= 1) {
        if (container) container.innerHTML = '';
        return;
    }
    let paginationHTML = `<button class="btn btn-outline" data-page="${currentPageNum - 1}" ${currentPageNum === 1 ? 'disabled' : ''}>&laquo;</button>`;
    for (let i = 1; i <= totalPages; i++) {
        paginationHTML += `<button class="btn ${i === currentPageNum ? '' : 'btn-outline'}" data-page="${i}">${i}</button>`;
    }
    paginationHTML += `<button class="btn btn-outline" data-page="${currentPageNum + 1}" ${currentPageNum === totalPages ? 'disabled' : ''}>&raquo;</button>`;
    container.innerHTML = paginationHTML;
}

/**
 * Обновляет UI для кнопок массовых действий.
 */
function updateBulkActionsUI() {
    const deleteBtn = document.getElementById('deleteSelectedResultsBtn');
    if (!deleteBtn) return;
    const count = selectedResultIds.size;
    deleteBtn.innerHTML = `<i class="fas fa-trash-alt"></i> Удалить выбранные (${count})`;
    deleteBtn.classList.toggle('visible', count > 0);
    
    const selectAllCheckbox = document.getElementById('selectAllResultsCheckbox');
    if (selectAllCheckbox) {
        const allOnPage = document.querySelectorAll('.result-checkbox').length;
        selectAllCheckbox.checked = count === allOnPage && allOnPage > 0;
        selectAllCheckbox.indeterminate = count > 0 && count < allOnPage;
    }
}

/**
 * Выполняет удаление выбранных результатов.
 */
async function executeDelete() {
    const idsToDelete = Array.from(selectedResultIds);
    if (idsToDelete.length === 0) return;

    const count = idsToDelete.length;
    const textForm = pluralize(count, 'result');
    const deleteBtn = document.getElementById('deleteSelectedResultsBtn');
    if (deleteBtn) deleteBtn.disabled = true;

    try {
        await deleteResults(idsToDelete);
        showToast(`${count} ${textForm} успешно удалено.`, 'success');

        idsToDelete.forEach(id => {
            const rowToRemove = document.querySelector(`#resultsTableContainer tr[data-id="${id}"]`);
            if (rowToRemove) {
                rowToRemove.remove();
            }
        });
        
        selectedResultIds.clear();
        updateBulkActionsUI();

        const remainingRows = document.querySelectorAll('#resultsTableContainer tr[data-id]').length;
        if (remainingRows === 0) {
            await loadResults();
        }

    } catch (error) {
        console.error("Ошибка удаления результатов:", error);
    } finally {
        if (deleteBtn) deleteBtn.disabled = false;
    }
}

/**
 * Показывает модальное окно подтверждения для массового удаления.
 */
function confirmAndHandleBulkDelete() {
    if (selectedResultIds.size === 0) return;
    showConfirmModal({
        title: `Удалить ${selectedResultIds.size} ${pluralize(selectedResultIds.size, 'result')}?`,
        text: 'Это действие необратимо. Вы уверены?',
        onConfirm: executeDelete,
        isInput: false
    });
}

/**
 * Показывает модальное окно с протоколом теста.
 */
async function showProtocolModal(resultId, fio) {
    const modal = document.getElementById('protocolModal');
    openModal(modal);
    const titleEl = document.getElementById('protocolModalTitle');
    const contentEl = document.getElementById('protocolContent');
    titleEl.innerHTML = `Загрузка протокола...`;
    contentEl.innerHTML = '<div class="spinner"></div>';
    try {
        const { summary, protocol: protocolData } = await fetchProtocol(resultId);
        const statusClass = summary.passed ? 'status-pass' : 'status-fail';
        const statusText = summary.passed ? 'СДАН' : 'НЕ СДАН';
        titleEl.innerHTML = `Протокол теста: ${escapeHTML(fio)} <span class="protocol-status ${statusClass}">${statusText}</span>`;
        if (!protocolData || protocolData.length === 0) {
            contentEl.innerHTML = '<p class="empty-state-message">Детальная информация для этого теста недоступна.</p>';
            return;
        }
        let protocolHTML = protocolData.map((item) => {
            const itemClass = item.isCorrect ? 'correct' : 'incorrect';
            const chosenAnswer = item.type === 'match'
                ? '<ul>' + item.match_prompts.map((p, i) => `<li>${escapeHTML(p)} &rarr; ${escapeHTML(item.chosen_answers_match[i] || '—')}</li>`).join('') + '</ul>'
                : escapeHTML(item.chosenAnswerText);
            const correctAnswer = item.type === 'match'
                ? '<ul>' + item.match_prompts.map((p, i) => `<li>${escapeHTML(p)} &rarr; ${escapeHTML(item.correct_answers_match[i] || '—')}</li>`).join('') + '</ul>'
                : escapeHTML(item.correctAnswerText);
            return `<div class="protocol-item ${itemClass}">
                        <div class="protocol-item-header"><span>${escapeHTML(item.questionText)}</span></div>
                        <div class="protocol-item-body">
                            <div class="protocol-answer-block"><div class="answer-label user-answer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>Ваш ответ</div><div class="answer-text">${chosenAnswer}</div></div>
                            <div class="protocol-answer-block"><div class="answer-label correct-answer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>Правильный ответ</div><div class="answer-text">${correctAnswer}</div></div>
                        </div>
                    </div>`;
        }).join('');
        contentEl.innerHTML = protocolHTML;
    } catch (error) {
        contentEl.innerHTML = `<p class="error-message">Не удалось загрузить протокол.</p>`;
        console.error("Ошибка загрузки протокола:", error);
    }
}

/**
 * Показывает модальное окно для ручной проверки ответов.
 */
async function showReviewModal(resultId, fio) {
    const modal = document.getElementById('reviewModal');
    openModal(modal);
    const title = document.getElementById('reviewModalTitle');
    const content = document.getElementById('reviewContent');
    const actions = modal.querySelector('.modal-actions');
    title.innerHTML = `Проверка ответов для: ${escapeHTML(fio)}`;
    content.innerHTML = '<div class="spinner"></div>';
    actions.innerHTML = '';
    try {
        const questionsToReview = await fetchQuestionsForReview(resultId);
        if (questionsToReview.length === 0) {
            content.innerHTML = '<p class="empty-state-message">Нет вопросов для проверки.</p>';
            actions.innerHTML = '<button type="button" class="btn" data-modal-close>Закрыть</button>';
            return;
        }
        content.innerHTML = questionsToReview.map(q => `
            <div class="review-item-compact" data-answer-id="${q.answerId}">
                <div class="review-item-content-compact">
                    <div class="review-question-text-compact">${escapeHTML(q.questionText)}</div>
                    <div class="review-user-answer-compact">${escapeHTML(q.userAnswer) || "<em>— ответ не дан —</em>"}</div>
                </div>
                <div class="review-item-actions-compact">
                    <button type="button" class="btn-review-compact btn-review-correct-compact" data-correct="true" title="Правильно"><i class="fas fa-check"></i></button>
                    <button type="button" class="btn-review-compact btn-review-incorrect-compact" data-correct="false" title="Неправильно"><i class="fas fa-times"></i></button>
                </div>
            </div>`).join('');
        actions.innerHTML = '<button id="reviewFinishBtn" type="button" class="btn">Завершить проверку</button>';
    } catch (error) {
        content.innerHTML = `<p class="error-message">Не удалось загрузить вопросы для проверки.</p>`;
    }
}

/**
 * Устанавливает слушатели событий для модального окна проверки.
 */
function setupReviewModalListeners() {
    const reviewModal = document.getElementById('reviewModal');
    if (reviewClickHandler) reviewModal.removeEventListener('click', reviewClickHandler);
    
    reviewClickHandler = (e) => {
        const reviewBtn = e.target.closest('.btn-review-compact');
        if (!reviewBtn) return;
        const isCorrect = reviewBtn.dataset.correct === 'true';
        const reviewItem = reviewBtn.closest('.review-item-compact');
        reviewItem.classList.remove('is-judged-correct', 'is-judged-incorrect');
        reviewItem.classList.add(isCorrect ? 'is-judged-correct' : 'is-judged-incorrect');
        reviewItem.dataset.judgedStatus = isCorrect ? 'correct' : 'incorrect';
    };
    
    reviewModal.addEventListener('click', reviewClickHandler);
}

/**
 * Инициализирует весь модуль "Результаты".
 */
export function initResultsModule(testId) {
    currentTestId = testId;
    const savedState = loadUiState();
    currentPage = savedState?.page || 1;
    currentSearch = savedState?.search || '';
    currentSort = savedState?.sort || { column: 'date', order: 'desc' };
    selectedResultIds.clear();

    const container = document.getElementById('tab-results');
    container.innerHTML = `
      <div class="card">
        <div class="admin-controls">
            <h2>Результаты Теста</h2>
            <div class="admin-actions">
                <button id="deleteSelectedResultsBtn" class="btn btn-danger">Удалить выбранные (0)</button>
            </div>
        </div>
        <div class="form-group">
            <input type="search" id="results-search-input" class="form-control" placeholder="Поиск по ФИО..." value="${escapeHTML(currentSearch)}">
        </div>
        <div id="resultsTableContainer"><div class="spinner"></div></div>
        <div id="paginationContainer"></div>
      </div>`;
    
    container.addEventListener('click', (e) => {
        const target = e.target;
    
        const pageBtn = target.closest('#paginationContainer .btn:not(:disabled)');
        if (pageBtn) {
            currentPage = parseInt(pageBtn.dataset.page, 10);
            loadResults();
            return;
        }
        
        const sortableHeader = target.closest('th.sortable');
        if (sortableHeader) {
            const newSortColumn = sortableHeader.dataset.sort;
            currentSort.order = (currentSort.column === newSortColumn && currentSort.order === 'desc') ? 'asc' : 'desc';
            currentSort.column = newSortColumn;
            currentPage = 1;
            loadResults();
            return;
        }
        
        const deleteBtn = target.closest('.btn-icon.delete');
        if (deleteBtn) {
            e.stopPropagation();
            const resultId = deleteBtn.dataset.id;
            const fio = deleteBtn.closest('tr')?.dataset.fio || `ID ${resultId}`;
            showConfirmModal({
                title: 'Удалить результат?', 
                text: `Вы уверены, что хотите удалить запись для "${escapeHTML(fio)}"?`,
                onConfirm: () => { 
                    selectedResultIds.clear(); 
                    selectedResultIds.add(resultId); 
                    executeDelete(); 
                }
            });
            return;
        }
        
        if (target.matches('.result-checkbox, #selectAllResultsCheckbox')) {
            if (target.id === 'selectAllResultsCheckbox') {
                document.querySelectorAll('.result-checkbox').forEach(cb => {
                    cb.checked = target.checked;
                    target.checked ? selectedResultIds.add(cb.dataset.id) : selectedResultIds.delete(cb.dataset.id);
                });
            } else {
                target.checked ? selectedResultIds.add(target.dataset.id) : selectedResultIds.delete(target.dataset.id);
            }
            updateBulkActionsUI();
            return;
        }
        
        const row = target.closest('tr[data-id]');
        if (row) {
            console.log("[ACTION] Клик по строке. Открытие модального окна для resultId:", row.dataset.id);
            row.classList.contains('needs-review') 
                ? showReviewModal(row.dataset.id, row.dataset.fio) 
                : showProtocolModal(row.dataset.id, row.dataset.fio);
            return;
        }
        
        if (target.closest('#deleteSelectedResultsBtn')) {
            confirmAndHandleBulkDelete();
        }
    });

    const searchInput = document.getElementById('results-search-input');
    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            currentSearch = searchInput.value;
            currentPage = 1;
            loadResults();
        }, 350);
    });

    document.body.addEventListener('click', async (e) => {
        const finishBtn = e.target.closest('#reviewFinishBtn');
        if (!finishBtn || finishBtn.disabled) return;
        finishBtn.disabled = true;
        finishBtn.textContent = 'Сохранение...';
        const verdicts = Array.from(document.querySelectorAll('#reviewContent [data-judged-status]')).map(item => ({
            answerId: parseInt(item.dataset.answerId, 10),
            isCorrect: item.dataset.judgedStatus === 'correct'
        }));
        try {
            await submitBatchReview(verdicts);
            showToast('Проверка успешно завершена!', 'success');
            closeModal(document.getElementById('reviewModal'));
            await loadResults();
        } catch (error) {
            console.error("Ошибка при отправке вердиктов:", error);
        } finally {
            finishBtn.disabled = false;
            finishBtn.textContent = 'Завершить проверку';
        }
    });

    setupReviewModalListeners();
    loadResults();
}
// ===================================================================
// Файл: /public/js/testing/screens.js (ПОЛНАЯ ИТОГОВАЯ ВЕРСИЯ)
// ===================================================================
// Этот модуль отвечает за управление основными "экранами" приложения
// и рендеринг крупных UI-блоков, таких как список тестов и финальные результаты.

import { pluralize, escapeHTML } from '../utils/utils.js';

/**
 * Создает HTML-элемент карточки теста. Является внутренней функцией для renderPublicTestList.
 * @param {object} test - Объект с данными теста.
 * @param {function} onSelectCallback - Функция, вызываемая при клике на карточку.
 * @returns {HTMLElement} - Готовый DOM-элемент <a>.
 */
function createTestCardElement(test, onSelectCallback) {
    const testCard = document.createElement('a');
    testCard.href = '#';
    testCard.className = 'test-card';
    testCard.dataset.id = test.id;
    
    if (test.passedStatus) {
        testCard.classList.add('is-passed');
    }
    
    testCard.dataset.name = test.name;
    testCard.dataset.questions = test.questions_per_test;
    testCard.dataset.score = test.passing_score;
    testCard.dataset.duration = test.duration_minutes;
    testCard.dataset.passed = String(test.passedStatus || false);

    const questionsCount = test.questions_per_test;
    const passingScore = test.passing_score;
    const duration = test.duration_minutes;

    // === ИЗМЕНЕНИЕ: HTML-структура карточки обновлена под новый дизайн ===
    testCard.innerHTML = `
        <div class="test-card-title">${escapeHTML(test.name)}</div>
        <div class="test-card-meta">
            <div class="meta-item" title="Всего вопросов в тесте">
                <svg class="meta-icon icon-questions" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                <span class="meta-text">${questionsCount} ${pluralize(questionsCount, 'question')}</span>
            </div>
            <div class="meta-item" title="Минимум правильных ответов для сдачи">
                 <svg class="meta-icon icon-score" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                <span class="meta-text">${passingScore} ${pluralize(passingScore, 'score')}</span>
            </div>
            <div class="meta-item" title="Время на прохождение">
                <svg class="meta-icon icon-time" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                <span class="meta-text">${duration} ${pluralize(duration, 'minute')}</span>
            </div>
        </div>
    `;
    
    testCard.onclick = (e) => {
        e.preventDefault();
        onSelectCallback(test);
    };

    return testCard;
}

/**
 * Отрисовывает детальный протокол теста. Является внутренней функцией для showFinalResults.
 * @param {Array} protocolData - Массив с данными протокола.
 * @param {string} fio - ФИО пользователя для отображения в заголовке.
 */
function displayProtocol(protocolData, fio) {
    const protocolEl = document.getElementById('protocol');
    const currentDate = new Date().toLocaleString('ru-RU');

    if (!protocolData || protocolData.length === 0) {
        protocolEl.innerHTML = `<p class="empty-state-message">Детальный протокол для этого теста недоступен.</p>`;
    } else {
        const rows = protocolData.map(item => {
            const rowClass = item.isCorrect ? 'correct-row' : 'incorrect-row';
            let chosenAnswerContent = (item.type === 'match')
                ? '<div class="match-protocol-grid">' + item.match_prompts.map((p, i) => `<div><strong>${escapeHTML(p)}:</strong> ${escapeHTML(item.chosen_answers_match[i] || '—')}</div>`).join('') + '</div>'
                : escapeHTML(item.chosenAnswerText);
            
            let correctAnswerContent = (item.type === 'match')
                ? '<div class="match-protocol-grid">' + item.match_prompts.map((p, i) => `<div><strong>${escapeHTML(p)}:</strong> ${escapeHTML(item.correct_answers_match[i] || '—')}</div>`).join('') + '</div>'
                : escapeHTML(item.correctAnswerText);

            return `
              <tr class="${rowClass}">
                <td data-label="Вопрос">${escapeHTML(item.questionText)}<div class="proto-meta">${escapeHTML(item.explanation || '')}</div></td>
                <td data-label="Ваш ответ">${chosenAnswerContent}</td>
                <td data-label="Правильный">${correctAnswerContent}</td>
                <td data-label="Итог"><span class="${item.isCorrect ? 'ok' : 'bad'}">${item.isCorrect ? 'Верно' : 'Неверно'}</span></td>
              </tr>`;
        }).join('');

        protocolEl.innerHTML = `
          <div class="protocol-header">
              <h2 class="protocol-title">Детальный протокол</h2>
              <div class="protocol-meta-info">
                  <div class="meta-item">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                      <span>${escapeHTML(fio)}</span>
                  </div>
                  <div class="meta-item">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                      <span>${currentDate}</span>
                  </div>
              </div>
          </div>
          <table>
            <colgroup><col><col><col><col></colgroup>
            <thead><tr><th>Вопрос и объяснение</th><th>Ваш ответ</th><th>Правильный ответ</th><th>Итог</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>`;
    }
      
    protocolEl.classList.remove('hidden');
    requestAnimationFrame(() => protocolEl.classList.add('is-visible'));
}

// --- ЭКСПОРТИРУЕМЫЕ ФУНКЦИИ ---

export function showWelcomeScreen() {
    document.getElementById('welcomeScreen').classList.remove('hidden');
    document.getElementById('testSelectionScreen').classList.add('hidden');
    document.getElementById('testRunnerScreen').classList.add('hidden');
}

export function showTestSelectionView(fio) {
    document.getElementById('welcomeScreen').classList.add('hidden');
    document.getElementById('testSelectionScreen').classList.remove('hidden');
    document.getElementById('testRunnerScreen').classList.add('hidden');
    document.getElementById('exitButtonContainer').classList.add('hidden');
    
    const selectionTitle = document.getElementById('selectionTitle');
    if (selectionTitle) {
        selectionTitle.innerHTML = `Здравствуйте, ${escapeHTML(fio)}!`;
    }
}

export function showTestRunnerView(testName) {
    const selectionScreen = document.getElementById('testSelectionScreen');
    const runnerScreen = document.getElementById('testRunnerScreen');
    
    selectionScreen.classList.add('fade-out');
    setTimeout(() => {
        selectionScreen.classList.add('hidden');
        runnerScreen.classList.remove('hidden');
        runnerScreen.classList.add('is-visible'); 
    }, 300);

    document.getElementById('testTitle').textContent = testName;
}

export function showQuizView() {
    const quizCard = document.getElementById('quizForm');
    
    quizCard.classList.remove('hidden'); 
    requestAnimationFrame(() => {
        quizCard.classList.add('is-visible');
    });
}

export function renderPublicTestList(tests, onSelectCallback) {
    const listContainer = document.getElementById('publicTestList');
    if (!listContainer) return;

    const newTestsMap = new Map(tests.map(t => [t.id, t]));
    const existingCards = listContainer.querySelectorAll('.test-card');
    
    existingCards.forEach(card => {
        const cardId = card.dataset.id;
        const newData = newTestsMap.get(cardId);

        if (newData) {
            const hasChanged = 
                card.dataset.name !== newData.name ||
                card.dataset.questions !== String(newData.questions_per_test) ||
                card.dataset.score !== String(newData.passing_score) ||
                card.dataset.duration !== String(newData.duration_minutes) ||
                card.dataset.passed !== String(newData.passedStatus || false);

            if (hasChanged) {
                const updatedCard = createTestCardElement(newData, onSelectCallback);
                card.innerHTML = updatedCard.innerHTML;
                Object.assign(card.dataset, updatedCard.dataset);
                card.classList.toggle('is-passed', newData.passedStatus);
                
                card.classList.add('is-updating');
                card.addEventListener('animationend', () => card.classList.remove('is-updating'), { once: true });
            }
            newTestsMap.delete(cardId);
        } else {
            card.classList.add('is-exiting');
            setTimeout(() => card.remove(), 400); 
        }
    });

    newTestsMap.forEach(test => {
        const testCard = createTestCardElement(test, onSelectCallback);
        testCard.classList.add('is-entering'); 
        listContainer.appendChild(testCard);
        
        requestAnimationFrame(() => {
            testCard.classList.add('is-visible');
        });
    });
    
    if (listContainer.children.length === 0 && tests.length === 0) {
        listContainer.innerHTML = '<p class="empty-state-message">В данный момент нет доступных тестов.</p>';
    } else if (tests.length > 0) {
        const spinner = listContainer.querySelector('.spinner');
        if (spinner) spinner.remove();
    }
}

/**
 * Показывает финальный результат теста.
 * @param {object} result - Объект с результатами, полученный от API.
 */
export function showFinalResults(result) {
  const { fio, passed, score, total, percentage, protocolData } = result;

  const finalSummaryEl = document.getElementById('finalSummary');
  const quizCard = document.getElementById('quizForm');
  const exitButtonContainer = document.getElementById('exitButtonContainer');

  finalSummaryEl.className = `card summary-card ${passed ? 'ok' : 'bad'}`;
  finalSummaryEl.innerHTML = `
    <div class="summary-icon">${passed ? '🎉' : '😕'}</div>
    <div class="verdict">${passed ? 'АТТЕСТАЦИЯ СДАНА' : 'АТТЕСТАЦИЯ НЕ СДАНА'}</div>
    <div class="details">Правильных ответов: ${score} из ${total} (${percentage}%)</div>
    <div class="advice">${passed ? 'Отличный результат!' : 'Рекомендуется повторно изучить материал.'}</div>
  `;
  
  quizCard.classList.add('fade-out');
  setTimeout(() => {
    quizCard.classList.add('hidden');
    finalSummaryEl.classList.remove('hidden');
    
    if (protocolData) {
      displayProtocol(protocolData, fio);
    }
    
    exitButtonContainer.classList.remove('hidden');
    finalSummaryEl.scrollIntoView({ behavior: 'smooth' });
  }, 400);
}

export function showWaitingScreen(fio) {
    const finalSummaryEl = document.getElementById('finalSummary');
    const quizCard = document.getElementById('quizForm');
    
    quizCard.classList.add('fade-out');
    setTimeout(() => {
        quizCard.classList.add('hidden');
        
        finalSummaryEl.className = 'card';
        finalSummaryEl.innerHTML = `
            <h2 class="centered-text top-margin">Спасибо, ${escapeHTML(fio)}!</h2>
            <p class="centered-text muted-text large-text">Ваши ответы, требующие ручной проверки, отправлены администратору.</p>
            <p class="centered-text bold-text">Пожалуйста, не закрывайте это окно.</p>
            <p class="centered-text muted-text">Результат появится здесь автоматически после завершения проверки.</p>
            <div class="spinner top-margin-small"></div>
        `;
        
        finalSummaryEl.classList.remove('hidden');
        document.getElementById('exitButtonContainer').classList.add('hidden');
    }, 400);
}
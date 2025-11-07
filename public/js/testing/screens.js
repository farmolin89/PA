// ===================================================================
// Файл: public/js/testing/screens.js (ПОЛНАЯ ИТОГОВАЯ ВЕРСИЯ)
// Описание: Управляет отображением экранов и рендерингом UI-компонентов,
// таких как список тестов и финальные результаты.
// ===================================================================

import { pluralize, escapeHTML } from '../utils/utils.js';

/**
 * Создает HTML-элемент карточки теста для нового дизайна.
 * @param {object} test - Объект с данными теста от API.
 * @param {function} onSelectCallback - Функция, вызываемая при клике на карточку.
 * @returns {HTMLElement} - Готовый DOM-элемент <a>.
 */
function createTestCardElement(test, onSelectCallback) {
    const testCard = document.createElement('a');
    testCard.href = '#';
    testCard.className = 'test-card';
    testCard.dataset.id = test.id;

    const status = test.status || (test.passedStatus ? 'passed' : 'not_started');
    const lastResult = test.lastResult || null;
    if (status === 'passed') {
        testCard.classList.add('passed');
    } else if (status === 'failed') {
        testCard.classList.add('failed');
    } else if (status === 'pending') {
        testCard.classList.add('pending');
    }
    
    const questionsCount = test.questions_per_test;
    const passingScore = test.passing_score;
    const duration = test.duration_minutes;

    const statusClass = status === 'passed'
        ? 'passed'
        : status === 'failed'
            ? 'failed'
            : status === 'pending'
                ? 'pending'
                : '';

    const statusText = status === 'passed'
        ? 'Тест сдан'
        : status === 'failed'
            ? 'Тест не сдан'
            : status === 'pending'
                ? 'Ожидает проверки'
                : 'Не начат';

    const correctAnswersText = (lastResult && typeof lastResult.score === 'number' && typeof lastResult.total === 'number')
        ? `Правильных ответов: ${lastResult.score}/${lastResult.total}`
        : '';

    testCard.innerHTML = `
        <div class="test-card-title">${escapeHTML(test.name)}</div>
        <div class="test-card-meta">
            <div class="meta-item" title="Всего вопросов в тесте">
               <svg class="meta-icon icon-questions" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <span class="meta-text">${questionsCount} ${pluralize(questionsCount, 'question')}</span>
            </div>

            <div class="meta-item" title="Время на прохождение">
              <svg class="meta-icon icon-time" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span class="meta-text">${duration} ${pluralize(duration, 'minute')}</span>
            </div>

            <div class="meta-item" title="Проходной балл">
              <svg class="meta-icon icon-score" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <span class="meta-text">Нужно ${passingScore} из ${questionsCount} правильных ответов</span>
            </div>
        </div>
        <div class="test-status">
            <div class="status-text ${statusClass}">${statusText}</div>
            <!-- Этот блок можно будет заполнять в будущем, если API будет возвращать доп. инфо -->
            <div class="correct-answers"></div>
        </div>
    `;

    testCard.onclick = (e) => {
        e.preventDefault();
        onSelectCallback(test);
    };

    const correctAnswersEl = testCard.querySelector('.correct-answers');
    if (correctAnswersEl) {
        if (correctAnswersText) {
            correctAnswersEl.textContent = correctAnswersText;
            if (status === 'passed') {
                correctAnswersEl.classList.add('positive');
            } else if (status === 'failed') {
                correctAnswersEl.classList.add('negative');
            }
        } else {
            correctAnswersEl.remove();
        }
    }

    return testCard;
}

/**
 * Отрисовывает детальный протокол ответов.
 * @param {Array} protocolData - Массив с данными протокола от API.
 * @returns {string} - HTML-строка с разметкой протокола.
 */
function displayProtocol(protocolData) {
    if (!protocolData || protocolData.length === 0) {
        return '<p class="empty-state-message">Детальный протокол для этого теста недоступен.</p>';
    }

    const rows = protocolData.map((item, index) => {
        const isCorrectClass = item.isCorrect ? 'correct' : 'incorrect';
        
        let chosenAnswerContent = (item.type === 'match')
            ? '<ul>' + item.match_prompts.map((p, i) => `<li>${escapeHTML(p)} &rarr; ${escapeHTML(item.chosen_answers_match[i] || '—')}</li>`).join('') + '</ul>'
            : escapeHTML(item.chosenAnswerText);
        
        let correctAnswerContent = (item.type === 'match')
            ? '<ul>' + item.match_prompts.map((p, i) => `<li>${escapeHTML(p)} &rarr; ${escapeHTML(item.correct_answers_match[i] || '—')}</li>`).join('') + '</ul>'
            : escapeHTML(item.correctAnswerText);

        return `
          <div class="protocol-item">
              <div class="protocol-question">${index + 1}. ${escapeHTML(item.questionText)}</div>
              <div class="protocol-answers">
                  <div class="protocol-answer user ${isCorrectClass}">
                      <div class="protocol-status ${isCorrectClass}">${item.isCorrect ? '✓' : '✗'}</div>
                      <div class="protocol-answer-content">
                          <span class="protocol-label">Ваш ответ:</span>
                          <div class="protocol-text">${chosenAnswerContent}</div>
                      </div>
                  </div>
                  ${!item.isCorrect ? `
                  <div class="protocol-answer correct">
                      <div class="protocol-status correct">✓</div>
                      <div class="protocol-answer-content">
                          <span class="protocol-label">Правильный ответ:</span>
                          <div class="protocol-text">${correctAnswerContent}</div>
                      </div>
                  </div>` : ''}
              </div>
          </div>`;
    }).join('');

    return `<div class="protocol"><h3 class="protocol-title">Разбор ответов</h3>${rows}</div>`;
}

// --- Функции управления видимостью экранов ---

export function showWelcomeScreen() {
    document.getElementById('welcomeScreen').classList.remove('hidden');
    document.getElementById('testSelectionScreen').classList.add('hidden');
    document.getElementById('testRunnerScreen').classList.add('hidden');
    document.getElementById('checkingScreen').classList.add('hidden');
}

export function showTestSelectionView() {
    document.getElementById('welcomeScreen').classList.add('hidden');
    document.getElementById('testSelectionScreen').classList.remove('hidden');
    document.getElementById('testRunnerScreen').classList.add('hidden');
    document.getElementById('checkingScreen').classList.add('hidden');
}

export function showTestRunnerView() {
    document.getElementById('welcomeScreen').classList.add('hidden');
    document.getElementById('testSelectionScreen').classList.add('hidden');
    document.getElementById('testRunnerScreen').classList.remove('hidden');
    document.getElementById('checkingScreen').classList.add('hidden');
    // Убедимся, что при показе этого экрана виден контейнер теста, а не результатов
    document.getElementById('testContent').classList.remove('hidden');
    document.getElementById('resultsContainer').classList.add('hidden');
}

export function showWaitingScreen() {
    document.getElementById('welcomeScreen').classList.add('hidden');
    document.getElementById('testSelectionScreen').classList.add('hidden');
    document.getElementById('testRunnerScreen').classList.add('hidden');
    document.getElementById('checkingScreen').classList.remove('hidden');
}

// --- Функции рендеринга контента ---

export function renderPublicTestList(tests, onSelectCallback) {
    const listContainer = document.getElementById('publicTestList');
    if (!listContainer) return;
    listContainer.innerHTML = ''; 

    if (!tests || tests.length === 0) {
        listContainer.innerHTML = '<p class="empty-state-message" style="text-align: center; grid-column: 1 / -1;">В данный момент нет доступных тестов.</p>';
        return;
    }

    tests.forEach(test => {
        const testCard = createTestCardElement(test, onSelectCallback);
        listContainer.appendChild(testCard);
    });
}

export function showFinalResults(result) {
  const { passed, score, total, percentage, protocolData, testName } = result;

  showTestRunnerView(); // Показываем общий контейнер

  const finalSummaryEl = document.getElementById('finalSummary');
  const resultsContainer = document.getElementById('resultsContainer');
  
  // Скрываем контейнер с вопросами и показываем контейнер с результатами
  document.getElementById('testContent').classList.add('hidden');
  resultsContainer.classList.remove('hidden');
  
  const incorrectCount = total - score;
  const protocolHtml = protocolData ? displayProtocol(protocolData) : '';

  finalSummaryEl.innerHTML = `
    <div class="protocol-header ${passed ? 'passed' : 'failed'}">
      <div class="protocol-attestation-status">${passed ? 'АТТЕСТАЦИЯ СДАНА' : 'АТТЕСТАЦИЯ НЕ СДАНА'}</div>
      <div class="protocol-test-name">${escapeHTML(testName)}</div>
      <div class="protocol-recommendation">${passed ? 'Поздравляем с успешной сдачей теста!' : 'Рекомендуется повторно изучить материал.'}</div>
    </div>
    <div class="protocol-content">
      <div class="result-details">
        <div class="result-item">
            <div class="result-value percentage">${percentage}%</div>
            <div class="result-label">Процент правильных ответов</div>
        </div>
        <div class="result-item">
            <div class="result-value correct">${score}</div>
            <div class="result-label">Правильных ответов</div>
        </div>
        <div class="result-item">
            <div class="result-value incorrect">${incorrectCount}</div>
            <div class="result-label">Неправильных ответов</div>
        </div>
      </div>
      ${protocolHtml}
      <button class="submit-btn" id="backToTestsBtn" style="margin-top: 2rem; width: 100%; max-width: 400px; margin-left: auto; margin-right: auto;">Вернуться к выбору тестов</button>
    </div>
  `;
  
  finalSummaryEl.scrollIntoView({ behavior: 'smooth' });
}
import { escapeHTML, pluralize } from '../utils/utils.js';

const STATUS_LABELS = {
    passed: 'Тест сдан',
    failed: 'Тест не сдан',
    pending: 'Ожидает проверки',
    not_started: 'Не начат',
};

const STATUS_CLASSNAMES = {
    passed: 'passed',
    failed: 'failed',
    pending: 'pending',
    not_started: '',
};

function formatCorrectAnswers(lastResult) {
    if (!lastResult || typeof lastResult.score !== 'number' || typeof lastResult.total !== 'number') {
        return '';
    }

    return `Правильных ответов: ${lastResult.score}/${lastResult.total}`;
}

function createTestCardElement(test, onSelect) {
    const status = test.status || (test.passedStatus ? 'passed' : 'not_started');
    const statusClass = STATUS_CLASSNAMES[status] || '';
    const statusText = STATUS_LABELS[status] || STATUS_LABELS.not_started;
    const correctAnswers = formatCorrectAnswers(test.lastResult);

    const card = document.createElement('a');
    card.href = '#';
    card.className = ['test-card', statusClass].filter(Boolean).join(' ');
    card.dataset.id = test.id;

    card.innerHTML = `
        <div class="test-card-title">${escapeHTML(test.name)}</div>
        <div class="test-card-meta">
            <div class="meta-item" title="Всего вопросов в тесте">
                <svg class="meta-icon icon-questions" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <span class="meta-text">${test.questions_per_test} ${pluralize(test.questions_per_test, 'question')}</span>
            </div>
            <div class="meta-item" title="Время на прохождение">
                <svg class="meta-icon icon-time" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span class="meta-text">${test.duration_minutes} ${pluralize(test.duration_minutes, 'minute')}</span>
            </div>
            <div class="meta-item" title="Проходной балл">
                <svg class="meta-icon icon-score" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <span class="meta-text">Нужно ${test.passing_score} из ${test.questions_per_test} правильных ответов</span>
            </div>
        </div>
        <div class="test-status">
            <div class="status-text ${statusClass}">${statusText}</div>
            ${correctAnswers ? `<div class="correct-answers${status === 'passed' ? ' positive' : status === 'failed' ? ' negative' : ''}">${correctAnswers}</div>` : ''}
        </div>
    `;

    card.addEventListener('click', (event) => {
        event.preventDefault();
        onSelect(test);
    });

    return card;
}

function displayProtocol(protocolData) {
    if (!Array.isArray(protocolData) || protocolData.length === 0) {
        return '<p class="empty-state-message">Детальный протокол для этого теста недоступен.</p>';
    }

    return `
        <div class="protocol">
            <h3 class="protocol-title">Разбор ответов</h3>
            ${protocolData
                .map((item, index) => {
                    const isCorrectClass = item.isCorrect ? 'correct' : 'incorrect';
                    const chosenAnswerContent = item.type === 'match'
                        ? `<ul>${item.match_prompts
                              .map((prompt, promptIndex) => `<li>${escapeHTML(prompt)} &rarr; ${escapeHTML(item.chosen_answers_match?.[promptIndex] ?? '—')}</li>`)
                              .join('')}</ul>`
                        : escapeHTML(item.chosenAnswerText);

                    const correctAnswerContent = item.type === 'match'
                        ? `<ul>${item.match_prompts
                              .map((prompt, promptIndex) => `<li>${escapeHTML(prompt)} &rarr; ${escapeHTML(item.correct_answers_match?.[promptIndex] ?? '—')}</li>`)
                              .join('')}</ul>`
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
                                ${item.isCorrect ? '' : `
                                    <div class="protocol-answer correct">
                                        <div class="protocol-status correct">✓</div>
                                        <div class="protocol-answer-content">
                                            <span class="protocol-label">Правильный ответ:</span>
                                            <div class="protocol-text">${correctAnswerContent}</div>
                                        </div>
                                    </div>
                                `}
                            </div>
                        </div>
                    `;
                })
                .join('')}
        </div>
    `;
}

export function showWelcomeScreen() {
    document.getElementById('welcomeScreen')?.classList.remove('hidden');
    document.getElementById('testSelectionScreen')?.classList.add('hidden');
    document.getElementById('testRunnerScreen')?.classList.add('hidden');
    document.getElementById('checkingScreen')?.classList.add('hidden');
}

export function showTestSelectionView() {
    document.getElementById('welcomeScreen')?.classList.add('hidden');
    document.getElementById('testSelectionScreen')?.classList.remove('hidden');
    document.getElementById('testRunnerScreen')?.classList.add('hidden');
    document.getElementById('checkingScreen')?.classList.add('hidden');
}

export function showTestRunnerView() {
    document.getElementById('welcomeScreen')?.classList.add('hidden');
    document.getElementById('testSelectionScreen')?.classList.add('hidden');
    document.getElementById('testRunnerScreen')?.classList.remove('hidden');
    document.getElementById('checkingScreen')?.classList.add('hidden');

    document.getElementById('testContent')?.classList.remove('hidden');
    document.getElementById('resultsContainer')?.classList.add('hidden');
}

export function showWaitingScreen() {
    document.getElementById('welcomeScreen')?.classList.add('hidden');
    document.getElementById('testSelectionScreen')?.classList.add('hidden');
    document.getElementById('testRunnerScreen')?.classList.add('hidden');
    document.getElementById('checkingScreen')?.classList.remove('hidden');
}

export function renderPublicTestList(tests, onSelectCallback) {
    const container = document.getElementById('publicTestList');
    if (!container) {
        return;
    }

    container.innerHTML = '';

    if (!Array.isArray(tests) || tests.length === 0) {
        container.innerHTML = '<p class="empty-state-message" style="text-align: center; grid-column: 1 / -1;">В данный момент нет доступных тестов.</p>';
        return;
    }

    tests.forEach((test) => {
        const card = createTestCardElement(test, onSelectCallback);
        container.appendChild(card);
    });
}

export function showFinalResults(result) {
    const {
        passed,
        score,
        total,
        percentage,
        protocolData,
        testName,
    } = result;

    showTestRunnerView();

    const finalSummaryEl = document.getElementById('finalSummary');
    const resultsContainer = document.getElementById('resultsContainer');

    document.getElementById('testContent')?.classList.add('hidden');
    resultsContainer?.classList.remove('hidden');

    const incorrectCount = typeof total === 'number' && typeof score === 'number' ? total - score : 0;
    const protocolHtml = displayProtocol(protocolData);

    if (finalSummaryEl) {
        finalSummaryEl.innerHTML = `
            <div class="protocol-header ${passed ? 'passed' : 'failed'}">
                <div class="protocol-attestation-status">${passed ? 'АТТЕСТАЦИЯ СДАНА' : 'АТТЕСТАЦИЯ НЕ СДАНА'}</div>
                <div class="protocol-test-name">${escapeHTML(testName ?? '')}</div>
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
}

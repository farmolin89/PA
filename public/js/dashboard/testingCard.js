// ===================================================================
// File: public/js/dashboard/testingCard.js (ПОЛНАЯ ИТОГОВАЯ ВЕРСИЯ С ИСПРАВЛЕНИЕМ)
// ===================================================================

/**
 * Обновляет DOM-элементы карточки "Обучение персонала" данными с сервера.
 * @param {object} summary - Объект со сводной статистикой.
 */
function updateTestingCard(summary) {
    const totalTestsEl = document.getElementById('testing-total-tests');
    const passedTestsEl = document.getElementById('testing-passed-tests');
    const avgResultEl = document.getElementById('testing-avg-result');
    const needsReviewEl = document.getElementById('testing-needs-review');

    if (totalTestsEl) totalTestsEl.textContent = summary.totalTests;
    if (passedTestsEl) passedTestsEl.textContent = summary.passedTests;
    
    // === ИСПРАВЛЕНИЕ ЗДЕСЬ ===
    // Имя поля приведено в соответствие с ответом от API (avgResult вместо averageResult).
    if (avgResultEl) avgResultEl.textContent = `${summary.avgResult}%`; 
    
    if (needsReviewEl) {
        needsReviewEl.textContent = summary.needsReview;
        // Добавляем визуальный акцент, если есть тесты для проверки
        const parentStatItem = needsReviewEl.closest('.stat-item');
        if (parentStatItem) {
            parentStatItem.classList.toggle('highlight-warning', summary.needsReview > 0);
        }
    }
}

/**
 * Запрашивает сводную статистику по тестам и вызывает функцию для обновления UI.
 */
export async function fetchTestingData() {
    try {
        const response = await fetch('/api/admin/tests/summary');
        
        if (!response.ok) {
            // Если сессия истекла или нет прав (401/403), сервер вернет ошибку.
            // Мы просто оставим '...' в полях, не показывая ошибку пользователю.
            console.error('Failed to fetch testing summary, status:', response.status);
            return;
        }
        
        const summaryData = await response.json();
        updateTestingCard(summaryData);

    } catch (error) {
        console.error('Error fetching testing data:', error);
        // В случае сетевой ошибки карточка также останется с '...'.
    }
}
// ===================================================================
// File: public/js/dashboard/edsCard.js
// Description: Логика для карточки "Менеджер ЭЦП" на дашборде.
// ===================================================================

/**
 * Обновляет DOM-элементы карточки "Менеджер ЭЦП" на основе полученных данных.
 * @param {object} data - Объект со статистикой { total, active, expiring }.
 */
function updateEdsCardUI(data) {
    document.getElementById('eds-total').textContent = data.total ?? '0';
    document.getElementById('eds-active').textContent = data.active ?? '0';
    document.getElementById('eds-expiring').textContent = data.expiring ?? '0';
}

/**
 * Загружает данные для карточки "Менеджер ЭЦП" с сервера.
 * Использует новый, изолированный эндпоинт /api/eds/stats.
 */
export async function fetchEdsData() {
    try {
        // Обращаемся к новому эндпоинту, специфичному для ЭЦП
        const response = await fetch('/api/eds/stats'); 
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        updateEdsCardUI(data);
    } catch (error) {
        console.error('Failed to fetch EDS data:', error);
        // В случае ошибки показываем нули, чтобы избежать "..."
        updateEdsCardUI({ total: '0', active: '0', expiring: '0' });
    }
}
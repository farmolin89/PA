// ===================================================================
// File: public/js/dashboard/verificationCard.js
// Description: Логика для карточки "График поверки" на дашборде.
// ===================================================================

// Импортируем функцию для получения статистики из нашего API-клиента
import { fetchVerificationStats } from '../common/api-client.js';

/**
 * Обновляет DOM-элементы карточки "График поверки" на основе полученных данных.
 * @param {object} data - Объект со статистикой { total, expiringInMonth, expired }.
 */
function updateVerificationCardUI(data) {
    const totalEl = document.getElementById('verif-total');
    const expiringMonthEl = document.getElementById('verif-expiring-month');
    const expiredEl = document.getElementById('verif-expired');

    if (totalEl) totalEl.textContent = data.total ?? '0';
    if (expiringMonthEl) expiringMonthEl.textContent = data.expiringInMonth ?? '0';
    if (expiredEl) expiredEl.textContent = data.expired ?? '0';
}

/**
 * Загружает данные для карточки "График поверки" с сервера и обновляет UI.
 */
export async function initializeVerificationCard() {
    try {
        const stats = await fetchVerificationStats();
        updateVerificationCardUI(stats);
    } catch (error)        {
        console.error('Failed to fetch verification stats:', error);
        // В случае ошибки показываем 'N/A' или '0'
        updateVerificationCardUI({ total: 'N/A', expiringInMonth: 'N/A', expired: 'N/A' });
    }
}
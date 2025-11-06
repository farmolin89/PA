// ===================================================================
// File: public/js/trips/tooltip.js (ОБНОВЛЕННАЯ ВЕРСИЯ С ТУЛТИПОМ ДЛЯ ОТПУСКА)
// ===================================================================

import { state } from './state.js';
import { utils } from './trip-helpers.js';

const tooltip = document.getElementById('trip-tooltip-modern');

/**
 * Возвращает правильное склонение слова "день" в зависимости от числа.
 * @param {number} days - Количество дней.
 * @returns {string} - Слово "день", "дня" или "дней".
 */
function getDayText(days) {
    if (days === null || days < 0) return '';
    const lastDigit = days % 10;
    const lastTwoDigits = days % 100;
    if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return 'дней';
    if (lastDigit === 1) return 'день';
    if (lastDigit >= 2 && lastDigit <= 4) return 'дня';
    return 'дней';
}

/**
 * Показывает и заполняет всплывающую подсказку данными о командировке.
 * @param {object} trip - Объект командировки.
 * @param {MouseEvent} event - Событие мыши для определения начальной позиции.
 */
export function showTooltip(trip, event) {
    const organization = state.organizations.find(o => o.id === trip.organizationId);
    if (!tooltip || !organization) return;

    // Показываем все элементы, которые могли быть скрыты тултипом отпуска
    tooltip.querySelectorAll('.modern-item, .modern-status, #tooltip-modern-partner-block').forEach(el => el.style.display = '');
    tooltip.querySelector('.modern-item.modern-organization').style.display = 'grid';

    const locationIconContainer = tooltip.querySelector('.location-icon');
    
    if (trip.transport) {
        const icons = { car: 'fas fa-car', train: 'fas fa-train', plane: 'fas fa-plane' };
        locationIconContainer.innerHTML = `<i class="${icons[trip.transport] || 'fas fa-map-marker-alt'}"></i>`;
    } else {
        locationIconContainer.innerHTML = '<i class="fas fa-map-marker-alt"></i>';
    }
    
    tooltip.querySelector('.subtitle').textContent = "Командировка";
    document.getElementById('tooltip-modern-destination').textContent = trip.destination;
    document.getElementById('tooltip-modern-organization').textContent = organization.name;
    
    const startDate = new Date(trip.startDate);
    const endDate = new Date(trip.endDate);
    
    document.getElementById('tooltip-modern-start-date').textContent = startDate.toLocaleDateString('ru-RU');
    document.getElementById('tooltip-modern-end-date').textContent = endDate.toLocaleDateString('ru-RU');

    const timeDiff = endDate.getTime() - startDate.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1;
    document.getElementById('tooltip-modern-duration').textContent = `${daysDiff} ${getDayText(daysDiff)}`;
    
    const statusBadge = document.getElementById('tooltip-modern-status');
    const dynamicStatus = utils.getTripDynamicStatus(trip);
    statusBadge.textContent = dynamicStatus.text;
    statusBadge.className = 'modern-status';
    statusBadge.classList.add(dynamicStatus.className);

    const partnerBlock = document.getElementById('tooltip-modern-partner-block');
    const participants = trip.participants.map(id => state.employees.find(e => e.id === id)).filter(Boolean);

    if (participants.length > 0) {
        partnerBlock.style.display = 'block';
        const label = partnerBlock.querySelector('.modern-label');
        label.textContent = participants.length > 1 ? 'Участники' : 'Участник';
        
        const partnerInfoContainer = document.getElementById('partner-info-container');
        partnerInfoContainer.innerHTML = participants.map(p => `
            <div class="partner-info" style="margin-bottom: ${participants.length > 1 ? '8px' : '0'}">
                <div class="partner-avatar">${p.lastName[0]}${p.firstName[0]}</div>
                <div class="partner-details">
                    <div class="partner-name">${p.lastName} ${p.firstName}</div>
                    <div class="partner-position">${p.position}</div>
                </div>
            </div>
        `).join('');

    } else {
        partnerBlock.style.display = 'none';
    }
    
    updateTooltipPosition(event);
    tooltip.style.display = 'block';
}

/**
 * +++ НОВАЯ ФУНКЦИЯ +++
 * Показывает и заполняет всплывающую подсказку данными об отпуске.
 * @param {object} vacation - Объект отпуска.
 * @param {MouseEvent} event - Событие мыши для определения начальной позиции.
 */
export function showVacationTooltip(vacation, event) {
    if (!tooltip) return;

    // Скрываем ненужные для отпуска элементы
    tooltip.querySelectorAll('.modern-status, #tooltip-modern-partner-block').forEach(el => el.style.display = 'none');
    tooltip.querySelector('.modern-item.modern-organization').style.display = 'none';
    
    const locationIconContainer = tooltip.querySelector('.location-icon');
    locationIconContainer.innerHTML = `<i class="fas fa-umbrella-beach"></i>`;
    
    tooltip.querySelector('.subtitle').textContent = "Событие";
    document.getElementById('tooltip-modern-destination').textContent = "Отпуск";
    
    const startDate = new Date(vacation.startDate);
    const endDate = new Date(vacation.endDate);
    
    document.getElementById('tooltip-modern-start-date').textContent = startDate.toLocaleDateString('ru-RU');
    document.getElementById('tooltip-modern-end-date').textContent = endDate.toLocaleDateString('ru-RU');

    const timeDiff = endDate.getTime() - startDate.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1;
    document.getElementById('tooltip-modern-duration').textContent = `${daysDiff} ${getDayText(daysDiff)}`;
    
    updateTooltipPosition(event);
    tooltip.style.display = 'block';
}

/**
 * Скрывает всплывающую подсказку.
 */
export function hideTooltip() { 
    if (tooltip) tooltip.style.display = 'none'; 
}

/**
 * Обновляет позицию всплывающей подсказки вслед за курсором мыши.
 * @param {MouseEvent} event - Событие движения мыши.
 */
export function updateTooltipPosition(event) {
    if (!tooltip) return;
    const offsetX = 15;
    const offsetY = 15;
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let left = event.clientX + offsetX;
    let top = event.clientY + offsetY;

    if (left + tooltipRect.width > viewportWidth) {
        left = event.clientX - tooltipRect.width - offsetX;
    }
    if (top + tooltipRect.height > viewportHeight) {
        top = event.clientY - tooltipRect.height - offsetY;
    }
    if (left < 0) left = offsetX;
    if (top < 0) top = offsetY;

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
}
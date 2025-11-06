// ===================================================================
// File: public/js/verification/verificationList.js (Полная итоговая версия)
// Description: Компонент для управления списком оборудования.
//              Отрисовывает колонку "Действия" с иконками местоположения
//              и загрузки, обрабатывает клики и статусы строк.
// ===================================================================

import { getVerificationEquipment, deleteVerificationEquipment, updateVerificationEquipment } from '../common/api-client.js';
import { openVerificationModal } from './verificationModal.js';
import { showConfirmModal } from '../common/modals.js';

// --- Состояние компонента ---
export let allEquipment = [];
let filteredEquipment = [];
let currentView = 'si'; // 'si' или 'vo'
let currentSort = { column: 'name', direction: 'asc' };

// --- Элементы DOM ---
const elements = {
    siTable: document.getElementById('siTable'),
    voTable: document.getElementById('voTable'),
    siTableBody: document.getElementById('siTable').querySelector('tbody'),
    voTableBody: document.getElementById('voTable').querySelector('tbody'),
    searchInput: document.getElementById('verification-search-input'),
};

// --- Вспомогательные функции ---
const helpers = {
    getVerificationStatus: (dateString) => {
        if (!dateString) return { statusClass: 'status-expired', statusText: 'Нет данных' };
        const verificationDate = new Date(dateString);
        if (isNaN(verificationDate.getTime())) return { statusClass: 'status-expired', statusText: 'Ошибка даты' };
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const daysDiff = Math.ceil((verificationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff < 0) return { statusClass: 'status-expired', statusText: 'Просрочено' };
        if (daysDiff <= 30) return { statusClass: 'status-warning', statusText: 'Скоро истекает' };
        return { statusClass: 'status-actual', statusText: 'Актуально' };
    },
    formatDate: (dateString) => {
        if (!dateString) return '';
        try {
            const [year, month, day] = dateString.split('T')[0].split('-');
            return `${day}.${month}.${year}`;
        } catch {
            return dateString;
        }
    },
    escapeHTML: (str) => {
        return String(str ?? '').replace(/[&<>"']/g, match => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[match]));
    },
};

// --- Функции рендеринга ---

/**
 * Генерирует HTML для колонки "Действия" на основе данных оборудования.
 * @param {object} item - Объект оборудования.
 * @returns {string} HTML-строка с кнопками действий.
 */
function renderActionButtons(item) {
    const location = item.location || 'office';
    let locationIcon = 'fa-building';
    let locationTitle = 'В офисе';
    if (location === 'verification') {
        locationIcon = 'fa-tachometer-alt';
        locationTitle = 'На поверке';
    }
    if (location === 'business-trip') {
        locationIcon = 'fa-suitcase';
        locationTitle = 'В командировке';
    }

    const certificateUrl = item.certificatePath || '#';
    const invoiceUrl = item.invoicePath || '#';
    const certDownloadAttr = item.certificatePath ? 'download' : '';
    const invoiceDownloadAttr = item.invoicePath ? 'download' : '';

    return `
        <div class="action-buttons">
            <button class="btn-location ${helpers.escapeHTML(location)}" title="${locationTitle}"><i class="fas ${locationIcon}"></i></button>
            <a href="${certificateUrl}" ${certDownloadAttr} class="btn-download" title="Скачать свидетельство"><i class="fas fa-file-pdf"></i></a>
            <a href="${invoiceUrl}" ${invoiceDownloadAttr} class="btn-download" title="Скачать счет-фактуру"><i class="fas fa-file-invoice"></i></a>
            <button class="btn-delete-row" title="Удалить"><i class="fas fa-trash"></i></button>
        </div>
    `;
}


/**
 * Создает и возвращает элемент <tr> для таблицы СИ.
 * @param {object} item - Данные оборудования.
 * @param {number} index - Порядковый номер.
 * @returns {HTMLTableRowElement} Готовый элемент строки таблицы.
 */
function renderSiRow(item, index) {
    const { statusClass, statusText } = helpers.getVerificationStatus(item.nextVerificationDate);
    const regNumbersHTML = (item.regNumbers || []).map(reg =>
        reg.url ? `<a href="${reg.url}" class="reg-number-link" target="_blank">${helpers.escapeHTML(reg.number)}</a>` : `<div class="reg-number-plain">${helpers.escapeHTML(reg.number)}</div>`
    ).join('');

    const row = document.createElement('tr');
    row.dataset.id = item.id;
    row.dataset.type = item.equipmentType || 'si';

    if (statusClass === 'status-warning') row.className = 'status-warning';
    if (statusClass === 'status-expired') row.className = 'status-expired';

    row.innerHTML = `
        <td>${index}</td>
        <td>${helpers.escapeHTML(item.name)}</td>
        <td>${helpers.escapeHTML(item.modification)}</td>
        <td><div class="reg-numbers-list">${regNumbersHTML}</div></td>
        <td class="no-wrap">${helpers.escapeHTML(item.serialNumber)}</td>
        <td>${helpers.escapeHTML(item.inventoryNumber)}</td>
        <td>${helpers.formatDate(item.commissionDate)}</td>
        <td>${helpers.escapeHTML(item.yearManufactured)}</td>
        <td>${helpers.formatDate(item.lastVerificationDate)}</td>
        <td><div class="verification-date-container ${statusClass}"><span class="verification-date">${helpers.formatDate(item.nextVerificationDate)}</span><div class="verification-status">${statusText}</div></div></td>
        <td>${helpers.escapeHTML(item.city)}</td>
        <td>${helpers.escapeHTML(item.responsible)}</td>
        <td>${renderActionButtons(item)}</td>
    `;
    return row;
}

/**
 * Создает и возвращает элемент <tr> для таблицы ВО.
 * @param {object} item - Данные оборудования.
 * @param {number} index - Порядковый номер.
 * @returns {HTMLTableRowElement} Готовый элемент строки таблицы.
 */
function renderVoRow(item, index) {
    const { statusClass, statusText } = helpers.getVerificationStatus(item.nextVerificationDate);

    const row = document.createElement('tr');
    row.dataset.id = item.id;
    row.dataset.type = 'vo';

    if (statusClass === 'status-warning') row.className = 'status-warning';
    if (statusClass === 'status-expired') row.className = 'status-expired';

    row.innerHTML = `
        <td>${index}</td>
        <td>${helpers.escapeHTML(item.name)}</td>
        <td class="no-wrap">${helpers.escapeHTML(item.serialNumber)}</td>
        <td>${helpers.escapeHTML(item.inventoryNumber)}</td>
        <td>${helpers.escapeHTML(item.yearManufactured)}</td>
        <td>${helpers.formatDate(item.lastVerificationDate)}</td>
        <td><div class="verification-date-container ${statusClass}"><span class="verification-date">${helpers.formatDate(item.nextVerificationDate)}</span><div class="verification-status">${statusText}</div></div></td>
        <td>${helpers.escapeHTML(item.city)}</td>
        <td>${renderActionButtons(item)}</td>
    `;
    return row;
}

function applyFilterAndSort() {
    let data = [...allEquipment];
    const searchTerm = elements.searchInput.value.toLowerCase().trim();
    if (searchTerm) {
        data = data.filter(item =>
            (item.name?.toLowerCase().includes(searchTerm)) ||
            (item.serialNumber?.toLowerCase().includes(searchTerm)) ||
            (item.inventoryNumber?.toLowerCase().includes(searchTerm))
        );
    }
    if (currentSort.column) {
        data.sort((a, b) => {
            const aVal = a[currentSort.column] || '';
            const bVal = b[currentSort.column] || '';
            const comparison = String(aVal).localeCompare(String(bVal), 'ru', { numeric: true });
            return currentSort.direction === 'asc' ? comparison : -comparison;
        });
    }
    filteredEquipment = data;
}

function renderAll() {
    applyFilterAndSort();
    elements.siTableBody.innerHTML = '';
    elements.voTableBody.innerHTML = '';
    let siCounter = 1;
    let voCounter = 1;
    filteredEquipment.forEach(item => {
        if (item.equipmentType === 'vo') {
            elements.voTableBody.appendChild(renderVoRow(item, voCounter++));
        } else {
            elements.siTableBody.appendChild(renderSiRow(item, siCounter++));
        }
    });
}

export async function reloadAndRenderList() {
    try {
        allEquipment = await getVerificationEquipment();
        renderAll();
    } catch (error) {
        console.error('Ошибка загрузки списка оборудования:', error);
    }
}

function handleSort(column) {
    if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = column;
        currentSort.direction = 'asc';
    }
    document.querySelectorAll('.sortable').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        if (th.dataset.column === column) {
            th.classList.add(`sort-${currentSort.direction}`);
        }
    });
    renderAll();
}

async function handleDelete(itemId) {
    try {
        const deletedItem = allEquipment.find(item => item.id === itemId);
        await deleteVerificationEquipment(itemId);
        if (deletedItem) {
            toast.info(`Оборудование "${deletedItem.name}" удалено.`);
        }
        await reloadAndRenderList();
    } catch (error) {
        console.error('Ошибка удаления оборудования:', error);
    }
}

async function handleLocationChange(item) {
    const locations = ['office', 'verification', 'business-trip'];
    const currentIndex = locations.indexOf(item.location || 'office');
    const nextIndex = (currentIndex + 1) % locations.length;
    const nextLocation = locations[nextIndex];
    
    const formData = new FormData();
    const dataToSend = { ...item, location: nextLocation };
    formData.append('data', JSON.stringify(dataToSend));
    
    try {
        await updateVerificationEquipment(item.id, formData);
        await reloadAndRenderList();
    } catch (error) {
        console.error('Ошибка изменения местоположения:', error);
        toast.error('Не удалось изменить местоположение.');
    }
}


export function initializeVerificationList() {
    document.querySelectorAll('.equipment-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelector('.equipment-btn.active').classList.remove('active');
            btn.classList.add('active');
            currentView = btn.dataset.type;
            elements.siTable.style.display = currentView === 'si' ? 'table' : 'none';
            elements.voTable.style.display = currentView === 'vo' ? 'table' : 'none';
        });
    });

    elements.searchInput.addEventListener('input', renderAll);
    document.querySelector('.clear-search').addEventListener('click', () => {
        elements.searchInput.value = '';
        renderAll();
    });

    document.querySelectorAll('.sortable').forEach(th => {
        th.addEventListener('click', () => handleSort(th.dataset.column));
    });

    const handleTableClick = (event) => {
        const row = event.target.closest('tr[data-id]');
        if (!row) return;

        const itemId = parseInt(row.dataset.id, 10);
        const item = allEquipment.find(i => i.id === itemId);
        if (!item) return;

        // Клик по кнопке местоположения
        if (event.target.closest('.btn-location')) {
            handleLocationChange(item);
            return;
        }

        // Клик по кнопке удаления
        if (event.target.closest('.btn-delete-row')) {
            showConfirmModal({
                title: 'Подтверждение удаления',
                text: `Вы уверены, что хотите удалить "${helpers.escapeHTML(item.name)}"? Это действие нельзя отменить.`,
                confirmText: 'Да, удалить',
                cancelText: 'Отмена',
                onConfirm: () => handleDelete(itemId),
            });
            return;
        }
        
        // Игнорируем клики по ссылкам (для скачивания файлов), чтобы не открывать модальное окно
        if (event.target.closest('a')) {
            return;
        }

        // Клик по остальной части строки -> открываем модальное окно редактирования
        openVerificationModal(item);
    };

    elements.siTableBody.addEventListener('click', handleTableClick);
    elements.voTableBody.addEventListener('click', handleTableClick);
}
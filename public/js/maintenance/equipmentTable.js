// ===================================================================
// Файл: public/js/maintenance/equipmentTable.js (ФИНАЛЬНАЯ ВЕРСИЯ СО ВСЕМИ ФУНКЦИЯМИ)
// ===================================================================

import { openEditModal } from './equipmentModal.js';
import { showConfirmModal } from '../common/modals.js';
import { deleteEquipment } from '../common/api-client.js';
import { calculateTODates, parseDate, formatDate, formatFullDate } from '../utils/date-utils.js';
import { escapeHTML } from '../utils/utils.js';

let onDataChangeCallback = () => {};
let getEquipmentByIdCallback = () => {};
let currentEquipmentList = []; // Локальное хранилище для отфильтрованного списка
let allEquipmentList = []; // Хранилище для полного списка (для нумерации и сортировки)

// Состояние сортировки
const sortState = {
    column: null,
    direction: 'asc'
};

// --- ЛОГИКА ТУЛТИПОВ ---
const tooltip = document.getElementById('dateTooltip');

function showTooltip(event) {
    const dateElement = event.target.closest('.to-date');
    if (!dateElement || !tooltip) return;

    const status = dateElement.dataset.status;
    const actualDate = dateElement.dataset.actualDate;
    const originalDate = dateElement.dataset.originalDate;
    const equipmentName = dateElement.dataset.equipmentName;
    const serviceWork = dateElement.dataset.serviceWork;
    const serviceFrequency = dateElement.dataset.serviceFrequency;
    
    let statusText = '';
    let statusClass = '';
    
    switch(status) {
        case 'completed': statusText = 'ТО выполнено'; statusClass = 'status-completed'; break;
        case 'moved': statusText = 'ТО перенесено'; statusClass = 'status-moved'; break;
        case 'planned': statusText = 'ТО запланировано'; statusClass = 'status-planned'; break;
    }
    
    tooltip.innerHTML = `
        <div class="tooltip-header"><span>${equipmentName}</span></div>
        <div class="tooltip-date">${actualDate}</div>
        <div class="tooltip-status ${statusClass}">${statusText}</div>
        <div class="tooltip-info">${serviceWork}</div>
        <div class="tooltip-service-type">Периодичность: ${serviceFrequency}</div>
        ${originalDate ? `<div class="tooltip-original-date">Первоначальная дата: ${originalDate}</div>` : ''}
    `;
    
    tooltip.classList.add('show');
    updateTooltipPosition(event);
}

function hideTooltip() {
    if (tooltip) {
        tooltip.classList.remove('show');
    }
}

function updateTooltipPosition(event) {
    if (!tooltip || !tooltip.classList.contains('show')) return;
    
    const offsetX = 15;
    const offsetY = 15;
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let left = event.clientX + offsetX;
    let top = event.clientY + offsetY;

    if (left + tooltipRect.width > viewportWidth - 10) {
        left = event.clientX - tooltipRect.width - offsetX;
    }
    if (top + tooltipRect.height > viewportHeight - 10) {
        top = event.clientY - tooltipRect.height - offsetY;
    }
    if (left < 10) left = 10;
    if (top < 10) top = 10;

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
}

function getServiceStatusClass(frequency) {
    switch(frequency) {
        case '1 раз в месяц': return 'status-monthly';
        case '1 раз в 3 месяца': return 'status-quarterly';
        case '1 раз в 6 месяцев': return 'status-planned';
        case '1 раз в год': return 'status-annual';
        case '1 раз в 2 года': return 'status-moved';
        default: return 'status-planned';
    }
}

function createEquipmentRow(item, year) {
    const row = document.createElement('tr');
    row.dataset.id = item.id;

    let rowHTML = `
        <td class="col-number">${item.order || ''}</td>
        <td>${escapeHTML(item.name || '')}</td>
        <td>${escapeHTML(item.serial || '')}</td>
        <td>${(item.services || []).map(service => escapeHTML(service.work || '')).join('<br>')}</td>
        <td>${(item.services || []).map(service => escapeHTML(service.frequency || '')).join('<br>')}</td>
    `;
    
    try {
        const startDate = parseDate(item.startDate || '01.01.2023');
        const allTODates = calculateTODates(startDate, item.services || [], 10);
        
        for (let month = 0; month < 12; month++) {
            const monthDates = allTODates.filter(to => 
                to.actualDate.getMonth() === month && to.actualDate.getFullYear() === year
            );
            
            let cellHTML = monthDates.map(to => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const status = to.actualDate < today ? 'completed' : (to.wasMoved ? 'moved' : 'planned');
                
                return `
                    <span class="to-date ${getServiceStatusClass(to.service.frequency)}"
                          data-status="${status}"
                          data-actual-date="${formatFullDate(to.actualDate)}"
                          data-original-date="${to.wasMoved ? formatFullDate(to.originalDate) : ''}"
                          data-equipment-name="${escapeHTML(item.name || '')}"
                          data-service-work="${escapeHTML(to.service.work || '')}"
                          data-service-frequency="${escapeHTML(to.service.frequency || '')}">
                        ${formatDate(to.actualDate)}
                    </span>
                `;
            }).join('');
            rowHTML += `<td>${cellHTML}</td>`;
        }
    } catch (error) {
        console.error('Ошибка при создании строки оборудования:', error, item);
        for (let month = 0; month < 12; month++) { rowHTML += `<td></td>`; }
    }
    
    rowHTML += `
        <td class="col-actions">
            <button class="delete-btn" title="Удалить оборудование">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>
            </button>
        </td>
    `;
    
    row.innerHTML = rowHTML;
    return row;
}

export function clearTable(message) {
    const tbody = document.querySelector('#mainTable tbody');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="18" style="text-align: center; padding: 20px;">${message}</td></tr>`;
    }
}

export function renderTable(equipmentList, year, allEquipment) {
    currentEquipmentList = [...equipmentList];
    allEquipmentList = [...allEquipment];
    
    if (sortState.column) {
        sortAndRender(false);
        return;
    }

    const tbody = document.querySelector('#mainTable tbody');
    if (!tbody) return;

    if (equipmentList.length === 0) {
        const searchInput = document.getElementById('maintenance-search-input');
        const message = searchInput && searchInput.value ? 'По вашему запросу ничего не найдено.' : 'Нет данных для отображения.';
        clearTable(message);
        return;
    }

    equipmentList.forEach(item => {
        const fullIndex = allEquipment.findIndex(e => e.id === item.id);
        item.order = fullIndex !== -1 ? fullIndex + 1 : '?';
    });

    const fragment = document.createDocumentFragment();
    equipmentList.forEach(item => fragment.appendChild(createEquipmentRow(item, year)));
    tbody.innerHTML = '';
    tbody.appendChild(fragment);
}

function sortAndRender(toggleDirection = true) {
    const { column } = sortState;
    if (!column) return;

    if (toggleDirection) {
        sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
    }

    currentEquipmentList.sort((a, b) => {
        const valA = a[column] || '';
        const valB = b[column] || '';
        const comparison = valA.localeCompare(valB, 'ru', { numeric: true });
        return sortState.direction === 'asc' ? comparison : -comparison;
    });
    
    const year = parseInt(document.getElementById('currentYear').textContent, 10);
    renderTable(currentEquipmentList, year, allEquipmentList);

    document.querySelectorAll('th.sortable').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        if (th.dataset.column === column) {
            th.classList.add(`sort-${sortState.direction}`);
        }
    });
}

function initColumnResize() {
    const table = document.getElementById('mainTable');
    if (!table) return;
    
    let isResizing = false;
    let currentHeader = null;
    let startX = 0;
    let startWidth = 0;

    document.addEventListener('mousedown', (e) => {
        if (!e.target.classList.contains('resizer')) return;
        isResizing = true;
        currentHeader = e.target.parentElement;
        startX = e.pageX;
        startWidth = currentHeader.offsetWidth;
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing || !currentHeader) return;
        const width = startWidth + (e.pageX - startX);
        if (width > 50) {
            currentHeader.style.width = `${width}px`;
        }
    });

    document.addEventListener('mouseup', () => {
        isResizing = false;
        currentHeader = null;
    });
}

export function initEquipmentTable(reloadCallback, getByIdCallback) {
    onDataChangeCallback = reloadCallback;
    getEquipmentByIdCallback = getByIdCallback;

    const tableBody = document.querySelector('#mainTable tbody');
    const tableHeader = document.querySelector('#mainTable thead');
    if (!tableBody || !tableHeader) return;

    tableBody.addEventListener('click', e => {
        const row = e.target.closest('tr[data-id]');
        if (!row) return;
        const equipmentId = parseInt(row.dataset.id, 10);
        const equipment = getEquipmentByIdCallback(equipmentId);

        if (e.target.closest('.delete-btn')) {
            showConfirmModal({
                title: 'Удалить оборудование?',
                text: `Вы уверены, что хотите удалить "${equipment?.name || 'это оборудование'}"?`,
                onConfirm: async () => {
                    try {
                        await deleteEquipment(equipmentId);
                        window.toast.success('Оборудование успешно удалено.');
                        onDataChangeCallback();
                    } catch (error) { /* Ошибку покажет глобальный обработчик */ }
                }
            });
        } else if (window.getSelection().toString().length === 0) {
            if (equipment) {
                openEditModal(equipment);
            }
        }
    });

    tableBody.addEventListener('mouseover', showTooltip);
    tableBody.addEventListener('mouseout', hideTooltip);
    tableBody.addEventListener('mousemove', updateTooltipPosition);

    tableHeader.addEventListener('click', e => {
        const header = e.target.closest('th.sortable');
        if (header) {
            const column = header.dataset.column;
            if(sortState.column !== column) {
                sortState.direction = 'asc';
            }
            sortState.column = column;
            sortAndRender();
        }
    });
    
    initColumnResize();
}
// ===================================================================
// File: public/js/eds/signatureList.js (ВЕРСИЯ С ИСПРАВЛЕННЫМ СКЛОНЕНИЕМ)
// ===================================================================

import { getAllSignatures, deleteSignature } from '../common/api-client.js';
import { openSignatureModal } from './signatureModal.js';
import { showConfirmModal } from '../common/modals.js';

// --- Состояние компонента ---
let allEmployees = [];
let filteredEmployees = [];
let currentView = 'table';
let currentSort = { field: 'fio', direction: 'asc' };

// --- Элементы DOM ---
const elements = {
    tableBody: document.getElementById('tableBody'),
    cardsView: document.getElementById('cardsView'),
    totalEmployees: document.getElementById('totalEmployees'),
    activeCerts: document.getElementById('activeCerts'),
    expiringCerts: document.getElementById('expiringCerts'),
    tableViewBtn: document.getElementById('tableViewBtn'),
    cardsViewBtn: document.getElementById('cardsViewBtn'),
    tableContainer: document.querySelector('.table-responsive'),
};

// --- Вспомогательные функции ---
const helpers = {
    getInitials: (fio) => {
        if (!fio || typeof fio !== 'string') return '';
        const parts = fio.split(' ');
        return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : fio.substring(0, 2).toUpperCase();
    },
    formatDate: (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        return date.toLocaleDateString('ru-RU');
    },
    getDaysText(days) {
        const absDays = Math.abs(days);
        const lastDigit = absDays % 10;
        const lastTwoDigits = absDays % 100;
        if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return 'дней';
        if (lastDigit === 1) return 'день';
        if (lastDigit >= 2 && lastDigit <= 4) return 'дня';
        return 'дней';
    },
    getCertificateStatus(dateTo) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expiryDate = new Date(dateTo);
        if (!dateTo || isNaN(expiryDate.getTime())) {
            return { text: 'Неизвестно', class: 'status-expired', dateClass: 'date-expired', dateIcon: 'fas fa-question-circle', tooltipText: 'Дата окончания не указана', icon: 'fas fa-question-circle' };
        }
        const diffDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
            return { text: 'Просрочен', class: 'status-expired', dateClass: 'date-expired', dateIcon: 'fas fa-calendar-times', tooltipText: 'Срок действия ЭЦП истек', icon: 'fas fa-times-circle' };
        } else if (diffDays <= 30) {
            return { text: 'Истекает', class: 'status-expiring', dateClass: 'date-expiring', dateIcon: 'fas fa-exclamation-triangle', tooltipText: 'ЭЦП скоро истечет', icon: 'fas fa-exclamation-triangle' };
        } else {
            return { text: 'Активен', class: 'status-active', dateClass: 'date-active', dateIcon: 'fas fa-calendar-check', tooltipText: 'ЭЦП активен', icon: 'fas fa-check-circle' };
        }
    },
    // --- ИЗМЕНЕНИЕ: Добавлена логика выбора глагола ---
    renderExpiryText(dateTo, isTooltip = false) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expiryDate = new Date(dateTo);
        if (isNaN(expiryDate.getTime())) return '';
        
        const diffDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
        
        const prefix = isTooltip ? '<br>' : '<div class="expiry-days">';
        const suffix = isTooltip ? '' : '</div>';
        
        if (diffDays >= 0) {
            const daysText = this.getDaysText(diffDays);
            // Выбираем правильную форму глагола: "Остался" для "день", "Осталось" для "дня" и "дней"
            const verb = (daysText === 'день') ? 'Остался' : 'Осталось';
            return `${prefix}${verb} ${diffDays} ${daysText}${suffix}`;
        } else {
            const daysOverdue = Math.abs(diffDays);
            const daysText = this.getDaysText(daysOverdue);
            // "Просрочено" всегда в среднем роде, здесь менять не нужно
            return `${prefix}Просрочено ${daysOverdue} ${daysText}${suffix}`;
        }
    },
    getGenderByName(fio) {
        if (!fio || typeof fio !== 'string') return 'unknown';
        const parts = fio.trim().split(' ');
        if (parts.length < 2) return 'unknown';
        const [surname, name, patronymic] = parts;
        if (patronymic) {
            if (patronymic.endsWith('ович') || patronymic.endsWith('евич')) return 'male';
            if (patronymic.endsWith('овна') || patronymic.endsWith('евна')) return 'female';
        }
        if (surname.endsWith('ов') || surname.endsWith('ев') || surname.endsWith('ин')) return 'male';
        if (surname.endsWith('ова') || surname.endsWith('ева') || surname.endsWith('ина')) return 'female';
        if (surname.endsWith('ский')) return 'male';
        if (surname.endsWith('ская')) return 'female';
        const maleExceptions = ['никита', 'илья', 'лука', 'фома', 'кузьма'];
        if (maleExceptions.includes(name.toLowerCase())) return 'male';
        if (name.endsWith('а') || name.endsWith('я')) return 'female';
        return 'male';
    }
};

// --- Функции рендеринга ---
function renderTable() {
    if (!elements.tableBody) return;
    elements.tableBody.innerHTML = ''; 
    if (filteredEmployees.length === 0) {
        elements.tableBody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="fas fa-inbox"></i><h3>Сотрудники не найдены</h3><p>Добавьте первого сотрудника, чтобы он появился в списке.</p></div></td></tr>`;
        return;
    }
    const rowsHtml = filteredEmployees.map(employee => {
        const status = helpers.getCertificateStatus(employee.date_to);
        const initials = helpers.getInitials(employee.fio);
        const gender = helpers.getGenderByName(employee.fio);
        return `
            <tr data-id="${employee.id}">
                <td><div class="employee-info"><div class="employee-avatar avatar-${gender}">${initials}</div><div class="employee-details"><div class="employee-name">${employee.fio}</div></div></div></td>
                <td style="text-align: center;">${employee.position_name}</td>
                <td style="text-align: center;">${employee.inn}</td>
                <td style="text-align: center;">${employee.ecp_number}</td>
                <td><div class="date-cell"><i class="fas fa-calendar-alt date-icon" style="color: var(--primary);"></i><div class="date-text">${helpers.formatDate(employee.date_from)}</div></div></td>
                <td><div class="date-cell ${status.dateClass} tooltip"><i class="${status.dateIcon} date-icon"></i><div class="date-text">${helpers.formatDate(employee.date_to)}</div>${helpers.renderExpiryText(employee.date_to)}<div class="tooltiptext">${status.tooltipText}${helpers.renderExpiryText(employee.date_to, true)}</div></div></td>
                <td><div class="row-actions"><div class="tooltip"><button class="row-action-btn delete-btn" data-id="${employee.id}"><i class="fas fa-trash"></i></button><span class="tooltiptext">Удалить</span></div></div></td>
            </tr>`;
    }).join('');
    elements.tableBody.innerHTML = rowsHtml;
}

function renderCards() {
    if (!elements.cardsView) return;
    elements.cardsView.innerHTML = '';
    if (filteredEmployees.length === 0) {
        elements.cardsView.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;"><i class="fas fa-inbox"></i><h3>Сотрудники не найдены</h3><p>Добавьте первого сотрудника, чтобы он появился в списке.</p></div>`;
        return;
    }
    const cardsHtml = filteredEmployees.map(employee => {
        const status = helpers.getCertificateStatus(employee.date_to);
        const initials = helpers.getInitials(employee.fio);
        const gender = helpers.getGenderByName(employee.fio);
        return `
            <div class="employee-card" data-id="${employee.id}">
                <div class="employee-card-avatar avatar-${gender}">${initials}</div>
                <div class="employee-card-main-info"><div class="employee-card-name">${employee.fio}</div><div class="employee-card-position">${employee.position_name}</div></div>
                <div class="employee-card-meta"><div class="meta-item"><i class="fas fa-id-card"></i><span>${employee.inn}</span></div><div class="meta-item"><i class="fas fa-key"></i><span>${employee.ecp_number}</span></div></div>
                <div class="employee-card-footer"><div class="date-range"><i class="fas fa-calendar-alt"></i><span>${helpers.formatDate(employee.date_from)} — ${helpers.formatDate(employee.date_to)}</span></div><span class="status-badge ${status.class}"><i class="${status.icon}"></i> ${status.text}</span></div>
                <div class="employee-card-actions"><div class="tooltip"><button class="row-action-btn delete-btn" data-id="${employee.id}"><i class="fas fa-trash"></i></button><span class="tooltiptext">Удалить</span></div></div>
            </div>`;
    }).join('');
    elements.cardsView.innerHTML = cardsHtml;
}

function updateStats() {
    let activeCount = 0;
    let problemCount = 0;
    allEmployees.forEach(emp => {
        const status = helpers.getCertificateStatus(emp.date_to);
        if (status.class === 'status-active') activeCount++;
        else if (status.class === 'status-expiring' || status.class === 'status-expired') problemCount++;
    });
    if (elements.totalEmployees) elements.totalEmployees.textContent = allEmployees.length;
    if (elements.activeCerts) elements.activeCerts.textContent = activeCount;
    if (elements.expiringCerts) elements.expiringCerts.textContent = problemCount;
}

function toggleView(view) {
    currentView = view;
    elements.tableViewBtn.classList.toggle('active', view === 'table');
    elements.cardsViewBtn.classList.toggle('active', view === 'cards');
    elements.tableContainer.style.display = view === 'table' ? 'block' : 'none';
    elements.cardsView.style.display = view === 'cards' ? 'grid' : 'none';
}

function updateSortIndicator() {
    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.classList.remove('sorted-asc', 'sorted-desc');
        if (th.dataset.sort === currentSort.field) {
            th.classList.add(`sorted-${currentSort.direction}`);
        }
    });
}

function applyAndRender() {
    let data = [...allEmployees];
    const { field, direction } = currentSort;
    if (field) {
        data.sort((a, b) => {
            const valA = a[field] || '';
            const valB = b[field] || '';
            return direction === 'asc' ? valA.localeCompare(valB, 'ru') : valB.localeCompare(valA, 'ru');
        });
    }
    filteredEmployees = data;
    renderTable();
    renderCards();
    updateStats();
    updateSortIndicator();
}

export async function reloadAndRenderList() {
    try {
        allEmployees = await getAllSignatures();
        applyAndRender();
    } catch (error) {
        console.error('Ошибка загрузки списка ЭЦП:', error);
    }
}

function handleSort(field) {
    if (currentSort.field === field) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.field = field;
        currentSort.direction = 'asc';
    }
    applyAndRender();
}

async function handleDelete(employeeId) {
    try {
        await deleteSignature(employeeId);
        window.toast.success('Сотрудник успешно удален.');
        await reloadAndRenderList();
    } catch (error) {
        console.error('Ошибка удаления ЭЦП:', error);
    }
}

export function initSignatureList() {
    elements.tableViewBtn.addEventListener('click', () => toggleView('table'));
    elements.cardsViewBtn.addEventListener('click', () => toggleView('cards'));
    const contentArea = document.querySelector('.card-body');
    contentArea.addEventListener('click', (event) => {
        const deleteBtn = event.target.closest('.delete-btn');
        if (deleteBtn) {
            event.stopPropagation();
            const id = parseInt(deleteBtn.dataset.id, 10);
            const employee = allEmployees.find(emp => emp.id === id);
            if (employee) {
                showConfirmModal({
                    title: 'Подтверждение удаления',
                    text: `Вы действительно хотите удалить данные сотрудника "${employee.fio}"?`,
                    confirmText: 'Удалить',
                    onConfirm: () => handleDelete(id)
                });
            }
            return;
        }
        const rowOrCard = event.target.closest('[data-id]');
        if (rowOrCard) {
            const id = parseInt(rowOrCard.dataset.id, 10);
            const employee = allEmployees.find(emp => emp.id === id);
            if (employee) {
                openSignatureModal(employee);
            }
        }
    });
    
    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => handleSort(th.dataset.sort));
    });
}
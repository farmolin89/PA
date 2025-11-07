// ===================================================================
// File: public/js/eds/signatureModal.js (НОВЫЙ КОМПОНЕНТ, ПОЛНАЯ ВЕРСИЯ)
// ===================================================================

import { saveSignature } from '../common/api-client.js';
import { reloadAndRenderList } from './signatureList.js';

// --- Элементы DOM ---
const modal = document.getElementById('employeeModal');
const elements = {
    modalTitle: document.getElementById('modalTitle'),
    form: document.getElementById('employeeForm'),
    fioInput: document.getElementById('fio'),
    positionSelect: document.getElementById('position'),
    innInput: document.getElementById('inn'),
    ecpNumberInput: document.getElementById('ecpNumber'),
    dateFromInput: document.getElementById('dateFrom'),
    dateToInput: document.getElementById('dateTo'),
    saveBtn: document.getElementById('saveBtn'),
    closeBtn: document.getElementById('closeModalBtn'),
};

let currentEditId = null;

// --- Управление состоянием модального окна ---
function openModal() {
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal() {
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

/**
 * Открывает модальное окно для создания (employeeData = null) или редактирования.
 * @param {object|null} employeeData - Данные сотрудника для редактирования.
 */
export function openSignatureModal(employeeData = null) {
    elements.form.reset();
    currentEditId = employeeData ? employeeData.id : null;

    const fromDateInstance = elements.dateFromInput._datepickerInstance;
    const toDateInstance = elements.dateToInput._datepickerInstance;
    
    if (employeeData) {
        elements.modalTitle.textContent = 'Редактировать сотрудника';
        elements.fioInput.value = employeeData.fio;
        elements.positionSelect.value = employeeData.position_key;
        elements.innInput.value = employeeData.inn;
        elements.ecpNumberInput.value = employeeData.ecp_number;
        
        if (fromDateInstance) fromDateInstance.setDate(employeeData.date_from, false);
        if (toDateInstance) toDateInstance.setDate(employeeData.date_to, false);

    } else {
        elements.modalTitle.textContent = 'Добавить сотрудника';
        if (fromDateInstance) fromDateInstance.setDate(null, false);
        if (toDateInstance) toDateInstance.setDate(null, false);
    }
    openModal();
}

/**
 * Обрабатывает сохранение данных из формы.
 */
async function handleSave() {
    if (!elements.form.checkValidity()) {
        elements.form.reportValidity();
        return;
    }

    const fromDateInstance = elements.dateFromInput._datepickerInstance;
    const toDateInstance = elements.dateToInput._datepickerInstance;
    const selectedOption = elements.positionSelect.options[elements.positionSelect.selectedIndex];

    const employeeData = {
        fio: elements.fioInput.value.trim(),
        position_key: elements.positionSelect.value,
        position_name: selectedOption.text,
        inn: elements.innInput.value.trim(),
        ecp_number: elements.ecpNumberInput.value.trim(),
        date_from: fromDateInstance ? fromDateInstance.getFormattedDate() : '',
        date_to: toDateInstance ? toDateInstance.getFormattedDate() : '',
    };
    
    const originalBtnText = elements.saveBtn.textContent;
    elements.saveBtn.disabled = true;
    elements.saveBtn.textContent = 'Сохранение...';

    try {
        await saveSignature(employeeData, currentEditId); // ИСПОЛЬЗУЕМ ОБЩИЙ API
        window.toast.success(currentEditId ? 'Данные успешно обновлены!' : 'Сотрудник успешно добавлен!');
        closeModal();
        await reloadAndRenderList();
    } catch (error) {
        // Ошибка будет показана глобальным обработчиком
        console.error('Ошибка сохранения ЭЦП:', error);
    } finally {
        elements.saveBtn.disabled = false;
        elements.saveBtn.textContent = originalBtnText;
    }
}

/**
 * Инициализирует все обработчики событий для модального окна.
 */
export function initSignatureModal() {
    // Кнопка "Добавить сотрудника" в шапке
    document.getElementById('addEmployeeBtn').addEventListener('click', () => openSignatureModal(null));
    
    // Кнопки внутри модального окна
    elements.saveBtn.addEventListener('click', handleSave);
    elements.closeBtn.addEventListener('click', closeModal);

    // Закрытие по клику на фон
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Закрытие по клавише Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });

    // Автоматическое обновление даты "Срок до" при изменении "Срок от"
    elements.dateFromInput.addEventListener('change', () => {
        const fromDateInstance = elements.dateFromInput._datepickerInstance;
        const toDateInstance = elements.dateToInput._datepickerInstance;
        if (!fromDateInstance || !toDateInstance) return;

        const fromDate = fromDateInstance.getDate();
        if (fromDate) {
            const newToDate = new Date(fromDate.getTime());
            newToDate.setFullYear(newToDate.getFullYear() + 1);
            newToDate.setDate(newToDate.getDate() - 1);
            toDateInstance.setDate(newToDate, true);
        } else {
            toDateInstance.setDate(null, true);
        }
    });
}
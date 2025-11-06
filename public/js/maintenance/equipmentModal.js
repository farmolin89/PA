// ===================================================================
// Файл: public/js/maintenance/equipmentModal.js (ВЕРСИЯ С КАСТОМНЫМ DATEPICKER)
// ===================================================================

import { createEquipment, updateEquipment } from '../common/api-client.js';

let onDataChangeCallback = () => {};
let currentServices = []; 
let currentEditingServiceId = null;

// Общие функции для модальных окон
function openModal(modalId) { document.getElementById(modalId)?.classList.add('active'); }
function closeModal(modalId) { document.getElementById(modalId)?.classList.remove('active'); }

// --- Логика, специфичная для модального окна оборудования ---

function renderServicesList(services) {
    const container = document.getElementById('servicesList');
    if (!container) return;
    container.innerHTML = services.map(service => {
        const serviceId = service.id || service.tempId || `temp-${Date.now()}-${Math.random()}`;
        return `
            <div class="service-item" data-service-id="${serviceId}">
                <div class="service-info">
                    <div class="service-work">${service.work}</div>
                    <div class="service-frequency">Периодичность: ${service.frequency}</div>
                </div>
                <div class="service-actions">
                    <button type="button" class="service-btn edit" title="Редактировать ТО">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/></svg>
                    </button>
                    <button type="button" class="service-btn delete" title="Удалить ТО">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>
                    </button>
                </div>
            </div>`;
    }).join('');
}

function openServiceModal(serviceToEdit = null) {
    currentEditingServiceId = serviceToEdit ? (serviceToEdit.id || serviceToEdit.tempId) : null;
    document.getElementById('serviceModalTitle').textContent = serviceToEdit ? 'Редактирование ТО' : 'Добавление ТО';
    document.getElementById('serviceWork').value = serviceToEdit ? serviceToEdit.work : '';
    document.getElementById('serviceFrequency').value = serviceToEdit ? serviceToEdit.frequency : '1 раз в месяц';
    document.getElementById('serviceErrorMessage').textContent = '';
    openModal('serviceModal');
}

function saveService() {
    const work = document.getElementById('serviceWork').value.trim();
    const frequency = document.getElementById('serviceFrequency').value;
    if (!work) {
        document.getElementById('serviceErrorMessage').textContent = 'Необходимо указать содержание работ.';
        return;
    }
    document.getElementById('serviceErrorMessage').textContent = '';

    if (currentEditingServiceId) {
        const service = currentServices.find(s => (s.id || s.tempId) == currentEditingServiceId);
        if (service) {
            service.work = work;
            service.frequency = frequency;
        }
    } else {
        currentServices.push({ tempId: `temp-${Date.now()}`, work, frequency });
    }
    renderServicesList(currentServices);
    closeModal('serviceModal');
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const editingId = form.dataset.editingId ? parseInt(form.dataset.editingId, 10) : null;
    const errorMessage = document.getElementById('ErrorMessage');
    const datePickerInstance = document.getElementById('EquipmentStartDate')._datepickerInstance;
    const startDateValue = datePickerInstance ? datePickerInstance.getFormattedDate('dd.mm.yyyy') : '';

    const equipmentData = {
        name: document.getElementById('EquipmentName').value.trim(),
        serial: document.getElementById('EquipmentSerial').value.trim(),
        startDate: startDateValue,
        services: currentServices.map(({ id, equipment_id, tempId, ...rest }) => rest)
    };

    if (!equipmentData.name || !equipmentData.serial || !equipmentData.startDate) {
        errorMessage.textContent = 'Все поля (Наименование, Зав. №, Дата ввода) обязательны.';
        return;
    }
    if (!/^\d{2}\.\d{2}\.\d{4}$/.test(equipmentData.startDate)) {
        errorMessage.textContent = 'Дата ввода должна быть в формате ДД.ММ.ГГГГ.';
        return;
    }
    if (equipmentData.services.length === 0) {
        errorMessage.textContent = 'Необходимо добавить хотя бы одно ТО.';
        return;
    }
    errorMessage.textContent = '';

    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;

    try {
        if (editingId) {
            submitButton.textContent = 'Сохранение...';
            await updateEquipment(editingId, equipmentData);
            window.toast.success('Оборудование успешно обновлено!');
        } else {
            submitButton.textContent = 'Добавление...';
            await createEquipment(equipmentData);
            window.toast.success('Оборудование успешно добавлено!');
        }
        closeModal('addEquipmentModal');
        onDataChangeCallback();
    } catch (error) {
        errorMessage.textContent = error.message;
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = editingId ? 'Сохранить' : 'Добавить оборудование';
    }
}

function resetAndOpenAddModal() {
    const form = document.getElementById('addEquipmentModalForm');
    form.reset();
    delete form.dataset.editingId;
    document.getElementById('addEquipmentModalTitle').textContent = 'Добавить новое оборудование';
    form.querySelector('button[type="submit"]').textContent = 'Сохранить';
    currentServices = [];
    renderServicesList(currentServices);
    document.getElementById('ErrorMessage').textContent = '';

    const datePickerInstance = document.getElementById('EquipmentStartDate')._datepickerInstance;
    if (datePickerInstance) {
        datePickerInstance.setDate(null);
    }
    
    openModal('addEquipmentModal');
}

export function openEditModal(equipment) {
    const form = document.getElementById('addEquipmentModalForm');
    form.reset();
    form.dataset.editingId = equipment.id;
    document.getElementById('addEquipmentModalTitle').textContent = 'Редактирование оборудования';
    form.querySelector('button[type="submit"]').textContent = 'Сохранить';
    document.getElementById('EquipmentName').value = equipment.name;
    document.getElementById('EquipmentSerial').value = equipment.serial;
    document.getElementById('ErrorMessage').textContent = '';
    
    const datePickerInstance = document.getElementById('EquipmentStartDate')._datepickerInstance;
    if (datePickerInstance) {
        datePickerInstance.setDate(equipment.startDate);
    }

    currentServices = JSON.parse(JSON.stringify(equipment.services || []));
    renderServicesList(currentServices);
    openModal('addEquipmentModal');
}

export function initEquipmentModal(reloadCallback) {
    onDataChangeCallback = reloadCallback;
    document.getElementById('addEquipment').addEventListener('click', resetAndOpenAddModal);
    document.getElementById('addEquipmentModalForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('addServiceBtn').addEventListener('click', () => openServiceModal(null));
    document.getElementById('saveService').addEventListener('click', saveService);
    document.getElementById('servicesList').addEventListener('click', e => {
        const serviceItem = e.target.closest('.service-item');
        if (!serviceItem) return;
        const serviceId = serviceItem.dataset.serviceId;
        const service = currentServices.find(s => (s.id || s.tempId) == serviceId);
        if (e.target.closest('.edit')) { if (service) openServiceModal(service); }
        if (e.target.closest('.delete')) {
            currentServices = currentServices.filter(s => (s.id || s.tempId) != serviceId);
            renderServicesList(currentServices);
        }
    });
    ['addEquipmentModal', 'serviceModal'].forEach(id => {
        const modal = document.getElementById(id);
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => closeModal(id));
        }
        modal.addEventListener('click', e => { if (e.target === modal) closeModal(id); });
    });
}
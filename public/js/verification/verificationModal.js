// ===================================================================
// File: public/js/verification/verificationModal.js (Полная итоговая версия)
// Description: Управляет модальными окнами добавления/редактирования.
//              Включает ограничение на размер файлов и логику их удаления.
// ===================================================================

import { createVerificationEquipment, updateVerificationEquipment } from '../common/api-client.js';
import { reloadAndRenderList, allEquipment } from './verificationList.js';
import DatePicker from '../components/datepicker.js';

// --- Константы и глобальные переменные ---
const MAX_REG_NUMBERS = 10;
const FILE_SIZE_LIMIT = 1024 * 1024; // 1 MB в байтах
const addModal = document.getElementById('addModal');
const editModal = document.getElementById('editModal');

let currentEditId = null;
let areAddModalPickersInitialized = false;

// --- Функции для управления полями рег. номеров ---

/**
 * Добавляет новое поле для ввода регистрационного номера.
 * @param {HTMLElement} container - Элемент .reg-numbers-container.
 */
function addRegNumberField(container) {
    if (container.querySelectorAll('.reg-number-full-item').length >= MAX_REG_NUMBERS) return;
    const newItem = document.createElement('div');
    newItem.className = 'reg-number-full-item';
    newItem.innerHTML = `
        <div class="reg-number-fields">
            <input type="text" class="form-input reg-number-input" placeholder="Рег. номер">
            <input type="url" class="form-input" onfocus="this.select()" placeholder="https://fgis.gost.ru/fundmetrology/...">
        </div>
        <button type="button" class="remove-reg-number">&times;</button>
    `;
    container.appendChild(newItem);
    updateRegNumberControls(container.closest('.modal-body'));
}

/**
 * Обновляет видимость и состояние элементов управления рег. номерами.
 * @param {HTMLElement} modalBody - Тело модального окна.
 */
function updateRegNumberControls(modalBody) {
    const container = modalBody.querySelector('.reg-numbers-container');
    if (!container) return;
    const isAddModal = modalBody.closest('#addModal');
    const isEtalon = isAddModal
        ? addModal.querySelector('.type-option[data-type="etalon"]').classList.contains('selected')
        : allEquipment.find(i => i.id === currentEditId)?.equipmentType === 'etalon';
    const items = container.querySelectorAll('.reg-number-full-item');
    const addButton = modalBody.querySelector('.add-reg-number');
    const label = modalBody.querySelector('#reg-number-label') || modalBody.querySelector('.reg-number-label');
    if (label) {
        label.textContent = isEtalon ? 'Регистрационные номера (ГРСИ)' : 'Регистрационный номер (ГРСИ)';
    }
    items.forEach(item => {
        const removeBtn = item.querySelector('.remove-reg-number');
        if (removeBtn) {
            removeBtn.style.visibility = (items.length > 1 && isEtalon) ? 'visible' : 'hidden';
        }
    });
    if (addButton) {
        if (isEtalon) {
            addButton.style.display = 'flex';
            const limitReached = items.length >= MAX_REG_NUMBERS;
            addButton.disabled = limitReached;
            addButton.style.opacity = limitReached ? '0.6' : '1';
        } else {
            addButton.style.display = 'none';
        }
    }
}


// --- Основная логика модальных окон ---

function closeModal(modal) {
    if (modal) {
        modal.classList.remove('active');
    }
}

export function openVerificationModal(itemData = null) {
    if (itemData) {
        // Режим редактирования
        currentEditId = itemData.id;
        const modalBody = editModal.querySelector('.modal-body');
        modalBody.innerHTML = itemData.equipmentType === 'vo'
            ? createVoEditFormHtml(itemData)
            : createSiEditFormHtml(itemData);
        initDatePickers(editModal.querySelectorAll('.datepicker-input'));
        if (itemData.equipmentType !== 'vo') {
            const regContainer = modalBody.querySelector('#editRegNumbersContainer');
            modalBody.querySelector('#editAddRegNumber')?.addEventListener('click', () => addRegNumberField(regContainer));
            if (regContainer) {
                regContainer.addEventListener('click', e => {
                    if (e.target.closest('.remove-reg-number')) {
                        e.target.closest('.reg-number-full-item').remove();
                        updateRegNumberControls(modalBody);
                    }
                });
            }
        }
        updateRegNumberControls(modalBody);
        editModal.classList.add('active');
    } else {
        // Режим создания
        currentEditId = null;
        resetAddForm();
        if (!areAddModalPickersInitialized) {
            initDatePickers(addModal.querySelectorAll('.datepicker-input'));
            areAddModalPickersInitialized = true;
        }
        addModal.classList.add('active');
    }
}

async function handleSave() {
    const modal = currentEditId ? editModal : addModal;
    const isEdit = !!currentEditId;
    
    const { data, isValid, errors } = getFormDataFromModal(modal, isEdit);
    const errorEl = modal.querySelector('.error-message');
    if (!isValid) {
        errorEl.innerHTML = errors.join('<br>');
        return;
    }
    errorEl.innerHTML = '';

    const formData = new FormData();
    formData.append('data', JSON.stringify(data));

    const isVo = data.equipmentType === 'vo';
    const certificateInputId = isEdit 
        ? (isVo ? 'editVoCertificate' : 'editCertificate') 
        : (isVo ? 'addVoCertificate' : 'addCertificate');
    const invoiceInputId = isEdit 
        ? (isVo ? 'editVoInvoice' : 'editInvoice') 
        : (isVo ? 'addVoInvoice' : 'addInvoice');

    const certificateInput = document.getElementById(certificateInputId);
    if (certificateInput && certificateInput.files[0]) {
        formData.append('certificateFile', certificateInput.files[0]);
    }

    const invoiceInput = document.getElementById(invoiceInputId);
    if (invoiceInput && invoiceInput.files[0]) {
        formData.append('invoiceFile', invoiceInput.files[0]);
    }

    try {
        if (isEdit) {
            await updateVerificationEquipment(currentEditId, formData);
            toast.success('Изменения успешно сохранены!');
        } else {
            await createVerificationEquipment(formData);
            toast.success('Оборудование успешно добавлено!');
        }
        closeModal(modal);
        await reloadAndRenderList();
    } catch (error) {
        console.error('Ошибка сохранения:', error);
    }
}

export function initializeVerificationModal() {
    document.getElementById('addEquipmentBtn').addEventListener('click', () => openVerificationModal(null));
    addModal.querySelector('#saveBtn').addEventListener('click', handleSave);
    editModal.querySelector('#saveEdit').addEventListener('click', handleSave);
    addModal.querySelectorAll('.type-option').forEach(opt => opt.addEventListener('click', () => toggleAddModalForm(opt.dataset.type)));

    document.body.addEventListener('click', (e) => {
        const locationOption = e.target.closest('.location-option');
        if (locationOption) {
            const container = locationOption.closest('.location-selection');
            container.querySelector('.location-option.active')?.classList.remove('active');
            locationOption.classList.add('active');
        }
        const uploadBtn = e.target.closest('.btn-file-upload');
        if (uploadBtn) {
            document.getElementById(uploadBtn.dataset.target)?.click();
        }
        const removeFileBtn = e.target.closest('.btn-remove-file');
        if (removeFileBtn) {
            const fileNameDiv = removeFileBtn.closest('.file-name');
            const inputId = fileNameDiv.id.replace('Name', '');
            const fileInput = document.getElementById(inputId);

            if (fileNameDiv.dataset.action === 'keep') {
                fileNameDiv.dataset.action = 'delete';
                fileNameDiv.innerHTML = '<i>Файл будет удален при сохранении</i>';
            } else {
                if (fileInput) fileInput.value = '';
                const textNode = document.createTextNode('Файл не выбран');
                const newRemoveBtn = document.createElement('button');
                newRemoveBtn.type = 'button';
                newRemoveBtn.className = 'btn-remove-file';
                newRemoveBtn.innerHTML = '&times;';
                newRemoveBtn.style.display = 'none';
                fileNameDiv.innerHTML = '';
                fileNameDiv.appendChild(textNode);
                fileNameDiv.appendChild(newRemoveBtn);
            }
        }
    });

    document.body.addEventListener('change', (e) => {
        if (e.target.matches('.file-input')) {
            const file = e.target.files[0];
            const nameDiv = document.getElementById(e.target.id + 'Name');

            if (file && file.size > FILE_SIZE_LIMIT) {
                toast.error(`Файл слишком большой. Максимальный размер: ${FILE_SIZE_LIMIT / 1024 / 1024} МБ.`);
                e.target.value = '';
                return;
            }

            if (nameDiv) {
                const textNode = document.createTextNode(file ? file.name : 'Файл не выбран');
                const removeBtn = nameDiv.querySelector('.btn-remove-file');
                nameDiv.innerHTML = '';
                nameDiv.appendChild(textNode);
                if (removeBtn) {
                    removeBtn.style.display = file ? 'flex' : 'none';
                    nameDiv.appendChild(removeBtn);
                    nameDiv.dataset.action = '';
                }
            }
        }
    });
    
    const addModalBody = addModal.querySelector('.modal-body');
    const regContainer = addModalBody.querySelector('#regNumbersContainer');
    addModalBody.querySelector('#addRegNumber').addEventListener('click', () => addRegNumberField(regContainer));
    regContainer.addEventListener('click', e => {
        if (e.target.closest('.remove-reg-number')) {
            e.target.closest('.reg-number-full-item').remove();
            updateRegNumberControls(addModalBody);
        }
    });

    [addModal, editModal].forEach(m => {
        m.querySelector('.modal-close')?.addEventListener('click', () => closeModal(m));
        m.addEventListener('click', (e) => { if (e.target === m) closeModal(m); });
    });
}

// --- Управление формами и вспомогательные функции ---

function getFormDataFromModal(modal, isEdit) {
    const itemType = isEdit
        ? allEquipment.find(i => i.id === currentEditId).equipmentType
        : modal.querySelector('.type-option.selected').dataset.type;
    const isVo = itemType === 'vo';
    const getValue = (id) => modal.querySelector(`#${id}`)?.value.trim() || '';
    let data = {};
    let errors = [];
    const location = modal.querySelector('.location-option.active')?.dataset.location || 'office';

    if (isEdit) {
        const originalItem = allEquipment.find(i => i.id === currentEditId);
        if (originalItem) {
            data.certificatePath = originalItem.certificatePath;
            data.invoicePath = originalItem.invoicePath;

            const isOriginalVo = originalItem.equipmentType === 'vo';
            const certId = isOriginalVo ? 'editVoCertificateName' : 'editCertificateName';
            const invoiceId = isOriginalVo ? 'editVoInvoiceName' : 'editInvoiceName';

            const certDiv = modal.querySelector(`#${certId}`);
            if (certDiv && certDiv.dataset.action === 'delete') {
                data.certificatePath = null;
            }
            
            const invoiceDiv = modal.querySelector(`#${invoiceId}`);
            if (invoiceDiv && invoiceDiv.dataset.action === 'delete') {
                data.invoicePath = null;
            }
        }
    }

    if (isVo) {
        data = {
            ...data,
            name: getValue(isEdit ? 'editVoName' : 'addVoName'),
            equipmentType: 'vo',
            serialNumber: getValue(isEdit ? 'editVoSerialNumber' : 'addVoSerialNumber'),
            inventoryNumber: getValue(isEdit ? 'editVoInventoryNumber' : 'addVoInventoryNumber'),
            yearManufactured: getValue(isEdit ? 'editVoYearManufactured' : 'addVoYearManufactured'),
            city: getValue(isEdit ? 'editVoCity' : 'addVoCity'),
            lastVerificationDate: formatDateForApi(getValue(isEdit ? 'editVoLastVerificationDate' : 'addVoLastVerificationDate')),
            nextVerificationDate: formatDateForApi(getValue(isEdit ? 'editVoNextVerificationDate' : 'addVoNextVerificationDate')),
            notes: getValue(isEdit ? 'editVoNotes' : 'addVoNotes'),
            location: location,
        };
    } else {
        const regNumbers = Array.from(modal.querySelectorAll('.reg-number-full-item')).map(item => {
            const number = item.querySelector('.reg-number-input')?.value.trim();
            const url = item.querySelector('input[type="url"]')?.value.trim();
            return number ? { number, url } : null;
        }).filter(Boolean);
        data = {
            ...data,
            name: getValue(isEdit ? 'editName' : 'addName'),
            equipmentType: itemType,
            modification: getValue(isEdit ? 'editModification' : 'addModification'),
            serialNumber: getValue(isEdit ? 'editSerialNumber' : 'addSerialNumber'),
            inventoryNumber: getValue(isEdit ? 'editInventoryNumber' : 'addInventoryNumber'),
            yearManufactured: getValue(isEdit ? 'editYearManufactured' : 'addYearManufactured'),
            commissionDate: formatDateForApi(getValue(isEdit ? 'editCommissionDate' : 'addCommissionDate')),
            lastVerificationDate: formatDateForApi(getValue(isEdit ? 'editLastVerificationDate' : 'addLastVerificationDate')),
            nextVerificationDate: formatDateForApi(getValue(isEdit ? 'editNextVerificationDate' : 'addNextVerificationDate')),
            city: getValue(isEdit ? 'editCity' : 'addCity'),
            responsible: getValue(isEdit ? 'editResponsible' : 'addResponsible'),
            notes: getValue(isEdit ? 'editNotes' : 'addNotes'),
            regNumbers: regNumbers,
            location: location,
        };
    }
    if (!data.name) errors.push('Наименование обязательно.');
    if (!data.serialNumber) errors.push('Заводской номер обязателен.');
    if (!data.inventoryNumber) errors.push('Инвентарный номер обязателен.');
    const duplicate = allEquipment.find(item => item.inventoryNumber === data.inventoryNumber && item.id !== currentEditId);
    if (duplicate) errors.push('Оборудование с таким инв. номером уже существует.');
    return { data, isValid: errors.length === 0, errors };
}

function resetAddForm() {
    addModal.querySelectorAll('input, textarea').forEach(el => el.value = '');
    addModal.querySelector('#errorMessage').innerHTML = '';
    const regContainer = addModal.querySelector('#regNumbersContainer');
    regContainer.innerHTML = `<div class="reg-number-full-item"><div class="reg-number-fields"><input type="text" class="form-input reg-number-input" placeholder="Рег. номер"><input type="url" class="form-input" onfocus="this.select()" placeholder="https://fgis.gost.ru/fundmetrology/..."></div><button type="button" class="remove-reg-number" style="visibility: hidden;">&times;</button></div>`;
    addModal.querySelector('.location-option.active')?.classList.remove('active');
    addModal.querySelector('.location-option[data-location="office"]').classList.add('active');
    addModal.querySelectorAll('.file-input').forEach(input => input.value = '');
    addModal.querySelectorAll('.file-name').forEach(fn => {
        const textNode = document.createTextNode('Файл не выбран');
        const removeBtn = fn.querySelector('.btn-remove-file') || document.createElement('button');
        if (!removeBtn.isConnected) {
            removeBtn.type = 'button';
            removeBtn.className = 'btn-remove-file';
            removeBtn.innerHTML = '&times;';
        }
        removeBtn.style.display = 'none';
        fn.innerHTML = '';
        fn.appendChild(textNode);
        fn.appendChild(removeBtn);
    });
    toggleAddModalForm('etalon', true);
}


function toggleAddModalForm(type, forceReset = false) {
    const currentSelected = addModal.querySelector('.type-option.selected');
    if (!forceReset && currentSelected && currentSelected.dataset.type === type) return;
    currentSelected?.classList.remove('selected');
    addModal.querySelector(`.type-option[data-type="${type}"]`).classList.add('selected');
    const isVo = type === 'vo';
    addModal.querySelector('#add-si-fields').style.display = isVo ? 'none' : 'block';
    addModal.querySelector('#add-vo-fields').style.display = isVo ? 'block' : 'none';
    if (type !== 'etalon') {
        const regContainer = addModal.querySelector('#regNumbersContainer');
        const allFields = regContainer.querySelectorAll('.reg-number-full-item');
        if (allFields.length > 1) {
            allFields.forEach((field, index) => { if (index > 0) field.remove(); });
        }
    }
    updateRegNumberControls(addModal.querySelector('.modal-body'));
}

function escapeHTML(str) { return String(str ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
function formatDateForApi(d) { if (!d || !/^\d{2}\.\d{2}\.\d{4}$/.test(d)) return null; const [day, m, y] = d.split('.'); return `${y}-${m}-${day}`; }
function formatDateForDisplay(d) { if (!d) return ''; try { const [y, m, day] = d.split('T')[0].split('-'); return `${day}.${m}.${y}`; } catch { return d; } }
function initDatePickers(els) { els.forEach(el => { if (!el._datepickerInstance) { new DatePicker(el); } }); }


// --- Генерация HTML для модальных окон ---

function createFileUploadHtml(prefix, id, label, item) {
    const filePath = item?.[`${id.toLowerCase()}Path`];
    const fileName = filePath ? (filePath.split(/-(.+)/)[1] || filePath.split('/').pop()) : "Файл не выбран";
    const hasFile = !!filePath;
    
    const actionAttribute = hasFile ? 'data-action="keep"' : '';

    return `
        <div class="file-upload-group">
            <label class="file-upload-label"><i class="fas fa-file-${label.includes('Свидетельство') ? 'pdf' : 'invoice'}"></i> ${label}</label>
            <div class="file-upload-container">
                <button type="button" class="btn-file-upload" data-target="${prefix}${id}"><i class="fas fa-paperclip"></i></button>
                <input type="file" class="file-input" id="${prefix}${id}" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx">
                <div class="file-name" id="${prefix}${id}Name" ${actionAttribute}>${escapeHTML(fileName)}<button type="button" class="btn-remove-file" style="display: ${hasFile ? 'flex' : 'none'};">&times;</button></div>
            </div>
        </div>
    `;
}

function createLocationSelectionHtml(currentLocation = 'office') {
    const locations = [
        { key: 'office', icon: 'fa-building', name: 'В офисе', desc: 'Оборудование находится в офисе' },
        { key: 'verification', icon: 'fa-tachometer-alt', name: 'На поверке', desc: 'Оборудование отправлено на поверку' },
        { key: 'business-trip', icon: 'fa-suitcase', name: 'В командировке', desc: 'Используется в командировке' },
    ];
    return `
        <div class="form-section">
            <div class="form-section-title">Местоположение оборудования</div>
            <div class="location-selection">
            ${locations.map(loc => `
                <div class="location-option ${loc.key} ${currentLocation === loc.key ? 'active' : ''}" data-location="${loc.key}">
                    <i class="fas ${loc.icon} location-icon"></i>
                    <div class="location-name">${loc.name}</div>
                    <div class="location-description">${loc.desc}</div>
                </div>
            `).join('')}
            </div>
        </div>
    `;
}

function createSiEditFormHtml(item) {
    const isEtalon = item.equipmentType === 'etalon';
    const regNumbersSource = (item.regNumbers && item.regNumbers.length > 0) ? item.regNumbers : [{ number: '', url: '' }];
    const regNumbersHTML = regNumbersSource.map(reg => `
        <div class="reg-number-full-item">
            <div class="reg-number-fields">
                <input type="text" class="form-input reg-number-input" value="${escapeHTML(reg.number)}" placeholder="Рег. номер">
                <input type="url" class="form-input" onfocus="this.select()" value="${escapeHTML(reg.url)}" placeholder="https://fgis.gost.ru/fundmetrology/...">
            </div>
            <button type="button" class="remove-reg-number">&times;</button>
        </div>`).join('');
    const addButtonHtml = isEtalon ? `<button type="button" class="add-reg-number" id="editAddRegNumber"><svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/></svg>Добавить</button>` : '';
    return `
        <div class="form-section">
            <div class="form-section-title">Основная информация</div>
            <div class="form-group"><label class="form-label">Наименование *</label><input type="text" class="form-input" id="editName" value="${escapeHTML(item.name)}"></div>
            <div class="form-group"><label class="form-label">Модификация (исполнение) *</label><input type="text" class="form-input" id="editModification" value="${escapeHTML(item.modification)}"></div>
            <div class="form-group"><label class="form-label reg-number-label">${isEtalon ? 'Регистрационные номера (ГРСИ)' : 'Регистрационный номер (ГРСИ)'}</label><div class="reg-numbers-container" id="editRegNumbersContainer">${regNumbersHTML}</div>${addButtonHtml}</div>
            <div class="form-row"><div class="form-group"><label class="form-label">Заводской номер *</label><input type="text" class="form-input" id="editSerialNumber" value="${escapeHTML(item.serialNumber)}"></div><div class="form-group"><label class="form-label">Инвентарный номер *</label><input type="text" class="form-input" id="editInventoryNumber" value="${escapeHTML(item.inventoryNumber)}"></div><div class="form-group"><label class="form-label">Год выпуска *</label><input type="text" class="form-input" id="editYearManufactured" value="${escapeHTML(item.yearManufactured)}"></div></div>
        </div>
        <div class="form-section">
            <div class="form-section-title">Информация о поверке</div>
            <div class="form-group"><label class="form-label">Ввод в эксплуатацию *</label><div class="calendar-wrapper"><input type="text" class="form-input datepicker-input" id="editCommissionDate" value="${formatDateForDisplay(item.commissionDate)}"></div></div>
            <div class="form-row"><div class="form-group"><label class="form-label">Дата поверки *</label><div class="calendar-wrapper"><input type="text" class="form-input datepicker-input" id="editLastVerificationDate" value="${formatDateForDisplay(item.lastVerificationDate)}"></div></div><div class="form-group"><label class="form-label">Дата след.поверки *</label><div class="calendar-wrapper"><input type="text" class="form-input datepicker-input" id="editNextVerificationDate" value="${formatDateForDisplay(item.nextVerificationDate)}"></div></div></div>
        </div>
        <div class="form-section">
            <div class="form-section-title">Дополнительная информация</div>
            <div class="form-row"><div class="form-group"><label class="form-label">Город *</label><input type="text" class="form-input" id="editCity" value="${escapeHTML(item.city)}"></div><div class="form-group"><label class="form-label">Ответственный *</label><input type="text" class="form-input" id="editResponsible" value="${escapeHTML(item.responsible)}"></div></div>
            <div class="form-group"><label class="form-label">Примечание</label><textarea class="form-textarea" id="editNotes">${escapeHTML(item.notes)}</textarea></div>
        </div>
        <div class="form-section">
            <div class="form-section-title">Прикрепленные файлы</div>
            <div class="file-upload-row">
                ${createFileUploadHtml('edit', 'Certificate', 'Свидетельство о поверке', item)}
                ${createFileUploadHtml('edit', 'Invoice', 'Счет-фактура', item)}
            </div>
        </div>
        ${createLocationSelectionHtml(item.location)}`;
}

function createVoEditFormHtml(item) {
    return `
        <div class="form-section">
            <div class="form-section-title">Основная информация</div>
            <div class="form-group"><label class="form-label">Наименование *</label><input type="text" class="form-input" id="editVoName" value="${escapeHTML(item.name)}"></div>
            <div class="form-row"><div class="form-group"><label class="form-label">Заводской номер *</label><input type="text" class="form-input" id="editVoSerialNumber" value="${escapeHTML(item.serialNumber)}"></div><div class="form-group"><label class="form-label">Инвентарный номер *</label><input type="text" class="form-input" id="editVoInventoryNumber" value="${escapeHTML(item.inventoryNumber)}"></div></div>
            <div class="form-row"><div class="form-group"><label class="form-label">Год выпуска *</label><input type="text" class="form-input" id="editVoYearManufactured" value="${escapeHTML(item.yearManufactured)}"></div><div class="form-group"><label class="form-label">Город *</label><input type="text" class="form-input" id="editVoCity" value="${escapeHTML(item.city)}"></div></div>
        </div>
        <div class="form-section">
            <div class="form-section-title">Аттестация/калибровка</div>
            <div class="form-row"><div class="form-group"><label class="form-label">Дата аттестации *</label><div class="calendar-wrapper"><input type="text" class="form-input datepicker-input" id="editVoLastVerificationDate" value="${formatDateForDisplay(item.lastVerificationDate)}"></div></div><div class="form-group"><label class="form-label">Дата след.аттестации *</label><div class="calendar-wrapper"><input type="text" class="form-input datepicker-input" id="editVoNextVerificationDate" value="${formatDateForDisplay(item.nextVerificationDate)}"></div></div></div>
        </div>
        <div class="form-section"><div class="form-group"><label class="form-label">Примечание</label><textarea class="form-textarea" id="editVoNotes">${escapeHTML(item.notes)}</textarea></div></div>
        <div class="form-section">
            <div class="form-section-title">Прикрепленные файлы</div>
            <div class="file-upload-row">
                ${createFileUploadHtml('editVo', 'Certificate', 'Свидетельство/Сертификат', item)}
                ${createFileUploadHtml('editVo', 'Invoice', 'Счет-фактура', item)}
            </div>
        </div>
        ${createLocationSelectionHtml(item.location)}`;
}
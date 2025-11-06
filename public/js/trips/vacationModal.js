// ===================================================================
// Файл: public/js/trips/vacationModal.js (ИСПРАВЛЕННАЯ ВЕРСЯ 3.0)
// ===================================================================

import { state } from './state.js';
import { api } from '../common/api-client.js';
import { openModal, closeModal } from './modals/modalManager.js';
import { updateEmployeeRow } from './calendar.js';
import DatePicker from '../components/datepicker.js';

const modal = document.getElementById('vacations-modal');
const vacationForm = document.getElementById('vacation-form');
const employeeSelect = document.getElementById('vacation-employee-select');
const employeeSearchInput = document.getElementById('vacation-employee-search');
const startDateInput = document.getElementById('vacation-start-date');
const endDateInput = document.getElementById('vacation-end-date');
const manageVacationsBtn = document.getElementById('manage-vacations-btn');
const modalTitle = modal.querySelector('.modal-title');
const submitButton = vacationForm.querySelector('button[type="submit"]');

// --- Функции для управления комбобоксом ---
function setComboboxValue(comboboxElement, value, text) {
    if (!comboboxElement) return;
    const searchInput = comboboxElement.querySelector('input[type="text"]');
    const optionsContainer = comboboxElement.querySelector('.custom-options');
    
    comboboxElement.dataset.value = value;
    if (searchInput) {
        searchInput.value = text;
        searchInput.placeholder = text || '-- Выберите сотрудника --';
    }

    if (optionsContainer) {
        const previouslySelected = optionsContainer.querySelector('.selected');
        if (previouslySelected) previouslySelected.classList.remove('selected');

        const newSelectedOption = optionsContainer.querySelector(`[data-value="${value}"]`);
        if (newSelectedOption) newSelectedOption.classList.add('selected');
    }
}

function setComboboxDisabled(comboboxElement, isDisabled) {
    if (!comboboxElement) return;
    comboboxElement.classList.toggle('disabled', isDisabled);
    const searchInput = comboboxElement.querySelector('input[type="text"]');
    if (searchInput) {
        searchInput.disabled = isDisabled;
    }
}

function filterComboboxOptions(comboboxElement, query) {
    const optionsContainer = comboboxElement.querySelector('.custom-options');
    if (!optionsContainer) return;

    const searchTerm = query.toLowerCase().trim();
    const options = optionsContainer.querySelectorAll('.custom-option');

    options.forEach(option => {
        const text = option.textContent.toLowerCase();
        option.classList.toggle('hidden', !text.includes(searchTerm));
    });
}

export function openVacationModalForEdit(vacation, employee) {
    if (!vacationForm) return;
    vacationForm.reset();
    vacationForm.dataset.editingVacationId = vacation.id;

    if (modalTitle) modalTitle.textContent = 'Редактирование отпуска';
    if (submitButton) submitButton.innerHTML = '<i class="fas fa-save"></i> Сохранить изменения';

    if (employeeSelect) {
        const optionsContainer = employeeSelect.querySelector('.custom-options');
        if (optionsContainer) {
            optionsContainer.innerHTML = `<li class="custom-option" data-value="${employee.id}">${employee.lastName} ${employee.firstName}</li>`;
        }
        setComboboxValue(employeeSelect, employee.id, `${employee.lastName} ${employee.firstName}`);
        setComboboxDisabled(employeeSelect, true);
    }
    
    const startDatePicker = startDateInput?._datepickerInstance;
    const endDatePicker = endDateInput?._datepickerInstance;
    
    if (startDatePicker) startDatePicker.setDate(vacation.startDate);
    if (endDatePicker) endDatePicker.setDate(vacation.endDate);
    
    if (startDatePicker) startDatePicker.setMinDate(null);
    if (endDatePicker) endDatePicker.setMinDate(vacation.startDate);

    openModal('vacations-modal');
}

export function setupVacationModal() {
    if (!manageVacationsBtn || !vacationForm || !employeeSelect) return;

    // Инициализируем календари один раз при настройке модального окна
    if (startDateInput && !startDateInput._datepickerInstance) {
        new DatePicker(startDateInput);
    }
    if (endDateInput && !endDateInput._datepickerInstance) {
        new DatePicker(endDateInput);
    }

    let ignoreBlur = false;

    manageVacationsBtn.addEventListener('click', () => {
        vacationForm.reset();
        delete vacationForm.dataset.editingVacationId;
        
        if (modalTitle) modalTitle.textContent = 'Добавление отпуска';
        if (submitButton) submitButton.innerHTML = '<i class="fas fa-plus"></i> Добавить отпуск';

        const optionsContainer = employeeSelect.querySelector('.custom-options');
        if (optionsContainer) {
            let optionsHTML = ``;
            state.employees.forEach(emp => {
                optionsHTML += `<li class="custom-option" data-value="${emp.id}">${emp.lastName} ${emp.firstName}</li>`;
            });
            optionsContainer.innerHTML = optionsHTML;
        }
        setComboboxValue(employeeSelect, "", "");
        setComboboxDisabled(employeeSelect, false);

        const today = new Date();
        const startDatePicker = startDateInput?._datepickerInstance;
        const endDatePicker = endDateInput?._datepickerInstance;

        if (startDatePicker) startDatePicker.setMinDate(today);
        if (endDatePicker) endDatePicker.setMinDate(today);

        if (startDatePicker) startDatePicker.setDate(null);
        if (endDatePicker) endDatePicker.setDate(null);

        openModal('vacations-modal');
    });
    
    vacationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const editingVacationId = vacationForm.dataset.editingVacationId;
        const employeeId = parseInt(employeeSelect.dataset.value, 10);
        
        const vacationData = {
            employeeId: employeeId,
            startDate: startDateInput?._datepickerInstance.getFormattedDate(),
            endDate: endDateInput?._datepickerInstance.getFormattedDate(),
        };

        if (!vacationData.employeeId) { toast.error("Пожалуйста, выберите сотрудника."); return; }
        if (!vacationData.startDate) { toast.error("Пожалуйста, укажите дату начала отпуска."); return; }
        if (!vacationData.endDate) { toast.error("Пожалуйста, укажите дату окончания отпуска."); return; }
        if (new Date(vacationData.startDate) > new Date(vacationData.endDate)) { toast.error("Дата начала не может быть позже даты окончания."); return; }

        try {
            if (submitButton) submitButton.disabled = true;
            let result;

            if (editingVacationId) {
                if (submitButton) submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Сохранение...';
                result = await api.put(`/api/vacations/${editingVacationId}`, vacationData);
                
                const employee = state.employees.find(e => e.id === employeeId);
                if (employee) {
                    const vacationIndex = employee.vacations.findIndex(v => v.id == editingVacationId);
                    if (vacationIndex !== -1) employee.vacations[vacationIndex] = result;
                    updateEmployeeRow(employeeId);
                }
                toast.success("Отпуск успешно обновлен!");

            } else {
                if (submitButton) submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Добавление...';
                result = await api.post('/api/vacations', vacationData);
                
                const employee = state.employees.find(e => e.id === employeeId);
                if (employee) {
                    if (!employee.vacations) employee.vacations = [];
                    employee.vacations.push(result);
                    updateEmployeeRow(employeeId);
                }
                toast.success("Отпуск успешно добавлен!");
            }
            
            closeModal('vacations-modal');

        } catch (error) {
            let errorMessage = 'Не удалось сохранить отпуск';
            if (error.errors && error.errors.length > 0 && error.errors[0].message) {
                errorMessage = error.errors[0].message;
            } else if (error.message) {
                errorMessage = error.message;
            }
            toast.error(`Ошибка: ${errorMessage}`);
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = editingVacationId 
                    ? '<i class="fas fa-save"></i> Сохранить изменения' 
                    : '<i class="fas fa-plus"></i> Добавить отпуск';
            }
        }
    });

    const options = employeeSelect.querySelector('.custom-options');

    if (employeeSearchInput && options) {
        employeeSearchInput.addEventListener('focus', () => {
            employeeSelect.classList.add('open');
        });

        employeeSearchInput.addEventListener('input', () => {
            filterComboboxOptions(employeeSelect, employeeSearchInput.value);
        });
        
        options.addEventListener('mousedown', (e) => {
            e.preventDefault(); // Предотвращаем blur на input
            const targetOption = e.target.closest('.custom-option');
            if (targetOption && !targetOption.classList.contains('hidden')) {
                setComboboxValue(employeeSelect, targetOption.dataset.value, targetOption.textContent);
                employeeSelect.classList.remove('open');
                ignoreBlur = true; // Игнорируем следующий blur
                
                // Восстанавливаем фокус после выбора
                setTimeout(() => {
                    employeeSearchInput.focus();
                    ignoreBlur = false;
                }, 100);
            }
        });

        employeeSearchInput.addEventListener('blur', () => {
            if (ignoreBlur) return;
            
            setTimeout(() => {
                const inputText = employeeSearchInput.value.trim().toLowerCase();
                
                // Ищем точное совпадение
                const matchedEmployee = state.employees.find(emp => 
                    `${emp.lastName} ${emp.firstName}`.toLowerCase() === inputText
                );

                if (matchedEmployee) {
                    setComboboxValue(employeeSelect, matchedEmployee.id, `${matchedEmployee.lastName} ${matchedEmployee.firstName}`);
                } else {
                    const currentId = employeeSelect.dataset.value;
                    const currentEmployee = state.employees.find(e => e.id == currentId);
                    if(!currentEmployee) {
                       setComboboxValue(employeeSelect, "", "");
                    }
                }
                
                employeeSelect.classList.remove('open');
            }, 200);
        });
    }
    
    document.addEventListener('click', (e) => {
        if (!employeeSelect.contains(e.target)) {
            employeeSelect.classList.remove('open');
        }
    });

    if (modal) {
        const closeBtn = modal.querySelector('.modal-close-btn');
        if (closeBtn) closeBtn.addEventListener('click', () => closeModal('vacations-modal'));
        modal.addEventListener('click', (event) => {
            if (event.target === modal) closeModal('vacations-modal');
        });
    }

    if (startDateInput) {
        startDateInput.addEventListener('change', () => {
            const startDatePicker = startDateInput._datepickerInstance;
            const endDatePicker = endDateInput?._datepickerInstance;
            if (!startDatePicker || !endDatePicker) return;

            const startDate = startDatePicker.getDate();
            const endDate = endDatePicker.getDate();

            if (startDate) {
                if (!endDate || endDate < startDate) endDatePicker.setDate(startDate);
                endDatePicker.setMinDate(startDate);
            }
        });
    }
}
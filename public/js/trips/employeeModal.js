// ===================================================================
// Файл: public/js/trips/employeeModal.js (ИТОГОВАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ)
// ===================================================================
//
// В этом файле реализована вся логика для модального окна "Управление сотрудниками",
// включая отображение списка, поиск, добавление, редактирование, проверку
// на дубликаты и работу с кастомным компонентом выбора даты.

import { state, mutations } from './state.js';
import { api } from '../common/api-client.js';
import { renderCalendar, updateEmployeeRow } from './calendar.js';
import { populateTripModal } from './modals/tripFormModal.js';
import DatePicker from '../components/datepicker.js';

const modal = document.getElementById('employees-modal');

/**
 * Нормализует строку ФИО: убирает лишние пробелы и приводит к нижнему регистру.
 * @param {string} str - Исходная строка.
 * @returns {string} - Нормализованная строка.
 */
function normalizeFio(str) {
  return (str || "").replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Проверяет, существует ли уже сотрудник с таким ФИО.
 * @param {string} lastName - Фамилия.
 * @param {string} firstName - Имя.
 * @param {string} patronymic - Отчество.
 * @param {number|null} editingId - ID сотрудника, которого редактируют (чтобы исключить его из проверки).
 * @returns {boolean} - true, если дубликат найден.
 */
function isDuplicateEmployee(lastName, firstName, patronymic, editingId = null) {
  const last = lastName || "";
  const first = firstName || "";
  const middle = patronymic || "";

  if (!last.trim() || !first.trim()) {
      return false;
  }

  const candidate = normalizeFio(`${last} ${first} ${middle}`);
  
  return state.employees.some(e => {
    // Если мы редактируем, нужно исключить самого себя из проверки на дубликаты
    if (editingId && e.id === editingId) {
        return false;
    }
    return normalizeFio(`${e.lastName} ${e.firstName} ${e.patronymic || ""}`) === candidate;
  });
}

/**
 * Объект, инкапсулирующий всю логику для управления сотрудниками.
 */
const empManagementLogic = {
    /**
     * Собирает полное ФИО из объекта сотрудника.
     * @param {object} emp - Объект сотрудника.
     * @returns {string} - Полное ФИО.
     */
    getFullName(emp) {
        return `${emp.lastName} ${emp.firstName} ${emp.patronymic || ''}`.trim();
    },

    /**
     * Фильтрует сотрудников по поисковому запросу.
     * @param {string} query - Поисковый запрос.
     * @returns {Array<object>} - Отфильтрованный массив сотрудников.
     */
    filterEmployees(query) {
        if (!query.trim()) {
            return state.employees;
        }
        const searchTerm = query.toLowerCase();
        return state.employees.filter(emp => {
            const fullName = this.getFullName(emp).toLowerCase();
            const position = emp.position.toLowerCase();
            return fullName.includes(searchTerm) || position.includes(searchTerm);
        });
    },

    /**
     * Отрисовывает список сотрудников в модальном окне.
     */
    render() {
        const list = document.getElementById('employees-list-managed');
        const countEl = document.getElementById('employees-count');
        const filteredEmps = this.filterEmployees(state.empManagement.searchQuery);
        
        if (countEl) {
            countEl.textContent = `Всего сотрудников: ${filteredEmps.length}`;
        }
        
        if (!list) return;

        if (filteredEmps.length === 0) {
            const emptyMessage = state.empManagement.searchQuery.trim() ? 'Сотрудники не найдены' : 'Сотрудники не добавлены';
            list.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon"><i class="fas fa-users"></i></div>
                    <div>${emptyMessage}</div>
                </div>`;
            return;
        }

        list.innerHTML = filteredEmps.map(emp => `
            <div class="employee-item">
                <div>
                    <div class="employee-name">${this.getFullName(emp)}</div>
                    <div class="employee-position">${emp.position}</div>
                </div>
                <div class="employee-actions">
                    <button class="js-edit-btn" data-id="${emp.id}" title="Редактировать"></button>
                    <button class="js-delete-btn" data-id="${emp.id}" title="Удалить сотрудника"></button>
                </div>
            </div>
        `).join('');
    },
    
    /**
     * Устанавливает режим формы: 'add' (добавление) или 'edit' (редактирование).
     * @param {string} mode - Режим ('add' или 'edit').
     * @param {number|null} employeeId - ID сотрудника для режима редактирования.
     */
    setFormMode(mode, employeeId = null) {
        const form = document.getElementById('employee-form-managed');
        if (!form) return;
        
        const leftTitle = document.getElementById('employee-list-title');
        const rightTitle = modal.querySelector('.form-container').previousElementSibling.querySelector('.card-title');
        const submitButton = form.querySelector('button[type="submit"]');
        const cancelEditBtn = document.getElementById('cancel-edit-btn');

        if (mode === 'edit') {
            const employee = state.employees.find(e => e.id === employeeId);
            if (!employee) return;

            form.dataset.editingId = employeeId;
            if(leftTitle) leftTitle.textContent = 'Редактирование сотрудника';
            if(rightTitle) rightTitle.textContent = 'Редактирование сотрудника';
            if(submitButton) submitButton.innerHTML = '<i class="fas fa-save"></i> Сохранить изменения';
            if(cancelEditBtn) cancelEditBtn.style.display = 'block';
            
            form.querySelector('#employee-form-last-name').value = employee.lastName;
            form.querySelector('#employee-form-first-name').value = employee.firstName;
            form.querySelector('#employee-form-patronymic').value = employee.patronymic || '';
            form.querySelector('#employee-form-phone').value = employee.phone || '';
            form.querySelector('#employee-form-email').value = employee.email || '';
            form.querySelector('#employee-form-position').value = employee.position;
            
            // Установка даты через DatePicker API
            const hireDatePicker = form.querySelector('#employee-form-hire-date')._datepickerInstance;
            if (hireDatePicker) {
                hireDatePicker.setDate(employee.hireDate || null);
            }

        } else { // Режим 'add'
            form.reset();
            form.removeAttribute('data-editing-id');
            if(leftTitle) leftTitle.textContent = 'Список сотрудников';
            if(rightTitle) rightTitle.textContent = 'Добавить нового сотрудника';
            if(submitButton) submitButton.innerHTML = '<i class="fas fa-plus"></i> Добавить сотрудника';
            if(cancelEditBtn) cancelEditBtn.style.display = 'none';

            // Сброс значения DatePicker
            const hireDatePicker = form.querySelector('#employee-form-hire-date')._datepickerInstance;
            if (hireDatePicker) {
                hireDatePicker.setDate(null);
            }

            const errorEl = document.getElementById('employee-duplicate-error');
            if (errorEl) {
                errorEl.style.display = 'none';
            }
            form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
        }
    },

    /**
     * Обновляет предупреждение о дубликате ФИО при вводе в форме.
     */
    updateDuplicateWarning() {
        const form = document.getElementById('employee-form-managed');
        const editingId = form.dataset.editingId ? parseInt(form.dataset.editingId, 10) : null;
        const lastNameInput = document.getElementById('employee-form-last-name');
        const firstNameInput = document.getElementById('employee-form-first-name');
        const patronymicInput = document.getElementById('employee-form-patronymic');
        const errorEl = document.getElementById('employee-duplicate-error');

        if (!lastNameInput || !firstNameInput || !errorEl) return;

        const duplicate = isDuplicateEmployee(
            lastNameInput.value, 
            firstNameInput.value, 
            patronymicInput?.value,
            editingId
        );
        
        errorEl.style.display = duplicate ? 'flex' : 'none';
        lastNameInput.classList.toggle('error', duplicate);
        firstNameInput.classList.toggle('error', duplicate);
    }
};

/**
 * Устанавливает все обработчики событий для модального окна управления сотрудниками.
 */
export function setupEmployeeModal() {
    if (!modal) return;

    // Инициализируем DatePicker для поля даты приёма на работу
    const hireDateInput = document.getElementById('employee-form-hire-date');
    if (hireDateInput && !hireDateInput._datepickerInstance) {
        new DatePicker(hireDateInput);
    }
    
    const searchInput = modal.querySelector('#employee-search-input');
    const form = modal.querySelector('#employee-form-managed');
    const listContainer = modal.querySelector('#employees-list-managed');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            state.empManagement.searchQuery = e.target.value;
            empManagementLogic.render();
        });
    }

    if (form) {
        const inputsForDuplicateCheck = form.querySelectorAll('input[type="text"]');
        inputsForDuplicateCheck.forEach(input => {
            if (input) {
                input.addEventListener('input', empManagementLogic.updateDuplicateWarning);
            }
        });
    }
    
    if (listContainer) {
        listContainer.addEventListener('click', (e) => {
            const editButton = e.target.closest('.js-edit-btn');
            if (editButton) {
                const employeeId = parseInt(editButton.dataset.id, 10);
                empManagementLogic.setFormMode('edit', employeeId);
            }
        });
    }

    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', () => {
            empManagementLogic.setFormMode('add');
        });
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitButton = form.querySelector('button[type="submit"]');
            const editingId = form.dataset.editingId ? parseInt(form.dataset.editingId, 10) : null;
            
            // Получение даты из DatePicker API
            const hireDatePicker = form.querySelector('#employee-form-hire-date')._datepickerInstance;
            const employeeData = {
                lastName: form.querySelector('#employee-form-last-name').value.trim(),
                firstName: form.querySelector('#employee-form-first-name').value.trim(),
                patronymic: form.querySelector('#employee-form-patronymic').value.trim(),
                phone: form.querySelector('#employee-form-phone').value.trim(),
                email: form.querySelector('#employee-form-email').value.trim(),
                hireDate: hireDatePicker ? hireDatePicker.getFormattedDate() : null,
                position: form.querySelector('#employee-form-position').value
            };

            if (!employeeData.lastName || !employeeData.firstName || !employeeData.position) {
                toast.error('Фамилия, Имя и Должность обязательны для заполнения.');
                return;
            }

            if (isDuplicateEmployee(employeeData.lastName, employeeData.firstName, employeeData.patronymic, editingId)) {
                empManagementLogic.updateDuplicateWarning();
                form.querySelector('#employee-form-last-name').focus();
                return;
            }

            try {
                submitButton.disabled = true;
                
                if (editingId) {
                    submitButton.textContent = 'Сохранение...';
                    const updatedEmployee = await api.put(`/api/employees/${editingId}`, employeeData);
                    mutations.updateEmployee(updatedEmployee);
                    
                    empManagementLogic.render();
                    populateTripModal();
                    updateEmployeeRow(editingId);
                    
                    empManagementLogic.setFormMode('add');
                    toast.success(`Данные сотрудника "${updatedEmployee.lastName} ${updatedEmployee.firstName}" обновлены.`);

                } else {
                    submitButton.textContent = 'Добавление...';
                    const addedEmployee = await api.post('/api/employees', employeeData);
                    mutations.addEmployee(addedEmployee);
                    
                    empManagementLogic.render();
                    populateTripModal();
                    renderCalendar();
                    
                    empManagementLogic.setFormMode('add');
                    toast.success(`Сотрудник "${addedEmployee.lastName} ${addedEmployee.firstName}" добавлен.`);
                }

            } catch (error) {
                let errorMessage = 'Произошла неизвестная ошибка.';
                if (error.errors && Array.isArray(error.errors) && error.errors.length > 0) {
                    errorMessage = error.errors[0].message;
                } else if (error.message) {
                    errorMessage = error.message;
                }
                toast.error(errorMessage);
            } finally {
                submitButton.disabled = false;
                const buttonText = editingId ? '<i class="fas fa-save"></i> Сохранить изменения' : '<i class="fas fa-plus"></i> Добавить сотрудника';
                submitButton.innerHTML = buttonText;
            }
        });
    }
}

// Экспортируем функции для вызова извне
export const renderEmployeeList = empManagementLogic.render.bind(empManagementLogic);
export const resetEmployeeForm = empManagementLogic.setFormMode.bind(empManagementLogic, 'add');
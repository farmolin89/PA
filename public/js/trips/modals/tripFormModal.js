// ===================================================================
// File: public/js/trips/modals/tripFormModal.js (ФИНАЛЬНАЯ ВЕРСИЯ 5.0)
// ===================================================================

import { state, mutations } from '../state.js';
import { api } from '../../common/api-client.js';
import { updateEmployeeRow } from '../calendar.js';
import { closeModal } from './modalManager.js';
import { CONFIG } from '../constants.js';
import { utils } from '../trip-helpers.js';
import DatePicker from '../../components/datepicker.js';

export function populateTripModal() {
    const employeeContainer = document.getElementById('employees-container');
    if (employeeContainer) {
         employeeContainer.innerHTML = state.employees.map(e => {
            const initials = `${e.lastName[0] || ''}${e.firstName[0] || ''}`.toUpperCase();
            const fullName = `${e.lastName} ${e.firstName} ${e.patronymic || ''}`.trim();
            return `<div class="employee-item" data-id="${e.id}"><div class="employee-avatar">${initials}</div><div>${fullName}</div></div>`;
        }).join('');
    }
   
    const orgOptions = document.getElementById('organization-options');
    if (orgOptions) {
        orgOptions.innerHTML = state.organizations.map(o => `<div class="organization-option" data-value="${o.id}">${o.name}</div>`).join('');
    }
}

export function populateTripModalForEdit(trip) {
    const form = document.getElementById('trip-form');
    form.dataset.editingTripId = trip.id;
    document.getElementById('trip-modal-title').textContent = 'Редактировать командировку';
    form.querySelector('button[type="submit"] .btn-text').textContent = 'Сохранить изменения';

    document.getElementById('destination').value = trip.destination;
    
    const startDatePicker = document.getElementById('start-date')._datepickerInstance;
    const endDatePicker = document.getElementById('end-date')._datepickerInstance;
    if (startDatePicker) {
        startDatePicker.setDate(trip.startDate);
        startDatePicker.setMinDate(null);
    }
    if (endDatePicker) {
        endDatePicker.setDate(trip.endDate);
        endDatePicker.setMinDate(trip.startDate);
    }
    
    const organization = state.organizations.find(o => o.id === trip.organizationId);
    if (organization) {
        document.getElementById('organization-search').value = organization.name;
        document.getElementById('organization').value = organization.id;
    }

    document.querySelectorAll('.transport-option').forEach(btn => btn.classList.remove('active'));
    document.getElementById('transport').value = '';
    if (trip.transport) {
        const selectedBtn = document.querySelector(`.transport-option[data-transport="${trip.transport}"]`);
        if (selectedBtn) {
            selectedBtn.classList.add('active');
            document.getElementById('transport').value = trip.transport;
        }
    }
    
    state.selectedEmployees = [String(trip.employeeId)];
    document.querySelectorAll('#employees-container .employee-item').forEach(item => {
        item.classList.toggle('selected', item.dataset.id == trip.employeeId);
    });
    document.getElementById('selected-count').textContent = '1';
    
    document.getElementById('employees-container').classList.add('disabled');
}

export function setupTripForm() {
    const form = document.getElementById('trip-form');
    if (!form) return;

    // Инициализируем DatePicker для полей дат
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    if (startDateInput && !startDateInput._datepickerInstance) {
        new DatePicker(startDateInput);
    }
    if (endDateInput && !endDateInput._datepickerInstance) {
        new DatePicker(endDateInput);
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = form.querySelector('button[type="submit"]');
        
        const rawId = form.dataset.editingTripId;
        const editingTripId = rawId ? parseInt(rawId, 10) : null;
        
        const organizationId = form.querySelector('#organization').value ? parseInt(form.querySelector('#organization').value, 10) : null;
        const startDate = document.getElementById('start-date')._datepickerInstance.getFormattedDate();
        const endDate = document.getElementById('end-date')._datepickerInstance.getFormattedDate();
        const destination = form.querySelector('#destination').value.trim();

        if (!organizationId) { toast.error('Пожалуйста, выберите организацию из списка.'); return; }
        if (!startDate || !endDate || !destination) { toast.error('Даты и место назначения должны быть заполнены.'); return; }
        if (new Date(startDate) > new Date(endDate)) { toast.error('Дата окончания не может быть раньше даты начала.'); return; }

        try {
            submitButton.disabled = true;
            submitButton.querySelector('.btn-text').textContent = 'Сохранение...';

            if (editingTripId) {
                const tripToEdit = state.trips.find(t => t.id === editingTripId);
                const tripData = {
                    employeeId: tripToEdit.employeeId,
                    organizationId,
                    startDate,
                    endDate,
                    destination,
                    transport: form.querySelector('#transport').value || null,
                };
                
                const updatedTrip = await api.put(`/api/trips/${editingTripId}`, tripData);
                mutations.updateTrip(updatedTrip);
                updateEmployeeRow(updatedTrip.employeeId);
                toast.success('Командировка успешно обновлена!');

            } else {
                const participants = state.selectedEmployees.map(id => parseInt(id, 10));
                if (participants.length < CONFIG.MIN_TRIP_PARTICIPANTS) { toast.error('Выберите хотя бы одного сотрудника.'); submitButton.disabled = false; return; }

                const tripData = {
                    participants,
                    organizationId,
                    startDate,
                    endDate,
                    destination,
                    transport: form.querySelector('#transport').value || null,
                    status: 'Запланирована',
                };

                const addedTrips = await api.post('/api/trips', tripData);
                mutations.addTrip(addedTrips);
                participants.forEach(employeeId => updateEmployeeRow(employeeId));
                toast.success('Командировка успешно добавлена!');
            }
            
            closeModal('trip-modal');
        } catch (error) {
            const errorMessage = error.message || 'Не удалось сохранить командировку.';
            toast.error(errorMessage);
        } finally {
            submitButton.disabled = false;
            const buttonText = editingTripId ? 'Сохранить изменения' : 'Добавить Выезд';
            submitButton.querySelector('.btn-text').textContent = buttonText;
        }
    });

    const employeesContainer = document.getElementById('employees-container');
    const selectedCount = document.getElementById('selected-count');
    const employeeError = document.getElementById('employee-error');

    employeesContainer.addEventListener('click', (e) => {
        if (employeesContainer.classList.contains('disabled')) return;
        const item = e.target.closest('.employee-item');
        if (!item) return;
        const id = item.getAttribute('data-id');
        if (item.classList.contains('selected')) {
            item.classList.remove('selected');
            state.selectedEmployees = state.selectedEmployees.filter(empId => empId !== id);
        } else {
            if (state.selectedEmployees.length < CONFIG.MAX_TRIP_PARTICIPANTS) {
                item.classList.add('selected');
                state.selectedEmployees.push(id);
            } else {
                employeeError.style.display = 'block';
            }
        }
        selectedCount.textContent = state.selectedEmployees.length;
        if (state.selectedEmployees.length < CONFIG.MAX_TRIP_PARTICIPANTS) {
            employeeError.style.display = 'none';
        }
    });

    const organizationSearch = document.getElementById('organization-search');
    const organizationOptions = document.getElementById('organization-options');
    const organizationInput = document.getElementById('organization');

    organizationSearch.addEventListener('focus', () => organizationOptions.style.display = 'block');
    
    organizationSearch.addEventListener('input', function() {
        const filter = this.value.toLowerCase();
        organizationOptions.querySelectorAll('.organization-option').forEach(opt => {
            opt.style.display = opt.textContent.toLowerCase().includes(filter) ? '' : 'none';
        });
    });

    organizationOptions.addEventListener('click', (e) => {
        const option = e.target.closest('.organization-option');
        if (!option) return;
        organizationSearch.value = option.textContent;
        organizationInput.value = option.getAttribute('data-value');
        organizationOptions.style.display = 'none';
    });
    
    const transportContainer = document.querySelector('.transport-options');
    const transportInput = document.getElementById('transport');

    transportContainer.addEventListener('click', (e) => {
        const button = e.target.closest('.transport-option');
        if (!button) return;
        if (button.classList.contains('active')) {
            button.classList.remove('active');
            transportInput.value = '';
        } else {
            transportContainer.querySelector('.transport-option.active')?.classList.remove('active');
            button.classList.add('active');
            transportInput.value = button.dataset.transport;
        }
    });
    
    document.addEventListener('click', (e) => {
        if (organizationSearch && !organizationSearch.contains(e.target) && !organizationOptions.contains(e.target)) {
            organizationOptions.style.display = 'none';
        }
    });

    startDateInput.addEventListener('change', () => {
        const startDatePicker = startDateInput._datepickerInstance;
        const endDatePicker = document.getElementById('end-date')._datepickerInstance;
        if (!startDatePicker || !endDatePicker) return;

        const startDate = startDatePicker.getDate();
        const endDate = endDatePicker.getDate();

        if (startDate) {
            if (!endDate || endDate < startDate) {
                endDatePicker.setDate(startDate);
            }
            endDatePicker.setMinDate(startDate);
        }
    });
}
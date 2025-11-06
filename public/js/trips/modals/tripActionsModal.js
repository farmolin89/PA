// ===================================================================
// File: public/js/trips/modals/tripActionsModal.js (ВЕРСИЯ С ИНДИВИДУАЛЬНЫМИ КОМАНДИРОВКАМИ)
// ===================================================================

import { state, mutations } from '../state.js';
import { api } from '../../common/api-client.js';
import { updateEmployeeRow } from '../calendar.js';
import { openModal, closeModal } from './modalManager.js';
import { showConfirmationModal } from './confirmationModal.js';
import { populateTripModal, populateTripModalForEdit } from './tripFormModal.js';
import { openVacationModalForEdit } from '../vacationModal.js';

export function setupTripActionsModal() {
    const modal = document.getElementById('trip-actions-modal');
    if (!modal) return;
    
    const editBtn = document.getElementById('edit-trip-btn');
    const deleteBtn = document.getElementById('delete-trip-btn');

    // --- Обработчик кнопки "РЕДАКТИРОВАТЬ" ---
    editBtn.addEventListener('click', () => {
        const context = modal.dataset.context;
        const id = parseInt(modal.dataset.id, 10);
        closeModal(modal.id);

        if (context === 'trip') {
            // ИЗМЕНЕНИЕ: Находим одну конкретную поездку по её уникальному ID
            const tripToEdit = state.trips.find(t => t.id === id);
            if (!tripToEdit) return toast.error('Командировка не найдена.');
            
            populateTripModal(); // Сначала заполняем общими данными (сотрудники, организации)
            populateTripModalForEdit(tripToEdit); // Затем заполняем данными для редактирования
            openModal('trip-modal');

        } else if (context === 'vacation') {
            const employeeId = parseInt(modal.dataset.employeeId, 10);
            const employee = state.employees.find(e => e.id === employeeId);
            const vacationToEdit = employee?.vacations.find(v => v.id === id);
            if (!vacationToEdit || !employee) return toast.error('Отпуск не найден.');
            
            openVacationModalForEdit(vacationToEdit, employee);
        }
    });

    // --- Обработчик кнопки "УДАЛИТЬ" ---
    deleteBtn.addEventListener('click', () => {
        const context = modal.dataset.context;
        const id = parseInt(modal.dataset.id, 10);
        closeModal(modal.id);

        if (context === 'trip') {
            // ИЗМЕНЕНИЕ: Находим одну конкретную поездку для удаления
            const tripToDelete = state.trips.find(t => t.id === id);
            if (!tripToDelete) return toast.error('Командировка не найдена.');
            
            // ИЗМЕНЕНИЕ: Уточняем сообщение для пользователя
            const employee = state.employees.find(e => e.id === tripToDelete.employeeId);
            const employeeName = employee ? `${employee.lastName} ${employee.firstName}` : 'сотрудника';
            const message = `Вы уверены, что хотите удалить командировку в <strong>"${tripToDelete.destination}"</strong> для сотрудника <strong>${employeeName}</strong>?`;
            
            showConfirmationModal(message, async () => {
                try {
                    await api.delete(`/api/trips/${id}`);
                    const employeeToUpdate = tripToDelete.employeeId;
                    mutations.removeTrip(id);
                    // Обновляем строку только для одного сотрудника
                    updateEmployeeRow(employeeToUpdate);
                    toast.success('Командировка успешно удалена.');
                } catch (error) {
                    toast.error(`Не удалось удалить: ${error.message}`);
                }
            });

        } else if (context === 'vacation') {
            // Логика удаления отпуска не меняется
            const employeeId = parseInt(modal.dataset.employeeId, 10);
            const employee = state.employees.find(e => e.id === employeeId);
            const vacationToDelete = employee?.vacations.find(v => v.id === id);
            if (!vacationToDelete || !employee) return toast.error('Отпуск не найден.');

            const message = `Вы уверены, что хотите удалить отпуск для <strong>${employee.lastName} ${employee.firstName}</strong>?`;
            
            showConfirmationModal(message, async () => {
                try {
                    await api.delete(`/api/vacations/${id}`);
                    employee.vacations = employee.vacations.filter(v => v.id !== id);
                    updateEmployeeRow(employeeId);
                    toast.success('Отпуск успешно удален.');
                } catch (error) {
                    toast.error(`Не удалось удалить: ${error.message}`);
                }
            });
        }
    });
}
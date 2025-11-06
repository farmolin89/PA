// ===================================================================
// Файл: public/js/trips/main.js (ФИНАЛЬНАЯ ВЕРСИЯ С ЗАГРУЗКОЙ ДАННЫХ ПОЛЬЗОВАТЕЛЯ)
// ===================================================================

// --- Импорт состояния и API ---
import { state, mutations } from './state.js';
import { api } from '../common/api-client.js';

// +++ 1. ИМПОРТИРУЕМ ФУНКЦИЮ ДЛЯ ЗАГРУЗКИ ДАННЫХ ПОЛЬЗОВАТЕЛЯ +++
import { fetchUserData } from '../dashboard/userData.js';

// --- Глобальная утилита для уведомлений ---
const toast = window.toast;

// --- Импорт основных модулей страницы ---
import { renderCalendar } from './calendar.js';
import { setupCalendarInteractivity } from './calendarInteractivity.js';
import { setupEmployeeModal, renderEmployeeList, resetEmployeeForm } from './employeeModal.js';
import { setupOrgModal, renderOrgList } from './orgModal.js';
import { setupVacationModal } from './vacationModal.js';

// --- Импорт из разделенных модулей для модальных окон ---
import { openModal, setupCommonModalHandlers } from './modals/modalManager.js';
import { setupConfirmationModal, showConfirmationModal } from './modals/confirmationModal.js';
import { setupLevelModal } from './modals/employeeCardModal.js';
import { setupTripActionsModal } from './modals/tripActionsModal.js';
import { populateTripModal, setupTripForm } from './modals/tripFormModal.js';
import { setupStatsModal } from './statsModalManager.js';
import './tripHistoryModal.js';
import { utils } from './trip-helpers.js';

// --- Основные элементы DOM ---
const addTripBtn = document.getElementById('add-trip-btn');
const manageEmployeesBtn = document.getElementById('manage-employees-btn');
const manageOrganizationsBtn = document.getElementById('manage-organizations-btn');
const manageVacationsBtn = document.getElementById('manage-vacations-btn');
const scheduleBody = document.getElementById('schedule-body-grid');
const exportBtn = document.getElementById('export-btn');
const showStatsBtn = document.getElementById('show-stats-btn');

/**
 * Функция для синхронизации горизонтальной прокрутки шапки и тела.
 */
function setupScrollSync() {
    const header = document.getElementById('schedule-header-grid');
    const bodyWrapper = document.getElementById('schedule-body-wrapper');

    if (header && bodyWrapper) {
        bodyWrapper.addEventListener('scroll', () => {
            header.scrollLeft = bodyWrapper.scrollLeft;
        });
    }
}

/**
 * Настраивает единый делегированный обработчик кликов по кнопкам удаления.
 */
function setupDeleteHandlers() {
  document.body.addEventListener('click', async (e) => {
    const deleteButton = e.target.closest('.js-delete-btn');
    if (!deleteButton) return;

    const id = parseInt(deleteButton.dataset.id, 10);
    const parentModal = deleteButton.closest('.modal');
    if (!parentModal) return;

    let url, itemName, action, entityName;

    if (parentModal.id === 'employees-modal') {
      const employee = state.employees.find(e => e.id === id);
      entityName = employee ? `${employee.lastName} ${employee.firstName}` : 'сотрудника';
      url = `/api/employees/${id}`;
      itemName = 'сотрудника';
      action = () => {
        mutations.removeEmployee(id);
        renderEmployeeList();
        if (typeof populateTripModal === 'function') {
          populateTripModal();
        }
        renderCalendar();
        toast.success(`Сотрудник "${entityName}" удален.`);
      };
    } else if (parentModal.id === 'organizations-modal') {
      const organization = state.organizations.find(o => o.id === id);
      entityName = organization ? organization.name : 'организацию';
      url = `/api/organizations/${id}`;
      itemName = 'организацию';
      action = () => {
        mutations.removeOrganization(id);
        renderOrgList();
        if (typeof populateTripModal === 'function') {
          populateTripModal();
        }
        renderCalendar();
        toast.success(`Организация "${entityName}" удалена.`);
      };
    } else {
      return;
    }

    const confirmationMessage = `Вы уверены, что хотите удалить ${itemName}: <strong>"${entityName}"</strong>?`;
    showConfirmationModal(confirmationMessage, async () => {
      try {
        await api.delete(url);
        action();
      } catch (error) {
        let errorMessage = 'Не удалось выполнить удаление.';
        if (error.errors && Array.isArray(error.errors) && error.errors.length > 0) {
          errorMessage = error.errors[0].message;
        } else if (error.message) {
          errorMessage = error.message;
        }
        toast.error(errorMessage);
      }
    });
  });
}

/**
 * Обрабатывает экспорт визуального графика в PDF.
 */
async function handleExportPdf() {
  if (!exportBtn) return;
  
  const exportArea = document.getElementById('export-area');
  if (!exportArea) {
    toast.error('Ошибка: Область для экспорта не найдена на странице.');
    return;
  }

  const originalButtonText = exportBtn.innerHTML;
  exportBtn.disabled = true;
  exportBtn.innerHTML = '<span>⏳</span> Генерация...';
  toast.info('Пожалуйста, подождите, идет подготовка файла...');

  const clone = exportArea.cloneNode(true);
  const renderContainer = document.createElement('div');
  renderContainer.classList.add('pdf-render-clone');
  renderContainer.appendChild(clone);
  document.body.appendChild(renderContainer);
  
  try {
    const canvas = await window.html2canvas(clone, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = imgWidth / imgHeight;

    let finalImgWidth = pdfWidth - 20;
    let finalImgHeight = finalImgWidth / ratio;

    if (finalImgHeight > pdfHeight - 20) {
      finalImgHeight = pdfHeight - 20;
      finalImgWidth = finalImgHeight * ratio;
    }

    const x = (pdfWidth - finalImgWidth) / 2;
    const y = (pdfHeight - finalImgHeight) / 2;

    pdf.addImage(imgData, 'PNG', x, y, finalImgWidth, finalImgHeight);

    const year = state.currentDate.getFullYear();
    const monthName = state.currentDate.toLocaleString('ru-RU', { month: 'long' });
    pdf.save(`График_командировок_${monthName}_${year}.pdf`);

    toast.success('Экспорт в PDF успешно завершен!');
  } catch (error) {
    console.error("Ошибка при экспорте в PDF:", error);
    let errorMessage = 'Произошла ошибка при создании PDF-файла.';
    if (error.message) {
        if (error.message.toLowerCase().includes('tainted canvases')) {
            errorMessage = 'Ошибка безопасности: не удалось загрузить внешние изображения для PDF.';
        } else if (error.message.toLowerCase().includes('html2canvas')) {
            errorMessage = 'Ошибка рендеринга страницы. Попробуйте обновить и повторить.';
        }
    }
    toast.error(errorMessage);
  } finally {
    document.body.removeChild(renderContainer);
    exportBtn.disabled = false;
    exportBtn.innerHTML = originalButtonText;
  }
}

/**
 * Инициализирует и управляет простыми кастомными тултипами.
 */
function setupSimpleTooltips() {
  const tooltipElement = document.getElementById('simple-tooltip');
  if (!tooltipElement) return;

  let currentTarget = null;

  const showTooltip = (event) => {
    const target = event.target.closest('[data-tooltip]');
    if (!target) return;
    currentTarget = target;
    tooltipElement.textContent = target.dataset.tooltip;
    tooltipElement.classList.add('visible');
    updatePosition(event);
  };

  const hideTooltip = () => {
    if (currentTarget) {
      tooltipElement.classList.remove('visible');
      currentTarget = null;
    }
  };

  const updatePosition = (event) => {
    if (!tooltipElement.classList.contains('visible')) return;
    const tooltipRect = tooltipElement.getBoundingClientRect();
    let left = event.clientX + 10;
    let top = event.clientY + 15;
    if (left + tooltipRect.width > window.innerWidth - 10) left = event.clientX - tooltipRect.width - 10;
    if (top + tooltipRect.height > window.innerHeight - 10) top = event.clientY - tooltipRect.height - 10;
    tooltipElement.style.left = `${left}px`;
    tooltipElement.style.top = `${top}px`;
  };

  document.body.addEventListener('mouseover', showTooltip);
  document.body.addEventListener('mouseout', hideTooltip);
  document.body.addEventListener('mousemove', (event) => {
    if (currentTarget) updatePosition(event);
  });
}

/**
 * Главная асинхронная функция инициализации приложения.
 */
async function initialize() {
    const controlButtons = [addTripBtn, manageEmployeesBtn, manageOrganizationsBtn, manageVacationsBtn, exportBtn, showStatsBtn];
    controlButtons.forEach(btn => btn && (btn.disabled = true));

    try {
        // +++ 2. ВЫЗЫВАЕМ ФУНКЦИЮ ПЕРЕД ЗАГРУЗКОЙ ОСНОВНЫХ ДАННЫХ +++
        await fetchUserData();
        
        const scheduleBodyGrid = document.getElementById('schedule-body-grid');
        if (scheduleBodyGrid) {
          scheduleBodyGrid.innerHTML = '<div style="text-align: center; padding: 50px; grid-column: 1 / -1;">Загрузка данных...</div>';
        } else {
            toast.error("Критическая ошибка: основной элемент календаря не найден.");
            return;
        }

        const [fetchedEmployees, fetchedOrgs, fetchedTrips, fetchedVacations] = await Promise.all([
            api.get('/api/employees'),
            api.get('/api/organizations'),
            api.get('/api/trips'),
            api.get('/api/vacations')
        ]);

        const vacationsByEmployee = fetchedVacations.reduce((acc, vac) => {
            if (!acc.has(vac.employeeId)) acc.set(vac.employeeId, []);
            acc.get(vac.employeeId).push(vac);
            return acc;
        }, new Map());

        fetchedEmployees.forEach(employee => {
            employee.vacations = vacationsByEmployee.get(employee.id) || [];
        });

        mutations.setEmployees(fetchedEmployees);
        mutations.setOrganizations(fetchedOrgs);
        mutations.setTrips(fetchedTrips);

        renderCalendar();

        if (addTripBtn) {
          addTripBtn.addEventListener('click', () => {
              const form = document.getElementById('trip-form');
              if (!form) return;
              form.reset();
              form.removeAttribute('data-editing-trip-id');
              
              const modalTitle = document.getElementById('trip-modal-title');
              if (modalTitle) modalTitle.textContent = 'Добавить командировку';
              
              const submitBtnText = form.querySelector('button[type="submit"] .btn-text');
              if (submitBtnText) submitBtnText.textContent = 'Добавить Выезд';

              state.selectedEmployees = [];
              document.querySelectorAll('#employees-container .employee-item.selected').forEach(item => item.classList.remove('selected'));
              
              const selectedCount = document.getElementById('selected-count');
              if (selectedCount) selectedCount.textContent = '0';
              
              const employeeError = document.getElementById('employee-error');
              if (employeeError) employeeError.style.display = 'none';
              
              const organizationInput = document.getElementById('organization');
              if (organizationInput) organizationInput.value = '';

              const organizationSearch = document.getElementById('organization-search');
              if (organizationSearch) organizationSearch.value = '';
              
              const startDatePicker = document.getElementById('start-date')?._datepickerInstance;
              const endDatePicker = document.getElementById('end-date')?._datepickerInstance;
              const today = new Date();
              
              if (startDatePicker) {
                  startDatePicker.setDate(today);
                  startDatePicker.setMinDate(today);
              }
              if (endDatePicker) {
                  endDatePicker.setDate(today);
                  endDatePicker.setMinDate(today);
              }
              
              document.querySelector('.transport-option.active')?.classList.remove('active');
              utils.setTripFormDisabledState(false);
              if (typeof populateTripModal === 'function') populateTripModal();
              openModal('trip-modal');
          });
        }

        if (manageEmployeesBtn) {
          manageEmployeesBtn.addEventListener('click', () => {
              if (typeof resetEmployeeForm === 'function') resetEmployeeForm();
              renderEmployeeList();
              openModal('employees-modal');
          });
        }

        if (manageOrganizationsBtn) {
          manageOrganizationsBtn.addEventListener('click', () => {
              renderOrgList();
              openModal('organizations-modal');
          });
        }

        setupCalendarInteractivity();
        setupCommonModalHandlers();
        setupTripForm();
        setupEmployeeModal();
        setupOrgModal();
        setupTripActionsModal();
        setupConfirmationModal();
        setupDeleteHandlers();
        setupLevelModal();
        setupSimpleTooltips();
        setupStatsModal();
        setupVacationModal();

        if (exportBtn) {
          exportBtn.addEventListener('click', handleExportPdf);
        }

        setupScrollSync();

    } catch (error) {
        console.error("Ошибка инициализации:", error);
        let errorMessage = 'Не удалось загрузить данные.';
        if (error.message) errorMessage = `Не удалось загрузить данные: ${error.message}`;
        toast.error(errorMessage);
        const scheduleBodyGrid = document.getElementById('schedule-body-grid');
        if (scheduleBodyGrid) {
          scheduleBodyGrid.innerHTML = `<div style="text-align: center; padding: 50px; color: red; grid-column: 1 / -1;">Ошибка загрузки. Попробуйте обновить страницу.</div>`;
        }
    } finally {
        controlButtons.forEach(btn => btn && (btn.disabled = false));
    }
}

document.addEventListener('DOMContentLoaded', initialize);
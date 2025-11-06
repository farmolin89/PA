// ===================================================================
// File: public/js/trips/modals/employeeCardModal.js (ИСПРАВЛЕННАЯ ВЕРСИЯ)
// ===================================================================

import { state } from '../state.js';
import { utils } from '../trip-helpers.js';
import { api } from '../../common/api-client.js';
import { openModal } from './modalManager.js';
import { initTripHistoryModal } from '../tripHistoryModal.js';
import { 
    renderEmployeeSidebar, 
    renderStatusCards, 
    renderStatsAndProgress, 
    renderAchievementsGrid,
    highlightCurrentLevel,
    setupAchievementToggle,
    renderLoadingState
} from './employeeProfileRenderer.js';

// 1. Создаем переменную для хранения AbortController
let historyModalAbortController = null;

export async function renderEmployeeCard(employeeId) {
    state.currentProfile.employeeId = employeeId;

    const mainContent = document.querySelector('#employee-card-modal .main-content');
    const sidebar = document.querySelector('#employee-card-modal .sidebar');

    renderLoadingState(employeeId, mainContent, sidebar);

    try {
        const profile = await api.get(`/api/employees/${employeeId}/profile`);
        if (!profile) {
            toast.error("Не удалось загрузить профиль.");
            return;
        }
        
        renderEmployeeSidebar(profile);
        
        const currentActivity = utils.getCurrentActivity(employeeId);
        const upcomingEvent = utils.getUpcomingEvent(employeeId);

        renderStatusCards(currentActivity, upcomingEvent, employeeId);
        
        renderStatsAndProgress(profile.stats, profile.levelInfo);
        renderAchievementsGrid(profile.badges); 
        
        highlightCurrentLevel(profile.levelInfo.level);
        setupAchievementToggle();

        const historyModalTrigger = document.getElementById('businessTripsStat');
        const employee = state.employees.find(e => e.id === employeeId);
        const fullName = `${employee.lastName} ${employee.firstName}`;
        
        // 2. Отменяем предыдущий слушатель, если он был
        if (historyModalAbortController) {
            historyModalAbortController.abort();
        }
        
        // 3. Создаем новый AbortController для текущего слушателя
        historyModalAbortController = new AbortController();

        // 4. Добавляем слушатель, передавая ему `signal` от контроллера
        historyModalTrigger.addEventListener('click', () => {
            initTripHistoryModal(employeeId, fullName);
        }, { signal: historyModalAbortController.signal });

    } catch (error) {
        console.error("Ошибка при загрузке профиля сотрудника:", error);
        toast.error("Не удалось загрузить данные профиля.");
    } finally {
        mainContent.style.opacity = '1';
        sidebar.querySelector('.stats-sidebar').style.opacity = '1';
    }
}

export function setupLevelModal() {
    const profileModal = document.getElementById('employee-card-modal');
    if (!profileModal) return;

    profileModal.addEventListener('click', (event) => {
        if (event.target.closest('#level-card-trigger')) {
            openModal('levels-modal');
        }
    });
}
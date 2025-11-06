// ===================================================================
// Файл: public/js/trips/statsModalManager.js (ФИНАЛЬНАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ)
// ===================================================================
import { api } from '../common/api-client.js';
import { openModal } from './modals/modalManager.js';
import { state } from './state.js';
import { initTripHistoryModal } from './tripHistoryModal.js';
import { initAllTripsModal } from './allTripsModal.js';

// Импорт модулей рендеринга и графиков
import { createStatsLayout, updateStatsData } from './stats/statsRenderer.js';
import { createGeographyLayout, updateGeographyData } from './stats/geographyRenderer.js';
import { destroyCharts } from './stats/chartRenderer.js';

// --- Ссылки на ОБА модальных окна ---
const statsModal = document.getElementById('stats-modal');
const statsModalBody = document.getElementById('stats-modal-body');
const geographyModal = document.getElementById('geography-modal');
const geographyModalBody = document.getElementById('geography-modal-body');

// =============================================================
// === ФУНКЦИИ ЗАГРУЗКИ ДАННЫХ И ОБНОВЛЕНИЯ UI ===
// =============================================================

async function fetchAndRenderStats() {
    try {
        const year = document.getElementById('yearFilter').value;
        const statsData = await api.get(`/api/stats?year=${year}`);
        updateStatsData(statsData);
    } catch (error) {
        statsModalBody.innerHTML = `<div style="text-align: center; padding: 50px; color: red;">Ошибка загрузки статистики: ${error.message}</div>`;
    }
}

async function fetchAndRenderGeographyStats() {
    try {
        const year = document.getElementById('yearFilter').value;
        // +++ ИСПРАВЛЕНИЕ: Используем правильный URL +++
        const geoData = await api.get(`/api/stats/geography?year=${year}`);
        updateGeographyData(geoData);
    } catch (error) {
        geographyModalBody.innerHTML = `<div style="text-align: center; padding: 50px; color: red;">Ошибка загрузки географической статистики: ${error.message}</div>`;
    }
}

async function handleGeoFilterChange() {
    try {
        const year = document.getElementById('yearFilter').value;
        const employeeFilterElement = document.getElementById('geoEmployeeFilter');
        if (!employeeFilterElement) return;

        const employeeId = employeeFilterElement.dataset.value; 
        
        // +++ ИСПРАВЛЕНИЕ: Используем правильный URL +++
        const url = `/api/stats/geography?year=${year}${employeeId !== 'all' ? `&employeeId=${employeeId}` : ''}`;
        const geoData = await api.get(url);
        updateGeographyData(geoData);

    } catch (error) {
        if (geographyModalBody) {
            geographyModalBody.innerHTML = `<div style="text-align: center; padding: 50px; color: red;">Ошибка загрузки географической статистики: ${error.message}</div>`;
        }
    }
}


// =============================================================
// === ИНИЦИАЛИЗАЦИЯ И ОБРАБОТЧИКИ СОБЫТИЙ ===
// =============================================================

/**
 * Инициализирует модальное окно статистики и его обработчики.
 */
export function setupStatsModal() {
    const showStatsBtn = document.getElementById('show-stats-btn');
    
    if (!showStatsBtn) {
        return; 
    }

    showStatsBtn.addEventListener('click', () => {
        openModal('stats-modal');
        
        if (statsModalBody) {
            statsModalBody.scrollTop = 0;
        }

        createStatsLayout();
        fetchAndRenderStats();

        setTimeout(() => {
            const totalTripsCard = document.getElementById('totalTripsCard');
            if (totalTripsCard) {
                totalTripsCard.style.cursor = 'pointer';
                totalTripsCard.addEventListener('click', () => {
                    const year = document.getElementById('yearFilter').value;
                    initAllTripsModal(year);
                });
            }

            const totalCitiesCard = document.getElementById('totalCitiesCard');
            if (totalCitiesCard) {
                totalCitiesCard.style.cursor = 'pointer';
                totalCitiesCard.addEventListener('click', () => {
                    openModal('geography-modal');
                    createGeographyLayout(); // Эта функция теперь содержит JS-логику для селекта
                    fetchAndRenderGeographyStats();
                });
            }
        }, 200);
    });

    // Обработчик изменения года (для ОБЩЕЙ статистики)
    if (statsModal) {
        statsModal.addEventListener('change', (event) => {
            if (event.target.id === 'yearFilter') {
                fetchAndRenderStats();
                // Если окно географии открыто, обновляем и его тоже
                if (geographyModal && geographyModal.classList.contains('show')) {
                    handleGeoFilterChange();
                }
            }
        });

        statsModalBody.addEventListener('click', (event) => {
            const rankItem = event.target.closest('.js-rank-item');
            if (!rankItem) return;

            const employeeId = parseInt(rankItem.dataset.employeeId, 10);
            if (!employeeId) return;

            const employee = state.employees.find(e => e.id === employeeId);
            if (employee) {
                const fullName = `${employee.lastName} ${employee.firstName}`;
                initTripHistoryModal(employeeId, fullName, state.employees);
            }
        });

        statsModal.addEventListener('click', (event) => {
            if (event.target === statsModal || event.target.closest('.close-btn')) {
                destroyCharts('all');
            }
        });
    }

    // Отдельный обработчик для модального окна ГЕОГРАФИИ
    if (geographyModal) {
        // Слушаем наше кастомное событие 'custom-change'
        geographyModal.addEventListener('custom-change', (event) => {
            if (event.target.id === 'geoEmployeeFilter') {
                handleGeoFilterChange();
            }
        });
        
        geographyModal.addEventListener('click', (event) => {
            if (event.target === geographyModal || event.target.closest('.close-btn')) {
                destroyCharts('geography');
            }
        });
    }
}
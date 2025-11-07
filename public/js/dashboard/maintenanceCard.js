// ===================================================================
// File: public/js/dashboard/maintenanceCard.js (ИСПРАВЛЕННАЯ ВЕРСИЯ)
// Версия 2.0: Удалена логика для "Ближайшего ТО".
// ===================================================================

// Импортируем только нужные функции
import { parseDate, calculateTODates } from '../utils/date-utils.js';

/**
 * Главная функция: запрашивает оборудование и рассчитывает статистику.
 */
export async function fetchMaintenanceData() {
    try {
        const response = await fetch('/api/maintenance/equipment');
        if (!response.ok) {
            throw new Error(`Ошибка сети: ${response.status}`);
        }
        const equipmentList = await response.json();
        
        const stats = calculateMaintenanceStatsFromEquipment(equipmentList);
        updateMaintenanceCardUI(stats);
        
    } catch (error) {
        console.error('Ошибка при загрузке данных для карточки ТО:', error);
        updateMaintenanceCardUI({ 
            totalUnits: 0, 
            plannedThisMonth: 0,
        });
    }
}

/**
 * Рассчитывает статистику по оборудованию.
 */
function calculateMaintenanceStatsFromEquipment(equipmentList) {
    const totalUnits = equipmentList.length;
    let plannedThisMonth = 0;

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    equipmentList.forEach(equipment => {
        if (!equipment.services || equipment.services.length === 0) return;
        
        try {
            const startDate = parseDate(equipment.startDate);
            const toDates = calculateTODates(startDate, equipment.services, 2);
            
            toDates.forEach(to => {
                const toDate = to.actualDate;
                
                // Подсчет ТО в текущем месяце
                if (toDate.getMonth() === currentMonth && toDate.getFullYear() === currentYear) {
                    plannedThisMonth++;
                }
            });
        } catch (error) {
            console.error('Ошибка расчета дат ТО для оборудования:', equipment.name, error);
        }
    });

    return {
        totalUnits,
        plannedThisMonth,
    };
}

/**
 * Обновляет всю карточку (статистику).
 */
function updateMaintenanceCardUI(data) {
    const totalUnitsEl = document.getElementById('maint-total-units');
    const plannedMonthEl = document.getElementById('maint-planned-month');
    
    if (totalUnitsEl && data.totalUnits !== undefined) {
        totalUnitsEl.textContent = data.totalUnits;
    }
    
    if (plannedMonthEl && data.plannedThisMonth !== undefined) {
        plannedMonthEl.textContent = data.plannedThisMonth;
    }
}
// ===================================================================
// Файл: public/js/utils/date-utils.js (ФИНАЛЬНАЯ ВЕРСИЯ С КОРРЕКТНЫМ ИТЕРАТИВНЫМ АЛГОРИТМОМ)
// ===================================================================

// Вспомогательные данные (производственный календарь)
function getHolidaysForYear(year) {
    const holidays = {
        2024: [
            '01.01.2024', '02.01.2024', '03.01.2024', '04.01.2024', '05.01.2024', '06.01.2024', '07.01.2024', '08.01.2024',
            '23.02.2024', '08.03.2024', '29.04.2024', '30.04.2024', '01.05.2024', '09.05.2024', '10.05.2024', '12.06.2024', 
            '04.11.2024', '30.12.2024', '31.12.2024'
        ],
        2025: [
            '01.01.2025', '02.01.2025', '03.01.2025', '04.01.2025', '05.01.2025', '06.01.2025', '07.01.2025', '08.01.2025',
            '23.02.2025', '08.03.2025', '08.05.2025', '01.05.2025', '02.05.2025', '09.05.2025', '12.06.2025', '13.06.2025', 
            '03.11.2025', '04.11.2025', '31.12.2025'
        ],
        2026: [
            '01.01.2026', '02.01.2026', '03.01.2026', '04.01.2026', '05.01.2026', '06.01.2026', '07.01.2026', '08.01.2026',
            '09.01.2026', '23.02.2026', '08.03.2026', '01.05.2026', '09.05.2026', '12.06.2026', '04.11.2026', '31.12.2026'
        ]
    };
    return holidays[year] || [];
}

export function isHoliday(date) {
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const dateStr = `${day}.${month}.${year}`;
    const yearHolidays = getHolidaysForYear(year);
    return isWeekend || yearHolidays.includes(dateStr);
}

export function getPreviousWorkDay(date) {
    let prevDate = new Date(date);
    prevDate.setDate(prevDate.getDate() - 1);
    while (isHoliday(prevDate)) {
        prevDate.setDate(prevDate.getDate() - 1);
    }
    return prevDate;
}

export function parseDate(dateStr) {
    if (!/^\d{2}\.\d{2}\.\d{4}$/.test(dateStr)) {
        throw new Error(`Invalid date format for parsing: ${dateStr}`);
    }
    const [day, month, year] = dateStr.split('.').map(Number);
    return new Date(year, month - 1, day);
}

export function formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}.${month}`;
}

export function formatFullDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
}

function getPeriodValue(frequency) {
    switch(frequency) {
        case '1 раз в месяц': return 1;
        case '1 раз в 3 месяца': return 3;
        case '1 раз в 6 месяцев': return 6;
        case '1 раз в год': return 12;
        case '1 раз в 2 года': return 24;
        default: return 12;
    }
}

function getShortestPeriod(services) {
    if (!services || services.length === 0) return '1 раз в 2 года';
    return services.reduce((shortest, service) => {
        return getPeriodValue(service.frequency) < getPeriodValue(shortest) ? service.frequency : shortest;
    }, '1 раз в 2 года');
}

function calculateBaseDates(startDate, frequency, years = 10) {
    const dates = [];
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + years);
    
    // Начинаем с даты ввода в эксплуатацию. Эта переменная будет обновляться в каждой итерации.
    let lastDate = new Date(startDate);
    const periodMonths = getPeriodValue(frequency);
    
    while (true) {
        // 1. Создаем новую дату, отталкиваясь от ПОСЛЕДНЕЙ плановой даты
        let plannedDate = new Date(lastDate);

        // 2. Прибавляем период
        plannedDate.setMonth(plannedDate.getMonth() + periodMonths);
        
        // 3. Отнимаем 1 день
        plannedDate.setDate(plannedDate.getDate() - 1);

        // 4. Если вышли за пределы диапазона, останавливаемся
        if (plannedDate > endDate) {
            break;
        }

        // 5. Запоминаем эту дату как основу для СЛЕДУЮЩЕЙ итерации
        lastDate = new Date(plannedDate);
        
        // 6. Проверяем на выходные и сохраняем
        let actualDate = new Date(plannedDate);
        let wasMoved = false;
        
        if (isHoliday(actualDate)) {
            actualDate = getPreviousWorkDay(actualDate);
            wasMoved = true;
        }
        
        dates.push({
            originalDate: plannedDate,
            actualDate: actualDate,
            wasMoved: wasMoved
        });
    }
    
    return dates;
}

export function calculateTODates(startDate, services, years = 10) {
    if (!services || services.length === 0) return [];
    
    const allDates = [];
    const shortestPeriod = getShortestPeriod(services);
    const shortestPeriodValue = getPeriodValue(shortestPeriod);
    const baseDates = calculateBaseDates(startDate, shortestPeriod, years);
    
    const sortedServices = [...services].sort((a, b) => 
        getPeriodValue(b.frequency) - getPeriodValue(a.frequency)
    );
    
    baseDates.forEach((baseDate, index) => {
        let selectedService = sortedServices.find(service => {
            const periodValue = getPeriodValue(service.frequency);
            if (shortestPeriodValue === 0) return false;
            const ratio = periodValue / shortestPeriodValue;
            return (index + 1) % ratio === 0;
        });

        if (!selectedService) {
            selectedService = services.find(s => s.frequency === shortestPeriod);
        }
        
        if (selectedService) {
            allDates.push({
                ...baseDate,
                service: selectedService
            });
        }
    });
    
    return allDates;
}
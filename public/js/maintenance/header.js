// ===================================================================
// Файл: public/js/maintenance/header.js (НОВЫЙ КОМПОНЕНТ)
// Описание: Управляет шапкой страницы, включая поиск и переключение годов.
// ===================================================================

// Диапазон лет для переключателя
const MIN_YEAR = 2021;
const MAX_YEAR = 2030;
let debounceTimer;

/**
 * Обновляет отображение года в UI.
 * @param {number} year - Текущий год.
 */
function updateYearDisplay(year) {
    const yearDisplay = document.getElementById('currentYear');
    if (yearDisplay) {
        yearDisplay.textContent = year;
    }
}

/**
 * Инициализирует все обработчики событий для шапки страницы.
 * @param {function} onYearChange - Коллбэк для вызова при смене года.
 * @param {function} onSearch - Коллбэк для вызова при поиске.
 */
export function initHeader(onYearChange, onSearch) {
    const prevYearBtn = document.getElementById('prevYear');
    const nextYearBtn = document.getElementById('nextYear');
    const searchInput = document.getElementById('maintenance-search-input');
    const clearSearchBtn = document.querySelector('.clear-search');

    // --- Переключение года ---
    if (prevYearBtn) {
        prevYearBtn.addEventListener('click', () => {
            const currentYearElement = document.getElementById('currentYear');
            if (!currentYearElement) return;
            
            const currentYear = parseInt(currentYearElement.textContent, 10);
            if (currentYear > MIN_YEAR) {
                const newYear = currentYear - 1;
                updateYearDisplay(newYear);
                onYearChange(newYear);
            }
        });
    }

    if (nextYearBtn) {
        nextYearBtn.addEventListener('click', () => {
            const currentYearElement = document.getElementById('currentYear');
            if (!currentYearElement) return;

            const currentYear = parseInt(currentYearElement.textContent, 10);
            if (currentYear < MAX_YEAR) {
                const newYear = currentYear + 1;
                updateYearDisplay(newYear);
                onYearChange(newYear);
            }
        });
    }

    // --- Поиск ---
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                onSearch(searchInput.value);
            }, 350); // Дебаунсинг для предотвращения частых перерисовок
        });
        
        // Очистка поиска по Escape
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                searchInput.value = '';
                onSearch('');
            }
        });
    }
    
    // Очистка поиска по клику на крестик
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            if (searchInput) {
                searchInput.value = '';
                onSearch('');
                searchInput.focus();
            }
        });
    }

    // Первоначальная установка текущего года
    updateYearDisplay(new Date().getFullYear());
}
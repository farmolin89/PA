// ===================================================================
// Файл: public/js/trips/modals/modalManager.js (ИТОГОВАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ)
// ===================================================================

/**
 * Открывает модальное окно по его ID и блокирует прокрутку фона.
 * @param {string} modalId - ID модального окна, которое нужно открыть.
 */
export function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.error(`Модальное окно с ID "${modalId}" не найдено.`);
        return;
    }
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    requestAnimationFrame(() => {
        modal.classList.add('show');
    });
}

/**
 * Закрывает модальное окно по его ID и восстанавливает прокрутку фона.
 * @param {string} modalId - ID модального окна, которое нужно закрыть.
 */
export function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        
        // ИСПРАВЛЕНО: Установлена корректная задержка в 300 мс
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
    
    const anyActiveModal = Array.from(document.querySelectorAll('.modal')).some(m => m.classList.contains('show'));
    if (!anyActiveModal) {
        document.body.style.overflow = '';
    }
}

/**
 * Устанавливает общие обработчики событий для всех модальных окон на странице.
 */
export function setupCommonModalHandlers() {
    document.body.addEventListener('click', (event) => {
        const closeButton = event.target.closest('.close-btn, .cancel-btn, .modal-close-btn');
        if (closeButton) {
            const modal = closeButton.closest('.modal');
            if (modal) {
                closeModal(modal.id);
            }
        }
    });

    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeModal(modal.id);
            }
        });
    });
}
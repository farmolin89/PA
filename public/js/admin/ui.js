// --- ФАЙЛ: client/admin_modules/ui.js (ПОЛНАЯ ИТОГОВАЯ ВЕРСИЯ ПОСЛЕ РЕФАКТОРИНГА) ---
// Этот модуль отвечает за UI-компоненты, специфичные для админ-панели,
// такие как всплывающие уведомления и управление UI-индикаторами.

// Хранилище для "липких" уведомлений, которые не закрываются автоматически.
let stickyToasts = [];

/**
 * Показывает всплывающее уведомление (тост) с помощью библиотеки Toastify.
 * @param {string} message - Сообщение для отображения.
 * @param {'info'|'error'|'success'} [type='info'] - Тип уведомления, влияющий на его цвет.
 * @param {number} [duration=5000] - Длительность показа в миллисекундах. Установите 0, чтобы сделать уведомление "липким".
 * @returns {object} Возвращает экземпляр Toastify для возможного программного управления (например, закрытия).
 */
export function showToast(message, type = 'info', duration = 5000) {
    const toastClass = type === 'error' ? 'toast-error' : (type === 'success' ? 'toast-success' : 'toast-info');
    
    const toastInstance = Toastify({
        text: message,
        duration: duration,
        close: true,
        gravity: "top",
        position: "right",
        className: toastClass,
        stopOnFocus: true, // Приостанавливает таймер, когда курсор находится над уведомлением
    });
    
    toastInstance.showToast();

    // Если уведомление "липкое" (duration = 0), добавляем его в массив для отслеживания.
    if (duration === 0) {
        stickyToasts.push(toastInstance);
    }
    
    return toastInstance;
}

/**
 * Принудительно закрывает все активные "липкие" уведомления (те, что были созданы с duration = 0).
 */
export function hideStickyToasts() {
    stickyToasts.forEach(toast => toast.hideToast());
    stickyToasts = []; // Очищаем массив после закрытия
}

/**
 * Убирает CSS-класс подсветки с новых строк в таблице результатов.
 */
export function removeResultHighlight() {
    const highlightedRows = document.querySelectorAll('tr.is-highlighted');
    highlightedRows.forEach(row => {
        row.classList.remove('is-highlighted');
    });
}

/**
 * Убирает CSS-класс свечения с кнопки "Обновить" в таблице результатов.
 */
export function removeButtonGlow() {
    const glowingButton = document.querySelector('#results-refresh-btn.has-update');
    if (glowingButton) {
        glowingButton.classList.remove('has-update');
    }
}
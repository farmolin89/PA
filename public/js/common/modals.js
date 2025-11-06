// ===================================================================
// Файл: public/js/common/modals.js (ИТОГОВАЯ ВЕРСИЯ С ИСПРАВЛЕНИЕМ)
// ===================================================================
// Этот модуль содержит универсальный и централизованный код для управления
// всеми модальными окнами в приложении, обеспечивая консистентное поведение и доступность (a11y).

/**
 * Показывает универсальное модальное окно для подтверждения, информирования или ввода данных.
 * @param {object} options - Опции для модального окна.
 * @param {string} options.title - Заголовок.
 * @param {string} [options.text] - Текст сообщения (игнорируется, если передан htmlContent).
 * @param {string} [options.htmlContent] - HTML-содержимое для вставки в тело модального окна.
 * @param {function} [options.onConfirm] - Функция, которая будет вызвана при подтверждении. Для инпута она получит введенный текст.
 * @param {function} [options.onCancel] - Необязательная функция, которая будет вызвана при отмене.
 * @param {string} [options.confirmText='Да, уверен'] - Текст на кнопке подтверждения.
 * @param {string} [options.cancelText='Нет, отмена'] - Текст на кнопке отмены.
 * @param {boolean} [options.isInput=false] - Указывает, нужно ли показывать стандартное поле для ввода текста.
 * @param {string} [options.inputPlaceholder=''] - Плейсхолдер для поля ввода.
 */
export function showConfirmModal({
    title,
    text,
    htmlContent,
    onConfirm,
    onCancel,
    confirmText = 'Да, уверен',
    cancelText = 'Нет, отмена',
    isInput = false,
    inputPlaceholder = ''
}) {
    const confirmModal = document.getElementById('confirmModal');
    if (!confirmModal) {
        console.error('Модальное окно #confirmModal не найдено в DOM!');
        if (confirm(`${title}\n\n${text}`)) {
            if (onConfirm) onConfirm(isInput ? prompt(text) : undefined);
        } else {
            if (onCancel) onCancel();
        }
        return;
    }

    const titleEl = document.getElementById('confirmModalTitle');
    if (titleEl) titleEl.textContent = title;

    const textEl = document.getElementById('confirmModalText');
    if (textEl) {
        if (htmlContent) {
            textEl.innerHTML = htmlContent;
        } else {
            textEl.innerHTML = '';
            textEl.textContent = text || '';
        }
    }

    const inputWrapper = document.getElementById('confirmModalInputWrapper');
    const textInput = document.getElementById('confirmModalInput');

    // +++ КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: Гарантированно скрываем поле ввода при каждом вызове +++
    if (inputWrapper) {
        inputWrapper.classList.add('hidden');
    }
    // +++ КОНЕЦ ИСПРАВЛЕНИЯ +++

    // Теперь показываем поле, только если это ЯВНО указано в опциях
    if (isInput && !htmlContent && inputWrapper && textInput) {
        inputWrapper.classList.remove('hidden');
        textInput.value = '';
        textInput.placeholder = inputPlaceholder;
        setTimeout(() => textInput.focus(), 100);
    }

    const oldOkBtn = document.getElementById('confirmModalOkBtn');
    if (!oldOkBtn) return;
    const newOkBtn = oldOkBtn.cloneNode(true);
    oldOkBtn.parentNode.replaceChild(newOkBtn, oldOkBtn);
    newOkBtn.textContent = confirmText;

    const oldCancelBtn = document.getElementById('confirmModalCancelBtn');
    if (!oldCancelBtn) return;
    const newCancelBtn = oldCancelBtn.cloneNode(true);
    oldCancelBtn.parentNode.replaceChild(newCancelBtn, oldCancelBtn);
    newCancelBtn.textContent = cancelText;

    openModal(confirmModal);

    if (onConfirm) {
        newOkBtn.classList.add('btn-danger');
        newCancelBtn.style.display = '';

        const confirmAction = () => {
            if (isInput && !htmlContent) {
                const inputValue = textInput.value.trim();
                if (!inputValue) {
                    textInput.focus();
                    return;
                }
                closeModal(confirmModal);
                onConfirm(inputValue);
            } else {
                closeModal(confirmModal);
                onConfirm();
            }
        };

        newOkBtn.onclick = confirmAction;

        if (textInput && isInput && !htmlContent) {
            textInput.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    confirmAction();
                }
            };
        }

        newCancelBtn.onclick = () => {
            closeModal(confirmModal);
            if (onCancel) onCancel();
        };

        if (isInput || htmlContent) {
            newOkBtn.classList.remove('btn-danger');
        }

    } else {
        newOkBtn.classList.remove('btn-danger');
        newOkBtn.textContent = 'OK';
        newCancelBtn.style.display = 'none';
        newOkBtn.onclick = () => closeModal(confirmModal);
    }
}


// --- Продвинутый менеджер модальных окон для доступности (A11y) ---

let previouslyFocusedElement;

/**
 * Обработчик событий клавиатуры для модальных окон (Escape и ловушка фокуса).
 * @param {KeyboardEvent} event
 */
function handleModalKeyDown(event) {
    const activeModal = document.querySelector('.modal-overlay.visible');
    if (!activeModal) return;

    if (event.key === 'Escape') {
        const closeButton = activeModal.querySelector('[data-modal-close], #questionModalCancelBtn, #confirmModalCancelBtn, #protocolModalCloseBtn, #reviewModalCloseBtn');
        if (closeButton) {
            closeButton.click();
        } else {
            closeModal(activeModal);
        }
        return;
    }

    if (event.key === 'Tab') {
        const focusableElements = Array.from(
            activeModal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
        ).filter(el => !el.disabled && el.offsetParent !== null);

        if (focusableElements.length === 0) {
            event.preventDefault();
            return;
        };

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
            if (document.activeElement === firstElement) {
                lastElement.focus();
                event.preventDefault();
            }
        } else {
            if (document.activeElement === lastElement) {
                firstElement.focus();
                event.preventDefault();
            }
        }
    }
}

/**
 * Открывает указанное модальное окно с учетом доступности.
 * @param {HTMLElement} modal Элемент модального окна для открытия.
 */
export function openModal(modal) {
    if (!modal) return;
    previouslyFocusedElement = document.activeElement;
    modal.classList.add('visible');

    const firstFocusable = modal.querySelector('input, button, [href], select, textarea, [tabindex]:not([tabindex="-1"])');
    if (firstFocusable) {
        setTimeout(() => firstFocusable.focus(), 50);
    }

    document.addEventListener('keydown', handleModalKeyDown);
}

/**
 * Закрывает указанное модальное окно с учетом доступности.
 * @param {HTMLElement} modal Элемент модального окна для закрытия.
 */
export function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('visible');

    if (previouslyFocusedElement) {
        previouslyFocusedElement.focus();
    }

    document.removeEventListener('keydown', handleModalKeyDown);
}

/**
 * Инициализирует все модальные окна на странице, управляемые через data-атрибуты.
 */
function initializeDeclarativeModals() {
    document.body.addEventListener('click', (event) => {
        const openTrigger = event.target.closest('[data-modal-open]');
        if (openTrigger) {
            const modalId = openTrigger.dataset.modalOpen;
            const modal = document.getElementById(modalId);
            if (modal) openModal(modal);
            return;
        }

        const closeTrigger = event.target.closest('[data-modal-close]');
        if (closeTrigger) {
            const modal = closeTrigger.closest('.modal-overlay');
            if (modal) {
                if (modal.id === 'questionModal') {
                    document.getElementById('questionModalCancelBtn')?.click();
                } else {
                    closeModal(modal);
                }
            }
            return;
        }

        if (event.target.matches('.modal-overlay')) {
            const modal = event.target;

            if (modal.id === 'questionModal') {
                document.getElementById('questionModalCancelBtn')?.click();
                return;
            }

            closeModal(modal);
        }
    });
}

document.addEventListener('DOMContentLoaded', initializeDeclarativeModals);
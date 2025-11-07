// ===================================================================
// Файл: public/js/common/modals.js (ПОЛНАЯ, ФИНАЛЬНАЯ, ЭТАЛОННАЯ ВЕРСИЯ)
// Описание: Этот модуль централизованно управляет всеми модальными окнами в приложении.
// Он инициализирует обработчики и предоставляет функции для открытия/закрытия окон.
// ===================================================================

// Глобальные переменные для хранения функций обратного вызова (коллбэков).
// Это позволяет назначать действия для кнопок "ОК" и "Отмена" динамически.
let confirmCallback = null;
let cancelCallback = null;

function generateDialogId() {
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/**
 * Открывает указанное модальное окно с плавной CSS-анимацией.
 * @param {HTMLElement} modalElement - DOM-элемент модального окна, которое нужно открыть.
 */
export function openModal(modalElement) {
    if (!modalElement) {
        console.error('Ошибка: Попытка открыть несуществующее модальное окно.');
        return;
    }
    // Сначала делаем элемент видимым, но прозрачным
    modalElement.classList.remove('hidden');
    // С небольшой задержкой добавляем класс 'visible', чтобы сработал CSS-переход (transition)
    setTimeout(() => modalElement.classList.add('visible'), 10);
}

/**
 * Закрывает указанное модальное окно с плавной CSS-анимацией.
 * @param {HTMLElement} modalElement - DOM-элемент модального окна, которое нужно закрыть.
 */
export function closeModal(modalElement) {
    if (!modalElement) {
        console.error('Ошибка: Попытка закрыть несуществующее модальное окно.');
        return;
    }
    // Убираем класс 'visible', чтобы запустить анимацию исчезновения
    modalElement.classList.remove('visible');
    // Ждем окончания анимации (300ms, как в CSS) перед тем, как полностью скрыть элемент
    setTimeout(() => modalElement.classList.add('hidden'), 300);
}

/**
 * Показывает и настраивает универсальное модальное окно для подтверждения действий.
 * @param {object} options - Объект с параметрами для настройки окна.
 * @param {string} options.title - Заголовок окна.
 * @param {string} [options.text] - Основной текстовый контент.
 * @param {string} [options.htmlContent] - HTML-разметка, которая будет вставлена вместо простого текста.
 * @param {string} [options.confirmText='Да'] - Текст на кнопке подтверждения.
 * @param {string} [options.cancelText='Отмена'] - Текст на кнопке отмены. Если передать пустую строку, кнопка скроется.
 * @param {function} [options.onConfirm] - Функция, которая выполнится при нажатии на кнопку подтверждения.
 * @param {function} [options.onCancel] - Функция, которая выполнится при нажатии на кнопку отмены.
 */
export function showConfirmModal(options) {
    const { 
        title, 
        text, 
        htmlContent,
        confirmText = 'Да', 
        cancelText = 'Отмена', 
        onConfirm, 
        onCancel 
    } = options;

    const modal = document.getElementById('confirmModal');
    if (!modal) {
        console.error('Критическая ошибка: Модальное окно #confirmModal не найдено в DOM.');
        return;
    }

    // Сохраняем переданные коллбэки в глобальные переменные
    confirmCallback = onConfirm;
    cancelCallback = onCancel;
    modal.dataset.dialogId = generateDialogId();

    // Настраиваем текстовое содержимое
    modal.querySelector('#confirmModalTitle').textContent = title;
    const modalTextElement = modal.querySelector('#confirmModalText');
    
    if (htmlContent) {
        // Если передан HTML, вставляем его
        modalTextElement.innerHTML = htmlContent;
    } else {
        // Иначе вставляем простой текст
        modalTextElement.textContent = text || '';
    }
    
    // Настраиваем кнопки
    const okBtn = modal.querySelector('#confirmModalOkBtn');
    const cancelBtn = modal.querySelector('#confirmModalCancelBtn');
    
    okBtn.textContent = confirmText;
    
    if (cancelText) {
        cancelBtn.textContent = cancelText;
        cancelBtn.classList.remove('hidden');
    } else {
        // Если текст для кнопки отмены не передан, скрываем ее
        cancelBtn.classList.add('hidden');
    }

    openModal(modal);
}

/**
 * Инициализирует все глобальные обработчики событий для модальных окон.
 * Эта функция должна быть вызвана один раз при загрузке главного скрипта приложения.
 */
function initializeModalHandlers() {
    // Используем делегирование событий на `document.body` для эффективности
    document.body.addEventListener('click', (e) => {
        // Логика для закрытия любого модального окна по клику на его фон (оверлей)
        // или на элемент с атрибутом [data-modal-close]
        const modalOverlay = e.target.closest('.modal-overlay.visible');
        if (modalOverlay && (e.target === modalOverlay || e.target.closest('[data-modal-close]'))) {
            closeModal(modalOverlay);
        }
    });

    // Навешиваем обработчики на кнопки универсального окна подтверждения
    const confirmModal = document.getElementById('confirmModal');
    if (confirmModal) {
        const okBtn = confirmModal.querySelector('#confirmModalOkBtn');
        const cancelBtn = confirmModal.querySelector('#confirmModalCancelBtn');

        if (okBtn) {
            okBtn.addEventListener('click', () => {
                const currentDialogId = confirmModal.dataset.dialogId;
                const callback = confirmCallback;
                confirmCallback = null;
                cancelCallback = null;
                if (typeof callback === 'function') {
                    callback();
                }
                if (confirmModal.dataset.dialogId === currentDialogId) {
                    closeModal(confirmModal);
                }
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                const currentDialogId = confirmModal.dataset.dialogId;
                const callback = cancelCallback;
                confirmCallback = null;
                cancelCallback = null;
                if (typeof callback === 'function') {
                    callback();
                }
                if (confirmModal.dataset.dialogId === currentDialogId) {
                    closeModal(confirmModal);
                }
            });
        }
    }
}

// Запускаем инициализацию обработчиков сразу при загрузке этого модуля
initializeModalHandlers();

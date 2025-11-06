// File: public/js/trips/modals/confirmationModal.js (ПОЛНАЯ ИТОГОВАЯ ВЕРСИЯ)

// Этот модуль управляет модальным окном подтверждения действия (например, удаления).
// Он предоставляет одну основную функцию `showConfirmationModal` для вызова окна
// и одну функцию `setupConfirmationModal` для его первоначальной настройки.

import { openModal, closeModal } from './modalManager.js';

// Переменная в области видимости модуля для хранения колбэка,
// который нужно выполнить при подтверждении.
let onConfirmCallback = null;

/**
 * Показывает модальное окно подтверждения с заданным сообщением и функцией обратного вызова.
 * @param {string} message - HTML-сообщение для отображения в теле модального окна.
 * @param {function} callback - Функция, которая будет вызвана при нажатии на кнопку подтверждения.
 */
export function showConfirmationModal(message, callback) {
    const modal = document.getElementById('confirmation-modal');
    const textElement = document.getElementById('confirmation-text');
    
    // Проверяем, что необходимые элементы существуют в DOM
    if (!modal || !textElement) {
        console.error('Элементы модального окна подтверждения не найдены.');
        return;
    }

    // Заполняем окно контентом и сохраняем колбэк
    textElement.innerHTML = message;
    onConfirmCallback = callback;
    
    // Открываем окно
    openModal(modal.id);
}

/**
 * Устанавливает обработчики событий для кнопок "Подтвердить" и "Отмена"
 * в модальном окне подтверждения. Эту функцию достаточно вызвать один раз при
 * инициализации приложения.
 */
export function setupConfirmationModal() {
    const confirmBtn = document.getElementById('confirm-btn');
    const cancelBtn = document.getElementById('cancel-btn'); // ДОБАВЛЕНО
    const modalId = 'confirmation-modal';

    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            // Если колбэк был передан, вызываем его
            if (typeof onConfirmCallback === 'function') {
                onConfirmCallback();
            }
            // Сбрасываем колбэк, чтобы избежать случайного повторного вызова
            onConfirmCallback = null;
            // Закрываем модальное окно
            closeModal(modalId);
        });
    } else {
        console.error('Кнопка подтверждения #confirm-btn не найдена.');
    }

    // Добавляем обработчик для кнопки "Отмена"
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            // Просто закрываем модальное окно без выполнения колбэка
            onConfirmCallback = null; // На всякий случай сбрасываем колбэк
            closeModal(modalId);
        });
    } else {
        console.error('Кнопка отмены #cancel-btn не найдена.');
    }
}

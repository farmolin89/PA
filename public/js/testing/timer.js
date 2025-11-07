// ===================================================================
// Файл: public/js/testing/timer.js (ПОЛНАЯ ИТОГОВАЯ ВЕРСИЯ)
// Описание: Содержит всю логику для управления таймером обратного 
// отсчета во время прохождения теста.
// ===================================================================

import { testState } from './test-state.js';
import { showConfirmModal } from '../common/modals.js';

/**
 * Обновляет текстовое и визуальное отображение таймера.
 * @param {number} timeLeft - Оставшееся время в секундах.
 */
function updateTimerDisplay(timeLeft) {
    const timerTextEl = document.getElementById('timerText');
    const timerContainerEl = document.getElementById('timer');
    
    // Если элементы не найдены на странице, ничего не делаем
    if (!timerTextEl || !timerContainerEl) return;

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    
    // Форматируем время в формат ММ:СС
    timerTextEl.textContent = `Осталось времени: ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    // Сбрасываем классы предупреждения и опасности
    timerContainerEl.classList.remove('warning', 'danger');

    // Применяем классы в зависимости от оставшегося времени для визуального эффекта
    if (timeLeft <= 30 && timeLeft > 0) {
        timerContainerEl.classList.add('danger');
    } else if (timeLeft <= 60 && timeLeft > 0) {
        timerContainerEl.classList.add('warning');
    }
}

/**
 * Запускает таймер обратного отсчета и обновляет его отображение каждую секунду.
 * @param {function} onTimeUpCallback - Функция, которая будет вызвана, когда время выйдет.
 */
export function startTimer(onTimeUpCallback) {
    const currentState = testState.getState();
    
    // Гарантированно очищаем любой предыдущий интервал, чтобы избежать "утечек"
    if (currentState.testTimerInterval) {
        clearInterval(currentState.testTimerInterval);
    }

    const timerInterval = setInterval(async () => {
        // Получаем актуальные данные из состояния на каждой итерации
        const { testEndTime, attempted } = testState.getState();
        
        // Вычисляем оставшееся время и гарантируем, что оно не будет отрицательным
        const timeLeft = Math.max(0, Math.round((testEndTime - Date.now()) / 1000));

        updateTimerDisplay(timeLeft);

        // Если время вышло
        if (timeLeft <= 0) {
            clearInterval(timerInterval); // Останавливаем таймер

            // Проверяем, не была ли уже совершена попытка отправки, 
            // чтобы не показывать модальное окно и не отправлять результаты дважды
            if (!attempted) {
                // Показываем пользователю уведомление, что время вышло
                showConfirmModal({
                    title: 'Время вышло!',
                    text: 'Отведенное на тест время истекло. Ваши ответы будут отправлены на проверку.',
                    onConfirm: onTimeUpCallback, // При нажатии на ОК вызываем коллбэк
                    confirmText: 'Завершить тест',
                    cancelText: '' // Убираем кнопку отмены
                });
                // Немедленно вызываем коллбэк для отправки результатов, не дожидаясь нажатия ОК
                await onTimeUpCallback();
            }
        }
    }, 1000);

    // Сохраняем ID интервала в состояние, чтобы его можно было очистить при необходимости
    testState.setState({ testTimerInterval: timerInterval });
    
    // Немедленно обновляем таймер при запуске, чтобы не ждать первую секунду
    const initialTimeLeft = Math.max(0, Math.round((currentState.testEndTime - Date.now()) / 1000));
    updateTimerDisplay(initialTimeLeft);
}
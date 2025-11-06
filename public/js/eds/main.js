// ===================================================================
// File: public/js/eds/main.js (НОВАЯ КОМПОНЕНТНАЯ ВЕРСИЯ)
// ===================================================================

import { fetchUserData } from '../dashboard/userData.js';
import { initSignatureList, reloadAndRenderList } from './signatureList.js';
import { initSignatureModal } from './signatureModal.js';
import { registerAdminErrorCallback } from '../common/api-client.js';

/**
 * Главная функция инициализации страницы "Менеджер ЭЦП".
 */
function initializeEdsPage() {
    // 1. Регистрируем обработчик ошибок API для этого модуля
    registerAdminErrorCallback((message) => {
        window.toast.error(message);
    });
    
    // 2. Загружаем данные пользователя для шапки
    fetchUserData();

    // 3. Инициализируем основные компоненты страницы
    initSignatureList();
    initSignatureModal();

    // 4. Запускаем первоначальную загрузку и отрисовку списка
    reloadAndRenderList();
}

// Запускаем всю логику после полной загрузки DOM
document.addEventListener('DOMContentLoaded', initializeEdsPage);
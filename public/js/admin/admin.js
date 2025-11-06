// ===================================================================
// Файл: public/js/admin/admin.js (ФИНАЛЬНАЯ ВЕРСИЯ ДЛЯ РАБОЧЕЙ СТРАНИЦЫ)
// ===================================================================

// Импорты необходимых модулей с правильными путями
import { showPage } from './main-content.js'; 
import { showToast } from './ui.js'; 
import { registerAdminErrorCallback, fetchInviteLink } from '../common/api-client.js'; 
import { fetchUserData } from '../dashboard/userData.js';
import { showConfirmModal } from '../common/modals.js';

/**
 * Управляет навигацией: делает нужную ссылку в сайдбаре активной и отображает соответствующую страницу.
 * @param {string} pageId - ID страницы ('welcome', 'tests', 'create-test', 'analytics').
 */
function handleNavigation(pageId) {
    // Убираем 'active' класс у всех ссылок в навигации
    document.querySelectorAll('.nav-link').forEach(item => item.classList.remove('active'));
    
    // Добавляем 'active' класс к нужной ссылке
    const activeLink = document.querySelector(`.nav-link[data-page="${pageId}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }

    // Показываем запрошенную страницу, вызывая функцию из main-content.js
    showPage(pageId);
}

/**
 * Обрабатывает клик по кнопке "Сформировать ссылку", запрашивая URL у сервера.
 */
async function handleGenerateLink() {
    let link = `${window.location.origin}/test?welcome=1`; 
    try {
        const data = await fetchInviteLink();
        if (data?.link) {
            link = data.link;
        }
    } catch (error) {
        console.error('Не удалось получить ссылку-приглашение с сервера, используется локальная:', error);
    }

    const modalContentHTML = `
        <div class="form-group" style="margin-top: 1rem;">
            <label class="form-label">Ссылка для сотрудников:</label>
            <input type="text" id="generatedLinkInput" class="form-control" value="${link}" readonly style="text-align: center; cursor: pointer;">
        </div>
    `;
    
    showConfirmModal({
        title: 'Ссылка-приглашение',
        htmlContent: modalContentHTML,
        confirmText: 'Копировать',
        cancelText: 'Закрыть',
        onConfirm: () => {
            const linkInput = document.getElementById('generatedLinkInput');
            if (!linkInput) return;
            // Используем современный Clipboard API для копирования
            navigator.clipboard.writeText(linkInput.value)
                .then(() => showToast('Ссылка скопирована в буфер обмена!', 'success'))
                .catch(() => showToast('Ошибка при копировании ссылки.', 'error'));
        }
    });
}


/**
 * Инициализирует все глобальные обработчики событий.
 */
function initializeEventListeners() {
    // ИСПРАВЛЕНИЕ: Используем делегирование событий, но слушаем клики ТОЛЬКО на элементах с классом .nav-link ИЛИ кнопках в футере сайдбара
    document.body.addEventListener('click', (e) => {
        // Проверяем, был ли клик на элементе навигации или на кнопке, которая должна менять страницу
        const navElement = e.target.closest('.nav-link[data-page], .sidebar-footer .btn[data-page], #main-content-area .btn[data-page]');
        if (navElement) {
            e.preventDefault();
            const pageId = navElement.dataset.page;
            // Обрабатываем навигацию, только если это действительно элемент навигации
            if (pageId) {
                handleNavigation(pageId);
            }
        }
    });

    // Обработчик для кнопки "Сформировать ссылку"
    const generateLinkBtn = document.getElementById('generateLinkBtn');
    if(generateLinkBtn) {
        generateLinkBtn.addEventListener('click', handleGenerateLink);
    }
}

/**
 * Настраивает и запускает клиент для Server-Sent Events (SSE).
 */
function initializeEventSource() {
    if (typeof(EventSource) === "undefined") {
        console.warn("Server-Sent Events не поддерживаются этим браузером.");
        return;
    }

    const eventSource = new EventSource('/api/events');
    eventSource.onopen = () => console.log('SSE соединение установлено.');

    eventSource.addEventListener('new-result', (e) => {
        const newResult = JSON.parse(e.data);
        showToast(`Новый результат: "${newResult.fio}" прошел тест "${newResult.testName}"`, 'info');
    });

    eventSource.onerror = (err) => {
        console.error('Ошибка EventSource. Соединение будет закрыто.', err);
        eventSource.close();
    };
}

/**
 * Главная функция инициализации панели администратора.
 */
async function initializeAdminPanel() {
    // Показываем приветственную страницу по умолчанию
    handleNavigation('welcome');
    
    // Настраиваем все обработчики кликов для навигации и других кнопок
    initializeEventListeners();

    // Запускаем SSE для получения обновлений в реальном времени
    initializeEventSource();

    // Загружаем данные пользователя для отображения в сайдбаре
    try {
        const user = await fetchUserData();
        if (user) {
           const userNameEl = document.querySelector('.user-name');
           const userRoleEl = document.querySelector('.user-role');
           if(userNameEl) userNameEl.textContent = user.name || 'Администратор';
           if(userRoleEl) userRoleEl.textContent = user.position || 'Системный администратор';
        }
    } catch (error) {
        console.warn('Не удалось загрузить данные пользователя для сайдбара.');
        // В случае ошибки, устанавливаем значения по умолчанию
        const userNameEl = document.querySelector('.user-name');
        const userRoleEl = document.querySelector('.user-role');
        if(userNameEl) userNameEl.textContent = 'Администратор';
        if(userRoleEl) userRoleEl.textContent = 'Системный администратор';
    }
}

/**
 * Точка входа в приложение.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Регистрируем коллбэк для отображения ошибок API через тосты
    registerAdminErrorCallback((message) => {
        showToast(message, 'error');
    });

    // Запускаем инициализацию всей панели
    initializeAdminPanel();
});
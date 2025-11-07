// ===================================================================
// File: public/js/dashboard/dashboard.js (ФИНАЛЬНАЯ ОБНОВЛЕННАЯ ВЕРСИЯ)
// ===================================================================

// Импортируем все необходимые модули для каждой карточки
import { fetchUserData } from './userData.js';
import { fetchTripData } from './tripCard.js';
import { fetchTestingData } from './testingCard.js';
import { fetchMaintenanceData } from './maintenanceCard.js';
import { fetchEdsData } from './edsCard.js';
// +++ ДОБАВЛЕН ИМПОРТ ДЛЯ НАШЕЙ НОВОЙ КАРТОЧКИ ПОВЕРКИ +++
import { initializeVerificationCard } from './verificationCard.js'; 

/**
 * Инициализирует дашборд: загружает все необходимые данные параллельно
 * и настраивает интерактивные элементы.
 */
async function initializeDashboard() {
    try {
        // Сначала загружаем данные пользователя, так как они могут быть нужны для других запросов
        await fetchUserData();
        
        // Запускаем все остальные запросы для карточек параллельно, чтобы ускорить загрузку.
        // Promise.all дождется, пока ВСЕ запросы завершатся.
        await Promise.all([
            fetchTripData(),
            fetchTestingData(),
            fetchMaintenanceData(),
            fetchEdsData(),
            initializeVerificationCard() // +++ ДОБАВЛЕН ВЫЗОВ ФУНКЦИИ ДЛЯ КАРТОЧКИ ПОВЕРКИ +++
        ]);

        // После загрузки всех данных настраиваем обработчики кликов
        setupCardInteractions();
        
        console.log('Dashboard initialized successfully.');

    } catch (error) {
        console.error('Error initializing dashboard:', error);
        // Можно добавить уведомление для пользователя, если что-то пошло не так
        if (window.toast) {
            window.toast.error('Не удалось загрузить данные для дашборда.');
        }
    }
}

/**
 * Настраивает обработчики событий для интерактивных элементов на странице,
 * которые не являются простыми ссылками.
 */
function setupCardInteractions() {
    // Карточки, ведущие на /admin, /trips, /maintenance, являются обычными <a> ссылками
    // и не требуют дополнительной логики на JavaScript.
    
    // +++ УДАЛЕНА ЛОГИКА ДЛЯ metrology-card +++
    // Так как карточка "График поверки" теперь функциональна и является ссылкой на /verification,
    // старый обработчик, который показывал уведомление "в разработке", больше не нужен.
    
    // Оставляем обработчик для карточки ГСО, так как она все еще в разработке.
    const gsoCard = document.getElementById('gso-card');
    if (gsoCard) {
        gsoCard.addEventListener('click', (event) => {
            event.preventDefault();
            if (window.toast && typeof window.toast.info === 'function') {
                window.toast.info('Раздел "Ведомость ГСО" находится в разработке');
            } else {
                alert('Раздел "Ведомость ГСО" находится в разработке');
            }
        });
    }
}

// Запускаем всю логику после того, как HTML-структура страницы будет готова
document.addEventListener('DOMContentLoaded', initializeDashboard);
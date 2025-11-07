// ===================================================================
// Файл: public/js/admin/main-content.js (ПОЛНАЯ ИТОГОВАЯ ВЕРСИЯ)
// Описание: Этот модуль отвечает за рендеринг "страниц" в основной
// области контента админ-панели и управляет навигацией между ними.
// ===================================================================

// Импорты модулей для каждой отдельной страницы
import { initTestsPage } from './page-tests.js';
import { initCreateTestPage } from './page-create-test.js';
import { initAnalyticsPage } from './page-analytics.js';

// Импорты для вкладок детального дашборда конкретного теста
import { initSettingsModule } from './settings.js';
import { initResultsModule, loadResults } from './results.js';
import { initQuestionsModule } from './questions.js';
import { initSummaryModule } from './summary.js';

// Главный DOM-элемент, куда будет рендериться контент
const mainContentArea = document.getElementById('main-content-area');

/**
 * Отображает нужную "страницу" в основной области контента с плавной анимацией.
 * @param {string} pageId - ID страницы для отображения ('welcome', 'tests', 'create-test', 'analytics').
 */
export function showPage(pageId) {
    // Добавляем класс для анимации исчезновения
    mainContentArea.classList.add('is-changing');
    
    // Ждем завершения анимации (200ms), чтобы сменить контент
    setTimeout(() => {
        // Очищаем контент перед рендерингом новой страницы
        mainContentArea.innerHTML = ''; 

        switch (pageId) {
            case 'tests':
                initTestsPage(mainContentArea); 
                break;
            case 'create-test':
                initCreateTestPage(mainContentArea);
                break;
            case 'analytics':
                initAnalyticsPage(mainContentArea);
                break;
            case 'welcome':
            default:
                renderWelcomePage();
                break;
        }
        // Убираем класс, чтобы контент плавно появился
        mainContentArea.classList.remove('is-changing');
    }, 200);
}

/**
 * Рендерит приветственную страницу (Главная).
 */
function renderWelcomePage() {
    mainContentArea.innerHTML = `
        <div class="welcome-container">
            <h1 class="welcome-title">Добро пожаловать в систему тестирования</h1>
            <p class="welcome-subtitle">Управляйте учебными тестами, создавайте новые задания, отслеживайте результаты и анализируйте успеваемость.</p>
            
            <div class="feature-cards">
                <div class="feature-card">
                    <div class="feature-icon"><i class="fas fa-plus"></i></div>
                    <h3 class="feature-title">Создание тестов</h3>
                    <p class="feature-description">Создавайте тесты с различными типами вопросов и настраиваемыми параметрами.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon"><i class="fas fa-chart-line"></i></div>
                    <h3 class="feature-title">Аналитика</h3>
                    <p class="feature-description">Получайте детальную статистику по результатам тестирования и успеваемости.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon"><i class="fas fa-tasks"></i></div>
                    <h3 class="feature-title">Управление тестами</h3>
                    <p class="feature-description">Организуйте тесты по категориям, настраивайте параметры и отслеживайте прогресс.</p>
                </div>
            </div>
            
            <!-- Блок с дублирующими кнопками "Мои тесты" и "Создать новый тест" был удален. -->

        </div>
    `;
}

/**
 * Генерирует и отображает детальный дашборд для КОНКРЕТНОГО теста.
 * Эта функция вызывается из page-tests.js при клике на карточку теста.
 * @param {object} testContext - Объект с { id, name } выбранного теста.
 */
export function showTestDashboard(testContext) {
    mainContentArea.innerHTML = `
        <div class="action-bar">
             <h2 class="section-title">${testContext.name} - Управление</h2>
             <button class="btn btn-outline" data-page="tests">
                <i class="fas fa-arrow-left"></i> Назад к списку тестов
             </button>
        </div>
        <div class="test-dashboard">
            <div class="tabs">
                <button class="tab-button active" data-tab="summary" type="button">Сводка</button>
                <button class="tab-button" data-tab="results" type="button">Результаты</button>
                <button class="tab-button" data-tab="questions" type="button">Банк вопросов</button>
                <button class="tab-button" data-tab="settings" type="button">Настройки</button>
            </div>
            
            <div class="tab-content-wrapper">
                <div id="tab-summary" class="tab-content active"></div>
                <div id="tab-results" class="tab-content"></div>
                <div id="tab-questions" class="tab-content"></div>
                <div id="tab-settings" class="tab-content"></div>
            </div>
        </div>
    `;

    // Инициализируем модули для каждой вкладки
    initSummaryModule(testContext.id);
    initSettingsModule(testContext.id, () => {});
    initResultsModule(testContext.id);
    initQuestionsModule(testContext.id);

    // Логика переключения вкладок
    const tabsContainer = document.querySelector('.tabs');
    if (tabsContainer) {
        tabsContainer.addEventListener('click', (e) => {
            const clickedButton = e.target.closest('.tab-button');
            if (!clickedButton || clickedButton.classList.contains('active')) return;

            document.querySelector('.tab-button.active')?.classList.remove('active');
            document.querySelector('.tab-content.active')?.classList.remove('active');
            
            clickedButton.classList.add('active');
            const contentTab = document.getElementById(`tab-${clickedButton.dataset.tab}`);
            if(contentTab) contentTab.classList.add('active');
            
            if (clickedButton.dataset.tab === 'results' && clickedButton.classList.contains('has-update')) {
                loadResults(); // Функция из results.js
                clickedButton.classList.remove('has-update');
            }
        });
    }
}
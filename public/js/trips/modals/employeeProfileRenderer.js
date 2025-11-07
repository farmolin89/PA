// ===================================================================
// File: public/js/trips/modals/employeeProfileRenderer.js (ФИНАЛЬНАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ)
// ===================================================================

import { state } from '../state.js';
import { utils } from '../trip-helpers.js';

/**
 * Устанавливает состояние загрузки для модального окна профиля.
 */
export function renderLoadingState(employeeId, mainContent, sidebar) {
    const employeeFromState = state.employees.find(e => e.id === employeeId);
    if (employeeFromState) {
        const fullName = `${employeeFromState.lastName} ${employeeFromState.firstName} ${employeeFromState.patronymic || ''}`.trim();
        document.getElementById('profile-avatar-new').textContent = `${employeeFromState.lastName[0]}${employeeFromState.firstName[0]}`.toUpperCase();
        document.getElementById('profile-name-new').textContent = fullName;
        document.getElementById('profile-position-new').textContent = employeeFromState.position;
        document.getElementById('profile-phone-new').textContent = employeeFromState.phone || 'Не указан';
        document.getElementById('profile-email-new').textContent = employeeFromState.email || 'Не указан';
    }
    
    mainContent.style.opacity = '0.5';
    sidebar.querySelector('.stats-sidebar').style.opacity = '0.5';
    document.getElementById('stats-total-trips-new').textContent = '...';
    document.getElementById('stats-total-days-new').textContent = '...';
    document.getElementById('level-progress-fill-new').style.width = `0%`;
    document.getElementById('level-card-number').textContent = '...';
    document.getElementById('level-card-name').textContent = '...';
    document.getElementById('level-progress-text-new').innerHTML = `<i class="fas fa-calendar-day"></i> ...`;
    document.getElementById('achievements-container-new').innerHTML = '<div style="padding: 20px; text-align: center;">Загрузка достижений...</div>';
}

/**
 * Заполняет сайдбар (левую панель) карточки данными сотрудника.
 */
export function renderEmployeeSidebar(profile) {
    const fullName = `${profile.lastName} ${profile.firstName} ${profile.patronymic || ''}`.trim();
    document.getElementById('profile-avatar-new').textContent = `${profile.lastName[0]}${profile.firstName[0]}`.toUpperCase();
    document.getElementById('profile-name-new').textContent = fullName;
    document.getElementById('profile-position-new').textContent = profile.position;
    document.getElementById('profile-phone-new').textContent = profile.phone || 'Не указан';
    document.getElementById('profile-email-new').textContent = profile.email || 'Не указан';
    document.getElementById('profile-level-badge').textContent = profile.levelInfo.level;
    document.getElementById('profile-tenure-value').textContent = profile.tenure.value;
    document.getElementById('profile-tenure-unit').textContent = profile.tenure.unit;

    const topRatingBlock = document.querySelector('.top-rating');
    if (profile.rank && profile.rank <= 3) {
        topRatingBlock.style.display = 'flex';
        topRatingBlock.querySelector('.value-number').textContent = profile.rank;

        // --- ИСПРАВЛЕНИЕ: Логика смены цвета рейтинга ---
        // 1. Сбрасываем классы до состояния по умолчанию (золотой)
        topRatingBlock.classList.remove('top-2', 'top-3');

        // 2. Применяем специфичный класс для 2-го или 3-го места
        if (profile.rank === 2) {
            topRatingBlock.classList.add('top-2');
        } else if (profile.rank === 3) {
            topRatingBlock.classList.add('top-3');
        }
        // Для 1-го места дополнительный класс не нужен.
        // --- КОНЕЦ ИСПРАВЛЕНИЯ ---

    } else {
        topRatingBlock.style.display = 'none';
    }
}

function generateDaysCounter(days, type) {
    if (days === null || days < 0) return '';
    const getDaysText = d => (d % 100 >= 11 && d % 100 <= 19) ? 'дней' : (d % 10 === 1) ? 'день' : (d % 10 >= 2 && d % 10 <= 4) ? 'дня' : 'дней';
    const text = type === 'end' ? `До конца: ${days} ${getDaysText(days)}` : `До начала: ${days} ${getDaysText(days)}`;
    const className = type === 'end' ? 'current' : 'upcoming';
    return `<div class="days-counter ${className}"><i class="fas fa-clock"></i> ${text}</div>`;
}

/**
 * Заполняет карточки "Текущий статус" и "Ближайший выезд".
 */
export function renderStatusCards(currentActivity, upcomingEvent, employeeId) {
    const currentStatusCard = document.getElementById('current-status-card');
    const upcomingTripCard = document.getElementById('upcoming-trip-card');

    // --- Логика карточки "Текущий статус" ---
    if (currentActivity.type === 'trip') {
        const trip = currentActivity.data;
        const organization = state.organizations.find(o => o.id === trip.organizationId);
        const daysUntilEnd = utils.getDaysUntilEnd(trip.endDate);
        const partners = trip.participants.filter(id => id !== employeeId).map(id => state.employees.find(e => e.id === id)).filter(Boolean);
        currentStatusCard.innerHTML = `<div class="status-header"><div class="status-icon"><i class="fas fa-map-marker-alt"></i></div><div class="status-title">Текущий статус</div></div><div class="status-content"><div class="status-dates current"><i class="fas fa-circle" style="font-size:9px"></i> В командировке до ${new Date(trip.endDate).toLocaleDateString('ru-RU')}</div><div class="status-details"><div><strong>Организация:</strong> ${organization ? organization.name : 'Не указана'}</div><div><strong>Город:</strong> ${trip.destination}</div><div><strong>Напарник(и):</strong> ${partners.length > 0 ? partners.map(p => `${p.lastName} ${p.firstName[0]}.`).join(', ') : 'Нет'}</div></div>${generateDaysCounter(daysUntilEnd, 'end')}</div>`;
    } else if (currentActivity.type === 'vacation') {
        const vacation = currentActivity.data;
        const daysUntilEnd = utils.getDaysUntilEnd(vacation.endDate);
        currentStatusCard.innerHTML = `<div class="status-header"><div class="status-icon"><i class="fas fa-umbrella-beach"></i></div><div class="status-title">Текущий статус</div></div><div class="status-content"><div class="status-dates current" style="color: #0d9488;"><i class="fas fa-circle" style="font-size:9px"></i> В отпуске до ${new Date(vacation.endDate).toLocaleDateString('ru-RU')}</div><div class="status-details">Сотрудник находится в плановом отпуске.</div>${generateDaysCounter(daysUntilEnd, 'end')}</div>`;
    } else { // 'free'
        currentStatusCard.innerHTML = `<div class="status-header"><div class="status-icon"><i class="fas fa-briefcase"></i></div><div class="status-title">Текущий статус</div></div><div class="status-content"><div class="status-dates" style="color: #334155;"><i class="fas fa-circle" style="font-size:9px"></i> Свободен</div><div class="status-details">Сотрудник находится в офисе и доступен для новых задач.</div></div>`;
    }

    // --- Логика карточки "Ближайший выезд" ---
    if (upcomingEvent) {
        if (upcomingEvent.type === 'trip') {
            const nextTrip = upcomingEvent.data;
            const daysUntilStart = utils.getDaysUntilStart(nextTrip.startDate);
            const organization = state.organizations.find(o => o.id === nextTrip.organizationId);
            const partners = nextTrip.participants.filter(id => id !== employeeId).map(id => state.employees.find(e => e.id === id)).filter(Boolean);
            upcomingTripCard.innerHTML = `<div class="status-header"><div class="status-icon"><i class="fas fa-calendar-alt"></i></div><div class="status-title">Ближайший выезд</div></div><div class="status-content"><div class="status-dates upcoming"><i class="fas fa-circle" style="font-size:9px"></i> ${new Date(nextTrip.startDate).toLocaleDateString('ru-RU')} - ${new Date(nextTrip.endDate).toLocaleDateString('ru-RU')}</div><div class="status-details"><div><strong>Организация:</strong> ${organization ? organization.name : 'Не указана'}</div><div><strong>Город:</strong> ${nextTrip.destination}</div><div><strong>Напарник(и):</strong> ${partners.length > 0 ? partners.map(p => `${p.lastName} ${p.firstName[0]}.`).join(', ') : 'Нет'}</div></div>${generateDaysCounter(daysUntilStart, 'start')}</div>`;
        } else { // 'vacation'
            const nextVacation = upcomingEvent.data;
            const daysUntilStart = utils.getDaysUntilStart(nextVacation.startDate);
            upcomingTripCard.innerHTML = `<div class="status-header"><div class="status-icon"><i class="fas fa-calendar-alt"></i></div><div class="status-title">Ближайший выезд</div></div><div class="status-content"><div class="status-dates upcoming"><i class="fas fa-circle" style="font-size:9px"></i> Отпуск: ${new Date(nextVacation.startDate).toLocaleDateString('ru-RU')} - ${new Date(nextVacation.endDate).toLocaleDateString('ru-RU')}</div><div class="status-details">Запланирован ежегодный отпуск.</div>${generateDaysCounter(daysUntilStart, 'start')}</div>`;
        }
    } else {
        upcomingTripCard.innerHTML = `<div class="status-header"><div class="status-icon"><i class="fas fa-calendar-check"></i></div><div class="status-title">Ближайший выезд</div></div><div class="status-content"><div class="status-dates" style="color: #334155;"><i class="fas fa-circle" style="font-size:9px"></i> Нет запланированных выездов</div><div class="status-details">В графике сотрудника нет будущих выездов.</div></div>`;
    }
}


/**
 * Заполняет блок статистики и прогресс-бар системы уровней.
 */
export function renderStatsAndProgress(stats, levelInfo) {
    document.getElementById('stats-total-trips-new').textContent = stats.totalTrips;
    document.getElementById('stats-total-days-new').textContent = stats.totalDays;

    document.getElementById('level-card-number').textContent = levelInfo.level;
    document.getElementById('level-card-name').textContent = levelInfo.name;

    const progressPercent = (levelInfo.max > 0) ? Math.min(100, (levelInfo.progress / levelInfo.max) * 100) : 0;
    
    document.getElementById('level-progress-text-new').innerHTML = `<i class="fas fa-calendar-day"></i> ${levelInfo.progress} из ${levelInfo.max} дней`;
    document.getElementById('level-progress-fill-new').style.width = `${progressPercent}%`;
}


/**
 * Отрисовывает сетку достижений с категориями и прогрессом.
 */
export function renderAchievementsGrid(badges) {
    const container = document.getElementById('achievements-container-new');
    if (!container) return;

    const totalBadges = badges.length;
    const totalEarned = badges.filter(b => b.isEarned).length;
    const totalCounterHtml = `
        <div class="total-achievements-counter">
            <span class="achievement-badge">${totalEarned}/${totalBadges}</span>
        </div>
    `;

    const categories = {
        'Основные': { icon: 'fas fa-star', ids: ['firstTrip', 'veteran10', 'samurai20', 'chief30', 'padawan30', 'centurion100', 'twocentury200', 'threehundred300'] },
        'Профессиональные': { icon: 'fas fa-briefcase', ids: ['weekTrip', 'longHaul', 'monthTrip', 'noWeekends', 'monthlyHatTrick', 'stability'] },
        'Географические': { icon: 'fas fa-globe-asia', ids: ['explorer5', 'geography15', 'tourist25', 'northKing', 'centralBoss', 'transUral', 'southman'] },
        'Командные': { icon: 'fas fa-users', ids: ['keyCustomer', 'object10', 'monthlyRecord', 'yearMarathon'] }
    };
    
    let html = '';
    Object.entries(categories).forEach(([categoryName, data], index) => {
        const categoryBadges = badges.filter(b => data.ids.includes(b.id));
        const earnedCount = categoryBadges.filter(b => b.isEarned).length;

        const badgesHtml = categoryBadges.map(badge => {
            const progressPercent = (badge.goal > 0) ? Math.min(100, (badge.progress / badge.goal) * 100) : 0;
            let progressClass = 'zero';
            if (badge.isEarned) {
                progressClass = 'success';
            } else if (progressPercent > 0) {
                progressClass = 'partial';
            }
            const progressStyle = `width: ${badge.isEarned ? 100 : progressPercent}%`;
            const progressHtml = `<div class="achievement-progress"><div class="achievement-progress-fill ${progressClass}" style="${progressStyle}"></div></div>`;

            return `
                <div class="achievement-item ${badge.isEarned ? 'earned' : 'not-earned'}">
                    <div class="achievement-icon"><i class="${badge.icon}"></i></div>
                    <div class="achievement-name">${badge.name}</div>
                    <div class="achievement-description">${badge.description}</div>
                    ${progressHtml}
                </div>
            `;
        }).join('');

        html += `
            <div class="achievement-category ${index === 0 ? 'active' : ''}">
                <div class="achievement-category-header">
                    <div class="achievement-category-title"><i class="${data.icon}"></i> ${categoryName}</div>
                    <div class="achievement-count">
                        <span class="achievement-badge">${earnedCount}/${categoryBadges.length}</span>
                        <i class="fas fa-chevron-down achievement-toggle"></i>
                    </div>
                </div>
                <div class="achievement-category-content">
                    <div class="achievements-grid">${badgesHtml}</div>
                </div>
            </div>
        `;
    });

    container.innerHTML = totalCounterHtml + html;
}

/**
 * Устанавливает обработчики для раскрытия категорий достижений.
 */
export function setupAchievementToggle() {
    const headers = document.querySelectorAll('.achievement-category-header');
    headers.forEach(header => {
        header.addEventListener('click', () => {
            header.parentElement.classList.toggle('active');
        });
    });
}

/**
 * Подсвечивает текущий уровень сотрудника в модальном окне системы уровней.
 */
export function highlightCurrentLevel(currentLevel) {
    const levelsModal = document.getElementById('levels-modal');
    if (!levelsModal) return;

    levelsModal.querySelectorAll('.level').forEach(levelEl => {
        levelEl.classList.remove('current');
    });

    const currentLevelElement = levelsModal.querySelector(`.level-${currentLevel}`);
    if (currentLevelElement) {
        currentLevelElement.classList.add('current');
    }
}
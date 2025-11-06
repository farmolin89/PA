// ===================================================================
// File: services/employeeConstants.js (НОВЫЙ ФАЙЛ: Конфигурация достижений и регионов)
// ===================================================================
//
// Файл содержит статическую конфигурацию для сервиса сотрудников.

const BADGES = [
    // --- Количество командировок (4) ---
    { id: 'firstTrip', icon: 'fas fa-baby', name: 'Полевое крещение', description: 'Завершение первой командировки', check: (m) => ({ isEarned: m.completedTrips >= 1, progress: m.completedTrips, goal: 1 }) },
    { id: 'veteran10', icon: 'fas fa-award', name: 'Бывалый', description: 'За 10 завершенных командировок', check: (m) => ({ isEarned: m.completedTrips >= 10, progress: m.completedTrips, goal: 10 }) },
    { id: 'samurai20', icon: 'fas fa-medal', name: 'Командировочный Самурай', description: 'За 20 завершенных командировок', check: (m) => ({ isEarned: m.completedTrips >= 20, progress: m.completedTrips, goal: 20 }) },
    { id: 'chief30', icon: 'fas fa-crown', name: 'Главный чемодановод', description: 'За 30 завершенных командировок', check: (m) => ({ isEarned: m.completedTrips >= 30, progress: m.completedTrips, goal: 30 }) },
    
    // --- Суммарные дни (4) ---
    { id: 'padawan30', icon: 'fas fa-graduation-cap', name: 'Юный падаван', description: 'Провести в командировках суммарно более 30 дней', check: (m) => ({ isEarned: m.totalDaysCompleted >= 30, progress: m.totalDaysCompleted, goal: 30 }) },
    { id: 'centurion100', icon: 'fas fa-shield-alt', name: 'Столетний воин', description: 'Провести в командировках суммарно более 100 дней', check: (m) => ({ isEarned: m.totalDaysCompleted >= 100, progress: m.totalDaysCompleted, goal: 100 }) },
    { id: 'twocentury200', icon: 'fas fa-plane-departure', name: 'Двухсотник', description: 'Провести в командировках суммарно более 200 дней', check: (m) => ({ isEarned: m.totalDaysCompleted >= 200, progress: m.totalDaysCompleted, goal: 200 }) },
    { id: 'threehundred300', icon: 'fas fa-stopwatch', name: 'Трехсотый рубеж', description: 'Провести в командировках суммарно более 300 дней', check: (m) => ({ isEarned: m.totalDaysCompleted >= 300, progress: m.totalDaysCompleted, goal: 300 }) },

    // --- Продолжительность (3) ---
    { id: 'weekTrip', icon: 'fas fa-calendar-week', name: 'Неделя в поле', description: 'За командировку продолжительностью 7 дней и более', check: (m) => ({ isEarned: m.maxDuration >= 7, progress: m.maxDuration, goal: 7 }) },
    { id: 'longHaul', icon: 'fas fa-truck', name: 'Дальнобойщик', description: 'За командировку продолжительностью 21 день и более', check: (m) => ({ isEarned: m.maxDuration >= 21, progress: m.maxDuration, goal: 21 }) },
    { id: 'monthTrip', icon: 'fas fa-calendar-day', name: 'Месячник', description: 'За командировку продолжительностью 30 дней и более', check: (m) => ({ isEarned: m.maxDuration >= 30, progress: m.maxDuration, goal: 30 }) },

    // --- Географические (3) ---
    { id: 'explorer5', icon: 'fas fa-map-marked-alt', name: 'Исследователь', description: 'Посетить 5 разных населенных пунктов', check: (m) => ({ isEarned: m.uniqueDestinations >= 5, progress: m.uniqueDestinations, goal: 5 }) },
    { id: 'geography15', icon: 'fas fa-globe-asia', name: 'Пятёрка по географии', description: 'Посетить 15 разных населенных пунктов', check: (m) => ({ isEarned: m.uniqueDestinations >= 15, progress: m.uniqueDestinations, goal: 15 }) },
    { id: 'tourist25', icon: 'fas fa-city', name: 'Промышленный турист', description: 'Посетить 25 разных населенных пунктов', check: (m) => ({ isEarned: m.uniqueDestinations >= 25, progress: m.uniqueDestinations, goal: 25 }) },

    // --- Региональные (4) ---
    { id: 'northKing', icon: 'fas fa-snowflake', name: 'Главный по валенкам', description: 'За работу в северном регионе', check: (m) => ({ isEarned: m.regions.has('Северный'), progress: m.regions.has('Северный') ? 1:0, goal: 1 }) },
    { id: 'centralBoss', icon: 'fas fa-bullseye', name: 'Центровой', description: 'За работу в центральном регионе', check: (m) => ({ isEarned: m.regions.has('Центральный'), progress: m.regions.has('Центральный') ? 1:0, goal: 1 }) },
    { id: 'transUral', icon: 'fas fa-mountain', name: 'За Уралом', description: 'За работу в сибирском или дальневосточном регионе', check: (m) => ({ isEarned: m.regions.has('За Уралом'), progress: m.regions.has('За Уралом') ? 1:0, goal: 1 }) },
    { id: 'southman', icon: 'fas fa-sun', name: 'Южанин', description: 'За работу в южных регионах', check: (m) => ({ isEarned: m.regions.has('Южный'), progress: m.regions.has('Южный') ? 1:0, goal: 1 }) },

    // --- Заказчики (2) ---
    { id: 'keyCustomer', icon: 'fas fa-handshake', name: 'Свой человек', description: '5+ командировок к одному заказчику', check: (m) => ({ isEarned: m.maxTripsToSingleOrg >= 5, progress: m.maxTripsToSingleOrg, goal: 5 }) },
    { id: 'object10', icon: 'fas fa-building', name: '«Десяточка» в копилку', description: 'За работу на 10-м по счету объекте', check: (m) => ({ isEarned: m.uniqueDestinations >= 10, progress: m.uniqueDestinations, goal: 10 }) },
    
    // --- Особые достижения (2) ---
    { id: 'noWeekends', icon: 'fas fa-battery-full', name: '"Без выходных"', description: '3 командировки подряд с перерывом менее 3 дней', check: (m) => ({ isEarned: m.maxStreak >= 3, progress: m.maxStreak, goal: 3 }) },
    { id: 'monthlyHatTrick', icon: 'fas fa-calendar-check', name: 'Месячный хет-трик', description: '3 командировки в течение одного месяца', check: (m) => ({ isEarned: m.maxTripsInMonth >= 3, progress: m.maxTripsInMonth, goal: 3 }) },

    // --- Статистические бейджи (3) ---
    { id: 'stability', icon: 'fas fa-line-chart', name: 'Стабильность', description: '12 месяцев подряд с хотя бы одной командировкой', check: (m) => ({ isEarned: m.uniqueTripMonths >= 12, progress: m.uniqueTripMonths, goal: 12 }) },
    { id: 'monthlyRecord', icon: 'fas fa-trophy', name: 'Рекордсмен месяца', description: 'Установить рекорд по числу командировок за один месяц в текущем году', check: (m) => ({ isEarned: m.isMonthlyRecord, progress: m.isMonthlyRecord ? 1:0, goal: 1 }) },
    { id: 'yearMarathon', icon: 'fas fa-running', name: 'Марафонец года', description: 'Провести больше всех дней в командировках в текущем году', check: (m) => ({ isEarned: m.isYearlyDaysRecord, progress: m.isYearlyDaysRecord ? 1:0, goal: 1 }) },
];

const REGIONS = {
    // Центральный регион (ЦФО)
    'санкт-петербург': 'Центральный', 'калининград': 'Центральный', 'псков': 'Центральный', 'великий новгород': 'Центральный',
    'москва': 'Центральный', 'химки': 'Центральный', 'мытищи': 'Центральный', 'подольск': 'Центральный', 'тула': 'Центральный',
    'калуга': 'Центральный', 'рязань': 'Центральный', 'тверь': 'Центральный', 'смоленск': 'Центральный', 'брянск': 'Центральный',
    'владимир': 'Центральный', 'кострома': 'Центральный', 'иваново': 'Центральный', 'ярославль': 'Центральный',
    'воронеж': 'Центральный', 'белгород': 'Центральный', 'курск': 'Центральный', 'липецк': 'Центральный', 'орёл': 'Центральный',
    'тамбов': 'Центральный', 'екатеринбург': 'Центральный', 'челябинск': 'Центральный', 'курган': 'Центральный',
    'уфа': 'Центральный', 'заводоуковск': 'Центральный', 'тобольск': 'Центральный', 'ялуторовск': 'Центральный',
    'ишим': 'Центральный', 'самара': 'Центральный', 'саратов': 'Центральный',

    // Северный регион (СЗФО)
    'мурманск': 'Северный', 'архангельск': 'Северный', 'сыктывкар': 'Северный', 'воркута': 'Северный',
    'ухта': 'Северный', 'инта': 'Северный', 'новый уренгой': 'Северный', 'ноябрьск': 'Северный', 'сургут': 'Северный',
    'ханты-мансийск': 'Северный', 'нягань': 'Северный', 'когалым': 'Северный', 'лангепас': 'Северный',
    'лянтор': 'Северный', 'магадан': 'Северный', 'якутск': 'Северный', 'анадырь': 'Северный',
    'нижневартовск': 'Северный', 'покачи': 'Северный', 'тазовский': 'Северный', 'губкинский': 'Северный',
    'муравленко': 'Северный', 'коротчаево': 'Северный',

    // Южные регионы (ЮФО/СКФО)
    'ростов-на-дону': 'Южный', 'краснодар': 'Южный', 'сочи': 'Южный', 'новороссийск': 'Южный', 'туапсе': 'Южный',
    'армавир': 'Южный', 'волгоград': 'Южный', 'волжский': 'Южный', 'астрахань': 'Южный', 'элиста': 'Южный',
    'майкоп': 'Южный', 'симферополь': 'Южный', 'севастополь': 'Южный', 'керчь': 'Южный', 'таганрог': 'Южный',
    'шахты': 'Южный',

    // Сибирский или дальневосточный регион (СФО/ДФО) -> 'За Уралом'
    'новосибирск': 'За Уралом', 'омск': 'За Уралом', 'томск': 'За Уралом', 'кемерово': 'За Уралом', 'новокузнецк': 'За Уралом',
    'красноярск': 'За Уралом', 'абакан': 'За Уралом', 'барнаул': 'За Уралом', 'иркутск': 'За Уралом', 'улан-удэ': 'За Уралом',
    'чита': 'За Уралом', 'кызыл': 'За Уралом', 'владивосток': 'За Уралом', 'находка': 'За Уралом', 'уссурийск': 'За Уралом',
    'артём': 'За Уралом', 'хабаровск': 'За Уралом', 'комсомольск-на-амуре': 'За Уралом', 'биробиджан': 'За Уралом',
    'благовещенск': 'За Уралом', 'свободный': 'За Уралом', 'южно-сахалинск': 'За Уралом', 'петропавловск-камчатский': 'За Уралом'
};

module.exports = {
    BADGES,
    REGIONS
};
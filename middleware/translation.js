// ===================================================================
// Файл: middleware/translation.js (ФИНАЛЬНАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ)
// ===================================================================

const fieldTranslations = {
    // Аутентификация
    name: 'ФИО',
    position: 'Должность',
    password: 'Пароль',
    token: 'Токен',

    // Сотрудники
    lastName: 'Фамилия',
    firstName: 'Имя',
    patronymic: 'Отчество',
    phone: 'Телефон',
    email: 'Email',
    hireDate: 'Дата принятия на работу',

    // Организации
    color: 'Цвет',

    // Командировки и Отпуска
    organizationId: 'Организация',
    startDate: 'Дата начала',
    endDate: 'Дата окончания',
    destination: 'Место назначения',
    participants: 'Участники',
    transport: 'Транспорт',
    employeeId: 'Сотрудник',

    // Техническое обслуживание
    serial: 'Заводской номер',
    services: 'Технические обслуживания',
    'services.*.work': 'Содержание работ',
    'services.*.frequency': 'Периодичность',

    // Менеджер ЭЦП
    fio: 'ФИО',
    position_key: 'Ключ должности',
    position_name: 'Название должности',
    inn: 'ИНН',
    ecp_number: 'Номер ЭЦП',
    date_from: 'Дата выдачи',
    date_to: 'Дата окончания',

   // График поверки
    equipmentType: 'Тип оборудования',
    modification: 'Модификация',
    regNumbers: 'Рег. номера',
    serialNumber: 'Заводской номер',
    inventoryNumber: 'Инвентарный номер',
    yearManufactured: 'Год выпуска',
    commissionDate: 'Дата ввода в эксплуатацию',
    lastVerificationDate: 'Дата поверки/аттестации',
    nextVerificationDate: 'Дата след. поверки/аттестации',
    city: 'Город',
    responsible: 'Ответственный',
    notes: 'Примечание',
};

/**
 * Функция для получения русского названия поля.
 * Если перевод не найден, возвращает оригинальное имя.
 * @param {string} fieldName - Техническое имя поля (например, 'lastName').
 * @returns {string} - Русское название (например, 'Фамилия').
 */
const translateField = (fieldName) => {
    // +++ ДОБАВЛЕНО: Защита от некорректного ввода +++
    if (typeof fieldName !== 'string') {
        return fieldName || 'неизвестное поле';
    }
    const baseFieldName = fieldName.split('[')[0];
    return fieldTranslations[baseFieldName] || baseFieldName;
};

module.exports = {
    translateField,
};
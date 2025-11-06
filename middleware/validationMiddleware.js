// ===================================================================
// Файл: middleware/validationMiddleware.js (ПОЛНАЯ УНИФИЦИРОВАННАЯ ВЕРСИЯ)
// ===================================================================
// Этот файл содержит все правила валидации для express-validator
// и является единым источником правды для проверки входящих данных.

const { body, validationResult } = require('express-validator');
const { translateField } = require('./translation'); 

// --- ОБЩАЯ ФУНКЦИЯ ОБРАБОТКИ ОШИБОК ВАЛИДАЦИИ ---
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const formattedErrors = errors.array().map(err => ({
            field: err.param,
            message: `Поле '${translateField(err.param)}': ${err.msg}`
        }));
        // Возвращаем ошибку в виде объекта, чтобы ее мог перехватить
        // центральный обработчик ошибок в server.js
        const error = new Error('Ошибка валидации');
        error.errors = formattedErrors;
        return next(error);
    }
    next();
};

// --- ПРАВИЛА ВАЛИДАЦИИ ДЛЯ АУТЕНТИФИКАЦИИ ---
const registerValidation = [
    body('name').trim().notEmpty().withMessage('обязательно для заполнения'),
    body('position').trim().notEmpty().withMessage('обязательно для заполнения'),
    body('password').isLength({ min: 6 }).withMessage('должен содержать не менее 6 символов')
];

const loginValidation = [
    body('name').notEmpty().withMessage('обязательно для заполнения'),
    body('password').notEmpty().withMessage('обязательно для заполнения')
];

const forgotPasswordValidation = [
    body('name').trim().notEmpty().withMessage('обязательно для заполнения')
];

const resetPasswordValidation = [
    body('token').notEmpty().withMessage('обязательно'),
    body('password').isLength({ min: 6 }).withMessage('должен содержать не менее 6 символов')
];

// --- ПРАВИЛА ВАЛИДАЦИИ ДЛЯ СОТРУДНИКОВ ---
const employeeValidation = [
    body('lastName').trim().notEmpty().withMessage('обязательно для заполнения'),
    body('firstName').trim().notEmpty().withMessage('обязательно для заполнения'),
    body('position').notEmpty().withMessage('обязательно для заполнения'),
    body('email').optional({ checkFalsy: true }).isEmail().withMessage('имеет неверный формат'),
    body('hireDate').optional({ checkFalsy: true }).matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('имеет неверный формат даты (ГГГГ-ММ-ДД)')
];

// --- ПРАВИЛА ВАЛИДАЦИИ ДЛЯ ОРГАНИЗАЦИЙ ---
const organizationValidation = [
    body('name').trim().notEmpty().withMessage('обязательно для заполнения'),
    body('color').trim().notEmpty().withMessage('обязательно для заполнения')
];

// --- ПРАВИЛА ВАЛИДАЦИИ ДЛЯ КОМАНДИРОВОК ---
const createTripValidation = [
    body('participants').isArray({ min: 1 }).withMessage('должен быть массивом с хотя бы одним ID'),
    body('participants.*').isInt({ gt: 0 }).withMessage('ID участника должен быть числом'),
    body('organizationId').isInt({ gt: 0 }).withMessage('обязательно'),
    body('startDate').isISO8601().withMessage('имеет неверный формат даты'),
    body('endDate').isISO8601().withMessage('имеет неверный формат даты')
        .custom((value, { req }) => {
            if (new Date(value) < new Date(req.body.startDate)) {
                throw new Error('не может быть раньше даты начала');
            }
            return true;
        }),
    body('destination').trim().notEmpty().withMessage('обязательно для заполнения'),
    body('transport').optional({ checkFalsy: true }).isIn(['car', 'train', 'plane']).withMessage('имеет неверное значение')
];

const updateTripValidation = [
    body('employeeId').isInt({ gt: 0 }).withMessage('обязательно'),
    ...createTripValidation.slice(2)
];

// --- ПРАВИЛА ВАЛИДАЦИИ ДЛЯ ОТПУСКОВ ---
const vacationValidation = [
    body('employeeId').isInt({ gt: 0 }).withMessage('обязательно'),
    body('startDate').isISO8601().withMessage('имеет неверный формат даты'),
    body('endDate').isISO8601().withMessage('имеет неверный формат даты')
        .custom((value, { req }) => {
            if (new Date(value) < new Date(req.body.startDate)) {
                throw new Error('не может быть раньше даты начала');
            }
            return true;
        }),
];

// --- ПРАВИЛА ВАЛИДАЦИИ ДЛЯ ТЕХНИЧЕСКОГО ОБСЛУЖИВАНИЯ ---
const maintenanceValidation = [
    body('name').trim().notEmpty().withMessage('обязательно для заполнения'),
    body('serial').trim().notEmpty().withMessage('обязательно для заполнения'),
    body('startDate').isString().matches(/^\d{2}\.\d{2}\.\d{4}$/).withMessage('должно быть в формате ДД.ММ.ГГГГ'),
    body('services').optional().isArray().withMessage('должен быть массивом'),
    body('services.*.work').if(body('services').exists()).trim().notEmpty().withMessage('Содержание работ не может быть пустым'),
    body('services.*.frequency').if(body('services').exists()).trim().notEmpty().withMessage('Периодичность не может быть пустой')
];

// --- ПРАВИЛА ВАЛИДАЦИИ ДЛЯ МЕНЕДЖЕРА ЭЦП ---
const edsValidation = [
    body('fio').trim().notEmpty().withMessage('обязательно для заполнения'),
    body('position_key').trim().notEmpty().withMessage('обязательно'),
    body('position_name').trim().notEmpty().withMessage('обязательно'),
    body('inn').trim().matches(/^\d{10,12}$/).withMessage('должен состоять из 10 или 12 цифр'),
    body('ecp_number').trim().notEmpty().withMessage('обязательно для заполнения'),
    body('date_from').isISO8601().withMessage('имеет неверный формат даты'),
    body('date_to').isISO8601().withMessage('имеет неверный формат даты')
];

// --- ПРАВИЛА ВАЛИДАЦИИ ДЛЯ ГРАФИКА ПОВЕРКИ ---
const verificationValidation = [
    body('name').trim().notEmpty().withMessage('обязательно для заполнения'),
    body('equipmentType').isIn(['si', 'etalon', 'vo']).withMessage('имеет неверное значение'),
    
    // Общие поля
    body('serialNumber').trim().notEmpty().withMessage('обязательно для заполнения'),
    body('inventoryNumber').trim().notEmpty().withMessage('обязательно для заполнения'),
    body('yearManufactured').matches(/^\d{4}$/).withMessage('должен быть в формате ГГГГ'),
    // Даты должны приходить в формате YYYY-MM-DD от клиента
    body('lastVerificationDate').isISO8601().withMessage('имеет неверный формат даты'),
    body('nextVerificationDate').isISO8601().withMessage('имеет неверный формат даты')
        .custom((value, { req }) => {
            if (new Date(value) < new Date(req.body.lastVerificationDate)) {
                throw new Error('не может быть раньше даты последней поверки');
            }
            return true;
        }),
    body('city').trim().notEmpty().withMessage('обязательно для заполнения'),
    
    // Поля, специфичные для СИ/Эталонов
    body('modification').if(body('equipmentType').isIn(['si', 'etalon'])).trim().notEmpty().withMessage('обязательно для СИ/Эталонов'),
    body('commissionDate').if(body('equipmentType').isIn(['si', 'etalon'])).isISO8601().withMessage('имеет неверный формат даты'),
    body('responsible').if(body('equipmentType').isIn(['si', 'etalon'])).trim().notEmpty().withMessage('обязательно для СИ/Эталонов'),

    // Валидация массива рег. номеров
    body('regNumbers').optional().isArray().withMessage('должен быть массивом'),
    body('regNumbers.*.number').if(body('regNumbers').exists()).trim().notEmpty().withMessage('Номер не может быть пустым'),
    body('regNumbers.*.url').if(body('regNumbers').exists()).optional({ checkFalsy: true }).isURL().withMessage('должен быть корректным URL'),
];

// --- ПРАВИЛА ВАЛИДАЦИИ ДЛЯ АДМИН-ПАНЕЛИ ТЕСТОВ (НОВЫЕ) ---
const testCreationValidation = [
    body('name').trim().notEmpty().withMessage('обязательно для заполнения'),
    body('duration_minutes').optional().isInt({ min: 1, max: 480 }).withMessage('должно быть числом от 1 до 480'),
    body('passing_score').optional().isInt({ min: 1, max: 100 }).withMessage('должно быть числом от 1 до 100'),
    body('questions_per_test').optional().isInt({ min: 1 }).withMessage('должно быть числом больше 0'),
];

const bulkDeleteValidation = [
    body('ids').isArray({ min: 1 }).withMessage('должен быть непустым массивом ID')
];

const reviewBatchValidation = [
    body('verdicts').isArray({ min: 1 }).withMessage('должен быть непустым массивом'),
    body('verdicts.*.answerId').isInt().withMessage('ID ответа должен быть числом'),
    body('verdicts.*.isCorrect').isBoolean().withMessage('Вердикт должен быть true или false'),
];


// --- ОБЪЕКТ ДЛЯ ЭКСПОРТА ---
module.exports = {
    handleValidationErrors,
    registerValidation,
    loginValidation,
    forgotPasswordValidation,
    resetPasswordValidation,
    employeeValidation,
    organizationValidation,
    createTripValidation,
    updateTripValidation,
    vacationValidation,
    maintenanceValidation,
    edsValidation,
    verificationValidation,
    // Новые правила для модуля тестов
    testCreationValidation,
    bulkDeleteValidation,
    reviewBatchValidation,
};
// ===================================================================
// Файл: routes/apiRoutes.js (Полная итоговая версия с модулем Поверки)
// ===================================================================

const express = require('express');
const router = express.Router();

// --- Подключение middleware ---
const { isAuthenticated } = require('../middleware/authMiddleware');
const {
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
} = require('../middleware/validationMiddleware');
const upload = require('../config/multerConfig'); // Middleware для обработки файлов

// --- Подключение контроллеров ---
const authController = require('../controllers/authController');
const edsController = require('../controllers/edsController');
const verificationController = require('../controllers/verificationController');

// --- Подключение сервисов (для фабрик контроллеров) ---
const employeeService = require('../services/employeeService');
const organizationService = require('../services/organizationService');
const tripService = require('../services/tripService');
const vacationService = require('../services/vacationService');
const maintenanceService = require('../services/maintenanceService');
const statsService = require('../services/statsService');
const geographyStatsService = require('../services/geographyStatsService');

// --- Инициализация контроллеров через фабрики ---
const employeeController = require('../controllers/employeeController')(employeeService);
const organizationController = require('../controllers/organizationController')(organizationService);
const tripController = require('../controllers/tripController')(tripService, employeeService);
const vacationController = require('../controllers/vacationController')(vacationService, tripService, employeeService);
const maintenanceController = require('../controllers/maintenanceController')(maintenanceService);
const statsController = require('../controllers/statsController')(statsService, geographyStatsService);

// --- Middleware для разбора JSON-строки из FormData ---
const parseJsonBodyInFormData = (req, res, next) => {
    if (req.body && req.body.data && typeof req.body.data === 'string') {
        try {
            // Распаковываем JSON-строку и объединяем с req.body
            req.body = { ...req.body, ...JSON.parse(req.body.data) };
            delete req.body.data; // Удаляем исходное поле для чистоты
        } catch (e) {
            console.error("Не удалось разобрать JSON из поля 'data' в FormData.", e);
        }
    }
    next();
};

// --- Конфигурация полей для загрузки файлов в модуле Поверки ---
const verificationFileUploads = upload.fields([
    { name: 'certificateFile', maxCount: 1 },
    { name: 'invoiceFile', maxCount: 1 }
]);


// ===================================================================
// --- 1. МАРШРУТЫ АУТЕНТИФИКАЦИИ И CSRF (не требуют защиты) ---
// ===================================================================
router.post('/register', registerValidation, handleValidationErrors, authController.register);
router.post('/login', loginValidation, handleValidationErrors, authController.login);
router.post('/forgot-password', forgotPasswordValidation, handleValidationErrors, authController.forgotPassword);
router.post('/reset-password', resetPasswordValidation, handleValidationErrors, authController.resetPassword);
router.post('/logout', authController.logout);
router.get('/current-user', isAuthenticated, authController.getCurrentUser);
router.get('/user', isAuthenticated, authController.getCurrentUser); // Псевдоним
router.get('/csrf-token', (req, res) => {
    if (typeof req.csrfToken === 'function') {
        res.json({ csrfToken: req.csrfToken() });
    } else {
        res.status(500).json({ error: 'CSRF token function is not available' });
    }
});


// ===================================================================
// --- 2. ЗАЩИЩЕННЫЕ МАРШРУТЫ API ---
// ===================================================================

// --- Сотрудники (Employees) ---
router.get('/employees', isAuthenticated, employeeController.getAllEmployees);
router.post('/employees', isAuthenticated, employeeValidation, handleValidationErrors, employeeController.createEmployee);
router.put('/employees/:id', isAuthenticated, employeeValidation, handleValidationErrors, employeeController.updateEmployee);
router.delete('/employees/:id', isAuthenticated, employeeController.deleteEmployee);
router.get('/employees/:id/profile', isAuthenticated, employeeController.getEmployeeProfile);
router.get('/employees/:id/trips', isAuthenticated, employeeController.getEmployeeTrips);

// --- Организации (Organizations) ---
router.get('/organizations', isAuthenticated, organizationController.getAllOrganizations);
router.post('/organizations', isAuthenticated, organizationValidation, handleValidationErrors, organizationController.createOrganization);
router.delete('/organizations/:id', isAuthenticated, organizationController.deleteOrganization);

// --- Командировки (Trips) ---
router.get('/trips', isAuthenticated, tripController.getAllTrips);
router.post('/trips', isAuthenticated, createTripValidation, handleValidationErrors, tripController.createTrip);
router.put('/trips/:id', isAuthenticated, updateTripValidation, handleValidationErrors, tripController.updateTrip);
router.delete('/trips/:id', isAuthenticated, tripController.deleteTrip);

// --- Отпуска (Vacations) ---
router.get('/vacations', isAuthenticated, vacationController.getAllVacations);
router.post('/vacations', isAuthenticated, vacationValidation, handleValidationErrors, vacationController.createVacation);
router.put('/vacations/:id', isAuthenticated, vacationValidation, handleValidationErrors, vacationController.updateVacation);
router.delete('/vacations/:id', isAuthenticated, vacationController.deleteVacation);
router.get('/vacations/:employeeId', isAuthenticated, vacationController.getVacationsForEmployee);

// --- Статистика (Stats) - ТОЛЬКО ДЛЯ КОМАНДИРОВОК ---
router.get('/stats', isAuthenticated, statsController.getStats);
router.get('/stats/geography', isAuthenticated, statsController.getGeographyStats);

// --- ЭЦП (EDS - Digital Signatures) ---
router.get('/eds', isAuthenticated, edsController.getAll);
router.post('/eds', isAuthenticated, edsValidation, handleValidationErrors, edsController.create);
router.get('/eds/stats', isAuthenticated, edsController.getEdsStats);
router.get('/eds/:id', isAuthenticated, edsController.getById);
router.put('/eds/:id', isAuthenticated, edsValidation, handleValidationErrors, edsController.update);
router.delete('/eds/:id', isAuthenticated, edsController.delete);

// --- Техническое обслуживание (Maintenance) ---
router.get('/maintenance/equipment', isAuthenticated, maintenanceController.getAllEquipment);
router.post('/maintenance/equipment', isAuthenticated, maintenanceValidation, handleValidationErrors, maintenanceController.createEquipment);
router.put('/maintenance/equipment/:id', isAuthenticated, maintenanceValidation, handleValidationErrors, maintenanceController.updateEquipment);
router.delete('/maintenance/equipment/:id', isAuthenticated, maintenanceController.deleteEquipment);

// --- График поверки (Verification) ---
router.get('/verification/equipment', isAuthenticated, verificationController.getAllEquipment);
router.post('/verification/equipment', 
    isAuthenticated, 
    verificationFileUploads, 
    parseJsonBodyInFormData, 
    verificationValidation, 
    handleValidationErrors, 
    verificationController.createEquipment
);
router.put('/verification/equipment/:id', 
    isAuthenticated, 
    verificationFileUploads,
    parseJsonBodyInFormData, 
    verificationValidation, 
    handleValidationErrors, 
    verificationController.updateEquipment
);
router.delete('/verification/equipment/:id', isAuthenticated, verificationController.deleteEquipment);
router.get('/verification/stats', isAuthenticated, verificationController.getStats);


module.exports = router;
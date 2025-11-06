// ===================================================================
// Файл: routes/maintenance.routes.js (ИТОГОВАЯ ВЕРСИЯ ПОСЛЕ РЕФАКТОРИНГА)
// ===================================================================

const express = require('express');
const router = express.Router();

// Импортируем сервис и фабрику контроллера
const maintenanceService = require('../services/maintenanceService');
const maintenanceControllerFactory = require('../controllers/maintenanceController');

// Создаем экземпляр контроллера, передавая ему зависимость
const maintenanceController = maintenanceControllerFactory(maintenanceService);

// Импортируем middleware для валидации
const { maintenanceValidation, handleValidationErrors } = require('../middleware/validationMiddleware');
const { isAuthenticated } = require('../middleware/authMiddleware');

// Применяем middleware аутентификации ко всем маршрутам в этом файле
router.use(isAuthenticated);

// Маршрут для получения всего оборудования
router.get('/equipment', maintenanceController.getAllEquipment);

// Маршрут для создания нового оборудования с применением валидации
router.post('/equipment', maintenanceValidation, handleValidationErrors, maintenanceController.createEquipment);

// Маршрут для обновления существующего оборудования с применением валидации
router.put('/equipment/:id', maintenanceValidation, handleValidationErrors, maintenanceController.updateEquipment);

// Маршрут для удаления оборудования
router.delete('/equipment/:id', maintenanceController.deleteEquipment);

module.exports = router;
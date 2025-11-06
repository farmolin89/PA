// ===================================================================
// File: routes/eds.routes.js (ФИНАЛЬНАЯ ВЕРСИЯ С ВАЛИДАЦИЕЙ)
// Description: Маршруты Express для API модуля "Менеджер ЭЦП".
// ===================================================================

const express = require('express');
const router = express.Router();
const edsController = require('../controllers/edsController');
const { isAuthenticated } = require('../middleware/authMiddleware');
// Импортируем валидаторы из общего файла
const { edsValidation, handleValidationErrors } = require('../middleware/validationMiddleware');

// Применяем middleware аутентификации ко всем маршрутам в этом файле.
router.use(isAuthenticated);

// --- Маршруты для CRUD-операций ---

// GET /api/eds/
// Получить список всех электронных подписей.
router.get('/', edsController.getAll);

// GET /api/eds/stats
// Получить статистику по ЭЦП для дашборда.
router.get('/stats', edsController.getEdsStats);

// GET /api/eds/:id
// Получить одну запись по её уникальному идентификатору.
router.get('/:id', edsController.getById);

// POST /api/eds/
// Создать новую запись электронной подписи с применением валидации.
router.post('/', edsValidation, handleValidationErrors, edsController.create);

// PUT /api/eds/:id
// Обновить существующую запись по её ID с применением валидации.
router.put('/:id', edsValidation, handleValidationErrors, edsController.update);

// DELETE /api/eds/:id
// Удалить запись по её ID.
router.delete('/:id', edsController.delete);

module.exports = router;
// ===================================================================
// File: controllers/verificationController.js (Полная итоговая версия)
// Description: Обрабатывает HTTP-запросы для модуля "График поверки".
//              Включает логику для обработки загруженных файлов.
// ===================================================================

const verificationService = require('../services/verificationService');

const getAllEquipment = async (req, res, next) => {
    try {
        const equipment = await verificationService.getAll();
        res.status(200).json(equipment);
    } catch (error) {
        next(error);
    }
};

const createEquipment = async (req, res, next) => {
    try {
        // Так как мы используем multipart/form-data, текстовые поля приходят в req.body.
        // Мы ожидаем, что клиент отправит все данные формы в виде JSON-строки в поле 'data'.
        const data = req.body;

        // req.files создается middleware'ом multer. Он содержит информацию о загруженных файлах.
        // Проверяем, был ли загружен файл свидетельства.
        if (req.files && req.files.certificateFile) {
            // Сохраняем публичный путь к файлу в объект данных.
            data.certificatePath = '/uploads/' + req.files.certificateFile[0].filename;
        }

        // Проверяем, был ли загружен файл счета-фактуры.
        if (req.files && req.files.invoiceFile) {
            // Сохраняем публичный путь к файлу в объект данных.
            data.invoicePath = '/uploads/' + req.files.invoiceFile[0].filename;
        }

        const newEquipment = await verificationService.create(data);
        res.status(201).json(newEquipment);
    } catch (error) {
        next(error);
    }
};

const updateEquipment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = req.body;

        // Аналогично функции create, проверяем наличие новых файлов при обновлении.
        if (req.files && req.files.certificateFile) {
            data.certificatePath = '/uploads/' + req.files.certificateFile[0].filename;
        }

        if (req.files && req.files.invoiceFile) {
            data.invoicePath = '/uploads/' + req.files.invoiceFile[0].filename;
        }
        
        const updatedEquipment = await verificationService.update(id, data);
        res.status(200).json(updatedEquipment);
    } catch (error) {
        if (error.message.includes('not found')) {
            return res.status(404).json({ errors: [{ message: 'Оборудование не найдено' }] });
        }
        next(error);
    }
};

const deleteEquipment = async (req, res, next) => {
    try {
        const { id } = req.params;
        await verificationService.remove(id);
        res.status(204).send();
    } catch (error) {
        if (error.message.includes('not found')) {
            return res.status(404).json({ errors: [{ message: 'Оборудование не найдено' }] });
        }
        next(error);
    }
};

/**
 * Обработчик для получения статистики для дашборда.
 */
const getStats = async (req, res, next) => {
    try {
        const stats = await verificationService.getDashboardStats();
        res.status(200).json(stats);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllEquipment,
    createEquipment,
    updateEquipment,
    deleteEquipment,
    getStats,
};
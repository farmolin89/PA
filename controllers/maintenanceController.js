// ===================================================================
// Файл: controllers/maintenanceController.js (ФИНАЛЬНАЯ ВЕРСИЯ ПОСЛЕ РЕФАКТОРИНГА)
// ===================================================================
// Контроллер переведен на стиль "фабрики функций".
// ===================================================================

module.exports = (maintenanceService) => ({
    /**
     * Получает всё оборудование с их видами ТО.
     */
    getAllEquipment: async (req, res, next) => {
        try {
            const equipmentList = await maintenanceService.getAllEquipment();
            res.json(equipmentList);
        } catch (error) {
            console.error("Ошибка при получении оборудования:", error);
            next(error);
        }
    },

    /**
     * Создает новое оборудование.
     */
    createEquipment: async (req, res, next) => {
        try {
            const equipmentData = req.body;
            const newEquipment = await maintenanceService.createEquipment(equipmentData);
            res.status(201).json(newEquipment);
        } catch (error) {
            console.error("Ошибка при создании оборудования:", error);
            if (error.message.includes('уже существует')) {
                return res.status(409).json({ errors: [{ message: error.message }] });
            }
            next(error);
        }
    },

    /**
     * Обновляет оборудование.
     */
    updateEquipment: async (req, res, next) => {
        try {
            const { id } = req.params;
            const equipmentData = req.body;
            const updatedEquipment = await maintenanceService.updateEquipment(id, equipmentData);
            
            if (!updatedEquipment) {
                return res.status(404).json({ errors: [{ message: 'Оборудование для обновления не найдено.' }] });
            }
            
            res.status(200).json(updatedEquipment);
        } catch (error) {
            console.error(`Ошибка при обновлении оборудования ID ${req.params.id}:`, error);
            if (error.message.includes('уже существует')) {
                return res.status(409).json({ errors: [{ message: error.message }] });
            }
            next(error);
        }
    },

    /**
     * Удаляет оборудование.
     */
    deleteEquipment: async (req, res, next) => {
        try {
            const { id } = req.params;
            const success = await maintenanceService.deleteEquipment(id);
            
            if (!success) {
                return res.status(404).json({ errors: [{ message: 'Оборудование для удаления не найдено.' }] });
            }
            
            res.status(200).json({ message: 'Оборудование и связанные ТО успешно удалены.' });
        } catch (error) {
            console.error(`Ошибка при удалении оборудования ID ${req.params.id}:`, error);
            next(error);
        }
    }
});
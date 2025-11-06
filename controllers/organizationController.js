// ===================================================================
// Файл: controllers/organizationController.js (ФИНАЛЬНАЯ ВЕРСИЯ ПОСЛЕ РЕФАКТОРИНГА)
// ===================================================================
// Контроллер переведен на стиль "фабрики функций" и полностью использует
// сервисный слой для работы с базой данных.
// ===================================================================

module.exports = (organizationService) => ({
    /**
     * Получает все организации.
     */
    getAllOrganizations: async (req, res, next) => {
        try {
            const organizations = await organizationService.getAll();
            res.json(organizations);
        } catch (err) {
            console.error("Ошибка при получении организаций:", err);
            next(err);
        }
    },

    /**
     * Создает новую организацию.
     */
    createOrganization: async (req, res, next) => {
        const { name, color } = req.body;
        try {
            const existing = await organizationService.findByName(name);
            if (existing) {
                return res.status(409).json({ errors: [{ message: 'Организация с таким названием уже существует.' }] });
            }

            const newOrganization = await organizationService.create({ name, color });
            res.status(201).json(newOrganization);

        } catch (err) {
            console.error("Ошибка при добавлении организации:", err);
            next(err);
        }
    },

    /**
     * Удаляет организацию.
     */
    deleteOrganization: async (req, res, next) => {
        const { id } = req.params;
        try {
            const isUsed = await organizationService.isUsedInTrips(id);
            if (isUsed) {
                return res.status(409).json({
                    errors: [{ message: "Нельзя удалить организацию, так как она используется в запланированных командировках." }]
                });
            }

            const numDeleted = await organizationService.deleteById(id);
            if (numDeleted === 0) {
                return res.status(404).json({ errors: [{ message: 'Организация не найдена.' }] });
            }
            
            res.status(200).json({ message: 'Организация успешно удалена.' });

        } catch (err) {
            console.error("Ошибка при удалении организации:", err);
            next(err);
        }
    }
});
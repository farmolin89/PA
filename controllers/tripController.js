// ===================================================================
// Файл: controllers/tripController.js (ФИНАЛЬНАЯ ВЕРСИЯ ПОСЛЕ РЕФАКТОРИНГА)
// ===================================================================
// Контроллер переведен на стиль "фабрики функций" и полностью использует
// сервисный слой для работы с базой данных.
// ===================================================================

module.exports = (tripService, employeeService) => ({
    /**
     * Получает все командировки.
     */
    getAllTrips: async (req, res, next) => {
        try {
            const trips = await tripService.getAll(req.query);
            res.json(trips);
        } catch (err) {
            console.error("Ошибка при получении командировок:", err);
            next(err);
        }
    },

    /**
     * Создает новую командировку.
     */
    createTrip: async (req, res, next) => {
        const { participants, startDate, endDate } = req.body;
        try {
            const conflictingEmployee = await tripService.findConflictingEmployee(participants, startDate, endDate);
            if (conflictingEmployee) {
                const fullName = `${conflictingEmployee.lastName} ${conflictingEmployee.firstName}`;
                return res.status(409).json({ errors: [{ message: `Сотрудник ${fullName} уже занят в указанный период.` }] });
            }
            
            const createdTrips = await tripService.create(req.body);
            employeeService.invalidateGlobalRecordsCache();
            res.status(201).json(createdTrips);

        } catch (err) {
            console.error("Ошибка при создании командировки:", err);
            next(err);
        }
    },

    /**
     * Обновляет командировку.
     */
    updateTrip: async (req, res, next) => {
        const tripId = req.params.id;
        const { employeeId, startDate, endDate, ...tripDetails } = req.body;
        try {
            const conflictingEmployee = await tripService.findConflictingEmployee([employeeId], startDate, endDate, { excludeTripId: tripId });
            if (conflictingEmployee) {
                const fullName = `${conflictingEmployee.lastName} ${conflictingEmployee.firstName}`;
                return res.status(409).json({ errors: [{ message: `Сотрудник ${fullName} уже занят в указанный период.` }] });
            }
            
            const finalUpdatedTrip = await tripService.update(tripId, { startDate, endDate, ...tripDetails });
            if (!finalUpdatedTrip) {
                 return res.status(404).json({ errors: [{ message: 'Командировка для обновления не найдена.' }] });
            }

            employeeService.invalidateGlobalRecordsCache();
            res.status(200).json(finalUpdatedTrip);

        } catch (err) {
            console.error("Ошибка при обновлении командировки:", err);
            next(err);
        }
    },

    /**
     * Удаляет командировку.
     */
    deleteTrip: async (req, res, next) => {
        const { id } = req.params;
        try {
            const numDeleted = await tripService.deleteById(id);
            if (numDeleted === 0) {
                return res.status(404).json({ errors: [{ message: 'Командировка не найдена.' }] });
            }
            
            employeeService.invalidateGlobalRecordsCache();
            res.status(200).json({ message: 'Командировка успешно удалена.' });
        } catch (err) {
            console.error("Ошибка при удалении командировки:", err);
            next(err);
        }
    }
});
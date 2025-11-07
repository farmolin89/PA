// ===================================================================
// Файл: controllers/vacationController.js (ФИНАЛЬНАЯ ВЕРСИЯ ПОСЛЕ РЕФАКТОРИНГА)
// ===================================================================
// Контроллер переведен на стиль "фабрики функций" и полностью использует
// сервисный слой для работы с базой данных.
// ===================================================================

module.exports = (vacationService, tripService, employeeService) => ({
    /**
     * Получает все отпуска.
     */
    getAllVacations: async (req, res, next) => {
        try {
            const vacations = await vacationService.getAll();
            res.json(vacations);
        } catch (error) {
            console.error("Ошибка при получении всех отпусков:", error);
            next(error);
        }
    },

    /**
     * Получает отпуска для конкретного сотрудника.
     */
    getVacationsForEmployee: async (req, res, next) => {
        const { employeeId } = req.params;
        try {
            const vacations = await vacationService.getForEmployee(employeeId);
            res.json(vacations);
        } catch (error) {
            console.error("Ошибка при получении отпусков сотрудника:", error);
            next(error);
        }
    },

    /**
     * Создает новую запись об отпуске.
     */
    createVacation: async (req, res, next) => {
        const { employeeId, startDate, endDate } = req.body;
        try {
            const employeeExists = await employeeService.findById(employeeId);
            if (!employeeExists) {
                return res.status(404).json({ errors: [{ message: "Сотрудник с указанным ID не найден." }] });
            }
            
            const conflictingEmployee = await tripService.findConflictingEmployee([employeeId], startDate, endDate);
            if (conflictingEmployee) {
                const fullName = `${conflictingEmployee.lastName} ${conflictingEmployee.firstName}`;
                return res.status(409).json({ errors: [{ message: `Сотрудник ${fullName} уже занят в указанный период.` }] });
            }
            
            const newVacation = await vacationService.create({ employeeId, startDate, endDate });
            res.status(201).json(newVacation);

        } catch (error) {
            console.error("Ошибка при создании отпуска:", error);
            next(error);
        }
    },

    /**
     * Обновляет запись об отпуске.
     */
    updateVacation: async (req, res, next) => {
        const { id } = req.params;
        const { employeeId, startDate, endDate } = req.body;
        try {
            const conflictingEmployee = await tripService.findConflictingEmployee([employeeId], startDate, endDate, { excludeVacationId: id });
            if (conflictingEmployee) {
                const fullName = `${conflictingEmployee.lastName} ${conflictingEmployee.firstName}`;
                return res.status(409).json({ errors: [{ message: `Сотрудник ${fullName} уже занят в указанный период.` }] });
            }

            const updatedVacation = await vacationService.update(id, { startDate, endDate });
            if (!updatedVacation) {
                return res.status(404).json({ errors: [{ message: "Отпуск не найден." }] });
            }
            
            res.status(200).json(updatedVacation);

        } catch (error) {
            console.error("Ошибка при обновлении отпуска:", error);
            next(error);
        }
    },

    /**
     * Удаляет отпуск.
     */
    deleteVacation: async (req, res, next) => {
        const { id } = req.params;
        try {
            const numDeleted = await vacationService.deleteById(id);
            if (numDeleted === 0) {
                return res.status(404).json({ errors: [{ message: 'Отпуск не найден.' }] });
            }
            res.status(200).json({ message: 'Отпуск успешно удален.' });
        } catch (err) {
            console.error("Ошибка при удалении отпуска:", err);
            next(err);
        }
    }
});
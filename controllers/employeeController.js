// ===================================================================
// Файл: controllers/employeeController.js (ФИНАЛЬНАЯ УПРОЩЕННАЯ ВЕРСИЯ)
// ===================================================================
// Убраны предварительные проверки на дубликаты. Логика теперь полностью
// полагается на обработку ошибок UNIQUE constraint от базы данных,
// что делает код более простым и надежным.
// ===================================================================

const normalizePatronymic = (value) => {
    if (value === undefined || value === null) {
        return null;
    }
    if (typeof value !== 'string') {
        return value;
    }
    return value.trim();
};

module.exports = (employeeService) => ({
    /**
     * Получает всех сотрудников.
     */
    getAllEmployees: async (req, res, next) => {
        try {
            const employees = await employeeService.getAll();
            res.json(employees);
        } catch (err) {
            console.error("Ошибка при получении списка сотрудников:", err);
            next(err);
        }
    },

    /**
     * Создает нового сотрудника.
     */
    createEmployee: async (req, res, next) => {
        try {
            // Просто пытаемся создать сотрудника.
            // Если ФИО уже существует, база данных вернет ошибку, которую мы поймаем в catch.
            const employeeData = { ...req.body, patronymic: normalizePatronymic(req.body.patronymic) };
            const newEmployee = await employeeService.create(employeeData);
            res.status(201).json(newEmployee);
        } catch (err) {
            // Явно отлавливаем ошибку уникальности от БД
            if (err.code === 'SQLITE_CONSTRAINT' && err.message.includes('UNIQUE constraint failed')) {
                console.warn('Контроллер поймал ошибку UNIQUE constraint при создании.');
                return res.status(409).json({ errors: [{ message: 'Сотрудник с таким ФИО уже существует.' }] });
            }
            console.error("Ошибка при создании сотрудника:", err);
            next(err);
        }
    },

    /**
     * Обновляет данные сотрудника.
     */
    updateEmployee: async (req, res, next) => {
        const { id } = req.params;
        try {
            // Просто пытаемся обновить сотрудника.
            // Если новое ФИО конфликтует с другой записью, база данных вернет ошибку.
            const employeeData = { ...req.body, patronymic: normalizePatronymic(req.body.patronymic) };
            const updatedEmployee = await employeeService.update(id, employeeData);
            
            if (!updatedEmployee) {
                return res.status(404).json({ errors: [{ message: 'Сотрудник не найден.' }] });
            }
            
            res.status(200).json(updatedEmployee);
        } catch (err) {
            // Явно отлавливаем ошибку уникальности от БД
            if (err.code === 'SQLITE_CONSTRAINT' && err.message.includes('UNIQUE constraint failed')) {
                console.warn('Контроллер поймал ошибку UNIQUE constraint при обновлении.');
                return res.status(409).json({ errors: [{ message: 'Другой сотрудник с таким ФИО уже существует.' }] });
            }
            console.error("Ошибка при обновлении сотрудника:", err);
            next(err);
        }
    },

    /**
     * Удаляет сотрудника.
     */
    deleteEmployee: async (req, res, next) => {
        const { id } = req.params;
        try {
            const numDeleted = await employeeService.deleteById(id);
            if (numDeleted === 0) {
                return res.status(404).json({ errors: [{ message: 'Сотрудник не найден.' }] });
            }
            res.status(200).json({ message: 'Сотрудник успешно удален.' });
        } catch (err) {
            console.error("Ошибка при удалении сотрудника:", err);
            if (err.code === 'SQLITE_CONSTRAINT') {
                 return res.status(400).json({ errors: [{ message: 'Невозможно удалить сотрудника, так как он участвует в командировках.' }] });
            }
            next(err);
        }
    },

    /**
     * Получает полный профиль сотрудника.
     */
    getEmployeeProfile: async (req, res, next) => {
        try {
            const employeeId = parseInt(req.params.id, 10);
            const fullProfile = await employeeService.getFullEmployeeProfile(employeeId);
            if (!fullProfile) {
                return res.status(404).json({ errors: [{ message: 'Сотрудник не найден.' }] });
            }
            res.json(fullProfile);
        } catch (err) {
            console.error(`Ошибка при получении профиля для сотрудника ID ${req.params.id}:`, err);
            next(err);
        }
    },

    /**
     * Получает все командировки сотрудника.
     */
    getEmployeeTrips: async (req, res, next) => {
        try {
            const employeeId = parseInt(req.params.id, 10);
            const trips = await employeeService.getTripsForEmployee(employeeId);
            res.json(trips);
        } catch (err) {
            console.error(`Ошибка при получении командировок для сотрудника ID ${req.params.id}:`, err);
            next(err);
        }
    }
});

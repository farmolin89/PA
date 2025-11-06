// ===================================================================
// Файл: __tests__/employeeService.test.js (ФИНАЛЬНАЯ УЛУЧШЕННАЯ ВЕРСИЯ)
// ===================================================================

// Импортируем реальную функцию из сервиса
const { calculateLevel } = require('../services/employeeService');

// Основная группа тестов для сервиса сотрудников
describe('employeeService: calculateLevel', () => {

    // Группа тестов для стандартных значений внутри каждого уровня
    describe('Стандартные значения', () => {
        it('должен возвращать 1-й уровень для 20 дней', () => {
            const result = calculateLevel(20);
            expect(result.level).toBe(1);
            expect(result.name).toBe('Стажер полевых измерений');
            expect(result.progress).toBe(21); // 20 - 0 + 1
            expect(result.max).toBe(45); // 44 - 0 + 1
        });

        it('должен возвращать 2-й уровень для 60 дней', () => {
            const result = calculateLevel(60);
            expect(result.level).toBe(2);
            expect(result.name).toBe('Специалист выездной поверки');
            expect(result.progress).toBe(16); // 60 - 45 + 1
            expect(result.max).toBe(44); // 88 - 45 + 1
        });

        it('должен возвращать 3-й уровень для 100 дней', () => {
            const result = calculateLevel(100);
            expect(result.level).toBe(3);
            expect(result.name).toBe('Опытный полевик');
            expect(result.progress).toBe(12); // 100 - 89 + 1
        });

        it('должен возвращать 4-й уровень для 150 дней', () => {
            const result = calculateLevel(150);
            expect(result.level).toBe(4);
            expect(result.name).toBe('Мастер полевой поверки');
            expect(result.progress).toBe(18); // 150 - 133 + 1
        });

        it('должен возвращать 5-й уровень для 500 дней', () => {
            const result = calculateLevel(500);
            expect(result.level).toBe(5);
            expect(result.name).toBe('Ветеран командировок');
            expect(result.progress).toBe(324); // 500 - 177 + 1
            expect(result.max).toBe(9999);
        });
    });

    // Группа тестов для проверки граничных значений (переходы между уровнями)
    describe('Граничные значения', () => {
        // Переход с 1 на 2 уровень
        it('должен возвращать 1-й уровень для 44 дней (последний день)', () => {
            const result = calculateLevel(44);
            expect(result.level).toBe(1);
            expect(result.progress).toBe(45); // 44 - 0 + 1
        });
        it('должен возвращать 2-й уровень для 45 дней (первый день)', () => {
            const result = calculateLevel(45);
            expect(result.level).toBe(2);
            expect(result.progress).toBe(1);
        });

        // Переход с 2 на 3 уровень
        it('должен возвращать 2-й уровень для 88 дней (последний день)', () => {
            const result = calculateLevel(88);
            expect(result.level).toBe(2);
            expect(result.progress).toBe(44);
        });
        it('должен возвращать 3-й уровень для 89 дней (первый день)', () => {
            const result = calculateLevel(89);
            expect(result.level).toBe(3);
            expect(result.progress).toBe(1);
        });

        // Переход с 3 на 4 уровень
        it('должен возвращать 3-й уровень для 132 дней (последний день)', () => {
            const result = calculateLevel(132);
            expect(result.level).toBe(3);
            expect(result.progress).toBe(44); // 132 - 89 + 1
        });
        it('должен возвращать 4-й уровень для 133 дней (первый день)', () => {
            const result = calculateLevel(133);
            expect(result.level).toBe(4);
            expect(result.progress).toBe(1);
        });

        // Переход с 4 на 5 уровень
        it('должен возвращать 4-й уровень для 176 дней (последний день)', () => {
            const result = calculateLevel(176);
            expect(result.level).toBe(4);
            expect(result.progress).toBe(44); // 176 - 133 + 1
        });
        it('должен возвращать 5-й уровень для 177 дней (первый день)', () => {
            const result = calculateLevel(177);
            expect(result.level).toBe(5);
            expect(result.progress).toBe(1);
        });
    });

    // Группа тестов для крайних случаев и некорректного ввода
    describe('Крайние случаи и некорректный ввод', () => {
        it('должен возвращать 1-й уровень для 0 дней', () => {
            const result = calculateLevel(0);
            expect(result.level).toBe(1);
            expect(result.name).toBe('Стажер полевых измерений');
            expect(result.progress).toBe(0);
            expect(result.totalDays).toBe(0);
        });

        it('должен возвращать 1-й уровень для 1 дня', () => {
            const result = calculateLevel(1);
            expect(result.level).toBe(1);
            expect(result.progress).toBe(2); // 1 - 0 + 1
        });
        
        it('должен корректно обрабатывать отрицательное число как 0 дней', () => {
            const result = calculateLevel(-10);
            expect(result.level).toBe(1);
            expect(result.progress).toBe(0);
            expect(result.totalDays).toBe(0);
        });

        it('должен корректно обрабатывать null как 0 дней', () => {
            const result = calculateLevel(null);
            expect(result.level).toBe(1);
            expect(result.progress).toBe(0);
            expect(result.totalDays).toBe(0);
        });

        it('должен корректно обрабатывать undefined как 0 дней', () => {
            const result = calculateLevel(undefined);
            expect(result.level).toBe(1);
            expect(result.progress).toBe(0);
            expect(result.totalDays).toBe(0);
        });

        it('должен корректно обрабатывать нечисловую строку как 0 дней', () => {
            const result = calculateLevel('abc');
            expect(result.level).toBe(1);
            expect(result.progress).toBe(0);
            expect(result.totalDays).toBe(0);
        });
    });
});
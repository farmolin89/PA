// ===================================================================
// File: services/edsService.js (ФИНАЛЬНАЯ ИСПРАВЛЕННАЯ ВЕРСЯ 5.0)
// Description: Сервисный слой для управления бизнес-логикой ЭЦП.
// Версия 5.0: Исправлен импорт knex через деструктуризацию.
// =================================-=================================

// --- ИСПРАВЛЕНИЕ: Используем деструктуризацию для импорта knex ---
// Эта строка извлекает свойство `knex` из объекта, который экспортирует `database.js`
const { knex } = require('../config/database');

class EdsService {

  /**
   * Получает все записи ЭЦП из базы данных.
   */
  getAll() {
    // Теперь переменная `knex` - это именно та функция, которая нам нужна.
    return knex('digital_signatures').select('*').orderBy('id', 'asc');
  }

  /**
   * Находит запись ЭЦП по её ID.
   */
  getById(id) {
    return knex('digital_signatures').where({ id }).first();
  }

  /**
   * Создает новую запись ЭЦП в базе данных.
   */
  create(data) {
    return knex('digital_signatures').insert(data).returning('*');
  }

  /**
   * Обновляет существующую запись ЭЦП по её ID.
   */
  update(id, data) {
    return knex('digital_signatures').where({ id }).update(data).returning('*');
  }

  /**
   * Удаляет запись ЭЦП по её ID.
   */
  delete(id) {
    return knex('digital_signatures').where({ id }).del();
  }
  
  /**
   * Рассчитывает статистику по ЭЦП для дашборда.
   */
  async getEdsStats() {
    const today = new Date().toISOString().slice(0, 10);
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // В этой строке была ошибка (строка ~73)
    const statsPromises = {
        total: knex('digital_signatures').count('id as count').first(),
        active: knex('digital_signatures').where('date_to', '>=', today).count('id as count').first(),
        expiring: knex('digital_signatures')
            .where('date_to', '>=', today)
            .andWhere('date_to', '<=', thirtyDaysFromNow)
            .count('id as count')
            .first()
    };

    const [totalRes, activeRes, expiringRes] = await Promise.all(Object.values(statsPromises));

    return {
        total: totalRes?.count ?? 0,
        active: activeRes?.count ?? 0,
        expiring: expiringRes?.count ?? 0
    };
  }
}

module.exports = new EdsService();
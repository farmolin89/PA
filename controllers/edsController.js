// =agreed
// File: controllers/edsController.js
// Description: Контроллер для обработки HTTP-запросов модуля ЭЦП.
// Версия 4.0: Улучшена обработка ошибок уникальности (UNIQUE constraint).
// ===================================================================

const edsService = require('../services/edsService');

class EdsController {

  /**
   * Обрабатывает запрос на получение всех записей ЭЦП.
   */
  async getAll(req, res, next) {
    try {
      const signatures = await edsService.getAll();
      res.status(200).json(signatures);
    } catch (error) {
      console.error('Ошибка в edsController.getAll:', error);
      // Передаем ошибку в централизованный обработчик ошибок Express
      next(error);
    }
  }

  /**
   * Обрабатывает запрос на получение одной записи ЭЦП по ID.
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const signature = await edsService.getById(id);
      
      if (signature) {
        res.status(200).json(signature);
      } else {
        // Если запись не найдена, отправляем корректный статус 404
        res.status(404).json({ message: 'Запись ЭЦП с таким ID не найдена.' });
      }
    } catch (error) {
      console.error('Ошибка в edsController.getById:', error);
      next(error);
    }
  }

  /**
   * Обрабатывает запрос на получение статистики по ЭЦП для дашборда.
   */
  async getEdsStats(req, res, next) {
    try {
        const stats = await edsService.getEdsStats();
        res.status(200).json(stats);
    } catch (error) {
        console.error("Ошибка в edsController.getEdsStats:", error);
        next(error);
    }
  }

  /**
   * Обрабатывает запрос на создание новой записи ЭЦП.
   */
  async create(req, res, next) {
    try {
      const data = req.body;
      const newSignatureResult = await edsService.create(data);
      // Knex с returning('*') всегда возвращает массив. Проверяем его.
      const newSignature = newSignatureResult ? newSignatureResult[0] : null;

      if (!newSignature) {
          // Если по какой-то причине запись не создалась, но ошибки не было,
          // отправляем общую серверную ошибку.
          throw new Error('Не удалось получить данные о созданной записи из БД.');
      }

      // Отправляем статус 201 Created с созданным объектом
      res.status(201).json(newSignature);
    } catch (error) {
      console.error('Ошибка в edsController.create:', error);
      
      // Проверяем, является ли ошибка ошибкой уникальности для поля ecp_number
      if (error.code === 'SQLITE_CONSTRAINT' && error.message.includes('digital_signatures.ecp_number')) {
          // Если да, отправляем понятное сообщение об ошибке с кодом 409 (Conflict)
          return res.status(409).json({ message: 'Сотрудник с таким номером ЭЦП уже существует.' });
      }

      // Для всех остальных ошибок, передаем их в глобальный обработчик
      next(error);
    }
  }

  /**
   * Обрабатывает запрос на обновление существующей записи ЭЦП.
   */
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const data = req.body;
      const updatedSignatureResult = await edsService.update(id, data);
      const updatedSignature = updatedSignatureResult ? updatedSignatureResult[0] : null;
      
      if (updatedSignature) {
        res.status(200).json(updatedSignature);
      } else {
        res.status(404).json({ message: 'Не удалось найти запись для обновления.' });
      }
    } catch (error) {
      console.error('Ошибка в edsController.update:', error);

      // Проверяем, является ли ошибка ошибкой уникальности для поля ecp_number
      if (error.code === 'SQLITE_CONSTRAINT' && error.message.includes('digital_signatures.ecp_number')) {
          // Если да, отправляем понятное сообщение об ошибке с кодом 409 (Conflict)
          return res.status(409).json({ message: 'Этот номер ЭЦП уже присвоен другому сотруднику.' });
      }
      
      // Для всех остальных ошибок, передаем их в глобальный обработчик
      next(error);
    }
  }

  /**
   * Обрабатывает запрос на удаление записи ЭЦП.
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const deletedRows = await edsService.delete(id);
      
      if (deletedRows > 0) {
        // Успешное удаление. Отправляем статус 204 No Content без тела ответа.
        res.status(204).send();
      } else {
        res.status(404).json({ message: 'Запись для удаления не найдена.' });
      }
    } catch (error) {
      console.error('Ошибка в edsController.delete:', error);
      next(error);
    }
  }
}

// Экспортируем единственный экземпляр класса (Singleton)
module.exports = new EdsController();
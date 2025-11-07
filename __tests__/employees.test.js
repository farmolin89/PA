// ===================================================================
// Файл: __tests__/employees.test.js (ПОЛНАЯ ФИНАЛЬНАЯ ВЕРСИЯ)
// ===================================================================
// Тесты приведены в полное соответствие с логикой приложения.
// Во всех тестовых данных и запросах для сотрудников без отчества
// явно указывается `patronymic: ''` для обеспечения консистентности.
// ===================================================================

const request = require('supertest');
const bcrypt = require('bcrypt');
const app = require('../server');
const { knex } = require('../config/database');

describe('Интеграционные тесты для API сотрудников (/api/employees)', () => {
  let agent;
  let csrfToken;

  beforeAll(async () => {
    await knex.migrate.latest();
    agent = request.agent(app);
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash('password123', saltRounds);
    await knex('users').insert({
      name: 'testuser',
      position: 'tester',
      password: hashedPassword
    });
  });

  beforeEach(async () => {
    await knex('employees').del();
    await agent
      .post('/api/login')
      .send({ name: 'testuser', password: 'password123' });
    const csrfResponse = await agent.get('/api/csrf-token');
    csrfToken = csrfResponse.body.csrfToken;
  });

  afterAll(async () => {
    await knex.destroy();
  });

  const makeProtectedRequest = (method, url, data = null) => {
    let req = agent[method.toLowerCase()](url)
      .set('Accept', 'application/json');
    if (csrfToken && ['post', 'put', 'delete'].includes(method.toLowerCase())) {
      req = req.set('x-csrf-token', csrfToken);
    }
    return data ? req.send(data) : req;
  };

  describe('POST /api/employees', () => {
    it('должен успешно создать нового сотрудника и вернуть статус 201', async () => {
      const newEmployeeData = {
        lastName: 'Тестов',
        firstName: 'Иван',
        patronymic: 'Петрович',
        position: 'Ведущий тестировщик',
      };
      const response = await makeProtectedRequest('post', '/api/employees', newEmployeeData);
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      const employeeInDb = await knex('employees').where({ id: response.body.id }).first();
      expect(employeeInDb).toBeDefined();
    });

    it('должен вернуть ошибку 409 при попытке создать дубликат сотрудника', async () => {
      const employeeData = { 
        lastName: 'Дубликатов', 
        firstName: 'Петр', 
        patronymic: 'Иванович', 
        position: 'Инженер' 
      };
      await knex('employees').insert(employeeData);
      const response = await makeProtectedRequest('post', '/api/employees', employeeData);
      expect(response.status).toBe(409);
      expect(response.body.errors[0].message).toContain('Сотрудник с таким ФИО уже существует.');
    });

    it('должен вернуть ошибку 400, если не указано обязательное поле (lastName)', async () => {
      const invalidData = { 
        firstName: 'Имя', 
        patronymic: '',
        position: 'Должность' 
      };
      const response = await makeProtectedRequest('post', '/api/employees', invalidData);
      expect(response.status).toBe(400);
      expect(response.body.errors[0].field).toBe('lastName');
    });
  });

  describe('GET /api/employees', () => {
    it('должен вернуть пустой массив и статус 200, если сотрудников нет', async () => {
      const response = await makeProtectedRequest('get', '/api/employees');
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('должен вернуть массив всех сотрудников и статус 200', async () => {
      await knex('employees').insert([
        { lastName: 'Иванов', firstName: 'Иван', patronymic: '', position: 'Инженер' },
        { lastName: 'Петров', firstName: 'Петр', patronymic: '', position: 'Техник' },
      ]);
      const response = await makeProtectedRequest('get', '/api/employees');
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });
  });

  describe('PUT /api/employees/:id', () => {
    it('должен успешно обновить сотрудника и вернуть статус 200', async () => {
      const [inserted] = await knex('employees').insert({ 
        lastName: 'Старый', 
        firstName: 'Имя', 
        patronymic: '', 
        position: 'Старая должность' 
      }).returning('id');
      const employeeId = typeof inserted === 'object' ? inserted.id : inserted;
      const updatedData = { 
        lastName: 'Новый', 
        firstName: 'Имя', 
        patronymic: '', 
        position: 'Новая должность' 
      };
      const response = await makeProtectedRequest('put', `/api/employees/${employeeId}`, updatedData);
      expect(response.status).toBe(200);
      expect(response.body.lastName).toBe('Новый');
    });

    it('должен вернуть ошибку 404 при попытке обновить несуществующего сотрудника', async () => {
      const response = await makeProtectedRequest('put', '/api/employees/99999', { 
        lastName: 'Несуществующий', 
        firstName: 'Сотрудник', 
        patronymic: '', 
        position: 'Призрак' 
      });
      expect(response.status).toBe(404);
    });

    it('должен вернуть ошибку 409 при попытке присвоить ФИО уже существующего сотрудника', async () => {
      // Создаем первого сотрудника без отчества
      await knex('employees').insert({ 
        lastName: 'Иванов', 
        firstName: 'Иван', 
        patronymic: '', 
        position: 'Инженер' 
      });
      // Создаем второго сотрудника, которого будем обновлять
      const [inserted] = await knex('employees').insert({ 
        lastName: 'Петров', 
        firstName: 'Петр', 
        patronymic: '', 
        position: 'Техник' 
      }).returning('id');
      const employeeIdToUpdate = typeof inserted === 'object' ? inserted.id : inserted;
      // Пытаемся присвоить второму сотруднику ФИО первого
      const conflictingData = { 
        lastName: 'Иванов', 
        firstName: 'Иван', 
        patronymic: '', 
        position: 'Новая должность' 
      };
      const response = await makeProtectedRequest('put', `/api/employees/${employeeIdToUpdate}`, conflictingData);
      // Ожидаем конфликт, так как сервис теперь корректно находит дубликат
      expect(response.status).toBe(409);
    });
  });

  describe('DELETE /api/employees/:id', () => {
    it('должен успешно удалить сотрудника и вернуть статус 200', async () => {
      const [inserted] = await knex('employees').insert({ 
        lastName: 'Удаляемый', 
        firstName: 'Сотрудник', 
        patronymic: '', 
        position: 'Кандидат' 
      }).returning('id');
      const employeeId = typeof inserted === 'object' ? inserted.id : inserted;
      const response = await makeProtectedRequest('delete', `/api/employees/${employeeId}`);
      expect(response.status).toBe(200);
      const employeeInDb = await knex('employees').where({ id: employeeId }).first();
      expect(employeeInDb).toBeUndefined();
    });

    it('должен вернуть ошибку 404 при попытке удалить несуществующего сотрудника', async () => {
      const response = await makeProtectedRequest('delete', '/api/employees/99999');
      expect(response.status).toBe(404);
    });
  });
});
// ===================================================================
// File: services/verificationService.js (Полная итоговая версия)
// Description: Включает логику физического удаления файлов с сервера.
// ===================================================================

const { knex } = require('../config/database');
const fs = require('fs');
const path = require('path');

const TABLE_NAME = 'verification_equipment';

/**
 * Вспомогательная функция для безопасного удаления файла с сервера.
 * @param {string} filePath - Относительный путь к файлу (например, /uploads/file.pdf).
 */
const deleteFileFromServer = (filePath) => {
    if (!filePath) return; // Если пути нет, ничего не делаем

    // Путь из базы хранится с префиксом '/uploads/...'. Такой абсолютный путь
    // "обнуляет" предыдущие сегменты при использовании path.join, поэтому
    // необходимо удалить ведущий слэш.
    const sanitizedRelativePath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
    const normalizedRelativePath = path
        .normalize(sanitizedRelativePath)
        .replace(/^([.]{2}[\/])+/, '');

    // Строим полный, абсолютный путь к файлу внутри публичной директории.
    const fullPath = path.join(__dirname, '..', 'public', normalizedRelativePath);
    fs.unlink(fullPath, (err) => {
        // Игнорируем ошибку, если файла и так не существует (ENOENT)
        if (err && err.code !== 'ENOENT') {
            console.error(`Не удалось удалить файл: ${fullPath}`, err);
        }
    });
};

const dbToApi = (dbRow) => {
    if (!dbRow) return null;
    return {
        id: dbRow.id,
        name: dbRow.name,
        equipmentType: dbRow.equipment_type,
        modification: dbRow.modification,
        regNumbers: dbRow.reg_numbers ? JSON.parse(dbRow.reg_numbers) : [],
        serialNumber: dbRow.serial_number,
        inventoryNumber: dbRow.inventory_number,
        yearManufactured: dbRow.year_manufactured,
        commissionDate: dbRow.commission_date,
        lastVerificationDate: dbRow.last_verification_date,
        nextVerificationDate: dbRow.next_verification_date,
        city: dbRow.city,
        responsible: dbRow.responsible,
        notes: dbRow.notes,
        location: dbRow.location,
        certificatePath: dbRow.certificate_path,
        invoicePath: dbRow.invoice_path,
    };
};

const apiToDb = (apiObject) => {
    if (!apiObject) return null;
    return {
        name: apiObject.name,
        equipment_type: apiObject.equipmentType,
        modification: apiObject.modification || null,
        reg_numbers: apiObject.regNumbers ? JSON.stringify(apiObject.regNumbers) : JSON.stringify([]),
        serial_number: apiObject.serialNumber,
        inventory_number: apiObject.inventoryNumber,
        year_manufactured: apiObject.yearManufactured,
        commission_date: apiObject.commissionDate || null,
        last_verification_date: apiObject.lastVerificationDate,
        next_verification_date: apiObject.nextVerificationDate,
        city: apiObject.city,
        responsible: apiObject.responsible || null,
        notes: apiObject.notes || null,
        location: apiObject.location,
        certificate_path: apiObject.certificatePath, // null обработается базой
        invoice_path: apiObject.invoicePath,       // null обработается базой
    };
};

// Получить все записи
const getAll = async () => {
    const items = await knex(TABLE_NAME).select('*').orderBy('id', 'asc');
    return items.map(dbToApi);
};

// Создать новую запись
const create = async (data) => {
    const dbData = apiToDb(data);
    const [newItem] = await knex(TABLE_NAME).insert(dbData).returning('*');
    return dbToApi(newItem);
};

// Обновить запись по ID
const update = async (id, data) => {
    // 1. Получаем старую запись ДО обновления, чтобы знать, какие файлы нужно удалить
    const oldItem = await knex(TABLE_NAME).where({ id }).first();
    if (!oldItem) {
        throw new Error('Equipment not found');
    }

    const dbData = apiToDb(data);

    // 2. Сравниваем пути и удаляем старые файлы, если они были заменены или удалены
    // Если старый путь был, и он не равен новому (который может быть null или путем к новому файлу)
    if (oldItem.certificate_path && oldItem.certificate_path !== dbData.certificate_path) {
        deleteFileFromServer(oldItem.certificate_path);
    }
    if (oldItem.invoice_path && oldItem.invoice_path !== dbData.invoice_path) {
        deleteFileFromServer(oldItem.invoice_path);
    }

    // 3. Обновляем запись в базе
    const [updatedItem] = await knex(TABLE_NAME).where({ id }).update(dbData).returning('*');
    return dbToApi(updatedItem);
};

// Удалить запись по ID
const remove = async (id) => {
    // 1. Получаем запись ДО удаления, чтобы знать, какие файлы удалять
    const itemToDelete = await knex(TABLE_NAME).where({ id }).first();
    if (!itemToDelete) {
        throw new Error('Equipment not found');
    }

    // 2. Удаляем запись из базы
    await knex(TABLE_NAME).where({ id }).del();

    // 3. Удаляем связанные файлы с сервера
    deleteFileFromServer(itemToDelete.certificate_path);
    deleteFileFromServer(itemToDelete.invoice_path);
    
    return { id };
};

const getDashboardStats = async () => {
    const today = new Date();
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const todayStr = today.toISOString().split('T')[0];
    const lastDayStr = lastDayOfMonth.toISOString().split('T')[0];

    const [totalResult] = await knex(TABLE_NAME).count('id as count');
    const [expiredResult] = await knex(TABLE_NAME).where('next_verification_date', '<', todayStr).count('id as count');
    const [expiringInMonthResult] = await knex(TABLE_NAME).whereBetween('next_verification_date', [todayStr, lastDayStr]).count('id as count');

    return {
        total: totalResult.count || 0,
        expired: expiredResult.count || 0,
        expiringInMonth: expiringInMonthResult.count || 0,
    };
};

module.exports = {
    getAll,
    create,
    update,
    remove,
    getDashboardStats,
};
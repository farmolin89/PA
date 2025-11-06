// ===================================================================
// Файл: services/maintenanceService.js (ИТОГОВАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ)
// ===================================================================

const { knex } = require('../config/database');

/**
 * Получает всё оборудование и связанные с ним виды ТО.
 */
exports.getAllEquipment = async () => {
    const allEquipment = await knex('equipment').select('*').orderBy('name');
    const allServices = await knex('maintenance_services').select('*');

    const servicesByEquipmentId = allServices.reduce((acc, service) => {
        const key = service.equipment_id;
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(service);
        return acc;
    }, {});

    return allEquipment.map(equip => ({
        ...equip,
        services: servicesByEquipmentId[equip.id] || []
    }));
};

/**
 * Создает новую запись об оборудовании и связанные с ней виды ТО.
 */
exports.createEquipment = async (equipmentData) => {
    const { services, ...mainData } = equipmentData;

    const existing = await knex('equipment').whereRaw('lower(serial) = lower(?)', [mainData.serial]).first();
    if (existing) {
        throw new Error(`Оборудование с заводским номером "${mainData.serial}" уже существует.`);
    }

    return knex.transaction(async (trx) => {
        // ==================================================================
        // === ИСПРАВЛЕНИЕ ЗДЕСЬ ============================================
        // ==================================================================
        // Старый код:
        // const [newEquipmentId] = await trx('equipment').insert(mainData).returning('id');
        //
        // Новый, более универсальный код:
        const insertedRows = await trx('equipment').insert(mainData).returning('id');
        
        // Проверяем, что ID был возвращен, и извлекаем его корректно
        if (!insertedRows || insertedRows.length === 0) {
            throw new Error('Не удалось создать запись оборудования в базе данных.');
        }
        // Для Postgres insertedRows будет [{ id: 1 }], для других - [1]
        const newEquipmentId = typeof insertedRows[0] === 'object' ? insertedRows[0].id : insertedRows[0];
        // ==================================================================
        // ==================================================================
        
        if (services && Array.isArray(services) && services.length > 0) {
            const servicesToInsert = services.map(service => {
                const { id, ...rest } = service; 
                return {
                    ...rest,
                    equipment_id: newEquipmentId
                };
            });
            await trx('maintenance_services').insert(servicesToInsert);
        }

        const newEquipment = await trx('equipment').where({ id: newEquipmentId }).first();
        const newServices = await trx('maintenance_services').where({ equipment_id: newEquipmentId });
        
        return { ...newEquipment, services: newServices };
    });
};

/**
 * Обновляет оборудование и его виды ТО.
 */
exports.updateEquipment = async (id, equipmentData) => {
    const { services, ...mainData } = equipmentData;

    const existing = await knex('equipment')
        .whereRaw('lower(serial) = lower(?)', [mainData.serial])
        .whereNot('id', id)
        .first();
    if (existing) {
        throw new Error(`Другое оборудование с заводским номером "${mainData.serial}" уже существует.`);
    }

    return knex.transaction(async (trx) => {
        const updatedCount = await trx('equipment').where({ id }).update(mainData);
        if (updatedCount === 0) {
            return null;
        }

        await trx('maintenance_services').where({ equipment_id: id }).del();

        if (services && Array.isArray(services) && services.length > 0) {
            const servicesToInsert = services.map(service => {
                const { id: serviceId, ...rest } = service;
                return {
                    ...rest,
                    equipment_id: id
                };
            });
            await trx('maintenance_services').insert(servicesToInsert);
        }

        const updatedEquipment = await trx('equipment').where({ id }).first();
        const updatedServices = await trx('maintenance_services').where({ equipment_id: id });
        
        return { ...updatedEquipment, services: updatedServices };
    });
};

/**
 * Удаляет оборудование и все связанные с ним виды ТО.
 */
exports.deleteEquipment = async (id) => {
    const numDeleted = await knex('equipment').where({ id }).del();
    return numDeleted > 0;
};
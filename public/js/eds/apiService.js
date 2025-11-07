// ===================================================================
// File: public/js/eds/apiService.js (ВЕРСИЯ С ОБЩИМ API-КЛИЕНТОМ)
// ===================================================================

import { apiFetch } from '../common/api-client.js';

const API_BASE_URL = '/api/eds';

export const edsApiService = {
    /**
     * Запрашивает все записи ЭЦП с сервера.
     * @returns {Promise<Array<Object>>} Массив с данными сотрудников.
     */
    getAllSignatures() {
        return apiFetch(API_BASE_URL);
    },

    /**
     * Отправляет данные для создания или обновления записи ЭЦП.
     * @param {Object} employeeData - Данные сотрудника для сохранения.
     * @param {number|null} id - ID сотрудника для обновления, или null для создания.
     * @returns {Promise<Object>} Сохраненные данные сотрудника.
     */
    saveSignature(employeeData, id) {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_BASE_URL}/${id}` : API_BASE_URL;
        
        return apiFetch(url, {
            method: method,
            body: JSON.stringify(employeeData),
        });
    },

    /**
     * Отправляет запрос на удаление записи ЭЦП по ID.
     * @param {number} id - ID сотрудника для удаления.
     * @returns {Promise<null>}
     */
    deleteSignature(id) {
        return apiFetch(`${API_BASE_URL}/${id}`, {
            method: 'DELETE',
        });
    },
};
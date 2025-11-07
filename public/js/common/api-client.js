// ===================================================================
// Файл: public/js/common/api-client.js (Полная итоговая версия)
// ===================================================================

// ============================
// КОНФИГУРАЦИЯ ОБРАБОТЧИКОВ ОШИБОК
// ============================
let showPublicErrorCallback = (message) => console.error("Public API Error:", message);
export function registerErrorCallback(callback) { showPublicErrorCallback = callback; }
let showAdminErrorCallback = (message) => console.error("Admin API Error:", message);
export function registerAdminErrorCallback(callback) { showAdminErrorCallback = callback; }

// ============================
// КОНФИГУРАЦИЯ КЕШИРОВАНИЯ
// ============================
const CACHEABLE_ENDPOINTS = [
    '/api/employees', '/api/organizations', '/api/trips', '/api/vacations',
    '/api/maintenance/equipment', '/api/eds', '/api/admin/tests',
    '/api/verification/equipment'
];

// ============================
// ОСНОВНАЯ ФУНКЦИЯ API FETCH
// ============================
export async function apiFetch(url, options = {}) {
    const urlString = url.toString();
    const method = options.method || 'GET';
    if (method === 'GET' && CACHEABLE_ENDPOINTS.some(endpoint => urlString.startsWith(endpoint))) {
        const cachedData = sessionStorage.getItem(urlString);
        if (cachedData) return JSON.parse(cachedData);
    }
    if (['POST', 'PUT', 'DELETE'].includes(method)) {
        CACHEABLE_ENDPOINTS.forEach(endpoint => {
            if (urlString.startsWith(endpoint.split('/:')[0])) {
                Object.keys(sessionStorage).forEach(key => {
                    if (key.startsWith(endpoint.split('/:')[0])) sessionStorage.removeItem(key);
                });
            }
        });
    }
    const defaultOptions = { headers: { 'Content-Type': 'application/json' } };
    if (method !== 'GET') {
        let csrfToken = document.cookie.split('; ').find(row => row.startsWith('_csrf='))?.split('=')[1];
        if (!csrfToken) {
            try {
                const response = await fetch('/api/csrf-token', { credentials: 'include' });
                if (response.ok) csrfToken = (await response.json())?.csrfToken;
            } catch (error) { console.error('[CSRF] Не удалось получить токен с сервера.', error); }
        }
        if (csrfToken) {
            defaultOptions.headers['x-csrf-token'] = csrfToken;
            if (options.body instanceof FormData) {
                options.body.append('_csrf', csrfToken);
                delete defaultOptions.headers['Content-Type'];
            } else {
                const payload = options.body ? JSON.parse(options.body) : {};
                if (!('_csrf' in payload)) payload._csrf = csrfToken;
                options.body = JSON.stringify(payload);
            }
        } else { console.warn('[CSRF] Не удалось получить CSRF-токен для запроса.'); }
    }
    const config = { credentials: 'include', ...defaultOptions, ...options, headers: { ...defaultOptions.headers, ...options.headers } };
    try {
        const response = await fetch(url, config);
        if (!response.ok) {
            let serverMessage = null;
            try {
                const data = await response.json();
                // Универсальный парсер: ищет ошибку в data.message или в data.errors[0].message
                serverMessage = data.message || data.errors?.[0]?.message;
            } catch (e) {
                // Игнорируем ошибку, если тело ответа не JSON или пустое
            }
            
            let errorMessage = serverMessage || `Ошибка сервера: ${response.status}`;
            if (response.status === 403 && !serverMessage) {
                errorMessage = 'Ошибка безопасности (CSRF). Пожалуйста, обновите страницу и попробуйте снова.';
            }

            // Вызываем колбэк с более точным сообщением об ошибке
            urlString.includes('/api/public/') ? showPublicErrorCallback(errorMessage) : showAdminErrorCallback(errorMessage);
            throw new Error(errorMessage);
        }
        if (response.status === 204 || response.headers.get('content-length') === '0') return null;
        const data = await response.json();
        if (method === 'GET' && CACHEABLE_ENDPOINTS.some(endpoint => urlString.startsWith(endpoint))) {
            sessionStorage.setItem(urlString, JSON.stringify(data));
        }
        return data;
    } catch (error) {
        if (error.message.includes('Failed to fetch')) {
            const networkErrorMsg = 'Не удалось связаться с сервером. Проверьте ваше интернет-соединение.';
            urlString.includes('/api/public/') ? showPublicErrorCallback(networkErrorMsg) : showAdminErrorCallback(networkErrorMsg);
        }
        throw error;
    }
}


// ============================
// PUBLIC API ФУНКЦИИ
// ============================
export const fetchPublicTests = (fio) => apiFetch(`/api/public/tests?fio=${encodeURIComponent(fio)}`);
export const getLastResultProtocol = (testId, fio) => apiFetch(`/api/public/results/last?testId=${testId}&fio=${encodeURIComponent(fio)}`);
export const startTestSession = (testId) => apiFetch(`/api/public/tests/${testId}/start`, { method: 'POST' });
export const fetchQuestions = (testId) => apiFetch(`/api/public/tests/${testId}/questions`); // Переименовано для ясности
export const submitAnswers = (testId, fio, userAnswers) => apiFetch(`/api/public/tests/${testId}/submit`, { method: 'POST', body: JSON.stringify({ fio, userAnswers }) }); // Переименовано для ясности

// ============================
// ADMIN API ФУНКЦИИ
// ============================
export const fetchTests = () => apiFetch('/api/admin/tests');
export const createTest = (testData) => apiFetch('/api/admin/tests', { method: 'POST', body: JSON.stringify(testData) });
export const renameTest = (testId, newName) => apiFetch(`/api/admin/tests/${testId}/rename`, { method: 'PUT', body: JSON.stringify({ name: newName }) });
export const updateTestStatus = (testId, isActive) => apiFetch(`/api/admin/tests/${testId}/status`, { method: 'PUT', body: JSON.stringify({ isActive }) });
export const deleteTest = (testId) => apiFetch(`/api/admin/tests/${testId}`, { method: 'DELETE' });
export const fetchTestSettings = (testId) => apiFetch(`/api/admin/tests/${testId}/settings`);
export const saveTestSettings = (testId, settingsData) => apiFetch(`/api/admin/tests/${testId}/settings`, { method: 'POST', body: JSON.stringify(settingsData) });
export const fetchResults = (testId, params = {}) => apiFetch(`/api/admin/tests/${testId}/results?${new URLSearchParams(params)}`);
export const deleteResults = (ids) => apiFetch('/api/admin/results/delete-bulk', { method: 'POST', body: JSON.stringify({ ids }) });
export const fetchProtocol = (resultId) => apiFetch(`/api/admin/results/${resultId}/protocol`);
export const fetchAllQuestions = (testId) => apiFetch(`/api/admin/tests/${testId}/questions`);
export const addQuestion = (testId, questionData) => apiFetch(`/api/admin/tests/${testId}/questions/add`, { method: 'POST', body: JSON.stringify(questionData) });
export const updateQuestion = (questionData) => apiFetch('/api/admin/questions/update', { method: 'POST', body: JSON.stringify(questionData) });
export const deleteQuestions = (ids) => apiFetch('/api/admin/questions/delete-bulk', { method: 'POST', body: JSON.stringify({ ids }) });
export const fetchTestAnalytics = (testId) => apiFetch(`/api/admin/tests/${testId}/analytics`);
export const fetchOverallAnalytics = () => apiFetch('/api/admin/analytics/overall');
export const fetchTestingSummary = () => apiFetch('/api/admin/tests/summary');
export const fetchInviteLink = () => apiFetch('/api/admin/invite-link');
export const fetchQuestionsForReview = (resultId) => apiFetch(`/api/admin/results/${resultId}/review`);
export const submitBatchReview = (verdicts) => apiFetch('/api/admin/review/submit-batch', { method: 'POST', body: JSON.stringify({ verdicts }) });

// ============================
// MAINTENANCE API
// ============================
const MAINTENANCE_API_BASE = '/api/maintenance';
export const getEquipment = () => apiFetch(`${MAINTENANCE_API_BASE}/equipment`);
export const createEquipment = (equipmentData) => apiFetch(`${MAINTENANCE_API_BASE}/equipment`, { method: 'POST', body: JSON.stringify(equipmentData) });
export const updateEquipment = (id, equipmentData) => apiFetch(`${MAINTENANCE_API_BASE}/equipment/${id}`, { method: 'PUT', body: JSON.stringify(equipmentData) });
export const deleteEquipment = (id) => apiFetch(`${MAINTENANCE_API_BASE}/equipment/${id}`, { method: 'DELETE' });

// ============================
// EDS API
// ============================
const EDS_API_BASE = '/api/eds';
export const getAllSignatures = () => apiFetch(EDS_API_BASE);
export const saveSignature = (employeeData, id) => {
    const method = id ? 'PUT' : 'POST';
    const url = id ? `${EDS_API_BASE}/${id}` : EDS_API_BASE;
    return apiFetch(url, { method: method, body: JSON.stringify(employeeData) });
};
export const deleteSignature = (id) => apiFetch(`${EDS_API_BASE}/${id}`, { method: 'DELETE' });

// ============================
// VERIFICATION API
// ============================
const VERIFICATION_API_BASE = '/api/verification/equipment';
export const getVerificationEquipment = () => apiFetch(VERIFICATION_API_BASE);

export const createVerificationEquipment = (formData) => apiFetch(VERIFICATION_API_BASE, {
    method: 'POST',
    body: formData,
});

export const updateVerificationEquipment = (id, formData) => apiFetch(`${VERIFICATION_API_BASE}/${id}`, {
    method: 'PUT',
    body: formData,
});

export const deleteVerificationEquipment = (id) => apiFetch(`${VERIFICATION_API_BASE}/${id}`, { method: 'DELETE' });
export const fetchVerificationStats = () => apiFetch(`/api/verification/stats`);

// ============================
// УНИВЕРСАЛЬНЫЙ API ИНТЕРФЕЙС
// ============================
export const api = {
    get: (url) => apiFetch(url),
    post: (url, data) => apiFetch(url, { method: 'POST', body: JSON.stringify(data) }),
    put: (url, data) => apiFetch(url, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (url) => apiFetch(url, { method: 'DELETE' }),
};
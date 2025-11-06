// ===================================================================
// Файл: public/js/utils/utils.js (ИТОГОВАЯ ВЕРСИЯ)
// ===================================================================
// Этот модуль содержит общие вспомогательные функции, используемые
// в разных частях фронтенд-приложения.

/**
 * Экранирует HTML-теги в строке для безопасной вставки в DOM (защита от XSS).
 * @param {any} unsafe - Входные данные. Если не строка, будет возвращена пустая строка.
 * @returns {string} Безопасная строка.
 */
export function escapeHTML(unsafe) {
    if (typeof unsafe !== 'string') return '';
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

/**
 * Словарь с формами русских слов для функции плюрализации.
 * @type {Object.<string, string[]>}
 */
const pluralForms = {
  question: ['вопрос', 'вопроса', 'вопросов'],
  minute: ['минута', 'минуты', 'минут'],
  score: ['балл', 'балла', 'баллов'],
  result: ['результат', 'результата', 'результатов'],
};

/**
 * Возвращает правильную форму русского слова для указанного числительного.
 * @param {number} count - Число, для которого подбирается форма слова.
 * @param {string} key - Ключ слова из словаря pluralForms (например, 'question').
 * @returns {string} Правильная форма слова.
 */
export function pluralize(count, key) {
    const forms = pluralForms[key];
    if (!forms) return ''; // Возвращаем пустую строку, если ключ не найден

    const absCount = Math.abs(count);
    
    // Правила для русского языка
    const n = absCount % 100;
    const n1 = absCount % 10;

    if (n > 10 && n < 20) return forms[2]; // для 11-19
    if (n1 > 1 && n1 < 5) return forms[1]; // для 2-4
    if (n1 === 1) return forms[0];        // для 1

    return forms[2]; // для 0, 5-9
}
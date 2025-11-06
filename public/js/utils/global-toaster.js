// ===================================================================
// File: public/js/utils/global-toaster.js (ПОЛНАЯ ИТОГОВАЯ ВЕРСИЯ)
// ===================================================================
//
// Этот файл создает глобально доступный объект 'toast' для вызова уведомлений.
// Он должен подключаться во всех HTML-файлах после библиотеки Toastify,
// но перед основными скриптами страницы, которые его используют.

(function() {
    // Проверяем, был ли объект уже создан, чтобы избежать повторной инициализации.
    // Также проверяем, что сама библиотека Toastify загружена.
    if (window.toast || typeof Toastify === 'undefined') {
        return;
    }

    // Базовая конфигурация для всех уведомлений
    const baseConfig = {
        duration: 3000,       // 3 секунды
        close: true,          // Показывать крестик для закрытия
        gravity: "top",       // Появляться сверху
        position: "right",    // В правом углу
        stopOnFocus: true,    // Останавливать таймер, если навести курсор
    };

    /**
     * Показывает уведомление об успехе (зеленое).
     * @param {string} text - Сообщение для отображения.
     */
    function success(text) {
        Toastify({
            ...baseConfig,
            text,
            style: {
                background: "linear-gradient(to right, #00b09b, #96c93d)",
            }
        }).showToast();
    }

    /**
     * Показывает уведомление об ошибке (красное).
     * @param {string} text - Сообщение для отображения.
     */
    function error(text) {
        Toastify({
            ...baseConfig,
            text,
            duration: 5000, // Ошибки показываем дольше
            style: {
                background: "linear-gradient(to right, #ff5f6d, #ffc371)",
            }
        }).showToast();
    }

    /**
     * Показывает информационное уведомление (синее).
     * @param {string} text - Сообщение для отображения.
     */
    function info(text) {
        Toastify({
            ...baseConfig,
            text,
            style: {
                background: "linear-gradient(to right, #0078D4, #50B0F0)",
            }
        }).showToast();
    }

    // Прикрепляем наш объект к глобальному объекту window,
    // делая его доступным для всех скриптов на странице.
    window.toast = {
        success,
        error,
        info
    };

})(); // Самовызывающаяся функция для изоляции области видимости переменных (baseConfig и др.).
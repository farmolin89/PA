// ===================================================================
// Файл: event-emitter.js (ИТОГОВАЯ ВЕРСИЯ)
// ===================================================================

// Массив для хранения всех активных клиентских подключений
let clients = [];

/**
 * Инициализирует эндпоинт для Server-Sent Events (SSE).
 * @param {object} app - Экземпляр Express-приложения.
 */
function initializeSSE(app) {
  app.get('/api/events', (req, res) => {
    // Настраиваем заголовки для SSE-соединения
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const clientId = Date.now();
    clients.push({ id: clientId, res });
    console.log(`[SSE] Клиент ${clientId} подключен. Всего клиентов: ${clients.length}`);

    // При закрытии соединения клиентом, удаляем его из списка
    req.on('close', () => {
      clients = clients.filter(client => client.id !== clientId);
      console.log(`[SSE] Клиент ${clientId} отключен. Всего клиентов: ${clients.length}`);
    });
  });
}

/**
 * Отправляет событие всем подключенным клиентам.
 * @param {object} data - Данные для отправки (будут преобразованы в JSON).
 * @param {string} [eventName='message'] - Название события.
 */
function sendEvent(data, eventName = 'message') {
  if (clients.length === 0) return;
  
  const message = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  console.log(`[SSE] Отправка события '${eventName}'...`);
  clients.forEach(client => client.res.write(message));
}

module.exports = { initializeSSE, sendEvent };
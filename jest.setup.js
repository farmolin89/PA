process.env.NODE_ENV = 'test';
if (!process.env.SESSION_SECRET) {
  process.env.SESSION_SECRET = 'test-session-secret';
}
if (!process.env.CSRF_SECRET) {
  process.env.CSRF_SECRET = '12345678901234567890123456789012';
}

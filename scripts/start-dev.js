#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const serverEntry = path.resolve(__dirname, '..', 'server.js');

function runProcess(command, args) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'development' },
  });

  const terminate = signal => {
    if (child.exitCode === null) {
      child.kill(signal);
    }
  };

  process.on('SIGINT', terminate);
  process.on('SIGTERM', terminate);

  child.on('exit', code => {
    process.exit(code ?? 0);
  });
}

try {
  const nodemonBinary = require.resolve('nodemon/bin/nodemon.js');
  runProcess(process.execPath, [nodemonBinary, serverEntry]);
} catch (error) {
  if (error && error.code === 'MODULE_NOT_FOUND') {
    console.warn('[dev] Nodemon не установлен. Выполните "npm install" для установки зависимостей.');
    console.warn('[dev] Запуск приложения в обычном режиме без автоматической перезагрузки.');
    runProcess(process.execPath, [serverEntry]);
  } else {
    throw error;
  }
}

#!/usr/bin/env node

const fs = require('fs');
const { spawn, spawnSync } = require('child_process');
const path = require('path');

const serverEntry = path.resolve(__dirname, '..', 'server.js');
const projectRoot = path.resolve(__dirname, '..');

function ensureDependencies() {
  const modulesDir = path.join(projectRoot, 'node_modules');

  if (fs.existsSync(modulesDir)) {
    return;
  }

  console.log('[dev] Обнаружено отсутствие директории node_modules. Выполняю "npm install" для установки зависимостей...');
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const installResult = spawnSync(npmCommand, ['install'], { stdio: 'inherit', cwd: projectRoot });

  if (installResult.status !== 0) {
    console.error('[dev] Не удалось автоматически установить зависимости. Выполните "npm install" вручную и повторите запуск.');
    process.exit(installResult.status ?? 1);
  }
}

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

ensureDependencies();

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

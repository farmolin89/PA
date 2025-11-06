#!/usr/bin/env node

const fs = require('fs');
const { spawn, spawnSync } = require('child_process');
const path = require('path');

const serverEntry = path.resolve(__dirname, '..', 'server.js');
const projectRoot = path.resolve(__dirname, '..');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function ensureDependencies() {
  const modulesDir = path.join(projectRoot, 'node_modules');

  if (fs.existsSync(modulesDir)) {
    return;
  }

  console.log('[dev] Обнаружено отсутствие директории node_modules. Выполняю "npm install" для установки зависимостей...');
  const installResult = spawnSync(npmCommand, ['install'], { stdio: 'inherit', cwd: projectRoot });

  if (installResult.status !== 0) {
    console.error('[dev] Не удалось автоматически установить зависимости. Выполните "npm install" вручную и повторите запуск.');
    process.exit(installResult.status ?? 1);
  }
}

function runProcess(command, args, { onExit, onError } = {}) {
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

  const cleanup = () => {
    process.off('SIGINT', terminate);
    process.off('SIGTERM', terminate);
  };

  child.on('exit', code => {
    cleanup();
    if (typeof onExit === 'function') {
      onExit(code ?? 0);
      return;
    }
    process.exit(code ?? 0);
  });

  child.on('error', error => {
    cleanup();
    if (typeof onError === 'function') {
      onError(error);
      return;
    }
    console.error('[dev] Не удалось запустить дочерний процесс:', error);
    process.exit(1);
  });

  return child;
}

ensureDependencies();

try {
  const nodemonBinary = require.resolve('nodemon/bin/nodemon.js');
  runProcess(process.execPath, [nodemonBinary, serverEntry]);
} catch (error) {
  if (error && error.code === 'MODULE_NOT_FOUND') {
    console.warn('[dev] Nodemon не найден среди локальных зависимостей.');
    console.warn('[dev] Пытаюсь запустить его через "npm exec" (требуется npm 7+).');

    runProcess(npmCommand, ['exec', '--', 'nodemon', serverEntry], {
      onExit(code) {
        if (code === 0) {
          process.exit(0);
        }

        console.warn(`[dev] Завершение "npm exec nodemon" с кодом ${code}.`);
        console.warn('[dev] Запуск приложения в обычном режиме без автоматической перезагрузки.');
        runProcess(process.execPath, [serverEntry]);
      },
      onError(execError) {
        console.warn('[dev] Не удалось запустить nodemon через "npm exec":', execError.message);
        console.warn('[dev] Запуск приложения в обычном режиме без автоматической перезагрузки.');
        runProcess(process.execPath, [serverEntry]);
      },
    });
  } else {
    throw error;
  }
}

#!/usr/bin/env node
/**
 * Скрипт предварительной проверки перед запуском режима разработки.
 * Убеждается, что установлены зависимости и доступен nodemon.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const nodeModulesDir = path.join(projectRoot, 'node_modules');
const nodemonBin = path.join(nodeModulesDir, 'nodemon', 'bin', 'nodemon.js');

function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch (err) {
    return false;
  }
}

function ensureDependencies() {
  if (exists(nodemonBin)) {
    return;
  }

  if (!exists(nodeModulesDir)) {
    console.log('Каталог node_modules не найден. Запускается установка зависимостей...');
  } else {
    console.log('Nodemon отсутствует. Запускается переустановка зависимостей...');
  }

  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const install = spawnSync(npmCmd, ['install'], {
    cwd: projectRoot,
    stdio: 'inherit',
    env: process.env,
  });

  if (install.status !== 0) {
    console.error(`npm install завершился с кодом ${install.status}.`);
    process.exit(install.status || 1);
  }

  if (!exists(nodemonBin)) {
    console.error('После установки зависимостей nodemon по-прежнему недоступен.');
    console.error('Проверьте файл package.json и повторите попытку.');
    process.exit(1);
  }
}

ensureDependencies();

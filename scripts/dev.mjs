// Watcher de desarrollo. Ignora node_modules y la base de datos para evitar
// reinicios en bucle provocados por cambios internos de dependencias.
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const WATCH_DIRS = ['src'];
const IGNORED = ['node_modules', 'data', '.git', 'dist'];

let child = null;
let restarting = false;
let pending = false;

function start() {
  child = spawn(process.execPath, ['src/server.js'], {
    cwd: rootDir,
    stdio: 'inherit',
    env: process.env,
  });

  child.on('exit', (code) => {
    child = null;

    if (restarting) {
      restarting = false;
      start();
      return;
    }

    if (code !== 0 && code !== null) {
      console.error(`\nEl servidor se detuvo con codigo ${code}.`);
      console.error('No se reiniciara automaticamente. Revisa el mensaje de arriba.\n');
    }
  });
}

function restart() {
  if (!child) {
    start();
    return;
  }

  if (restarting) {
    pending = true;
    return;
  }

  restarting = true;

  // Keep a reference to the process being replaced. The global `child` will
  // point to the replacement once it starts, so the force kill below must not
  // read from it or it would terminate the new process.
  const previous = child;

  previous.once('exit', () => {
    if (pending) {
      pending = false;
      setTimeout(start, 100);
    }
  });

  previous.kill('SIGTERM');

  setTimeout(() => {
    if (previous.exitCode === null && previous.signalCode === null) {
      previous.kill('SIGKILL');
    }
  }, 3000);
}

let timer = null;

function schedule() {
  clearTimeout(timer);
  timer = setTimeout(restart, 120);
}

for (const dir of WATCH_DIRS) {
  const full = path.join(rootDir, dir);
  if (!fs.existsSync(full)) continue;

  fs.watch(full, { recursive: true }, (_event, filename) => {
    if (!filename) return;
    if (IGNORED.some((segment) => filename.split(path.sep).includes(segment))) return;
    if (filename.includes('.sqlite')) return;
    schedule();
  });
}

console.log('Vigilando cambios en src/ ... (Ctrl+C para detener)');
start();

import { execSync } from 'node:child_process';
import env from './config/env.js';
import { createApp } from './app.js';
import { closeDatabase } from './db/connection.js';
import { isOpenAiConfigured } from './services/ai/openaiProvider.js';

const app = createApp();

function findProcessOnPort(port) {
  try {
    const isWindows = process.platform === 'win32';
    const command = isWindows ? `netstat -ano | findstr :${port}` : `lsof -ti :${port}`;
    const output = execSync(command, { encoding: 'utf8' });

    if (isWindows) {
      const lines = output.split('\n').filter((line) => line.includes('LISTENING'));
      if (lines.length === 0) return [];

      const pids = lines
        .map((line) => {
          const parts = line.trim().split(/\s+/);
          return Number(parts[parts.length - 1]);
        })
        .filter((pid) => Number.isFinite(pid) && pid > 0 && pid !== process.pid);

      return [...new Set(pids)].map((pid) => ({ pid }));
    }

    return output
      .split('\n')
      .map((pid) => Number(pid.trim()))
      .filter(Boolean);
  } catch {
    return [];
  }
}

const server = app.listen(env.port);

server.on('listening', () => {
  const aiMode = isOpenAiConfigured()
    ? `OpenAI (${env.ai.model})`
    : 'proveedor local (sin API key)';

  console.log('');
  console.log('  BabyTrack IA - API');
  console.log(`  Entorno:   http://localhost:${env.port}`);
  console.log(`  Health:    http://localhost:${env.port}/api/health`);
  console.log(`  Base:      ${env.databaseFile}`);
  console.log(`  IA:        ${aiMode}`);
  console.log(`  CORS:      ${env.corsOrigin.join(', ')}`);
  console.log('');
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    const conflicts = findProcessOnPort(env.port);

    console.error('');
    console.error(`  El puerto ${env.port} ya esta en uso.`);
    console.error('');

    if (conflicts.length > 0) {
      console.error('  Procesos que lo ocupan:');
      for (const { pid } of conflicts) {
        console.error(`    PID ${pid}`);
      }
      console.error('');
      console.error('  Para detenerlos en Windows:');
      for (const { pid } of conflicts) {
        console.error(`    taskkill /PID ${pid} /F`);
      }
    }

    console.error('');
    console.error('  O cambia el puerto en el archivo .env:');
    console.error('    PORT=4002');
    console.error('  y actualiza el proxy del frontend:');
    console.error('    VITE_PROXY_TARGET=http://localhost:4002');
    console.error('');
  } else {
    console.error('  Error al iniciar el servidor:', error.message);
  }

  closeDatabase();
  process.exit(1);
});

function shutdown(signal) {
  console.log(`\n${signal} recibido, cerrando servidor...`);
  server.close(() => {
    closeDatabase();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

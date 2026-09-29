import { execSync } from 'node:child_process';
import env from './config/env.js';
import { createApp } from './app.js';
import { closeDatabase } from './db/connection.js';
import { isOpenAiConfigured } from './services/ai/openaiProvider.js';

const app = createApp();

function readCommandLine(pid) {
  try {
    const output = execSync(`wmic process where processid=${pid} get CommandLine /value`, {
      encoding: 'utf8',
    });
    return output.trim();
  } catch {
    try {
      return execSync(`ps -p ${pid} -o command=`, { encoding: 'utf8' }).trim();
    } catch {
      return '';
    }
  }
}

function findOwners(port) {
  try {
    const isWindows = process.platform === 'win32';
    const output = execSync(isWindows ? `netstat -ano | findstr :${port}` : `lsof -ti :${port}`, {
      encoding: 'utf8',
    });

    const pids = isWindows
      ? output
          .split('\n')
          .filter((line) => line.includes('LISTENING'))
          .map((line) => Number(line.trim().split(/\s+/).pop()))
          .filter((pid) => Number.isFinite(pid) && pid > 0 && pid !== process.pid)
      : output
          .split('\n')
          .map((value) => Number(value.trim()))
          .filter((pid) => Number.isFinite(pid) && pid > 0 && pid !== process.pid);

    return [...new Set(pids)].map((pid) => {
      const commandLine = readCommandLine(pid);
      const match = commandLine.match(/Proyectos_Mideros[\\/]([^\\"]+?)[\\/]+([^\\"\s]+)/);
      return {
        pid,
        project: match ? `${match[1]}/${match[2]}` : 'otro proyecto',
        isSameProject: commandLine.includes('Back_Babi'),
      };
    });
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
    const owners = findOwners(env.port);

    console.error('');
    console.error(`  El puerto ${env.port} ya esta en uso.`);

    if (owners.length > 0) {
      console.error('');
      for (const owner of owners) {
        const tag = owner.isSameProject
          ? ' (otra copia de BabyTrack)'
          : ' (proyecto distinto)';
        console.error(`    PID ${owner.pid} - ${owner.project}${tag}`);
      }
    }

    console.error('');
    console.error('  Libera el puerto:');
    for (const owner of owners) {
      console.error(`    taskkill /PID ${owner.pid} /F`);
    }
    console.error('');
    console.error('  O cambia el puerto en Back_Babi/.env:');
    console.error('    PORT=4002');
    console.error('  y actualiza Fron_Babi/.env:');
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

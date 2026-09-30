import env from './config/env.js';
import { createApp } from './app.js';
import { closeDatabase } from './db/connection.js';
import { isOpenAiConfigured } from './services/ai/openaiProvider.js';
import { findPortOwners } from './utils/ports.js';

const app = createApp();

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
    const owners = findPortOwners(env.port);

    console.error('');
    console.error(`  El puerto ${env.port} ya esta en uso.`);

    if (owners.length > 0) {
      console.error('');
      for (const owner of owners) {
        const tag = owner.commandLine.includes('Back_Babi')
          ? ' (otra copia de BabyTrack)'
          : ' (otro proyecto)';
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

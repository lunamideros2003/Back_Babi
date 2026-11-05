import env from './config/env.js';
import { createApp } from './app.js';
import { closeDatabase, DRIVER } from './db/connection.js';
import { bootState } from './db/index.js';
import { isOpenAiConfigured } from './services/ai/openaiProvider.js';
import { findPortOwners } from './utils/ports.js';

const app = await createApp();

const server = app.listen(env.port);

server.on('listening', () => {
  const aiMode = isOpenAiConfigured()
    ? `OpenAI (${env.ai.model})`
    : 'local provider (no API key)';

  console.log('');
  console.log('  BabyTrack IA - API');
  console.log(`  Environment: ${env.nodeEnv}`);
  console.log(`  Database:    ${env.databaseUrl ? 'Supabase / Postgres' : env.databaseFile}`);
  console.log(`  Health:      http://localhost:${env.port}/api/health`);
  console.log(`  AI:          ${aiMode}`);
  console.log(`  CORS:        ${env.corsOrigin.join(', ')}`);
  console.log(
    `  DB status:   ${bootState.database.ready ? `ready (${bootState.database.weeks} weeks)` : 'NOT available'}`,
  );
  if (!bootState.database.ready) {
    console.log(`  DB error:    ${bootState.database.error}`);
  }
  console.log('');
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    const owners = findPortOwners(env.port);

    console.error('');
    console.error(`  Port ${env.port} is already in use.`);

    if (owners.length > 0) {
      console.error('');
      for (const owner of owners) {
        const tag = owner.commandLine.includes('Back_Babi')
          ? ' (another BabyTrack copy)'
          : ' (another project)';
        console.error(`    PID ${owner.pid} - ${owner.project}${tag}`);
      }
    }

    console.error('');
    console.error('  Free the port:');
    for (const owner of owners) {
      console.error(`    taskkill /PID ${owner.pid} /F`);
    }
    console.error('');
    console.error('  Or change the port in Back_Babi/.env:');
    console.error('    PORT=4002');
    console.error('  and update Fron_Babi/.env:');
    console.error('    VITE_PROXY_TARGET=http://localhost:4002');
    console.error('');
  } else {
    console.error('  Failed to start the server:', error.message);
  }

  closeDatabase().finally(() => process.exit(1));
});

function shutdown(signal) {
  console.log(`\n${signal} received, shutting down server...`);
  server.close(() => {
    closeDatabase().finally(() => process.exit(0));
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

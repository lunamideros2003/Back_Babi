import { Router } from 'express';
import env from '../config/env.js';
import { CATEGORIES } from '../services/ai/classifier.js';
import { isOpenAiConfigured } from '../services/ai/openaiProvider.js';
import { DISCLAIMER } from '../config/disclaimers.js';
import { all, get, DRIVER } from '../db/connection.js';
import { bootState } from '../db/index.js';
import { APP_VERSION, BUILD_COMMIT, STARTED_AT } from '../config/version.js';

const router = Router();

router.get('/version', (_req, res) => {
  res.json({
    ok: true,
    version: APP_VERSION,
    commit: BUILD_COMMIT,
    started_at: STARTED_AT,
    uptime_seconds: Math.round((Date.now() - STARTED_AT) / 1000),
  });
});

router.get('/health', async (_req, res) => {
  const weeks = await get('SELECT COUNT(*) AS total FROM weeks').catch(() => null);
  const users = await get('SELECT COUNT(*) AS total FROM users').catch(() => null);

  const databaseReady = bootState.database.ready && weeks !== null;

  res.json({
    ok: databaseReady,
    status: databaseReady ? 'up' : 'degraded',
    database: databaseReady ? DRIVER : 'error',
    weeks_loaded: Number(weeks?.total ?? 0),
    users_registered: Number(users?.total ?? 0),
    version: APP_VERSION,
    commit: BUILD_COMMIT,
    uptime_seconds: Math.round((Date.now() - STARTED_AT) / 1000),
    ai: {
      provider: env.ai.provider,
      model: env.ai.model,
      ready: isOpenAiConfigured(),
      active: isOpenAiConfigured() ? 'openai' : 'local',
    },
    categories: CATEGORIES.length,
    disclaimer: DISCLAIMER,
    ...(databaseReady
      ? {}
      : { database_error: bootState.database.error ?? 'sin conexion a la base de datos' }),
  });
});

router.get('/categories', async (_req, res) => {
  res.json({ ok: true, categories: CATEGORIES.map(({ key, label }) => ({ key, label })) });
});

router.get('/ports', async (_req, res) => {
  res.json({
    ok: true,
    project: 'BabyTrack IA',
    backend: {
      port: env.port,
      url: `http://localhost:${env.port}`,
      role: 'BabyTrack API (not the frontend)',
    },
    frontend: {
      port: 5180,
      url: 'http://localhost:5180',
      role: 'BabyTrack interface',
    },
    tip:
      'If you see another application in the browser, you are on the wrong port. ' +
      `BabyTrack opens at http://localhost:5180 and its API responds at http://localhost:${env.port}/api/health.`,
  });
});

export { all };
export default router;

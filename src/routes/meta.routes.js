import { Router } from 'express';
import env from '../config/env.js';
import { CATEGORIES } from '../services/ai/classifier.js';
import { isOpenAiConfigured } from '../services/ai/openaiProvider.js';
import { DISCLAIMER } from '../config/disclaimers.js';
import { all, get } from '../db/connection.js';

const router = Router();

router.get('/health', (_req, res) => {
  const weeks = get('SELECT COUNT(*) AS total FROM weeks');
  const users = get('SELECT COUNT(*) AS total FROM users');

  res.json({
    ok: true,
    status: 'up',
    database: 'sqlite',
    weeks_loaded: Number(weeks?.total ?? 0),
    users_registered: Number(users?.total ?? 0),
    ai: {
      provider: env.ai.provider,
      model: env.ai.model,
      ready: isOpenAiConfigured(),
      active: isOpenAiConfigured() ? 'openai' : 'local',
    },
    categories: CATEGORIES.length,
    disclaimer: DISCLAIMER,
  });
});

router.get('/categories', (_req, res) => {
  res.json({ ok: true, categories: CATEGORIES.map(({ key, label }) => ({ key, label })) });
});

export { all };
export default router;

import { Router } from 'express';
import { buildGuide } from '../services/guideService.js';

const router = Router();

router.get('/', async (_req, res) => {
  res.json({ ok: true, ...buildGuide() });
});

export default router;

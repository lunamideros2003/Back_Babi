import { Router } from 'express';
import * as repo from '../repositories/index.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/index.js';
import { toISODate } from '../utils/pregnancyMath.js';

const router = Router();
router.use(requireAuth);

const entrySchema = {
  mood: { type: 'string', max: 24 },
  content: { type: 'string', required: true, min: 2, max: 4000 },
  entry_date: { type: 'date' },
};

router.get('/', async (req, res) => {
  res.json({ ok: true, entries: await repo.listJournalEntries(req.user.id) });
});

router.post('/', validate(entrySchema), async (req, res) => {
  const pregnancy = await repo.getPregnancy(req.user.id);

  const entry = await repo.createJournalEntry(req.user.id, {
    ...req.validated,
    entry_date: req.validated.entry_date ?? toISODate(new Date()),
    pregnancy_week: pregnancy?.current_week ?? null,
  });

  res.status(201).json({ ok: true, entry });
});

router.delete('/:id', async (req, res) => {
  await repo.deleteJournalEntry(req.user.id, Number(req.params.id));
  res.json({ ok: true });
});

export default router;

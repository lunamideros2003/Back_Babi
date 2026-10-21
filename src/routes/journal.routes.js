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
  const limit = Math.min(Math.max(Number(req.query.limit ?? 50), 1), 200);
  const offset = Math.max(Number(req.query.offset ?? 0), 0);

  const [entries, total] = await Promise.all([
    repo.listJournalEntries(req.user.id, { limit, offset }),
    repo.countJournalEntries(req.user.id),
  ]);

  res.json({
    ok: true,
    entries,
    total,
    limit,
    offset,
    has_more: offset + entries.length < total,
  });
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

import { Router } from 'express';
import * as repo from '../repositories/index.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/index.js';
import { NotFoundError } from '../utils/errors.js';
import { dueDateFromLastPeriod, dueDateFromWeek } from '../utils/pregnancyMath.js';

const router = Router();
router.use(requireAuth);

const pregnancySchema = {
  dueDate: { type: 'date' },
  lastPeriodDate: { type: 'date' },
  currentWeek: { type: 'number', min: 1, max: 42 },
  babyName: { type: 'string', max: 60 },
  notes: { type: 'string', max: 1000 },
};

function resolveDueDate({ dueDate, lastPeriodDate, currentWeek }) {
  if (dueDate) return dueDate;
  if (lastPeriodDate) return dueDateFromLastPeriod(lastPeriodDate);
  if (currentWeek) return dueDateFromWeek(currentWeek);
  return null;
}

router.get('/', (req, res) => {
  res.json({ ok: true, pregnancy: repo.pregnancySummary(req.user.id) });
});

router.post('/', validate(pregnancySchema), (req, res) => {
  const resolved = resolveDueDate(req.validated);
  if (!resolved) throw new NotFoundError('Fecha estimada de parto');

  repo.upsertPregnancy(req.user.id, resolved, {
    babyName: req.validated.babyName,
    notes: req.validated.notes,
  });

  res.status(201).json({ ok: true, pregnancy: repo.pregnancySummary(req.user.id) });
});

router.put('/', validate(pregnancySchema), (req, res) => {
  const resolved = resolveDueDate(req.validated);

  if (resolved) {
    repo.upsertPregnancy(req.user.id, resolved, {
      babyName: req.validated.babyName,
      notes: req.validated.notes,
    });
  } else if (!repo.getPregnancy(req.user.id)) {
    throw new NotFoundError('Embarazo');
  }

  res.json({ ok: true, pregnancy: repo.pregnancySummary(req.user.id) });
});

export default router;

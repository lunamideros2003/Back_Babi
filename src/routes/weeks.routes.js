import { Router } from 'express';
import { all, get } from '../db/connection.js';
import { requireAuth } from '../middleware/auth.js';
import { NotFoundError } from '../utils/errors.js';
import { calculatePregnancy, dueDateFromLastPeriod, dueDateFromWeek } from '../utils/pregnancyMath.js';

const router = Router();

router.get('/', (_req, res) => {
  const weeks = all('SELECT * FROM weeks ORDER BY week_number ASC');
  res.json({ ok: true, total: weeks.length, weeks });
});

router.get('/calculate', (req, res) => {
  const { dueDate, lastPeriodDate, week } = req.query;

  let resolved = dueDate ?? null;
  if (!resolved && lastPeriodDate) resolved = dueDateFromLastPeriod(lastPeriodDate);
  if (!resolved && week) resolved = dueDateFromWeek(Number(week));
  if (!resolved) {
    throw new NotFoundError('Parametro de calculo');
  }

  res.json({ ok: true, pregnancy: calculatePregnancy({ dueDate: resolved }) });
});

router.get('/:number', (req, res) => {
  const number = Number(req.params.number);
  const week = get('SELECT * FROM weeks WHERE week_number = :number', { number });

  if (!week) throw new NotFoundError('Semana');

  res.json({ ok: true, week });
});

router.get('/around/:number', requireAuth, (req, res) => {
  const center = Number(req.params.number);
  const weeks = all(
    `SELECT * FROM weeks
     WHERE week_number BETWEEN :from AND :to
     ORDER BY week_number ASC`,
    { from: Math.max(4, center - 1), to: Math.min(40, center + 1) },
  );
  res.json({ ok: true, weeks });
});

export default router;

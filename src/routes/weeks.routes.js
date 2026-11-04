import { Router } from 'express';
import { all, get } from '../db/connection.js';
import { requireAuth } from '../middleware/auth.js';
import { NotFoundError } from '../utils/errors.js';
import {
  calculatePregnancy,
  dueDateFromLastPeriod,
  dueDateFromWeek,
  parseWeekNumber,
  trimesterName,
} from '../utils/pregnancyMath.js';

const router = Router();

router.get('/', async (_req, res) => {
  const weeks = await all('SELECT * FROM weeks ORDER BY week_number ASC');
  res.json({
    ok: true,
    total: weeks.length,
    weeks: weeks.map((week) => ({
      ...week,
      trimester: trimesterName(week.week_number),
    })),
  });
});

router.get('/calculate', async (req, res) => {
  const { dueDate, lastPeriodDate, week } = req.query;

  let resolved = dueDate ?? null;
  if (!resolved && lastPeriodDate) resolved = dueDateFromLastPeriod(lastPeriodDate);
  if (!resolved && week) {
    const number = parseWeekNumber(week);
    if (number === null) throw new NotFoundError('Semana');
    resolved = dueDateFromWeek(number);
  }
  if (!resolved) {
    throw new NotFoundError('Parametro de calculo');
  }

  res.json({ ok: true, pregnancy: calculatePregnancy({ dueDate: resolved }) });
});

router.get('/around/:number', requireAuth, async (req, res) => {
  const center = parseWeekNumber(req.params.number);
  if (center === null) throw new NotFoundError('Semana');

  const weeks = await all(
    `SELECT * FROM weeks
     WHERE week_number BETWEEN :from AND :to
     ORDER BY week_number ASC`,
    { from: Math.max(4, center - 1), to: Math.min(40, center + 1) },
  );
  res.json({ ok: true, weeks });
});

router.get('/:number', async (req, res) => {
  const number = parseWeekNumber(req.params.number);
  if (number === null) throw new NotFoundError('Semana');

  const week = await get('SELECT * FROM weeks WHERE week_number = :number', { number });

  if (!week) throw new NotFoundError('Semana');

  res.json({ ok: true, week, trimester: trimesterName(number) });
});

export default router;

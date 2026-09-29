import { Router } from 'express';
import * as repo from '../repositories/index.js';
import { validate } from '../middleware/index.js';
import { requireAuth } from '../middleware/auth.js';
import { NotFoundError } from '../utils/errors.js';
import { calculatePregnancy, dueDateFromLastPeriod, dueDateFromWeek, GESTATION_DAYS } from '../utils/pregnancyMath.js';

const router = Router();

const registerSchema = {
  name: { type: 'string', required: true, min: 2, max: 80 },
  email: { type: 'email', required: true },
  password: { type: 'string', required: true, min: 6, max: 128 },
  dueDate: { type: 'date' },
  lastPeriodDate: { type: 'date' },
  currentWeek: { type: 'number', min: 1, max: 42 },
  babyName: { type: 'string', max: 60 },
};

const loginSchema = {
  email: { type: 'email', required: true },
  password: { type: 'string', required: true },
};

const updateProfileSchema = {
  name: { type: 'string', min: 2, max: 80 },
  dueDate: { type: 'date' },
  lastPeriodDate: { type: 'date' },
  currentWeek: { type: 'number', min: 1, max: 42 },
  babyName: { type: 'string', max: 60 },
};

router.post('/register', validate(registerSchema), (req, res) => {
  const { name, email, password, dueDate, lastPeriodDate, currentWeek, babyName } = req.validated;
  const user = repo.createUser({ name, email, password });

  const resolvedDueDate =
    dueDate ?? dueDateFromLastPeriod(lastPeriodDate) ?? dueDateFromWeek(currentWeek);

  if (resolvedDueDate) {
    repo.upsertPregnancy(user.id, resolvedDueDate, { babyName });
  }

  res.status(201).json({ ok: true, ...repo.authPayload(user) });
});

router.post('/login', validate(loginSchema), (req, res) => {
  const { email, password } = req.validated;
  const user = repo.verifyCredentials(email, password);
  res.json({ ok: true, ...repo.authPayload(user) });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({
    ok: true,
    user: repo.toPublicUser(req.user),
    pregnancy: repo.pregnancySummary(req.user.id),
  });
});

router.patch('/me', requireAuth, validate(updateProfileSchema), (req, res) => {
  const { name, dueDate, lastPeriodDate, currentWeek, babyName } = req.validated;
  const resolvedDueDate =
    dueDate ?? dueDateFromLastPeriod(lastPeriodDate) ?? dueDateFromWeek(currentWeek);
  const user = repo.updateProfile(req.user.id, { name, dueDate: resolvedDueDate });

  if (resolvedDueDate) {
    repo.upsertPregnancy(user.id, resolvedDueDate, { babyName });
  }

  res.json({
    ok: true,
    user: repo.toPublicUser(user),
    pregnancy: repo.pregnancySummary(req.user.id),
  });
});

export default router;
export { calculatePregnancy, GESTATION_DAYS, NotFoundError };

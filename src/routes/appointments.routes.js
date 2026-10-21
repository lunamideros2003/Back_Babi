import { Router } from 'express';
import * as repo from '../repositories/index.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/index.js';
import { NotFoundError } from '../utils/errors.js';
import {
  APPOINTMENT_CATEGORIES,
  APPOINTMENT_STATUSES,
  APPOINTMENT_CATEGORY_VALUES,
} from '../config/appointments.js';

const router = Router();
router.use(requireAuth);

const appointmentSchema = {
  title: { type: 'string', required: true, min: 2, max: 120 },
  category: { type: 'string', default: 'checkup', oneOf: APPOINTMENT_CATEGORY_VALUES },
  scheduled_at: { type: 'datetime', required: true },
  location: { type: 'string', max: 160 },
  provider_name: { type: 'string', max: 120 },
  notes: { type: 'string', max: 1000 },
  status: { type: 'string', default: 'scheduled' },
};

const appointmentUpdateSchema = {
  title: { type: 'string', min: 2, max: 120 },
  category: { type: 'string', oneOf: APPOINTMENT_CATEGORY_VALUES },
  scheduled_at: { type: 'datetime' },
  location: { type: 'string', max: 160 },
  provider_name: { type: 'string', max: 120 },
  notes: { type: 'string', max: 1000 },
  status: { type: 'string' },
};

router.get('/categories', (_req, res) => {
  res.json({
    ok: true,
    categories: APPOINTMENT_CATEGORIES,
    statuses: APPOINTMENT_STATUSES,
  });
});

router.get('/', async (req, res) => {
  const scope = req.query.scope ?? 'all';
  res.json({ ok: true, appointments: await repo.listAppointments(req.user.id, { scope }) });
});

router.post('/', validate(appointmentSchema), async (req, res) => {
  const appointment = await repo.createAppointment(req.user.id, req.validated);
  res.status(201).json({ ok: true, appointment });
});

router.put('/:id', validate(appointmentUpdateSchema), async (req, res) => {
  const appointment = await repo.updateAppointment(req.user.id, Number(req.params.id), req.validated);
  res.json({ ok: true, appointment });
});

router.delete('/:id', async (req, res) => {
  await repo.deleteAppointment(req.user.id, Number(req.params.id));
  res.json({ ok: true });
});

export { NotFoundError };
export default router;

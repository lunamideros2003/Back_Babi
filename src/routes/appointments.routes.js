import { Router } from 'express';
import * as repo from '../repositories/index.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/index.js';
import { NotFoundError } from '../utils/errors.js';

const router = Router();
router.use(requireAuth);

const appointmentSchema = {
  title: { type: 'string', required: true, min: 2, max: 120 },
  category: { type: 'string', default: 'checkup' },
  scheduled_at: { type: 'datetime', required: true },
  location: { type: 'string', max: 160 },
  provider_name: { type: 'string', max: 120 },
  notes: { type: 'string', max: 1000 },
  status: { type: 'string', default: 'scheduled' },
};

const appointmentUpdateSchema = {
  title: { type: 'string', min: 2, max: 120 },
  category: { type: 'string' },
  scheduled_at: { type: 'datetime' },
  location: { type: 'string', max: 160 },
  provider_name: { type: 'string', max: 120 },
  notes: { type: 'string', max: 1000 },
  status: { type: 'string' },
};

router.get('/', (req, res) => {
  const scope = req.query.scope ?? 'all';
  res.json({ ok: true, appointments: repo.listAppointments(req.user.id, { scope }) });
});

router.post('/', validate(appointmentSchema), (req, res) => {
  const appointment = repo.createAppointment(req.user.id, req.validated);
  res.status(201).json({ ok: true, appointment });
});

router.put('/:id', validate(appointmentUpdateSchema), (req, res) => {
  const appointment = repo.updateAppointment(req.user.id, Number(req.params.id), req.validated);
  res.json({ ok: true, appointment });
});

router.delete('/:id', (req, res) => {
  repo.deleteAppointment(req.user.id, Number(req.params.id));
  res.json({ ok: true });
});

export { NotFoundError };
export default router;

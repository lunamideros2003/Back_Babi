import { Router } from 'express';
import * as repo from '../repositories/index.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/index.js';
import { get } from '../db/connection.js';

const router = Router();
router.use(requireAuth);

const checkupSchema = {
  pregnancy_week: { type: 'number', min: 1, max: 42 },
  weight_kg: { type: 'number', min: 30, max: 200 },
  blood_pressure: { type: 'string', max: 20 },
  notes: { type: 'string', max: 1000 },
};

const symptomSchema = {
  pregnancy_week: { type: 'number', min: 1, max: 42 },
  symptom: { type: 'string', required: true, max: 120 },
  severity: { type: 'number', default: 1, min: 1, max: 5 },
  notes: { type: 'string', max: 1000 },
};

router.get('/checkups', (req, res) => {
  res.json({ ok: true, checkups: repo.listCheckups(req.user.id) });
});

router.post('/checkups', validate(checkupSchema), (req, res) => {
  const checkup = repo.createCheckup(req.user.id, req.validated);
  res.status(201).json({ ok: true, checkup });
});

router.get('/symptoms', (req, res) => {
  res.json({ ok: true, symptoms: repo.listSymptoms(req.user.id) });
});

router.post('/symptoms', validate(symptomSchema), (req, res) => {
  const symptom = repo.createSymptom(req.user.id, req.validated);
  res.status(201).json({ ok: true, symptom });
});

router.get('/timeline', (req, res) => {
  const pregnancy = repo.getPregnancy(req.user.id);
  const week = pregnancy
    ? get('SELECT * FROM weeks WHERE week_number = :week', { week: pregnancy.current_week })
    : null;

  res.json({
    ok: true,
    pregnancy: repo.pregnancySummary(req.user.id),
    week,
    appointments: repo.listAppointments(req.user.id, { scope: 'upcoming' }),
    reminders: repo.listReminders(req.user.id),
    checkups: repo.listCheckups(req.user.id),
    symptoms: repo.listSymptoms(req.user.id),
  });
});

export default router;

import { Router } from 'express';
import * as repo from '../repositories/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

/**
 * Resumen rapido de como va el seguimiento.
 *
 * Devuelve en una sola llamada lo que la aplicacion necesita saber de
 * golpe: la semana, cuantas citas hay, cuantos recordatorios, cuantas entradas
 * de diario y cuantas conversaciones.
 */
router.get('/', async (req, res) => {
  const userId = req.user.id;

  const [pregnancy, appointments, reminders, journal, messages] = await Promise.all([
    repo.pregnancySummary(userId),
    repo.listAppointments(userId, { scope: 'all' }),
    repo.listReminders(userId, false),
    repo.listJournalEntries(userId, { limit: 200 }),
    repo.countChatMessages(userId),
  ]);

  const proxima = appointments
    .filter((cita) => cita.status === 'scheduled')
    .sort((a, b) => String(a.scheduled_at).localeCompare(String(b.scheduled_at)))[0];

  res.json({
    ok: true,
    summary: {
      week: pregnancy?.current_week ?? null,
      trimester: pregnancy?.trimester ?? null,
      trimester_label: pregnancy?.trimester_label ?? null,
      due_date: pregnancy?.due_date ?? null,
      days_left: pregnancy?.days_left ?? null,
      progress_percent: pregnancy?.progress_percent ?? 0,
      appointments_total: appointments.length,
      next_appointment: proxima
        ? {
            id: proxima.id,
            title: proxima.title,
            scheduled_at: proxima.scheduled_at,
          }
        : null,
      reminders_pending: reminders.length,
      journal_entries: journal.length,
      chat_messages: messages,
    },
  });
});

export default router;

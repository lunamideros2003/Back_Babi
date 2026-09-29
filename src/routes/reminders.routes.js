import { Router } from 'express';
import * as repo from '../repositories/index.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/index.js';
import { generateReminders } from '../services/reminderService.js';
import { ValidationError } from '../utils/errors.js';

const router = Router();
router.use(requireAuth);

const reminderSchema = {
  title: { type: 'string', required: true, min: 2, max: 140 },
  description: { type: 'string', max: 1000 },
  category: { type: 'string', default: 'general' },
  due_at: { type: 'datetime', required: true },
  recurrence: { type: 'string', default: 'none' },
};

router.get('/', (req, res) => {
  const includeCompleted = req.query.all === 'true';
  res.json({ ok: true, reminders: repo.listReminders(req.user.id, { includeCompleted }) });
});

router.post('/', validate(reminderSchema), (req, res) => {
  const reminder = repo.createReminder(req.user.id, req.validated);
  res.status(201).json({ ok: true, reminder });
});

router.post('/generate', async (req, res, next) => {
  try {
    const count = Math.min(Number(req.body?.count ?? 5), 10);
    const pregnancy = repo.getPregnancy(req.user.id);

    if (!pregnancy) {
      throw new ValidationError([
        { field: 'pregnancy', message: 'Registra tu fecha estimada de parto primero.' },
      ]);
    }

    const suggestions = await generateReminders({ pregnancy, count });

    const created = suggestions.map((item) =>
      repo.createReminder(req.user.id, {
        title: item.title,
        description: item.description,
        category: item.category,
        due_at: item.due_at,
        recurrence: item.recurrence,
        source: item.source,
      }),
    );

    res.status(201).json({ ok: true, reminders: created });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/toggle', (req, res) => {
  const reminder = repo.toggleReminder(req.user.id, Number(req.params.id));
  res.json({ ok: true, reminder });
});

router.delete('/:id', (req, res) => {
  repo.deleteReminder(req.user.id, Number(req.params.id));
  res.json({ ok: true });
});

export default router;

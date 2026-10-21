import { all, get, run, transaction } from '../db/connection.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { signToken } from '../utils/token.js';
import { ConflictError, NotFoundError, UnauthorizedError } from '../utils/errors.js';
import { calculatePregnancy, toISODate, addDays } from '../utils/pregnancyMath.js';

/**
 * Every function is async because the Postgres driver is network based. The
 * SQLite driver resolves immediately, so local development stays instant.
 */

function toPublicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    created_at: row.created_at,
  };
}

export async function findByEmail(email) {
  return await get('SELECT * FROM users WHERE email = :email', { email: String(email).toLowerCase() });
}

export async function findById(id) {
  return await get('SELECT * FROM users WHERE id = :id', { id });
}

export async function createUser({ name, email, password }) {
  const normalizedEmail = String(email).toLowerCase().trim();

  if (await findByEmail(normalizedEmail)) {
    throw new ConflictError('Ese correo ya esta registrado.');
  }

  const result = await run(
    `INSERT INTO users (name, email, password_hash)
     VALUES (:name, :email, :passwordHash)`,
    { name: name.trim(), email: normalizedEmail, passwordHash: hashPassword(password) },
  );

  return await findById(Number(result.lastInsertRowid));
}

export async function verifyCredentials(email, password) {
  const user = await findByEmail(email);
  if (!user) throw new UnauthorizedError('Correo o contrasena incorrectos.');
  if (!verifyPassword(password, user.password_hash)) {
    throw new UnauthorizedError('Correo o contrasena incorrectos.');
  }
  return user;
}

export async function updateProfile(userId, { name, dueDate }) {
  const user = await findById(userId);
  if (!user) throw new NotFoundError('Usuario');

  await run(
    `UPDATE users
     SET name = COALESCE(:name, name), due_date = COALESCE(:dueDate, due_date),
         updated_at = datetime('now')
     WHERE id = :userId`,
    { name: name?.trim() ?? null, dueDate: dueDate ?? null, userId },
  );

  if (dueDate) {
    await upsertPregnancy(userId, dueDate);
  }

  return await findById(userId);
}

/* ---------------------------------- pregnancy --------------------------------- */

export async function getPregnancy(userId) {
  return await get('SELECT * FROM pregnancies WHERE user_id = :userId', { userId });
}

export async function upsertPregnancy(userId, dueDate, extra = {}) {
  const calculated = calculatePregnancy({ dueDate });
  if (!calculated) throw new NotFoundError('Fecha de parto');

  const existing = await getPregnancy(userId);

  if (existing) {
    await run(
      `UPDATE pregnancies
       SET due_date = :dueDate, start_date = :startDate, current_week = :currentWeek,
           current_day = :currentDay, baby_name = COALESCE(:babyName, baby_name),
           notes = COALESCE(:notes, notes), updated_at = datetime('now')
       WHERE user_id = :userId`,
      {
        dueDate: calculated.due_date,
        startDate: calculated.start_date,
        currentWeek: calculated.current_week,
        currentDay: calculated.current_day,
        babyName: extra.babyName ?? null,
        notes: extra.notes ?? null,
        userId,
      },
    );
  } else {
    await run(
      `INSERT INTO pregnancies
         (user_id, due_date, start_date, current_week, current_day, baby_name, notes)
       VALUES
         (:userId, :dueDate, :startDate, :currentWeek, :currentDay, :babyName, :notes)`,
      {
        userId,
        dueDate: calculated.due_date,
        startDate: calculated.start_date,
        currentWeek: calculated.current_week,
        currentDay: calculated.current_day,
        babyName: extra.babyName ?? null,
        notes: extra.notes ?? null,
      },
    );
  }

  await run("UPDATE users SET due_date = :dueDate, updated_at = datetime('now') WHERE id = :userId", {
    dueDate: calculated.due_date,
    userId,
  });

  return await getPregnancy(userId);
}

export async function refreshPregnancy(userId) {
  const pregnancy = await getPregnancy(userId);
  if (!pregnancy) return null;

  const calculated = calculatePregnancy({ dueDate: pregnancy.due_date });
  if (!calculated) return pregnancy;

  await run(
    `UPDATE pregnancies
     SET current_week = :currentWeek, current_day = :currentDay, updated_at = datetime('now')
     WHERE id = :id`,
    { currentWeek: calculated.current_week, currentDay: calculated.current_day, id: pregnancy.id },
  );

  return { ...(await getPregnancy(userId)), ...calculated };
}

export async function pregnancySummary(userId) {
  const pregnancy = await refreshPregnancy(userId);
  if (!pregnancy) return null;

  const calculated = calculatePregnancy({ dueDate: pregnancy.due_date });
  const week = await get('SELECT * FROM weeks WHERE week_number = :week', {
    week: pregnancy.current_week,
  });

  const nextAppointment = await get(
    `SELECT * FROM appointments
     WHERE user_id = :userId AND scheduled_at >= datetime('now') AND status = 'scheduled'
     ORDER BY scheduled_at ASC LIMIT 1`,
    { userId },
  );

  const pendingReminders = await get(
    `SELECT COUNT(*) AS total FROM reminders
     WHERE user_id = :userId AND is_completed = 0`,
    { userId },
  );

  return {
    id: pregnancy.id,
    due_date: pregnancy.due_date,
    start_date: pregnancy.start_date,
    baby_name: pregnancy.baby_name,
    notes: pregnancy.notes,
    ...calculated,
    current_week: pregnancy.current_week,
    week: week ?? null,
    next_appointment: nextAppointment ?? null,
    pending_reminders: Number(pendingReminders?.total ?? 0),
  };
}

/* --------------------------------- appointments -------------------------------- */

export async function listAppointments(userId, { scope = 'all' } = {}) {
  if (scope === 'upcoming') {
    return await all(
      `SELECT * FROM appointments
       WHERE user_id = :userId AND scheduled_at >= datetime('now')
       ORDER BY scheduled_at ASC`,
      { userId },
    );
  }

  if (scope === 'past') {
    return await all(
      `SELECT * FROM appointments
       WHERE user_id = :userId AND scheduled_at < datetime('now')
       ORDER BY scheduled_at DESC`,
      { userId },
    );
  }

  return await all(
    'SELECT * FROM appointments WHERE user_id = :userId ORDER BY scheduled_at ASC',
    { userId },
  );
}

export async function createAppointment(userId, data) {
  const result = await run(
    `INSERT INTO appointments (user_id, title, category, scheduled_at, location, provider_name, notes)
     VALUES (:userId, :title, :category, :scheduledAt, :location, :providerName, :notes)`,
    {
      userId,
      title: data.title,
      category: data.category ?? 'checkup',
      scheduledAt: data.scheduled_at,
      location: data.location ?? null,
      providerName: data.provider_name ?? null,
      notes: data.notes ?? null,
    },
  );

  return await get('SELECT * FROM appointments WHERE id = :id', { id: Number(result.lastInsertRowid) });
}

export async function updateAppointment(userId, id, data) {
  const appointment = await get(
    'SELECT * FROM appointments WHERE id = :id AND user_id = :userId',
    { id, userId },
  );
  if (!appointment) throw new NotFoundError('Cita');

  await run(
    `UPDATE appointments
     SET title = :title, category = :category, scheduled_at = :scheduledAt,
         location = :location, provider_name = :providerName, notes = :notes,
         status = :status, updated_at = datetime('now')
     WHERE id = :id AND user_id = :userId`,
    {
      title: data.title ?? appointment.title,
      category: data.category ?? appointment.category,
      scheduledAt: data.scheduled_at ?? appointment.scheduled_at,
      location: data.location ?? appointment.location,
      providerName: data.provider_name ?? appointment.provider_name,
      notes: data.notes ?? appointment.notes,
      status: data.status ?? appointment.status,
      id,
      userId,
    },
  );

  return await get('SELECT * FROM appointments WHERE id = :id', { id });
}

export async function deleteAppointment(userId, id) {
  const result = await run('DELETE FROM appointments WHERE id = :id AND user_id = :userId', {
    id,
    userId,
  });
  if (result.changes === 0) throw new NotFoundError('Cita');
}

/* ---------------------------------- reminders --------------------------------- */

export async function listReminders(userId, { includeCompleted = false } = {}) {
  if (includeCompleted) {
    return await all(
      'SELECT * FROM reminders WHERE user_id = :userId ORDER BY is_completed ASC, due_at ASC',
      { userId },
    );
  }

  return await all(
    'SELECT * FROM reminders WHERE user_id = :userId AND is_completed = 0 ORDER BY due_at ASC',
    { userId },
  );
}

export async function createReminder(userId, data) {
  const result = await run(
    `INSERT INTO reminders (user_id, title, description, category, due_at, recurrence, source)
     VALUES (:userId, :title, :description, :category, :dueAt, :recurrence, :source)`,
    {
      userId,
      title: data.title,
      description: data.description ?? null,
      category: data.category ?? 'general',
      dueAt: data.due_at,
      recurrence: data.recurrence ?? 'none',
      source: data.source ?? 'manual',
    },
  );

  return await get('SELECT * FROM reminders WHERE id = :id', { id: Number(result.lastInsertRowid) });
}

export async function toggleReminder(userId, id) {
  const reminder = await get('SELECT * FROM reminders WHERE id = :id AND user_id = :userId', {
    id,
    userId,
  });
  if (!reminder) throw new NotFoundError('Recordatorio');

  await run('UPDATE reminders SET is_completed = :completed WHERE id = :id', {
    completed: reminder.is_completed ? 0 : 1,
    id,
  });

  return await get('SELECT * FROM reminders WHERE id = :id', { id });
}

export async function deleteReminder(userId, id) {
  const result = await run('DELETE FROM reminders WHERE id = :id AND user_id = :userId', {
    id,
    userId,
  });
  if (result.changes === 0) throw new NotFoundError('Recordatorio');
}

/* ----------------------------------- diary ---------------------------------- */

export async function listJournalEntries(userId, { limit = 50, offset = 0 } = {}) {
  return await all(
    `SELECT * FROM journal_entries WHERE user_id = :userId
     ORDER BY entry_date DESC, id DESC
     LIMIT :limit OFFSET :offset`,
    { userId, limit, offset },
  );
}

export async function countJournalEntries(userId) {
  const row = await get(
    'SELECT COUNT(*) AS total FROM journal_entries WHERE user_id = :userId',
    { userId },
  );
  return Number(row?.total ?? 0);
}

export async function createJournalEntry(userId, data) {
  const result = await run(
    `INSERT INTO journal_entries (user_id, mood, content, entry_date, pregnancy_week)
     VALUES (:userId, :mood, :content, :entryDate, :pregnancyWeek)`,
    {
      userId,
      mood: data.mood ?? null,
      content: data.content,
      entryDate: data.entry_date,
      pregnancyWeek: data.pregnancy_week ?? null,
    },
  );

  return await get('SELECT * FROM journal_entries WHERE id = :id', {
    id: Number(result.lastInsertRowid),
  });
}

export async function deleteJournalEntry(userId, id) {
  const result = await run('DELETE FROM journal_entries WHERE id = :id AND user_id = :userId', {
    id,
    userId,
  });
  if (result.changes === 0) throw new NotFoundError('Entrada del diario');
}

/* ------------------------------- health tracking ------------------------------ */

export async function listCheckups(userId) {
  return await all(
    'SELECT * FROM checkup_logs WHERE user_id = :userId ORDER BY recorded_at DESC',
    { userId },
  );
}

export async function createCheckup(userId, data) {
  const result = await run(
    `INSERT INTO checkup_logs (user_id, pregnancy_week, weight_kg, blood_pressure, notes)
     VALUES (:userId, :week, :weight, :bloodPressure, :notes)`,
    {
      userId,
      week: data.pregnancy_week ?? null,
      weight: data.weight_kg ?? null,
      bloodPressure: data.blood_pressure ?? null,
      notes: data.notes ?? null,
    },
  );

  return await get('SELECT * FROM checkup_logs WHERE id = :id', { id: Number(result.lastInsertRowid) });
}

export async function listSymptoms(userId) {
  return await all(
    'SELECT * FROM symptom_logs WHERE user_id = :userId ORDER BY created_at DESC',
    { userId },
  );
}

export async function createSymptom(userId, data) {
  const result = await run(
    `INSERT INTO symptom_logs (user_id, pregnancy_week, symptom, severity, notes)
     VALUES (:userId, :week, :symptom, :severity, :notes)`,
    {
      userId,
      week: data.pregnancy_week ?? null,
      symptom: data.symptom,
      severity: data.severity ?? 1,
      notes: data.notes ?? null,
    },
  );

  return await get('SELECT * FROM symptom_logs WHERE id = :id', { id: Number(result.lastInsertRowid) });
}

export async function listChatHistory(userId, limit = 50, offset = 0) {
  const rows = await all(
    `SELECT * FROM chat_messages WHERE user_id = :userId
     ORDER BY id DESC LIMIT :limit OFFSET :offset`,
    { userId, limit, offset },
  );

  return rows.reverse();
}

export async function countChatMessages(userId) {
  const row = await get(
    'SELECT COUNT(*) AS total FROM chat_messages WHERE user_id = :userId',
    { userId },
  );
  return Number(row?.total ?? 0);
}

export async function clearChatHistory(userId) {
  return await run('DELETE FROM chat_messages WHERE user_id = :userId', { userId });
}

export function authPayload(user) {
  return {
    token: signToken({ sub: user.id, email: user.email }),
    user: toPublicUser(user),
  };
}

export { toPublicUser, transaction, toISODate, addDays };
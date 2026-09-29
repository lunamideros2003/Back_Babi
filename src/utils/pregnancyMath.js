const MS_PER_DAY = 86_400_000;
export const GESTATION_DAYS = 280;

function toDate(value) {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function addDays(value, days) {
  const date = toDate(value);
  if (!date) return null;
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function toISODate(value) {
  const date = toDate(value);
  return date ? date.toISOString().slice(0, 10) : null;
}

export function daysBetween(from, to) {
  const a = toDate(from);
  const b = toDate(to);
  if (!a || !b) return null;
  return Math.round((startOfDay(b) - startOfDay(a)) / MS_PER_DAY);
}

function startOfDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Pregnancy math. week 1 starts on the first day of the last menstrual period.
 * Returns a safe summary so the client never has to recalculate.
 */
export function calculatePregnancy({ dueDate, today = new Date() }) {
  const due = toDate(dueDate);
  if (!due) return null;

  const startDate = addDays(due, -GESTATION_DAYS);
  const current = startOfDay(toDate(today));
  const rawElapsed = Math.round((current - startOfDay(startDate)) / MS_PER_DAY);
  // Day 1 is the first day of the last menstrual period, so day 280 (the due
  // date) still belongs to week 40. Clamping to 279 keeps that boundary right.
  const elapsedDays = Math.min(GESTATION_DAYS - 1, Math.max(0, rawElapsed));
  const daysLeft = Math.round((startOfDay(due) - current) / MS_PER_DAY);

  const currentWeek = Math.min(42, Math.max(1, Math.floor(elapsedDays / 7) + 1));
  const currentDay = elapsedDays + 1;
  const dayOfWeek = (currentWeek - 1) * 7 + (elapsedDays % 7) + 1;
  const progress = Math.min(100, Math.round(((elapsedDays + 1) / GESTATION_DAYS) * 100));

  return {
    due_date: toISODate(due),
    start_date: toISODate(startDate),
    current_week: currentWeek,
    current_day: currentDay,
    day_of_week: dayOfWeek,
    days_left: daysLeft,
    progress_percent: progress,
    trimester: currentWeek <= 13 ? 1 : currentWeek <= 27 ? 2 : 3,
    trimester_label:
      currentWeek <= 13 ? 'Primer trimestre' : currentWeek <= 27 ? 'Segundo trimestre' : 'Tercer trimestre',
    is_overdue: daysLeft < 0,
  };
}

export function dueDateFromLastPeriod(lastPeriodDate) {
  const date = addDays(lastPeriodDate, GESTATION_DAYS);
  return toISODate(date);
}

export function dueDateFromWeek(week, today = new Date()) {
  const base = toDate(today);
  if (!base) return null;
  const daysElapsed = (week - 1) * 7;
  return toISODate(addDays(base, GESTATION_DAYS - daysElapsed));
}

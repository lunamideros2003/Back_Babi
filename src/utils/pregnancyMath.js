const MS_PER_DAY = 86_400_000;
export const GESTATION_DAYS = 280;
export const FIRST_WEEK = 4;
export const LAST_WEEK = 40;

const TRIMESTER_NAMES = ['Primer trimestre', 'Segundo trimestre', 'Tercer trimestre'];

/**
 * Devuelve el numero de semana si es un entero dentro del rango que tiene
 * contenido (4 a 40). Cualquier otra cosa devuelve null, para que la ruta
 * responda 404 en vez de consultar NaN.
 */
export function parseWeekNumber(value) {
  const number = Number(value);

  if (!Number.isInteger(number)) return null;
  if (number < FIRST_WEEK || number > LAST_WEEK) return null;

  return number;
}

/** 1, 2 o 3 segun la semana; null si no es un numero. */
export function trimesterOf(week) {
  if (week === null || week === undefined || week === '') return null;

  const number = Number(week);
  if (!Number.isFinite(number)) return null;
  if (number <= 13) return 1;
  if (number <= 27) return 2;
  return 3;
}

export function trimesterName(week) {
  const trimester = trimesterOf(week);
  return trimester ? TRIMESTER_NAMES[trimester - 1] : null;
}

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
  const trimester = trimesterOf(currentWeek);

  return {
    due_date: toISODate(due),
    start_date: toISODate(startDate),
    current_week: currentWeek,
    current_day: currentDay,
    day_of_week: dayOfWeek,
    days_left: daysLeft,
    progress_percent: progress,
    trimester,
    trimester_label: TRIMESTER_NAMES[trimester - 1],
    is_overdue: daysLeft < 0,
  };
}

export function dueDateFromLastPeriod(lastPeriodDate) {
  const date = addDays(lastPeriodDate, GESTATION_DAYS);
  return toISODate(date);
}

export function dueDateFromWeek(week, today = new Date()) {
  const number = Number(week);
  // Una semana no numérica produciría una fecha inválida y un error 500.
  if (!Number.isInteger(number) || number < 1 || number > 42) return null;

  const base = toDate(today);
  if (!base) return null;
  const daysElapsed = (number - 1) * 7;
  return toISODate(addDays(base, GESTATION_DAYS - daysElapsed));
}

export const REMINDER_CATEGORIES = [
  { key: 'alimentacion', label: 'Alimentación' },
  { key: 'ejercicio', label: 'Ejercicio' },
  { key: 'desarrollo', label: 'Desarrollo' },
  { key: 'controles', label: 'Controles' },
  { key: 'parto', label: 'Parto' },
  { key: 'emocional', label: 'Emocional' },
  { key: 'general', label: 'General' },
];

export const REMINDER_KEYS = REMINDER_CATEGORIES.map((category) => category.key);

export const RECURRENCE_OPTIONS = ['none', 'daily', 'weekly'];

export function isReminderCategory(value) {
  return REMINDER_KEYS.includes(value);
}

export function isRecurrence(value) {
  return RECURRENCE_OPTIONS.includes(value);
}

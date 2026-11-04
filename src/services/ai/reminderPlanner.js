import { REMINDER_KEYS, RECURRENCE_OPTIONS } from '../../config/reminders.js';

/**
 * Planificador de recordatorios con el modelo de lenguaje.
 *
 * El modelo solo propone; el backend valida cada campo contra las listas de
 * `config/reminders.js` antes de guardar nada. Si algo no cuadra se descarta
 * el elemento y, si no queda ninguno, se usan las plantillas locales.
 */

const SYSTEM_PROMPT = `Eres la planificadora de recordatorios de BabyTrack IA, una aplicación educativa de seguimiento del embarazo.

Devuelve SOLO un objeto JSON válido, sin explicaciones, sin markdown y sin bloques de código.

Formato exacto:
{"reminders":[{"title":"...","description":"...","category":"...","recurrence":"..."}]}

Reglas:
1. Devuelve exactamente la cantidad pedida.
2. "title" empieza con un verbo en imperativo y tiene entre 3 y 70 caracteres.
3. "description" explica el beneficio en una frase de máximo 180 caracteres.
4. "category" solo puede ser: ${REMINDER_KEYS.join(', ')}.
5. "recurrence" solo puede ser: ${RECURRENCE_OPTIONS.join(', ')}.
6. Nada de diagnósticos, medicamentos ni dosis.
7. Adapta las sugerencias a la semana y al trimestre indicados.
8. Escribe en español neutro y tutea a la usuaria.`;

export function trimesterLabel(week) {
  if (!Number.isFinite(week)) return 'trimestre desconocido';
  if (week <= 13) return 'primer trimestre';
  if (week <= 27) return 'segundo trimestre';
  return 'tercer trimestre';
}

export function buildReminderPrompt({ pregnancy, count }) {
  const week = Number(pregnancy?.current_week ?? 0);

  const lines = [
    `Semana actual: ${week} de 40 (${trimesterLabel(week)}).`,
    `Cantidad de recordatorios: ${count}.`,
  ];

  if (week <= 13) {
    lines.push('Énfasis: náuseas, ácido fólico, hidratación y descanso.');
  } else if (week <= 27) {
    lines.push('Énfasis: movimientos del bebé, ejercicio suave y controles.');
  } else {
    lines.push('Énfasis: preparación del parto, maleta del hospital y descanso.');
  }

  lines.push(`Categorías disponibles: ${REMINDER_KEYS.join(', ')}.`);

  return lines.join('\n');
}

export { SYSTEM_PROMPT };

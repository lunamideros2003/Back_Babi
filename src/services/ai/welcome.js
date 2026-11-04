/**
 * Saludo y sugerencias de la burbuja del asistente.
 *
 * Se generan aqui, sin llamar al modelo, para que la ventana abra al instante
 * y no gaste tokens. Las preguntas cambian con el trimestre.
 */

import { trimesterOf } from '../../utils/pregnancyMath.js';

export const WELCOME_PHRASE = 'Hazme preguntas sobre tu embarazo y resolvámoslas juntas.';

export const SUGGESTIONS = {
  early: [
    'Tengo náuseas, ¿qué puedo hacer?',
    '¿Qué alimentos me sientan mejor?',
    '¿Cuándo es mi primer control?',
    '¿Puedo seguir haciendo ejercicio?',
  ],
  middle: [
    '¿Qué se siente cuando se mueve el bebé?',
    '¿Cuánto peso puedo ganar?',
    '¿Cómo cuido mi espalda?',
    '¿Qué controles me tocan ahora?',
  ],
  late: [
    '¿Qué llevo a la maleta del hospital?',
    '¿Cómo reconozco las contracciones?',
    '¿Cómo preparo mi plan de parto?',
    '¿Qué señales de alarma debo vigilar?',
  ],
  general: [
    '¿Qué puedo comer en el embarazo?',
    '¿Cómo puedo dormir mejor?',
    '¿Qué controles necesito?',
    'Me siento ansiosa, ¿qué hago?',
  ],
};

export function stageFor(week) {
  const trimester = trimesterOf(week);
  if (trimester === 1) return 'early';
  if (trimester === 2) return 'middle';
  if (trimester === 3) return 'late';
  return 'general';
}

export function buildGreeting(name) {
  const firstName = String(name ?? '').trim().split(/\s+/)[0];

  if (!firstName) return `Hola. ${WELCOME_PHRASE}`;
  return `Hola, ${firstName}. ${WELCOME_PHRASE}`;
}

export function pickSuggestions(week) {
  return SUGGESTIONS[stageFor(week)];
}

export function buildWelcome({ name, week }) {
  const stage = stageFor(week);

  return {
    greeting: buildGreeting(name),
    suggestions: SUGGESTIONS[stage],
    stage,
    week: Number.isFinite(week) ? week : null,
  };
}

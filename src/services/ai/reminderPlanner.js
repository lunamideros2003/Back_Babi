import env from '../../config/env.js';
import { openAiJson, isOpenAiConfigured } from './openaiProvider.js';
import {
  REMINDER_KEYS,
  RECURRENCE_OPTIONS,
  isReminderCategory,
  isRecurrence,
} from '../../config/reminders.js';

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

/**
 * Extrae el primer JSON que aparezca en la respuesta del modelo.
 *
 * Los modelos pequeños a veces envuelven el objeto en un bloque de código o
 * agregan una frase antes; se recorta sin depender de que sean perfectos.
 */
export function parseJsonObject(text) {
  if (!text) return null;

  const cleaned = String(text)
    .replace(/```(?:json)?/gi, '')
    .trim();

  const objectStart = cleaned.indexOf('{');
  const objectEnd = cleaned.lastIndexOf('}');
  if (objectStart !== -1 && objectEnd > objectStart) {
    try {
      return JSON.parse(cleaned.slice(objectStart, objectEnd + 1));
    } catch {
      /* se intenta como lista */
    }
  }

  const arrayStart = cleaned.indexOf('[');
  const arrayEnd = cleaned.lastIndexOf(']');
  if (arrayStart !== -1 && arrayEnd > arrayStart) {
    try {
      return JSON.parse(cleaned.slice(arrayStart, arrayEnd + 1));
    } catch {
      /* sin JSON legible */
    }
  }

  return null;
}

const MAX_TITLE = 140;
const MAX_DESCRIPTION = 400;

function cleanText(value, max) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/**
 * Convierte lo que devolvio el modelo en recordatorios seguros.
 * Descarta lo que no cumple y completa los campos opcionales.
 */
export function normalizePlan(raw, { count = 5 } = {}) {
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.reminders)
      ? raw.reminders
      : [];

  const items = [];

  for (const entry of list) {
    if (!entry || typeof entry !== 'object') continue;

    const title = cleanText(entry.title, MAX_TITLE);
    if (title.length < 3) continue;

    items.push({
      title,
      description: cleanText(entry.description, MAX_DESCRIPTION),
      category: isReminderCategory(entry.category) ? entry.category : 'general',
      recurrence: isRecurrence(entry.recurrence) ? entry.recurrence : 'none',
    });

    if (items.length >= count) break;
  }

  return items;
}

/**
 * Pide los recordatorios al modelo. Devuelve `null` cuando no hay modelo
 * disponible o cuando la respuesta no sirve, para que quien llama decida el
 * respaldo.
 */
export async function planReminders({ pregnancy, count = 5 }) {
  if (!pregnancy) return null;
  if (env.ai.provider === 'local' || !isOpenAiConfigured()) return null;

  try {
    const { content, provider, tokensUsed } = await openAiJson({
      system: SYSTEM_PROMPT,
      user: buildReminderPrompt({ pregnancy, count }),
      maxTokens: 700,
      temperature: 0.6,
    });

    const items = normalizePlan(parseJsonObject(content), { count });
    if (items.length === 0) return null;

    return { items, provider, tokensUsed };
  } catch {
    return null;
  }
}

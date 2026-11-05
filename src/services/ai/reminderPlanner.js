import env from '../../config/env.js';
import { openAiJson, isOpenAiConfigured } from './openaiProvider.js';
import {
  REMINDER_KEYS,
  RECURRENCE_OPTIONS,
  isReminderCategory,
  isRecurrence,
} from '../../config/reminders.js';
import { trimesterName } from '../../utils/pregnancyMath.js';

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
  const name = trimesterName(week);
  return name ? name.toLowerCase() : 'trimestre desconocido';
}

export function buildReminderPrompt({ pregnancy, count, existingTitles = [] }) {
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

  const existingList = existingTitles.filter(Boolean).slice(0, 12);
  if (existingList.length > 0) {
    lines.push(`No repitas estos recordatorios que ya tiene activos: ${existingList.join('; ')}.`);
  }

  lines.push(`Categorías disponibles: ${REMINDER_KEYS.join(', ')}.`);

  return lines.join('\n');
}

export { SYSTEM_PROMPT };

export function parseJsonObject(text) {
  if (!text) return null;

  const cleaned = String(text)
    .replace(/```(?:json)?/gi, '')
    .trim();

  const objectStart = cleaned.indexOf('{');
  const objectEnd = cleaned.lastIndexOf('}');
  const arrayStart = cleaned.indexOf('[');
  const arrayEnd = cleaned.lastIndexOf(']');

  const ranges = [];
  if (objectStart !== -1 && objectEnd > objectStart) ranges.push([objectStart, objectEnd]);
  if (arrayStart !== -1 && arrayEnd > arrayStart) ranges.push([arrayStart, arrayEnd]);
  ranges.sort((a, b) => a[0] - b[0]);

  for (const [start, end] of ranges) {
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
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

export async function planReminders({ pregnancy, count = 5, existingTitles = [] }) {
  if (!pregnancy) return null;
  if (env.ai.provider === 'local' || !isOpenAiConfigured()) return null;

  try {
    const { content, provider, tokensUsed } = await openAiJson({
      system: SYSTEM_PROMPT,
      user: buildReminderPrompt({ pregnancy, count, existingTitles }),
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

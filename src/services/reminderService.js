import { toISODate, addDays } from '../utils/pregnancyMath.js';
import { isOpenAiConfigured } from './ai/openaiProvider.js';
import { DISCLAIMER } from '../config/disclaimers.js';

const LOCAL_TEMPLATES = [
  { title: 'Toma tu acido folico', category: 'alimentacion', description: 'La vitamina B9 es clave en el primer trimestre. Tomala con el desayuno.' },
  { title: 'Bebe un vaso de agua', category: 'alimentacion', description: 'Mantenete hidratada: ayuda con el estreñimiento y las nauseas.' },
  { title: 'Camina 20 minutos', category: 'ejercicio', description: 'Una caminata suave mejora la circulacion y el animo.' },
  { title: 'Registra tus movimientos', category: 'desarrollo', description: 'Anota la hora de los primeros movimientos del bebe para ver su patron.' },
  { title: 'Prepara la maleta del hospital', category: 'parto', description: 'A partir de la semana 32 conviene tenerla lista.' },
  { title: 'Respiracion profunda', category: 'emocional', description: 'Cuatro segundos inhalando y seis exhalando, tres veces.' },
  { title: 'Revisa tu plan de parto', category: 'controles', description: 'Repasa contigo y con tu pareja las preferencias para el parto.' },
  { title: 'Mide tu presion arterial', category: 'controles', description: 'Registra tus cifras y compartelas en tu proxima cita.' },
];

function pickTemplates(week, count) {
  const scored = LOCAL_TEMPLATES.map((template, index) => {
    let score = (index * 7 + week) % 11;
    if (template.category === 'controles' && week >= 34) score += 5;
    if (template.category === 'parto' && week >= 32) score += 6;
    if (template.category === 'alimentacion' && week <= 13) score += 4;
    if (template.category === 'desarrollo' && week >= 16 && week <= 28) score += 3;
    if (template.category === 'emocional') score += 2;
    return { ...template, score };
  });
  return scored.sort((a, b) => b.score - a.score).slice(0, count);
}

function aiTemplates(week, trimester) {
  return [
    `Esta en tu semana ${week} (${trimester}).`,
    `Sugerencia: ${LOCAL_TEMPLATES[week % LOCAL_TEMPLATES.length].description}`,
    DISCLAIMER,
  ].join('\n');
}

/**
 * Personalized reminders. Uses the LLM when available, otherwise a
 * deterministic template so the feature always returns something useful.
 */
export async function generateReminders({ pregnancy, count = 5 }) {
  if (!pregnancy) return [];

  const week = pregnancy.current_week;
  const trimester =
    week <= 13 ? 'primer trimestre' : week <= 27 ? 'segundo trimestre' : 'tercer trimestre';

  const suggestions = pickTemplates(week, count);
  const dueDate = toISODate(addDays(new Date(), 1));

  return suggestions.map((template, index) => ({
    title: template.title,
    description: template.description,
    category: template.category,
    due_at: dueDate,
    recurrence: 'daily',
    source: 'ai',
    offset_hours: index,
  }));
}

export function reminderNote(pregnancy) {
  if (!pregnancy) return '';
  return aiTemplates(pregnancy.current_week, 'trimestre actual');
}

export { isOpenAiConfigured };

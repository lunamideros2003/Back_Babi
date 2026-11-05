import { toISODate, addDays } from '../utils/pregnancyMath.js';
import { planReminders } from './ai/reminderPlanner.js';

const LOCAL_TEMPLATES = [
  { title: 'Toma tu ácido fólico', category: 'alimentacion', description: 'La vitamina B9 es clave en el primer trimestre. Tómala con el desayuno.' },
  { title: 'Bebe un vaso de agua', category: 'alimentacion', description: 'Mantente hidratada: ayuda con el estreñimiento y las náuseas.' },
  { title: 'Camina 20 minutos', category: 'ejercicio', description: 'Una caminata suave mejora la circulación y el ánimo.' },
  { title: 'Registra tus movimientos', category: 'desarrollo', description: 'Anota la hora de los primeros movimientos del bebé para ver su patrón.' },
  { title: 'Prepara la maleta del hospital', category: 'parto', description: 'A partir de la semana 32 conviene tenerla lista.' },
  { title: 'Respiración profunda', category: 'emocional', description: 'Cuatro segundos inhalando y seis exhalando, tres veces.' },
  { title: 'Revisa tu plan de parto', category: 'controles', description: 'Repasa contigo y con tu pareja las preferencias para el parto.' },
  { title: 'Mide tu presión arterial', category: 'controles', description: 'Registra tus cifras y compártelas en tu próxima cita.' },
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

export async function generateReminders({ pregnancy, count = 5, existingTitles = [] }) {
  if (!pregnancy) return [];

  const dueDate = toISODate(addDays(new Date(), 1));

  const ai = await planReminders({ pregnancy, count, existingTitles });

  if (ai) {
    return ai.items.map((item, index) => ({
      ...item,
      due_at: dueDate,
      source: 'ai',
      offset_hours: index,
    }));
  }

  return pickTemplates(pregnancy.current_week, count).map((template, index) => ({
    title: template.title,
    description: template.description,
    category: template.category,
    due_at: dueDate,
    recurrence: 'daily',
    source: 'template',
    offset_hours: index,
  }));
}

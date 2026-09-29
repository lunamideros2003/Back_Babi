import { knowledgeBase } from './knowledgeBase.js';
import { classifyQuestion } from './classifier.js';
import { buildSystemContext } from './guardrails.js';
import { DISCLAIMER } from '../../config/disclaimers.js';
import { get } from '../../db/connection.js';

function getWeek(weekNumber) {
  if (!weekNumber || weekNumber < 4 || weekNumber > 40) return null;
  return get('SELECT * FROM weeks WHERE week_number = :week', { week: weekNumber });
}

function normalize(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function findBestEntry(message, category) {
  const text = normalize(message);
  let best = null;
  let bestScore = 0;

  for (const entry of knowledgeBase) {
    let score = 0;
    if (category && entry.category === category) score += 3;
    for (const keyword of entry.keywords) {
      const normalizedKeyword = normalize(keyword);
      if (text.includes(normalizedKeyword)) score += 2;
    }
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  return bestScore > 0 ? best : null;
}

function greeting(message) {
  const text = normalize(message).trim();
  return /^(hola|holis|buenas|buenos dias|buenas tardes|buenas noches|hey|hi|hello|salve|que tal)\b/.test(
    text,
  );
}

function weekAnswer(targetWeek, currentWeek) {
  if (!targetWeek) {
    return 'Registra tu fecha estimada de parto en tu perfil para que pueda darte la informacion de tu semana.';
  }

  const isOther = currentWeek && currentWeek.week_number !== targetWeek.week_number;

  const intro = isOther
    ? `Tu semana actual es la ${currentWeek.week_number}. En la semana ${targetWeek.week_number}, el momento se llama "${targetWeek.title}".`
    : `Esta en tu semana ${targetWeek.week_number}, el momento se llama "${targetWeek.title}".`;

  return [
    intro,
    '',
    `Tu bebe: ${targetWeek.baby_development}`,
    `Tamano aproximado: ${targetWeek.size_comparison}.`,
    `En ti: ${targetWeek.mother_changes}`,
    '',
    targetWeek.tips ? `Consejo de la semana: ${targetWeek.tips}` : '',
    targetWeek.checkup_focus ? `En el control: ${targetWeek.checkup_focus}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function asksAboutWeek(message) {
  const text = normalize(message);
  return /\bsemana\b/.test(text) && /\b(\d{1,2}|actual|pasada|que|vengo|estoy)\b/.test(text);
}

function requestedWeek(message) {
  const match = normalize(message).match(/semana\s+(\d{1,2})/);
  return match ? Number(match[1]) : null;
}

/**
 * Offline provider. Always available, zero cost, no API key required.
 * Gives the project a working AI experience out of the box and acts as the
 * fallback whenever the LLM call fails.
 */
export async function localAnswer({ message, weekData, userName }) {
  const classification = classifyQuestion(message);
  const entry = asksAboutWeek(message) ? null : findBestEntry(message, classification.category);
  const parts = [];

  if (greeting(message)) {
    parts.push(`Hola ${userName || 'bienvenida'}.`);
  }

  if (asksAboutWeek(message)) {
    const asked = requestedWeek(message);
    const target = asked && asked !== weekData?.week_number ? getWeek(asked) : weekData;
    parts.push(weekAnswer(weekData, asked ? target : null));
  } else if (entry) {
    parts.push(entry.answer);
    if (weekData) {
      parts.push(
        `Para tu semana ${weekData.week_number} en concreto: ${weekData.tips}`,
      );
    }
  } else if (weekData) {
    parts.push(
      `No tengo una respuesta exacta guardada para eso, pero esto es lo mas relevante de tu semana ${weekData.week_number}:`,
      '',
      weekAnswer(weekData),
    );
  } else {
    parts.push(
      'Puedo ayudarte con temas de alimentacion, controles medicos, sintomas comunes, ejercicio, ' +
        'desarrollo del bebe, preparacion para el parto y bienestar emocional. ' +
        'Registra tu fecha estimada de parto para que mis respuestas se ajusten a tu semana.',
    );
  }

  const related = knowledgeBase
    .filter((item) => item.category === classification.category && item !== entry)
    .slice(0, 2)
    .map((item) => item.question);

  if (related.length > 0) {
    parts.push('', `Tambien puedes preguntarme: ${related.join('; ')}.`);
  }

  parts.push('', DISCLAIMER);

  return {
    content: parts.filter((p) => p !== '').join('\n\n'),
    provider: 'local',
    tokensUsed: 0,
  };
}

export function buildGroundingContext(weekData) {
  const context = buildSystemContext(weekData);
  const faq = knowledgeBase
    .map((item) => `[${item.category}] P: ${item.question} R: ${item.answer}`)
    .join('\n');

  return `${context}\n\nBase de conocimiento BabyTrack:\n${faq}`;
}

export default localAnswer;

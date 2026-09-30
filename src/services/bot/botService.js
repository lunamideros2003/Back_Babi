import env from '../../config/env.js';
import { isOpenAiConfigured } from '../ai/openaiProvider.js';
import { get } from '../../db/connection.js';

// Local feedback rules. A table keyed by question id and option value keeps
// this readable and lets a new question be added without touching a switch.
const RULES = {
  q_energy: {
    low: 'Tu energia baja es muy comun porque el cuerpo trabaja doble. Descansa todo lo que puedas y aprovecha los ratos buenos para lo importante.',
    mid: 'Tu energia esta en un rango normal. Manten el ritmo con caminatas cortas y comidas regulares.',
    high: 'Que tengas tanta energia es una buena noticia. aproveitala, pero recuerda que no tiene que ser todos los dias igual.',
  },
  q_symptoms: {
    nausea: 'Las nauseas son tipicas sobre todo en el primer trimestre. Las porciones pequeñas y frecuentes ayudan mucho, igual que unas galletas saladas antes de levantarte.',
    reflujo: 'El reflujo aparece porque el utero ocupa espacio. Come poco y seguido, evita comidas grasosas y no te acuestes justo despues de comer.',
    estreñimiento: 'El estreñimiento aparece por la progesterona, que relaja el intestino. Aumenta fibra, toma agua y camina a diario.',
    dolor_espalda: 'El dolor de espalda es frecuente porque se desplaza el peso hacia adelante. Dobla las rodillas al recoger cosas y descansa de lado con almohada entre las piernas.',
    insomnio: 'El insomnio es muy comun en el tercer trimestre. Banos tibios, horarios regulares y evitar pantallas una hora antes ayudan a dormir mejor.',
    ninguno: 'Que te sientas bien es buena noticia. Sigue con tus controles y tu alimentacion habitual.',
  },
  q_food: {
    pocas: 'Con una o dos comidas al dia pueden quedarteBbb los huecos. Prueba con algo pequeño cada pocas horas.',
    muchas: 'Comer con frecuencia esta bien, siempre que las comidas sean variadas y nutritivas.',
    mediana: 'Tres comidas al dia es un buen punto de partida. Agrega un tentempi de fruta o yogur entre comidas.',
  },
  q_vitamins: {
    yes: 'Excelente. El acido folico es clave en el primer trimestre y el hierro ayuda a prevenir la anemia.',
    sometimes: 'Intenta tomarlos a la misma hora cada dia, por ejemplo con el desayuno. Un recordatorio en el celular ayuda mucho.',
    no: 'Consulta con tu obstetra cual es la vitamina adecuada para tu semana. No empieces ninguna sin indicacion medica.',
  },
  q_exercise: {
    yes: 'Mantener actividad es positivo. Caminar, nadar o hacer yoga suelen ser las opciones mas habituales durante el embarazo.',
    sometimes: 'Con veinte minutos de caminata al dia ya ganaste. Empieza poco y ve aumentando a tu ritmo.',
    no: 'Si no puedes moverte mucho no te preocupes. Cambiar de postura con frecuencia y descansar tambien ayuda. Si es por un sintoma concreto, consultalo con tu obstetra.',
  },
  q_checkup: {
    yes: 'Perfecto. Anota la fecha en el modulo de citas para que no se te pase.',
    no: 'Agenda pronto con tu obstetra. Los controles regulares son los que detectan cualquier cambio a tiempo.',
    unsure: 'Revisa tu cartilla o llama a tu clinica para confirmar la fecha. Es mejor tenerlo claro.',
  },
};

const CONCERN_TEXT = {
  health: 'Tu preocupacion por la salud del bebe es normal y te lleva a cuidar mas los controles. Recuerda que solo tu obstetra puede confirmar como va todo.',
  symptoms: 'Anotar tus sintomas con fecha y detalle ayuda mucho. En el modulo de seguimiento puedes ver como cambian con los dias.',
  weight: 'El aumento de peso se revisa mes a mes, no dia a dia. Lo importante es la variedad de lo que comes, no el numero de la balanza.',
  birth: 'Prepararte con tiempo da tranquilidad. Ya tienes el modulo de citas y toda la seccion de preparacion para el parto.',
  mood: 'Tus emociones importan tanto como lo fisico. Hablar con alguien de confianza o con tu profesional es siempre valido.',
  nothing: 'Que este tranquila es una excelente noticia. Manten tus controles y disfruta de esta etapa.',
};

const FIRST_BABY_TEXT =
  'Es tu primer embarazo, asi que es normal tener tantas dudas. BabyTrack esta para acompanarte en cada etapa.';

const WEEK_LABEL = {
  '1-13': 'primer trimestre',
  '14-27': 'segundo trimestre',
  '28-40': 'tercer trimestre',
};

function cleanText(value) {
  return String(value ?? '')
    .replace(/[()\\\r\n]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(value, max = 160) {
  const text = cleanText(value);
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

function pickSingle(questionId, value) {
  const rules = RULES[questionId];
  if (!rules) return null;

  if (questionId === 'q_energy') {
    const score = Number(value);
    if (!Number.isFinite(score)) return rules.mid;
    if (score <= 2) return rules.low;
    if (score >= 4) return rules.high;
    return rules.mid;
  }

  return rules[value] ?? null;
}

function symptomsFeedback(value) {
  const values = Array.isArray(value) ? value : [value];

  if (values.length === 0 || values.includes('ninguno')) {
    return RULES.q_symptoms.ninguno;
  }

  const parts = values.map((item) => RULES.q_symptoms[item]).filter(Boolean).slice(0, 3);
  return parts.length > 0 ? parts.join(' ') : RULES.q_symptoms.ninguno;
}

export function localFeedbackFor(question, value) {
  switch (question.id) {
    case 'q_week':
      return `Perfecto, estamos en el ${WEEK_LABEL[value] ?? 'embarazo'}. Te mostrare informacion de esa etapa.`;
    case 'q_first':
      return value === 'yes'
        ? FIRST_BABY_TEXT
        : 'Cada embarazo es distinto. Comparar con el anterior ayuda a entender mejor el tuyo.';
    case 'q_symptoms':
      return symptomsFeedback(value);
    case 'q_concern':
      return CONCERN_TEXT[value] ?? 'Tus respuestas ya me estan dando un contexto muy claro.';
    case 'q_note':
      return value ? `Anotado: ${truncate(value)}` : 'Sin problema, seguimos con lo importante.';
    default:
      return pickSingle(question.id, value) ?? 'Respuesta registrada, gracias.';
  }
}

function buildAiPrompt(question, value, user, weekData) {
  const label =
    question.options?.find((option) => option.value === value)?.label ??
    (Array.isArray(value) ? value.join(', ') : value);

  return [
    'Escribe UNA respuesta breve y calida de maximo dos frases.',
    '',
    `Pregunta que le hiciste: ${question.text}`,
    `Respuesta de la usuaria: ${label}`,
    user?.name ? `Nombre de la usuaria: ${user.name}` : '',
    weekData ? `Esta en la semana ${weekData.week_number} de 40` : '',
    '',
    'Reglas:',
    '- No diagnostiques ni indiques medicamentos.',
    '- No repitas la pregunta ni digas "respuesta registrada".',
    '- Se directa, calida y en espanol.',
  ]
    .filter(Boolean)
    .join('\n');
}

export async function buildFeedback({ question, value, user, weekData }) {
  if (env.ai.provider === 'local' || !isOpenAiConfigured()) {
    return localFeedbackFor(question, value);
  }

  try {
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey: env.ai.apiKey, baseURL: env.ai.baseUrl });

    const completion = await client.chat.completions.create({
      model: env.ai.model,
      messages: [
        {
          role: 'system',
          content: 'Eres BabyTrack IA, un asistente educativo del embarazo. Nunca diagnosticas.',
        },
        { role: 'user', content: buildAiPrompt(question, value, user, weekData) },
      ],
      max_tokens: 160,
      temperature: 0.6,
    });

    const content = completion.choices?.[0]?.message?.content?.trim();
    return content || localFeedbackFor(question, value);
  } catch {
    return localFeedbackFor(question, value);
  }
}

export function weekForTrimester(value) {
  if (value === '1-13') return 8;
  if (value === '14-27') return 20;
  if (value === '28-40') return 34;
  return null;
}

export function scoreFromAnswers(answers) {
  const map = Object.fromEntries(answers.map((a) => [a.question_id, a.answer_value]));
  let score = 0;

  if (map.q_vitamins === 'yes') score += 2;
  else if (map.q_vitamins === 'sometimes') score += 1;

  if (map.q_food === '4-5' || map.q_food === '6+') score += 2;
  else if (map.q_food === '3') score += 1;

  if (map.q_exercise === 'yes') score += 2;
  else if (map.q_exercise === 'sometimes') score += 1;

  if (map.q_checkup === 'yes') score += 2;
  else if (map.q_checkup === 'unsure') score += 1;

  if (map.q_symptoms === 'ninguno') score += 2;

  const energy = Number(map.q_energy);
  if (Number.isFinite(energy) && energy >= 3) score += 1;

  return score;
}

export function buildSummaryText(answers, score, weekData) {
  const map = Object.fromEntries(answers.map((a) => [a.question_id, a.answer_value]));

  const highlights = [];
  const followUps = [];

  if (map.q_vitamins === 'yes') highlights.push('Tomas tus vitaminas de forma constante');
  else followUps.push('Consulta con tu obstetra sobre la vitamina adecuada para tu etapa');

  if (map.q_food === '4-5' || map.q_food === '6+') highlights.push('Tu ritmo de comidas es bueno');
  else if (map.q_food === '1-2') followUps.push('Prueba con un tentempi entre comidas para mantener la energia');
  else followUps.push('Agrega un tentempi entre comidas para mantener la energia');

  if (map.q_exercise === 'yes') highlights.push('Mantienes actividad fisica a diario');
  else if (map.q_exercise === 'sometimes') followUps.push('Una caminata de veinte minutos al dia seria un buen punto de partida');
  else followUps.push('Buscar alguna forma suave de movimiento que si puedas hacer');

  if (map.q_checkup === 'yes') highlights.push('Tienes tu proximo control agendado');
  else followUps.push('Confirma la fecha de tu proximo control medico');

  if (map.q_symptoms && !String(map.q_symptoms).includes('ninguno')) {
    followUps.push('Registra tus sintomas en el modulo de seguimiento para ver como evolucionan');
  }

  const level =
    score >= 7 ? 'Muy buen autocuidado' : score >= 4 ? 'Buen autocuidado' : 'Hay cosas por mejorar';

  const parts = [`${level}. Tu puntaje de seguimiento es ${score} de 12.`, ''];

  if (highlights.length > 0) {
    parts.push('Lo que estas haciendo bien:');
    for (const item of highlights) parts.push(`- ${item}`);
    parts.push('');
  }

  if (followUps.length > 0) {
    parts.push('Lo que te puede ayudar:');
    for (const item of followUps) parts.push(`- ${item}`);
    parts.push('');
  }

  if (weekData?.tips) {
    parts.push(`Consejo de tu semana ${weekData.week_number}: ${weekData.tips}`);
  }

  return parts.join('\n').trim();
}

export function getWeekData(weekNumber) {
  if (!weekNumber) return null;
  return get('SELECT * FROM weeks WHERE week_number = :week', { week: weekNumber });
}

export { cleanText };

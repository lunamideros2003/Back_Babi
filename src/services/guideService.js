import { knowledgeBase } from './ai/knowledgeBase.js';

/*
  Agrupa la base de conocimiento existente en las cuatro categorias de la
  guia prenatal. No se inventa contenido: se reutiliza el mismo material que
  usa el asistente, solo se reorganiza y se le pone un titulo legible.
*/

const TITLES = {
  'que puedo comer': 'Qué puedo comer',
  'cuanto peso puedo ganar': 'Cuánto peso puedo ganar',
  'puedo tomar cafe': 'Puedo tomar café',
  nauseas: 'Náuseas y vómitos',
  reflujo: 'Acidez y reflujo',
  estreñimiento: 'Estreñimiento',
  'dolor de espalda': 'Dolor de espalda',
  sangrado: 'Sangrado',
  'que controles necesito': 'Qué controles necesito',
  ecografia: 'Ecografías',
  'el bebe esta bien': '¿Está bien mi bebé?',
  'puedo hacer ejercicio': 'Puedo hacer ejercicio',
  'suelo pelvico': 'Suelo pélvico',
  'que se siente': 'Cómo se siente el bebé',
  'como estimular': 'Cómo estimular al bebé',
  'que llevo al hospital': 'Qué llevar al hospital',
  'cuando es el parto': 'Cuándo es el parto',
  'dolor del parto': 'El dolor del parto',
  ansiedad: 'Ansiedad',
  'no duermo': 'No duermo',
  'me siento sola': 'Me siento sola',
};

const GROUPS = [
  {
    id: 'alimentacion',
    label: 'Alimentación',
    description: 'Qué comer, qué limitar y cómo acompañar la alimentación de estas semanas.',
    categories: ['alimentacion'],
  },
  {
    id: 'sintomas',
    label: 'Síntomas y bienestar',
    description: 'Las molestias más frecuentes y qué puedes hacer para aliviarlas.',
    categories: ['sintomas', 'ejercicio'],
  },
  {
    id: 'controles',
    label: 'Controles prenatales',
    description: 'Revisiones, ecografías y la preparación del nacimiento.',
    categories: ['controles', 'desarrollo', 'parto'],
  },
  {
    id: 'emocional',
    label: 'Bienestar emocional',
    description: 'El descanso, el ánimo y el acompañamiento de esta etapa.',
    categories: ['emocional'],
  },
];

function toTitle(question) {
  return TITLES[question] ?? question.charAt(0).toUpperCase() + question.slice(1);
}

export function buildGuide() {
  const categories = GROUPS.map((group) => {
    const items = knowledgeBase
      .filter((entry) => group.categories.includes(entry.category))
      .map((entry) => ({
        id: entry.question.replace(/[^a-z0-9]+/gi, '-').toLowerCase(),
        title: toTitle(entry.question),
        content: entry.answer,
        tags: entry.keywords.slice(0, 4),
      }));

    return { ...group, categories: undefined, total: items.length, items };
  });

  return {
    categories,
    total: categories.reduce((sum, item) => sum + item.total, 0),
  };
}

export default buildGuide;

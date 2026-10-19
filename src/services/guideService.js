import { knowledgeBase } from './ai/knowledgeBase.js';

/*
  Agrupa la base de conocimiento existente en las cuatro categorias de la
  guia prenatal. No se inventa contenido: se reutiliza el mismo material que
  usa el asistente, solo se reorganiza y se le pone un titulo legible.
*/

const TITLES = {
  'que puedo comer': 'Que puedo comer',
  'cuanto peso puedo ganar': 'Cuanto peso puedo ganar',
  'puedo tomar cafe': 'Puedo tomar cafe',
  nauseas: 'Nauseas y vomitos',
  reflujo: 'Acidez y reflujo',
  estreñimiento: 'Estreñimiento',
  'dolor de espalda': 'Dolor de espalda',
  sangrado: 'Sangrado',
  'que controles necesito': 'Que controles necesito',
  ecografia: 'Ecografias',
  'el bebe esta bien': 'Si mi bebe esta bien',
  'puedo hacer ejercicio': 'Puedo hacer ejercicio',
  'suelo pelvico': 'Suelo pelvico',
  'que se siente': 'Como se siente el bebe',
  'como estimular': 'Como estimular al bebe',
  'que llevo al hospital': 'Que llevar al hospital',
  'cuando es el parto': 'Cuando es el parto',
  'dolor del parto': 'El dolor del parto',
  ansiedad: 'Ansiedad',
  'no duermo': 'No duermo',
  'me siento sola': 'Me siento sola',
};

const GROUPS = [
  {
    id: 'alimentacion',
    label: 'Alimentacion',
    description: 'Que comer, que limitar y como acompanar la alimentacion de estas semanas.',
    categories: ['alimentacion'],
  },
  {
    id: 'sintomas',
    label: 'Sintomas y bienestar',
    description: 'Las molestias mas frecuentes y que puedes hacer para aliviarlas.',
    categories: ['sintomas', 'ejercicio'],
  },
  {
    id: 'controles',
    label: 'Controles prenatales',
    description: 'Revisiones, ecografias y la preparacion del nacimiento.',
    categories: ['controles', 'desarrollo', 'parto'],
  },
  {
    id: 'emocional',
    label: 'Bienestar emocional',
    description: 'El descanso, el animo y el acompañamiento de esta etapa.',
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

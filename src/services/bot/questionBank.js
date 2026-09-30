// Question bank for the BabyTrack bot. The bot asks, the user answers, and the
// bot replies with personalized educational feedback. Spanish copy, no claims
// that go beyond general information.

export const QUESTION_TYPES = {
  SINGLE: 'single',
  MULTI: 'multi',
  SCALE: 'scale',
  TEXT: 'text',
};

export const questions = [
  {
    id: 'q_week',
    order: 1,
    category: 'desarrollo',
    type: QUESTION_TYPES.SINGLE,
    text: 'A que semana estas ahora mismo?',
    help: 'Si no la sabes con exactitud, elige la que mas se acerque.',
    options: [
      { value: '1-13', label: 'Primer trimestre (semanas 1 a 13)' },
      { value: '14-27', label: 'Segundo trimestre (semanas 14 a 27)' },
      { value: '28-40', label: 'Tercer trimestre (semanas 28 a 40)' },
    ],
  },
  {
    id: 'q_first',
    order: 2,
    category: 'desarrollo',
    type: QUESTION_TYPES.SINGLE,
    text: 'Es tu primer embarazo?',
    options: [
      { value: 'yes', label: 'Si, es el primero' },
      { value: 'no', label: 'No, ya he estado embarazada antes' },
    ],
  },
  {
    id: 'q_energy',
    order: 3,
    category: 'emocional',
    type: QUESTION_TYPES.SCALE,
    text: 'Como ha estado tu energia estos dias?',
    help: '1 es muy baja y 5 es excelente.',
    min: 1,
    max: 5,
    minLabel: 'Muy baja',
    maxLabel: 'Excelente',
  },
  {
    id: 'q_symptoms',
    order: 4,
    category: 'sintomas',
    type: QUESTION_TYPES.MULTI,
    text: 'Que sintomas has tenido en los ultimos dias?',
    help: 'Puedes elegir varias o ninguna.',
    options: [
      { value: 'nauseas', label: 'Nauseas' },
      { value: 'reflujo', label: 'Reflujo o acidez' },
      { value: 'estreñimiento', label: 'Estreñimiento' },
      { value: 'dolor_espalda', label: 'Dolor de espalda' },
      { value: 'insomnio', label: 'Dificultad para dormir' },
      { value: 'ninguno', label: 'Ninguno, me siento bien' },
    ],
  },
  {
    id: 'q_food',
    order: 5,
    category: 'alimentacion',
    type: QUESTION_TYPES.SINGLE,
    text: 'Cuantas comidas al dia haces normalmente?',
    options: [
      { value: '1-2', label: 'Una o dos' },
      { value: '3', label: 'Tres' },
      { value: '4-5', label: 'Cuatro o cinco' },
      { value: '6+', label: 'Seis o mas' },
    ],
  },
  {
    id: 'q_vitamins',
    order: 6,
    category: 'alimentacion',
    type: QUESTION_TYPES.SINGLE,
    text: 'Estas tomando acido folico o vitaminas ahora?',
    options: [
      { value: 'yes', label: 'Si, todos los dias' },
      { value: 'sometimes', label: 'A veces, se me olvida' },
      { value: 'no', label: 'No, todavia no empiezo' },
    ],
  },
  {
    id: 'q_exercise',
    order: 7,
    category: 'ejercicio',
    type: QUESTION_TYPES.SINGLE,
    text: 'Puedes hacer algo de ejercicio en tu dia a dia?',
    options: [
      { value: 'yes', label: 'Si, camino o hago actividad' },
      { value: 'sometimes', label: 'Solo a veces' },
      { value: 'no', label: 'No, casi no puedo moverme' },
    ],
  },
  {
    id: 'q_concern',
    order: 8,
    category: 'emocional',
    type: QUESTION_TYPES.SINGLE,
    text: 'Que te preocupa mas en este momento?',
    options: [
      { value: 'health', label: 'La salud del bebe' },
      { value: 'symptoms', label: 'Los sintomas que tengo' },
      { value: 'weight', label: 'El peso y la alimentacion' },
      { value: 'birth', label: 'El parto y el momento de nacer' },
      { value: 'mood', label: 'Mi animo y mis emociones' },
      { value: 'nothing', label: 'Nada en especial' },
    ],
  },
  {
    id: 'q_checkup',
    order: 9,
    category: 'controles',
    type: QUESTION_TYPES.SINGLE,
    text: 'Tienes tu proxima cita medica agendada?',
    options: [
      { value: 'yes', label: 'Si, ya la tengo' },
      { value: 'no', label: 'No, todavia no' },
      { value: 'unsure', label: 'No estoy segura' },
    ],
  },
  {
    id: 'q_note',
    order: 10,
    category: 'general',
    type: QUESTION_TYPES.TEXT,
    text: 'Hay algo mas que quieras que recordemos?',
    help: 'Escribelo con tus palabras. Puedes dejarlo vacio.',
    placeholder: 'Por ejemplo: estoy tomando hierro o me cuesta dormir',
  },
];

export const TOTAL_QUESTIONS = questions.length;

export const getQuestionByIndex = (index) => questions.find((q) => q.order === index + 1) ?? null;

export const getQuestionById = (id) => questions.find((q) => q.id === id) ?? null;

export default questions;

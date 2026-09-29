import { EMERGENCY_KEYWORDS, RED_FLAG_MESSAGE, DISCLAIMER } from '../../config/disclaimers.js';

const DIAGNOSTIC_PATTERNS = [
  /\b(puedo tener|debo tener|tengo|pregunto si es|diagnosticame)\b/i,
  /\b(es [a-z]+ o [a-z]+)\b/i,
];

const MEDICATION_TERMS = 'pastilla|pastillas|medicamento|medicamentos|mg|mgml|dosis|antibiotico|antibioticos|ibuprofeno|paracetamol|aspirina|corticoide|progesterona|vitamina|vitamins|iron|hierro|suplemento';

const PRESCRIPTION_PATTERNS = [
  new RegExp(`\\b(recetame|receta|recetas|recetar|prescribme|dame|tomar|toma|recomiendame|indicame|indica|necesito)\\b[\\s\\S]{0,40}\\b(${MEDICATION_TERMS})\\b`, 'i'),
  new RegExp(`\\b(puedo|podria|se puede|debo)\\b[\\s\\S]{0,25}\\b(tomar|usar|consumir|ingerir)\\b[\\s\\S]{0,30}\\b(${MEDICATION_TERMS})\\b`, 'i'),
  new RegExp(`\\b(que|que)\\b[\\s\\S]{0,20}\\b(${MEDICATION_TERMS})\\b`, 'i'),
  /\b(dosis|cuantas pastillas)\b/i,
];

const SELF_DIAGNOSIS_PATTERNS = [
  /\b(tengo|se me puede|me pasa|padezco)\b.*\b(diabetes|gestacional|pre[e|i]clampsia|eclampsia|aborto|embarazo ectopico|placenta previa|anemia|hipotiroidismo|chlamydia|torch|infecci)/i,
];

function normalize(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function isEmergency(message) {
  const text = normalize(message);
  return EMERGENCY_KEYWORDS.some((keyword) => text.includes(normalize(keyword)));
}

export function isPrescriptionRequest(message) {
  return PRESCRIPTION_PATTERNS.some((pattern) => pattern.test(String(message)));
}

export function isSelfDiagnosisRequest(message) {
  return SELF_DIAGNOSIS_PATTERNS.some((pattern) => pattern.test(String(message)));
}

export function requiresRedirect(message) {
  return isPrescriptionRequest(message) || isSelfDiagnosisRequest(message);
}

export const MEDICATION_REFUSAL =
  'No puedo indicarte medicamentos ni dosis, eso le corresponde a tu obstetra o a un farmaceutico. ' +
  'Si tu medico ya te receto algo, sigue exactamente sus indicaciones. Mientras tanto, ' +
  'puedo explicarte los cambios tipicos de tu semana, darte orientacion general o ' +
  'recordarte tus proximos controles.';

export const EMERGENCY_RESPONSE = {
  content: RED_FLAG_MESSAGE,
  isEmergency: true,
  disclaimer: DISCLAIMER,
};

export function buildSystemContext(weekData) {
  if (!weekData) return '';
  return [
    'Contexto de la usuaria:',
    `- Semana actual: ${weekData.week_number} de 40 (${weekData.trimester_label})`,
    `- Tamano aproximado: ${weekData.size_comparison}`,
    `- Desarrollo: ${weekData.baby_development}`,
    `- Cambios tipicos en la madre: ${weekData.mother_changes}`,
    `- Enfoque de alimentacion: ${weekData.food_focus}`,
    `- Enfoque de ejercicio: ${weekData.exercise_tip}`,
    `- Foco del control: ${weekData.checkup_focus}`,
  ].join('\n');
}

export { DISCLAIMER };

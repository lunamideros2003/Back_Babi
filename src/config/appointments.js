/*
  Categorias de control prenatal.

  Viven en el backend para que el formulario y la API usen la misma lista: si
  se anaden en un sitio, se anaden en los dos.
*/

export const APPOINTMENT_CATEGORIES = [
  { value: 'checkup', label: 'Control prenatal' },
  { value: 'ultrasound', label: 'Ecografía' },
  { value: 'lab', label: 'Análisis de laboratorio' },
  { value: 'specialist', label: 'Especialista' },
  { value: 'vaccine', label: 'Vacuna' },
  { value: 'birth_class', label: 'Clase de parto' },
  { value: 'other', label: 'Otro' },
];

export const APPOINTMENT_STATUSES = [
  { value: 'scheduled', label: 'Programada' },
  { value: 'done', label: 'Realizada' },
  { value: 'cancelled', label: 'Cancelada' },
];

export const APPOINTMENT_CATEGORY_VALUES = APPOINTMENT_CATEGORIES.map((item) => item.value);
export const APPOINTMENT_STATUS_VALUES = APPOINTMENT_STATUSES.map((item) => item.value);

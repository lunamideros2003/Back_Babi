import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isEmergency,
  isPrescriptionRequest,
  isSelfDiagnosisRequest,
} from '../src/services/ai/guardrails.js';
import {
  calculatePregnancy,
  dueDateFromLastPeriod,
  dueDateFromWeek,
} from '../src/utils/pregnancyMath.js';
import { hashPassword, verifyPassword } from '../src/utils/password.js';

test('detecta senales de emergencia', () => {
  assert.equal(isEmergency('Estoy sangrado mucho'), true);
  assert.equal(isEmergency('creo que rompi la bolsa'), true);
  assert.equal(isEmergency('tengo dolor intenso'), true);
  assert.equal(isEmergency('el bebe dejo de moverse'), true);
  assert.equal(isEmergency('tengo fiebre alta'), true);
  assert.equal(isEmergency('Que puedo comer'), false);
  assert.equal(isEmergency('puedo hacer yoga'), false);
});

test('detecta pedidos de receta', () => {
  assert.equal(isPrescriptionRequest('me recetas paracetamol?'), true);
  assert.equal(isPrescriptionRequest('puedo tomar ibuprofeno?'), true);
  assert.equal(isPrescriptionRequest('cual es la dosis'), true);
  assert.equal(isPrescriptionRequest('que como hoy'), false);
});

test('detecta intentos de autodiagnostico', () => {
  assert.equal(isSelfDiagnosisRequest('creo que tengo diabetes gestacional'), true);
  assert.equal(isSelfDiagnosisRequest('tengo preeclampsia?'), true);
  assert.equal(isSelfDiagnosisRequest('me duele la cabeza'), false);
});

test('calcula la semana de embarazo correctamente', () => {
  // 2026-01-05 is 133 days after the 2025-08-25 start date, so day 134 of 280.
  const result = calculatePregnancy({ dueDate: '2026-06-01', today: '2026-01-05' });

  assert.equal(result.due_date, '2026-06-01');
  assert.equal(result.start_date, '2025-08-25');
  assert.equal(result.current_day, 134);
  assert.equal(result.current_week, 20);
  assert.equal(result.day_of_week, 134);
  assert.equal(result.days_left, 147);
  assert.equal(result.trimester, 2);
  assert.equal(result.trimester_label, 'Segundo trimestre');
  assert.equal(result.is_overdue, false);
  assert.equal(result.progress_percent, 48);
});

test('la fecha de parto nunca se inventa con valores vacios', () => {
  assert.equal(dueDateFromLastPeriod(undefined), null);
  assert.equal(dueDateFromLastPeriod(''), null);
  assert.equal(calculatePregnancy({ dueDate: null }), null);
  assert.equal(calculatePregnancy({ dueDate: 'no-es-fecha' }), null);
});

test('la semana se queda en 40 y el dia en 280 al llegar a la fecha', () => {
  const result = calculatePregnancy({ dueDate: '2026-06-01', today: '2026-06-01' });
  assert.equal(result.current_day, 280);
  assert.equal(result.current_week, 40);
  assert.equal(result.days_left, 0);
});

test('la semana nunca supera 40 por encima de la fecha', () => {
  const result = calculatePregnancy({ dueDate: '2020-01-01', today: '2026-01-01' });
  assert.equal(result.current_week, 40);
  assert.equal(result.current_day, 280);
  assert.equal(result.progress_percent, 100);
  assert.equal(result.is_overdue, true);
});

test('calcula la fecha de parto desde la ultima menstruacion', () => {
  assert.equal(dueDateFromLastPeriod('2026-01-01'), '2026-10-08');
});

test('calcula la fecha de parto desde una semana objetivo', () => {
  assert.equal(dueDateFromWeek(40, '2026-01-01'), '2026-01-08');
  assert.equal(dueDateFromWeek(20, '2026-01-01'), '2026-05-28');
  assert.equal(dueDateFromWeek(1, '2026-01-01'), '2026-10-08');
});

test('las contrasenas se verifican correctamente', () => {
  const hash = hashPassword('secreta123');
  assert.equal(verifyPassword('secreta123', hash), true);
  assert.equal(verifyPassword('incorrecta', hash), false);
  assert.equal(verifyPassword('secreta123', 'basura'), false);
});

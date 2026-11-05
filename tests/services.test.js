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

test('detects emergency signs', () => {
  assert.equal(isEmergency('Estoy sangrado mucho'), true);
  assert.equal(isEmergency('creo que rompi la bolsa'), true);
  assert.equal(isEmergency('tengo dolor intenso'), true);
  assert.equal(isEmergency('el bebe dejo de moverse'), true);
  assert.equal(isEmergency('tengo fiebre alta'), true);
  assert.equal(isEmergency('Que puedo comer'), false);
  assert.equal(isEmergency('puedo hacer yoga'), false);
});

test('detects prescription requests', () => {
  assert.equal(isPrescriptionRequest('me recetas paracetamol?'), true);
  assert.equal(isPrescriptionRequest('puedo tomar ibuprofeno?'), true);
  assert.equal(isPrescriptionRequest('cual es la dosis'), true);
  assert.equal(isPrescriptionRequest('que como hoy'), false);
});

test('detects self-diagnosis attempts', () => {
  assert.equal(isSelfDiagnosisRequest('creo que tengo diabetes gestacional'), true);
  assert.equal(isSelfDiagnosisRequest('tengo preeclampsia?'), true);
  assert.equal(isSelfDiagnosisRequest('me duele la cabeza'), false);
});

test('calculates the pregnancy week correctly', () => {

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

test('the due date is never invented from empty values', () => {
  assert.equal(dueDateFromLastPeriod(undefined), null);
  assert.equal(dueDateFromLastPeriod(''), null);
  assert.equal(calculatePregnancy({ dueDate: null }), null);
  assert.equal(calculatePregnancy({ dueDate: 'no-es-fecha' }), null);
});

test('the week stays at 40 and the day at 280 when reaching the due date', () => {
  const result = calculatePregnancy({ dueDate: '2026-06-01', today: '2026-06-01' });
  assert.equal(result.current_day, 280);
  assert.equal(result.current_week, 40);
  assert.equal(result.days_left, 0);
});

test('the week never exceeds 40 past the due date', () => {
  const result = calculatePregnancy({ dueDate: '2020-01-01', today: '2026-01-01' });
  assert.equal(result.current_week, 40);
  assert.equal(result.current_day, 280);
  assert.equal(result.progress_percent, 100);
  assert.equal(result.is_overdue, true);
});

test('calculates the due date from the last period', () => {
  assert.equal(dueDateFromLastPeriod('2026-01-01'), '2026-10-08');
});

test('calculates the due date from a target week', () => {
  assert.equal(dueDateFromWeek(40, '2026-01-01'), '2026-01-08');
  assert.equal(dueDateFromWeek(20, '2026-01-01'), '2026-05-28');
  assert.equal(dueDateFromWeek(1, '2026-01-01'), '2026-10-08');
});

test('passwords are verified correctly', () => {
  const hash = hashPassword('secreta123');
  assert.equal(verifyPassword('secreta123', hash), true);
  assert.equal(verifyPassword('incorrecta', hash), false);
  assert.equal(verifyPassword('secreta123', 'basura'), false);
});

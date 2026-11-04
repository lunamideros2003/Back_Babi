import test from 'node:test';
import assert from 'node:assert/strict';

import {
  trimesterLabel,
  buildReminderPrompt,
  parseJsonObject,
  normalizePlan,
} from '../src/services/ai/reminderPlanner.js';
import { REMINDER_KEYS } from '../src/config/reminders.js';

test('nombra el trimestre segun la semana', () => {
  assert.equal(trimesterLabel(8), 'primer trimestre');
  assert.equal(trimesterLabel(13), 'primer trimestre');
  assert.equal(trimesterLabel(14), 'segundo trimestre');
  assert.equal(trimesterLabel(27), 'segundo trimestre');
  assert.equal(trimesterLabel(28), 'tercer trimestre');
  assert.equal(trimesterLabel(40), 'tercer trimestre');
});

test('el prompt incluye la semana, el trimestre y la cantidad', () => {
  const prompt = buildReminderPrompt({ pregnancy: { current_week: 30 }, count: 4 });

  assert.match(prompt, /Semana actual: 30 de 40/);
  assert.match(prompt, /tercer trimestre/);
  assert.match(prompt, /Cantidad de recordatorios: 4/);
  assert.match(prompt, /preparación del parto/);
});

test('el prompt cambia el enfasis en el primer trimestre', () => {
  const prompt = buildReminderPrompt({ pregnancy: { current_week: 6 }, count: 3 });

  assert.match(prompt, /primer trimestre/);
  assert.match(prompt, /ácido fólico/);
});

test('el prompt menciona los recordatorios que ya existen', () => {
  const conRepetidos = buildReminderPrompt({
    pregnancy: { current_week: 20 },
    count: 3,
    existingTitles: ['Camina 20 minutos', 'Bebe agua'],
  });

  assert.match(conRepetidos, /No repitas/);
  assert.match(conRepetidos, /Camina 20 minutos/);

  const sinRepetidos = buildReminderPrompt({ pregnancy: { current_week: 20 }, count: 3 });
  assert.doesNotMatch(sinRepetidos, /No repitas/);
});

test('extrae el JSON aunque venga en un bloque de codigo', () => {
  const raw = 'Claro:\n```json\n{"reminders":[{"title":"Camina"}]}\n```';

  assert.deepEqual(parseJsonObject(raw), { reminders: [{ title: 'Camina' }] });
});

test('acepta una lista suelta', () => {
  assert.deepEqual(parseJsonObject('[{"title":"Camina"}]'), [{ title: 'Camina' }]);
});

test('devuelve null cuando no hay JSON', () => {
  assert.equal(parseJsonObject('lo siento, no puedo'), null);
  assert.equal(parseJsonObject(''), null);
  assert.equal(parseJsonObject(undefined), null);
});

test('normaliza los campos y descarta titulos vacios', () => {
  const items = normalizePlan({
    reminders: [
      { title: '  Camina   20 minutos ', description: 'Mejora   la circulación' },
      { title: 'x' },
      { title: 'Mide tu presión', category: 'inventada', recurrence: 'hourly' },
    ],
  });

  assert.equal(items.length, 2);
  assert.equal(items[0].title, 'Camina 20 minutos');
  assert.equal(items[0].description, 'Mejora la circulación');
  assert.equal(items[0].category, 'general');
  assert.equal(items[0].recurrence, 'none');
  assert.equal(items[1].category, 'general');
  assert.equal(items[1].recurrence, 'none');
});

test('respeta las categorias validas y el maximo pedido', () => {
  const reminders = REMINDER_KEYS.map((category) => ({
    title: `Recordatorio ${category}`,
    category,
    recurrence: 'daily',
  }));

  const items = normalizePlan({ reminders }, { count: 3 });

  assert.equal(items.length, 3);
  assert.ok(items.every((item) => REMINDER_KEYS.includes(item.category)));
  assert.ok(items.every((item) => item.recurrence === 'daily'));
});

test('devuelve una lista vacia si la respuesta no trae nada', () => {
  assert.deepEqual(normalizePlan(null), []);
  assert.deepEqual(normalizePlan({}), []);
  assert.deepEqual(normalizePlan({ reminders: 'nada' }), []);
});

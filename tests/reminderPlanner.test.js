import test from 'node:test';
import assert from 'node:assert/strict';

import {
  trimesterLabel,
  buildReminderPrompt,
  parseJsonObject,
  normalizePlan,
} from '../src/services/ai/reminderPlanner.js';
import { REMINDER_KEYS } from '../src/config/reminders.js';

test('names the trimester based on the week', () => {
  assert.equal(trimesterLabel(8), 'primer trimestre');
  assert.equal(trimesterLabel(13), 'primer trimestre');
  assert.equal(trimesterLabel(14), 'segundo trimestre');
  assert.equal(trimesterLabel(27), 'segundo trimestre');
  assert.equal(trimesterLabel(28), 'tercer trimestre');
  assert.equal(trimesterLabel(40), 'tercer trimestre');
});

test('the prompt includes the week, trimester and count', () => {
  const prompt = buildReminderPrompt({ pregnancy: { current_week: 30 }, count: 4 });

  assert.match(prompt, /Semana actual: 30 de 40/);
  assert.match(prompt, /tercer trimestre/);
  assert.match(prompt, /Cantidad de recordatorios: 4/);
  assert.match(prompt, /preparación del parto/);
});

test('the prompt shifts emphasis in the first trimester', () => {
  const prompt = buildReminderPrompt({ pregnancy: { current_week: 6 }, count: 3 });

  assert.match(prompt, /primer trimestre/);
  assert.match(prompt, /ácido fólico/);
});

test('the prompt mentions existing reminders', () => {
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

test('extracts JSON even inside a code block', () => {
  const raw = 'Claro:\n```json\n{"reminders":[{"title":"Camina"}]}\n```';

  assert.deepEqual(parseJsonObject(raw), { reminders: [{ title: 'Camina' }] });
});

test('accepts a bare list', () => {
  assert.deepEqual(parseJsonObject('[{"title":"Camina"}]'), [{ title: 'Camina' }]);
});

test('returns null when there is no JSON', () => {
  assert.equal(parseJsonObject('lo siento, no puedo'), null);
  assert.equal(parseJsonObject(''), null);
  assert.equal(parseJsonObject(undefined), null);
});

test('normalizes fields and drops empty titles', () => {
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

test('respects valid categories and the requested maximum', () => {
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

test('returns an empty list when the response brings nothing', () => {
  assert.deepEqual(normalizePlan(null), []);
  assert.deepEqual(normalizePlan({}), []);
  assert.deepEqual(normalizePlan({ reminders: 'nada' }), []);
});

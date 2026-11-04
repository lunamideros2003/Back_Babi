import test from 'node:test';
import assert from 'node:assert/strict';

import { weeks } from '../src/db/data/weeks.js';

const late = weeks.filter((item) => item.week_number >= 28);

test('el tercer trimestre va de la semana 28 a la 40', () => {
  assert.equal(late.length, 13);
  assert.equal(late[0].week_number, 28);
  assert.equal(late.at(-1).week_number, 40);
});

test('la semana 37 se compara con una sandia pequena', () => {
  const item = weeks.find((entry) => entry.week_number === 37);

  assert.equal(item.size_comparison, 'una sandía pequeña');
});

test('las ultimas semanas usan sandias cada vez mayores', () => {
  const watermelons = [37, 38, 39, 40].map(
    (week) => weeks.find((entry) => entry.week_number === week).size_comparison,
  );

  assert.deepEqual(watermelons, [
    'una sandía pequeña',
    'una sandía mediana',
    'una sandía grande',
    'una sandía muy grande',
  ]);
});

test('el peso del tercer trimestre supera los 3 kg al final', () => {
  for (const item of late) {
    const match = String(item.typical_weight ?? '').match(/([\d.]+)\s*g/);
    if (!match) continue;

    const grams = Number(match[1].replace('.', ''));
    if (item.week_number === 40) assert.ok(grams >= 3000);
  }
});

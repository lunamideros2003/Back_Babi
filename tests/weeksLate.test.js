import test from 'node:test';
import assert from 'node:assert/strict';

import { weeks } from '../src/db/data/weeks.js';

const late = weeks.filter((item) => item.week_number >= 28);

test('the third trimester spans weeks 28 to 40', () => {
  assert.equal(late.length, 13);
  assert.equal(late[0].week_number, 28);
  assert.equal(late.at(-1).week_number, 40);
});

test('week 37 is compared to a small watermelon', () => {
  const item = weeks.find((entry) => entry.week_number === 37);

  assert.equal(item.size_comparison, 'una sandía pequeña');
});

test('the last weeks use increasingly larger watermelons', () => {
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

test('third-trimester weight exceeds 3 kg at the end', () => {
  for (const item of late) {
    const match = String(item.typical_weight ?? '').match(/([\d.]+)\s*g/);
    if (!match) continue;

    const grams = Number(match[1].replace('.', ''));
    if (item.week_number === 40) assert.ok(grams >= 3000);
  }
});

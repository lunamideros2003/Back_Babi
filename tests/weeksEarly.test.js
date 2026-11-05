import test from 'node:test';
import assert from 'node:assert/strict';

import { weeks } from '../src/db/data/weeks.js';

const early = weeks.filter((item) => item.week_number <= 13);

test('the first trimester spans weeks 4 to 13', () => {
  assert.equal(early.length, 10);
  assert.equal(early[0].week_number, 4);
  assert.equal(early.at(-1).week_number, 13);
});

test('first-trimester sizes are seeds or small fruits', () => {
  const smallSizes = /semilla|lenteja|arándano|frambuesa|uva|fresa|higo|lima|limón/i;

  for (const item of early) {
    assert.match(item.size_comparison, smallSizes, `semana ${item.week_number}`);
  }
});

test('first-trimester weight stays under 30 g', () => {
  for (const item of early) {
    const match = String(item.typical_weight ?? '').match(/([\d.]+)\s*g/);
    if (!match) continue;

    assert.ok(Number(match[1].replace('.', '')) < 30, `semana ${item.week_number}`);
  }
});

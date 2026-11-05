import test from 'node:test';
import assert from 'node:assert/strict';

import { weeks } from '../src/db/data/weeks.js';

const middle = weeks.filter((item) => item.week_number >= 14 && item.week_number <= 27);

test('the second trimester spans weeks 14 to 27', () => {
  assert.equal(middle.length, 14);
  assert.equal(middle[0].week_number, 14);
  assert.equal(middle.at(-1).week_number, 27);
});

test('second-trimester sizes are medium fruits and vegetables', () => {
  const mediumSizes = /melocotón|manzana|aguacate|pera|pimiento|mango|plátano|zanahoria|papaya|pomelo|maíz|coliflor|calabacín|repollo/i;

  for (const item of middle) {
    assert.match(item.size_comparison, mediumSizes, `semana ${item.week_number}`);
  }
});

test('second-trimester weight grows from 43 g to 875 g', () => {
  const first = middle[0].typical_weight;
  const last = middle.at(-1).typical_weight;

  assert.match(first, /43 g/);
  assert.match(last, /875 g/);
});

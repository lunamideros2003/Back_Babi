import test from 'node:test';
import assert from 'node:assert/strict';

import { weeks } from '../src/db/data/weeks.js';

const middle = weeks.filter((item) => item.week_number >= 14 && item.week_number <= 27);

test('el segundo trimestre va de la semana 14 a la 27', () => {
  assert.equal(middle.length, 14);
  assert.equal(middle[0].week_number, 14);
  assert.equal(middle.at(-1).week_number, 27);
});

test('los tamanos del segundo trimestre son frutas y hortalizas medianas', () => {
  const medianas = /melocotón|manzana|aguacate|pera|pimiento|mango|plátano|zanahoria|papaya|pomelo|maíz|coliflor|calabacín|repollo/i;

  for (const item of middle) {
    assert.match(item.size_comparison, medianas, `semana ${item.week_number}`);
  }
});

test('el peso del segundo trimestre crece de 43 g a 875 g', () => {
  const first = middle[0].typical_weight;
  const last = middle.at(-1).typical_weight;

  assert.match(first, /43 g/);
  assert.match(last, /875 g/);
});

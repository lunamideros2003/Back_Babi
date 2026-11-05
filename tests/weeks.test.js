import test from 'node:test';
import assert from 'node:assert/strict';

import { weeks } from '../src/db/data/weeks.js';

const byWeek = new Map(weeks.map((item) => [item.week_number, item]));

function grams(text) {
  const match = String(text ?? '').match(/([\d.]+)\s*g/);
  return match ? Number(match[1].replace('.', '')) : null;
}

function centimeters(text) {
  const match = String(text ?? '').match(/([\d.]+)\s*cm/);
  return match ? Number(match[1].replace(',', '.')) : null;
}

test('all 37 weeks are present, from 4 to 40', () => {
  assert.equal(weeks.length, 37);

  for (let week = 4; week <= 40; week += 1) {
    assert.ok(byWeek.has(week), `falta la semana ${week}`);
  }
});

test('each week brings a size comparison with an article', () => {
  for (const item of weeks) {
    assert.ok(item.size_comparison, `semana ${item.week_number} sin tamano`);
    assert.match(
      item.size_comparison,
      /^un(a)?\s+\S/,
      `semana ${item.week_number}: "${item.size_comparison}" necesita articulo`,
    );
  }
});

test('week 37 is a small watermelon', () => {
  assert.equal(byWeek.get(37).size_comparison, 'una sandía pequeña');
});

test('fruits grow with the weeks and do not repeat back to back', () => {
  const orden = weeks.map((item) => item.week_number);
  assert.deepEqual(orden, [...orden].sort((a, b) => a - b));

  for (let i = 1; i < weeks.length; i += 1) {
    assert.notEqual(
      weeks[i].size_comparison,
      weeks[i - 1].size_comparison,
      `semana ${weeks[i].week_number} repite la fruta anterior`,
    );
  }
});

test('weight grows from week 20', () => {
  let anterior = 0;

  for (const item of weeks) {
    const weight = grams(item.typical_weight);
    if (weight === null) continue;
    if (item.week_number < 20) continue;

    assert.ok(weight > anterior, `semana ${item.week_number}: ${weight} g no supera ${anterior} g`);
    anterior = weight;
  }

  assert.ok(anterior >= 3000, 'la semana 40 deberia rondar los 3 kg');
});

test('length grows from week 8', () => {
  let anterior = 0;

  for (const item of weeks) {
    const largo = centimeters(item.typical_length);
    if (largo === null) continue;
    if (item.week_number < 8) continue;

    assert.ok(largo > anterior, `semana ${item.week_number}: ${largo} cm no supera ${anterior} cm`);
    anterior = largo;
  }

  assert.ok(anterior >= 50, 'la semana 40 deberia medir unos 51 cm');
});

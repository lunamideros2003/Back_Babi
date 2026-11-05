import test from 'node:test';
import assert from 'node:assert/strict';

import { weeks } from '../src/db/data/weeks.js';

const SIN_TILDE = [
  'corazon',
  'embrion',
  'utero',
  'nauseas',
  'ecografia',
  'tamano',
  'sueno',
  'energia',
  'estomago',
  'liquido',
  'presion',
  'respiracion',
  'organogenesis',
];

test('each week brings the texts that are shown', () => {
  for (const item of weeks) {
    assert.ok(item.title, `semana ${item.week_number} sin titulo`);
    assert.ok(item.summary, `semana ${item.week_number} sin resumen`);
    assert.ok(item.baby_development, `semana ${item.week_number} sin desarrollo`);
    assert.ok(item.mother_changes, `semana ${item.week_number} sin cambios de la madre`);
    assert.ok(item.tips, `semana ${item.week_number} sin consejo`);
  }
});

test('no known words are left without accents', () => {
  for (const item of weeks) {
    const text = [
      item.title,
      item.summary,
      item.baby_development,
      item.mother_changes,
      item.tips,
      item.food_focus,
      item.exercise_tip,
      item.checkup_focus,
    ]
      .join(' ')
      .toLowerCase();

    for (const palabra of SIN_TILDE) {
      assert.doesNotMatch(
        text,
        new RegExp(`\\b${palabra}\\b`),
        `semana ${item.week_number} conserva "${palabra}"`,
      );
    }
  }
});

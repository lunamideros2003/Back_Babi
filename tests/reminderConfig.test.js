import test from 'node:test';
import assert from 'node:assert/strict';

import {
  REMINDER_CATEGORIES,
  REMINDER_KEYS,
  RECURRENCE_OPTIONS,
  isReminderCategory,
  isRecurrence,
} from '../src/config/reminders.js';

test('todas las categorias tienen clave y etiqueta', () => {
  assert.ok(REMINDER_CATEGORIES.length >= 5);

  for (const category of REMINDER_CATEGORIES) {
    assert.ok(category.key);
    assert.ok(category.label);
    assert.equal(category.key, category.key.toLowerCase());
  }
});

test('reconoce solo las categorias de la lista', () => {
  assert.ok(isReminderCategory('parto'));
  assert.ok(isReminderCategory('emocional'));
  assert.ok(!isReminderCategory('inventada'));
  assert.ok(!isReminderCategory(undefined));
});

test('reconoce solo las recurrencias validas', () => {
  for (const option of RECURRENCE_OPTIONS) assert.ok(isRecurrence(option));

  assert.ok(!isRecurrence('hourly'));
  assert.ok(!isRecurrence(null));
});

test('las claves salen de las categorias sin repetirse', () => {
  assert.deepEqual(
    REMINDER_KEYS,
    REMINDER_CATEGORIES.map((category) => category.key),
  );
  assert.equal(new Set(REMINDER_KEYS).size, REMINDER_KEYS.length);
});

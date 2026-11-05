import test from 'node:test';
import assert from 'node:assert/strict';

import {
  REMINDER_CATEGORIES,
  REMINDER_KEYS,
  RECURRENCE_OPTIONS,
  isReminderCategory,
  isRecurrence,
} from '../src/config/reminders.js';

test('all categories have a key and a label', () => {
  assert.ok(REMINDER_CATEGORIES.length >= 5);

  for (const category of REMINDER_CATEGORIES) {
    assert.ok(category.key);
    assert.ok(category.label);
    assert.equal(category.key, category.key.toLowerCase());
  }
});

test('recognizes only categories from the list', () => {
  assert.ok(isReminderCategory('parto'));
  assert.ok(isReminderCategory('emocional'));
  assert.ok(!isReminderCategory('inventada'));
  assert.ok(!isReminderCategory(undefined));
});

test('recognizes only valid recurrences', () => {
  for (const option of RECURRENCE_OPTIONS) assert.ok(isRecurrence(option));

  assert.ok(!isRecurrence('hourly'));
  assert.ok(!isRecurrence(null));
});

test('keys come from the categories without duplicates', () => {
  assert.deepEqual(
    REMINDER_KEYS,
    REMINDER_CATEGORIES.map((category) => category.key),
  );
  assert.equal(new Set(REMINDER_KEYS).size, REMINDER_KEYS.length);
});

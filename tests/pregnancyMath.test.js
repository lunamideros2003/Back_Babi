import test from 'node:test';
import assert from 'node:assert/strict';

import {
  FIRST_WEEK,
  LAST_WEEK,
  dueDateFromWeek,
  parseWeekNumber,
  trimesterName,
  trimesterOf,
} from '../src/utils/pregnancyMath.js';

test('accepts weeks that have content', () => {
  assert.equal(parseWeekNumber(4), 4);
  assert.equal(parseWeekNumber('20'), 20);
  assert.equal(parseWeekNumber(40), 40);
  assert.equal(FIRST_WEEK, 4);
  assert.equal(LAST_WEEK, 40);
});

test('rejects out-of-range or non-integer weeks', () => {
  assert.equal(parseWeekNumber(3), null);
  assert.equal(parseWeekNumber(41), null);
  assert.equal(parseWeekNumber('37.5'), null);
  assert.equal(parseWeekNumber('abc'), null);
  assert.equal(parseWeekNumber(''), null);
  assert.equal(parseWeekNumber(undefined), null);
});

test('places each week in its trimester', () => {
  assert.equal(trimesterOf(4), 1);
  assert.equal(trimesterOf(13), 1);
  assert.equal(trimesterOf(14), 2);
  assert.equal(trimesterOf(27), 2);
  assert.equal(trimesterOf(28), 3);
  assert.equal(trimesterOf(40), 3);
  assert.equal(trimesterOf(null), null);
});

test('names the trimester in Spanish', () => {
  assert.equal(trimesterName(10), 'Primer trimestre');
  assert.equal(trimesterName(20), 'Segundo trimestre');
  assert.equal(trimesterName(37), 'Tercer trimestre');
  assert.equal(trimesterName('x'), null);
});

test('does not calculate a date from an invalid week', () => {
  assert.equal(dueDateFromWeek('abc', '2026-01-01'), null);
  assert.equal(dueDateFromWeek(0, '2026-01-01'), null);
  assert.equal(dueDateFromWeek(43, '2026-01-01'), null);
  assert.equal(dueDateFromWeek(20.5, '2026-01-01'), null);
});

test('calculates the due date from a valid week', () => {
  assert.equal(dueDateFromWeek(20, '2026-01-01'), '2026-05-28');
  assert.equal(dueDateFromWeek(40, '2026-01-01'), '2026-01-08');
});

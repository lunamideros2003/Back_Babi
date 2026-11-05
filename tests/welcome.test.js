import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildGreeting,
  buildWelcome,
  pickSuggestions,
  stageFor,
  WELCOME_PHRASE,
} from '../src/services/ai/welcome.js';

test('the greeting uses the first name', () => {
  const greeting = buildGreeting('Luna Mideros');

  assert.match(greeting, /^Hola, Luna\./);
  assert.ok(greeting.includes(WELCOME_PHRASE));
});

test('the greeting works without a name', () => {
  const greeting = buildGreeting('');

  assert.match(greeting, /^Hola\./);
  assert.ok(greeting.includes(WELCOME_PHRASE));
});

test('picks the stage based on the week', () => {
  assert.equal(stageFor(8), 'early');
  assert.equal(stageFor(14), 'middle');
  assert.equal(stageFor(30), 'late');
  assert.equal(stageFor(null), 'general');
});

test('each stage brings four different suggestions', () => {
  for (const week of [6, 20, 34, null]) {
    const suggestions = pickSuggestions(week);

    assert.equal(suggestions.length, 4);
    assert.equal(new Set(suggestions).size, 4);
  }
});

test('third-trimester suggestions talk about birth', () => {
  const suggestions = pickSuggestions(36).join(' ').toLowerCase();

  assert.match(suggestions, /parto|contracciones|hospital/);
});

test('buildWelcome joins greeting, stage and week', () => {
  const welcome = buildWelcome({ name: 'Ana', week: 20 });

  assert.equal(welcome.stage, 'middle');
  assert.equal(welcome.week, 20);
  assert.equal(welcome.suggestions.length, 4);
  assert.match(welcome.greeting, /Ana/);
});

test('without a registered pregnancy it uses general suggestions', () => {
  const welcome = buildWelcome({ name: 'Ana' });

  assert.equal(welcome.stage, 'general');
  assert.equal(welcome.week, null);
});

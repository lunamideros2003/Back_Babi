import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildGreeting,
  buildWelcome,
  pickSuggestions,
  stageFor,
  WELCOME_PHRASE,
} from '../src/services/ai/welcome.js';

test('el saludo usa el primer nombre', () => {
  const greeting = buildGreeting('Luna Mideros');

  assert.match(greeting, /^Hola, Luna\./);
  assert.ok(greeting.includes(WELCOME_PHRASE));
});

test('el saludo funciona sin nombre', () => {
  const greeting = buildGreeting('');

  assert.match(greeting, /^Hola\./);
  assert.ok(greeting.includes(WELCOME_PHRASE));
});

test('elige la etapa segun la semana', () => {
  assert.equal(stageFor(8), 'early');
  assert.equal(stageFor(14), 'middle');
  assert.equal(stageFor(30), 'late');
  assert.equal(stageFor(null), 'general');
});

test('cada etapa trae cuatro sugerencias distintas', () => {
  for (const week of [6, 20, 34, null]) {
    const suggestions = pickSuggestions(week);

    assert.equal(suggestions.length, 4);
    assert.equal(new Set(suggestions).size, 4);
  }
});

test('las sugerencias del tercer trimestre hablan del parto', () => {
  const suggestions = pickSuggestions(36).join(' ').toLowerCase();

  assert.match(suggestions, /parto|contracciones|hospital/);
});

test('buildWelcome reune saludo, etapa y semana', () => {
  const welcome = buildWelcome({ name: 'Ana', week: 20 });

  assert.equal(welcome.stage, 'middle');
  assert.equal(welcome.week, 20);
  assert.equal(welcome.suggestions.length, 4);
  assert.match(welcome.greeting, /Ana/);
});

test('sin embarazo registrado usa las sugerencias generales', () => {
  const welcome = buildWelcome({ name: 'Ana' });

  assert.equal(welcome.stage, 'general');
  assert.equal(welcome.week, null);
});

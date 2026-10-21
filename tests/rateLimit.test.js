import test from 'node:test';
import assert from 'node:assert/strict';

import { consume, reintentarEn, olvidar, resetear } from '../src/utils/rateLimit.js';

test('deja pasar las primeras peticiones', () => {
  resetear();
  assert.equal(consume('chat:1', 3), true);
  assert.equal(consume('chat:1', 3), true);
  assert.equal(consume('chat:1', 3), true);
});

test('bloquea cuando se pasa el limite', () => {
  resetear();
  consume('chat:2', 2);
  consume('chat:2', 2);
  assert.equal(consume('chat:2', 2), false);
});

test('cada clave lleva su propio contador', () => {
  resetear();
  consume('chat:3', 1);
  assert.equal(consume('chat:3', 1), false);
  assert.equal(consume('chat:4', 1), true);
});

test('indica cuanto falta para reintentar', () => {
  resetear();
  consume('chat:5', 1);
  const espera = reintentarEn('chat:5');
  assert.ok(espera > 0 && espera <= 60, `espera inesperada: ${espera}`);
});

test('olvidar una clave reinicia su contador', () => {
  resetear();
  consume('chat:6', 1);
  assert.equal(consume('chat:6', 1), false);
  olvidar('chat:6');
  assert.equal(consume('chat:6', 1), true);
});

test('resetear vacia todos los contadores', () => {
  resetear();
  consume('chat:7', 1);
  consume('chat:8', 1);
  resetear();
  assert.equal(consume('chat:7', 1), true);
  assert.equal(consume('chat:8', 1), true);
});

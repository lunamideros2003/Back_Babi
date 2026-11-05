import test from 'node:test';
import assert from 'node:assert/strict';

import { consume, retryAfter, forget, reset } from '../src/utils/rateLimit.js';

test('lets the first requests through', () => {
  reset();
  assert.equal(consume('chat:1', 3), true);
  assert.equal(consume('chat:1', 3), true);
  assert.equal(consume('chat:1', 3), true);
});

test('blocks once the limit is exceeded', () => {
  reset();
  consume('chat:2', 2);
  consume('chat:2', 2);
  assert.equal(consume('chat:2', 2), false);
});

test('each key keeps its own counter', () => {
  reset();
  consume('chat:3', 1);
  assert.equal(consume('chat:3', 1), false);
  assert.equal(consume('chat:4', 1), true);
});

test('reports how long until a retry is allowed', () => {
  reset();
  consume('chat:5', 1);
  const wait = retryAfter('chat:5');
  assert.ok(wait > 0 && wait <= 60, `unexpected wait: ${wait}`);
});

test('forgetting a key resets its counter', () => {
  reset();
  consume('chat:6', 1);
  assert.equal(consume('chat:6', 1), false);
  forget('chat:6');
  assert.equal(consume('chat:6', 1), true);
});

test('reset clears every counter', () => {
  reset();
  consume('chat:7', 1);
  consume('chat:8', 1);
  reset();
  assert.equal(consume('chat:7', 1), true);
  assert.equal(consume('chat:8', 1), true);
});

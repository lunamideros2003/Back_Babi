import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeDatabaseUrl } from '../src/config/env.js';
import { withRetry } from '../src/db/connection.js';

test('normalizes the connection url by removing sslmode', () => {
  assert.equal(
    normalizeDatabaseUrl('postgresql://u:p@h:5432/postgres?sslmode=require'),
    'postgresql://u:p@h:5432/postgres',
  );
});

test('keeps other url parameters', () => {
  assert.equal(
    normalizeDatabaseUrl('postgresql://u:p@h:5432/postgres?sslmode=require&application_name=babytrack'),
    'postgresql://u:p@h:5432/postgres?application_name=babytrack',
  );
});

test('leaves a url without parameters untouched', () => {
  assert.equal(
    normalizeDatabaseUrl('postgresql://u:p@h:5432/postgres'),
    'postgresql://u:p@h:5432/postgres',
  );
});

test('trims spaces left when copying a url', () => {
  assert.equal(
    normalizeDatabaseUrl('  postgresql://u:p@h:5432/postgres  '),
    'postgresql://u:p@h:5432/postgres',
  );
});

test('an empty url stays empty', () => {
  assert.equal(normalizeDatabaseUrl(''), '');
  assert.equal(normalizeDatabaseUrl(undefined), '');
});

test('encodes an unescaped # in the password', () => {
  assert.equal(
    normalizeDatabaseUrl('postgresql://postgres.x:pa#ss@host:5432/postgres'),
    'postgresql://postgres.x:pa%23ss@host:5432/postgres',
  );
});

test('encodes an unescaped ? in the password', () => {
  assert.equal(
    normalizeDatabaseUrl('postgresql://postgres.x:pa?ss@host:5432/postgres'),
    'postgresql://postgres.x:pa%3Fss@host:5432/postgres',
  );
});

test('a ? in the password is not confused with the query', () => {
  const result = normalizeDatabaseUrl('postgresql://postgres.x:pa?ss@host:5432/postgres?sslmode=require');

  assert.equal(result, 'postgresql://postgres.x:pa%3Fss@host:5432/postgres');
});

test('does not double encode an already encoded password', () => {
  assert.equal(
    normalizeDatabaseUrl('postgresql://postgres.x:p%40ss%2Fword@host:5432/postgres'),
    'postgresql://postgres.x:p%40ss%2Fword@host:5432/postgres',
  );
});

test('removes quotes that come when copying', () => {
  assert.equal(
    normalizeDatabaseUrl('"postgresql://postgres.x:p%40ss@host:5432/postgres"'),
    'postgresql://postgres.x:p%40ss@host:5432/postgres',
  );
  assert.equal(
    normalizeDatabaseUrl("'postgresql://postgres.x:p%40ss@host:5432/postgres'"),
    'postgresql://postgres.x:p%40ss@host:5432/postgres',
  );
});

test('an @ inside the password does not break the split', () => {
  assert.equal(
    normalizeDatabaseUrl('postgresql://postgres.x:p@ss@host:5432/postgres'),
    'postgresql://postgres.x:p%40ss@host:5432/postgres',
  );
});

test('leaves a url without credentials untouched', () => {
  assert.equal(
    normalizeDatabaseUrl('postgresql://host:5432/postgres'),
    'postgresql://host:5432/postgres',
  );
});

test('the repaired url can be read as a URL again', () => {
  const url = normalizeDatabaseUrl('postgresql://postgres.x:pa#ss@host:5432/postgres?sslmode=require');
  const parsed = new URL(url, 'postgres://base');

  assert.equal(parsed.host, 'host:5432');
  assert.equal(parsed.username, 'postgres.x');
  assert.equal(decodeURIComponent(parsed.password), 'pa#ss');
});

test('withRetry retries until the operation works', async () => {
  let attempts = 0;

  const result = await withRetry(
    async () => {
      attempts += 1;
      if (attempts < 3) throw new Error('todavia no');
      return 'listo';
    },
    { attempts: 3, delayMs: 1 },
  );

  assert.equal(result, 'listo');
  assert.equal(attempts, 3);
});

test('withRetry throws the last error if it never works', async () => {
  let attempts = 0;

  await assert.rejects(
    () =>
      withRetry(
        async () => {
          attempts += 1;
          throw new Error('conexion rechazada');
        },
        { attempts: 2, delayMs: 1 },
      ),
    /conexion rechazada/,
  );

  assert.equal(attempts, 2);
});

test('withRetry does not retry when the operation already works', async () => {
  let attempts = 0;

  await withRetry(
    async () => {
      attempts += 1;
      return 'ok';
    },
    { attempts: 3, delayMs: 1 },
  );

  assert.equal(attempts, 1);
});

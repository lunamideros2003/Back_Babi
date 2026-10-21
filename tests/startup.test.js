import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeDatabaseUrl } from '../src/config/env.js';
import { withRetry } from '../src/db/connection.js';

test('normaliza la url de conexion quitando sslmode', () => {
  assert.equal(
    normalizeDatabaseUrl('postgresql://u:p@h:5432/postgres?sslmode=require'),
    'postgresql://u:p@h:5432/postgres',
  );
});

test('conserva otros parametros de la url', () => {
  assert.equal(
    normalizeDatabaseUrl('postgresql://u:p@h:5432/postgres?sslmode=require&application_name=babytrack'),
    'postgresql://u:p@h:5432/postgres?application_name=babytrack',
  );
});

test('deja intacta una url sin parametros', () => {
  assert.equal(
    normalizeDatabaseUrl('postgresql://u:p@h:5432/postgres'),
    'postgresql://u:p@h:5432/postgres',
  );
});

test('recorta los espacios que deja copiar una url', () => {
  assert.equal(
    normalizeDatabaseUrl('  postgresql://u:p@h:5432/postgres  '),
    'postgresql://u:p@h:5432/postgres',
  );
});

test('una url vacia se queda vacia', () => {
  assert.equal(normalizeDatabaseUrl(''), '');
  assert.equal(normalizeDatabaseUrl(undefined), '');
});

test('withRetry reintenta hasta que la operacion funciona', async () => {
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

test('withRetry lanza el ultimo error si nunca funciona', async () => {
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

test('withRetry no reintenta cuando la operacion ya funciona', async () => {
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

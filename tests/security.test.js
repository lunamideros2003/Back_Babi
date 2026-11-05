import test from 'node:test';
import assert from 'node:assert/strict';

import { all, closeDatabase, DRIVER } from '../src/db/connection.js';

const TABLAS = [
  'appointments',
  'bot_answers',
  'bot_sessions',
  'chat_messages',
  'checkup_logs',
  'journal_entries',
  'pregnancies',
  'reminders',
  'symptom_logs',
  'users',
  'weeks',
];

test('all tables have RLS enabled', async (t) => {
  if (DRIVER !== 'postgres') {
    t.skip('necesita una base de datos Postgres');
    return;
  }

  const filas = await all(`
    SELECT c.relname AS tabla, c.relrowsecurity AS rls
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
  `);

  const sinRls = filas.filter((fila) => fila.rls !== true).map((fila) => fila.tabla);

  assert.deepEqual(sinRls, [], `tablas sin RLS: ${sinRls.join(', ')}`);
});

test('the backend role can read tables bypassing RLS', async (t) => {
  if (DRIVER !== 'postgres') {
    t.skip('necesita una base de datos Postgres');
    return;
  }

  const filas = await all(`
    SELECT rolsuper AS superusuario, rolbypassrls AS ignora_rls
    FROM pg_roles WHERE rolname = current_user
  `);

  assert.equal(filas.length, 1, 'no se pudo leer el rol actual');
  assert.equal(
    filas[0].ignora_rls === true || filas[0].superusuario === true,
    true,
    'el backend no puede saltarse el RLS y se quedaria sin acceso',
  );
});

test('each table has its restrictive policy', async (t) => {
  if (DRIVER !== 'postgres') {
    t.skip('necesita una base de datos Postgres');
    return;
  }

  const filas = await all(`
    SELECT tablename, count(*)::int AS politicas
    FROM pg_policies WHERE schemaname = 'public' GROUP BY tablename
  `);

  const conPolitica = new Set(filas.map((fila) => fila.tablename));
  const faltantes = TABLAS.filter((tabla) => !conPolitica.has(tabla));

  assert.deepEqual(faltantes, [], `tablas sin politica: ${faltantes.join(', ')}`);
});

test('RLS blocks direct access through the Supabase API', async (t) => {
  if (DRIVER !== 'postgres') {
    t.skip('necesita una base de datos Postgres');
    return;
  }

  const filas = await all(`
    SELECT tablename, qual AS usando, with_check AS comprobando
    FROM pg_policies WHERE schemaname = 'public'
  `);

  assert.ok(filas.length > 0, 'no hay politicas que revisar');

  for (const fila of filas) {
    assert.match(
      String(fila.usando),
      /false/i,
      `la politica de ${fila.tablename} permite leer`,
    );
  }
});

test('public tables are still the expected ones', async (t) => {
  if (DRIVER !== 'postgres') {
    t.skip('necesita una base de datos Postgres');
    return;
  }

  const filas = await all(`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
  `);

  const nombres = filas.map((fila) => fila.tablename);
  const extra = nombres.filter((nombre) => !TABLAS.includes(nombre));
  const faltan = TABLAS.filter((nombre) => !nombres.includes(nombre));

  assert.deepEqual(extra, [], `tablas de mas: ${extra.join(', ')}`);
  assert.deepEqual(faltan, [], `tablas que faltan: ${faltan.join(', ')}`);
});

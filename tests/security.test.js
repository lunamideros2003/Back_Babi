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

/*
  Comprueba que ninguna tabla se queda abierta a la API publica de Supabase.

  Sin Row Level Security, cualquiera con la clave anon del proyecto puede
  leer y escribir las tablas sin pasar por el backend. El backend entra como
  postgres, que ignora el RLS, asi que activarlo no le afecta.
*/

test('todas las tablas tienen RLS activo', async (t) => {
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

test('el rol del backend puede leer las tablas ignorando el RLS', async (t) => {
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

test('cada tabla tiene su politica restrictiva', async (t) => {
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

test('el RLS bloquea el acceso directo por la API de Supabase', async (t) => {
  if (DRIVER !== 'postgres') {
    t.skip('necesita una base de datos Postgres');
    return;
  }

  // La politica no permite nada a anon ni a authenticated, asi que la API
  // publica de Supabase tiene que responder sin datos.
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

test('las tablas publicas siguen siendo las esperadas', async (t) => {
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

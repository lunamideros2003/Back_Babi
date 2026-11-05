import test from 'node:test';
import assert from 'node:assert/strict';

import { all, closeDatabase, DRIVER } from '../src/db/connection.js';

const INDICES_ESPERADOS = [
  ['appointments', 'idx_appt_user_date'],
  ['reminders', 'idx_reminders_user_due'],
  ['chat_messages', 'idx_chat_user_created'],
  ['chat_messages', 'idx_chat_user_id'],
  ['checkup_logs', 'idx_checkups_user'],
  ['symptom_logs', 'idx_symptoms_user'],
  ['bot_sessions', 'idx_bot_sessions_user'],
  ['bot_answers', 'idx_bot_answers_session'],
  ['journal_entries', 'idx_journal_user_date'],
];

test('all tables have their indexes', async (t) => {
  if (DRIVER !== 'postgres') {
    t.skip('necesita una base de datos Postgres');
    return;
  }

  const indices = await all(
    "SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public'",
  );

  const existentes = new Set(indices.map((fila) => `${fila.tablename}.${fila.indexname}`));
  const faltan = INDICES_ESPERADOS.filter(
    ([tabla, indice]) => !existentes.has(`${tabla}.${indice}`),
  );

  assert.deepEqual(
    faltan.map(([tabla, indice]) => `${tabla}.${indice}`),
    [],
    'indices que faltan en la base de datos',
  );
});

test('the journal index covers the journal query', async (t) => {
  if (DRIVER !== 'postgres') {
    t.skip('necesita una base de datos Postgres');
    return;
  }

  const indices = await all(
    "SELECT indexdef FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_journal_user_date'",
  );

  assert.equal(indices.length, 1, 'falta el indice del diario');

  const definicion = String(indices[0].indexdef);
  assert.match(definicion, /user_id/, 'el indice tiene que filtrar por usuaria');
  assert.match(definicion, /entry_date/, 'el indice tiene que ordenar por fecha');
});

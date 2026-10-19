import test from 'node:test';
import assert from 'node:assert/strict';
import {
  toPostgres,
  toPositionalParameters,
  translateTimestamps,
  addReturningId,
} from '../src/db/dialect.js';
import { postgresSchema } from '../src/db/schema.postgres.js';
import { schema as sqliteSchema } from '../src/db/schema.js';

test('los parametros nombrados se vuelven posicionales en orden', () => {
  const { sql, values } = toPositionalParameters(
    'SELECT * FROM users WHERE id = :id AND email = :email',
    { id: 7, email: 'ana@correo.com' },
  );

  assert.equal(sql, 'SELECT * FROM users WHERE id = $1 AND email = $2');
  assert.deepEqual(values, [7, 'ana@correo.com']);
});

test('un parametro repetido usa la misma posicion', () => {
  const { sql, values } = toPositionalParameters(
    'SELECT * FROM reminders WHERE id = :id AND user_id = :id',
    { id: 3 },
  );

  assert.equal(sql, 'SELECT * FROM reminders WHERE id = $1 AND user_id = $1');
  assert.deepEqual(values, [3]);
});

test('un parametro ausente se envia como null', () => {
  const { values } = toPositionalParameters('SELECT * FROM t WHERE a = :a AND b = :b', { a: 1 });

  assert.equal(values.length, 2);
  assert.equal(values[1], null);
});

test('datetime(now) se traduce a CURRENT_TIMESTAMP', () => {
  const sql = "UPDATE users SET updated_at = datetime('now') WHERE id = :id";

  assert.equal(
    translateTimestamps(sql),
    'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = :id',
  );
});

test('RETURNING id solo se agrega a los INSERT', () => {
  assert.match(addReturningId('INSERT INTO users (name) VALUES ($1)'), /RETURNING id/);
  assert.doesNotMatch(addReturningId('UPDATE users SET name = $1'), /RETURNING/);
  assert.doesNotMatch(addReturningId('DELETE FROM users WHERE id = $1'), /RETURNING/);
});

test('no se toca el tiempo dentro de los datos del usuario', () => {
  const { values } = toPositionalParameters(
    "INSERT INTO chat_messages (content) VALUES (:content)",
    { content: 'actualizado = datetime(\'now\') ayer' },
  );

  assert.equal(values[0], "actualizado = datetime('now') ayer");
});

test('toPostgres combina las tres traducciones', () => {
  const { sql, values } = toPostgres(
    `INSERT INTO appointments (user_id, title) VALUES (:userId, :title)`,
    { userId: 1, title: 'Control' },
  );

  assert.equal(
    sql,
    'INSERT INTO appointments (user_id, title) VALUES ($1, $2)\nRETURNING id',
  );
  assert.deepEqual(values, [1, 'Control']);
});

test('las dos definiciones de esquema declaran las mismas tablas', () => {
  const names = (text) =>
    [...text.matchAll(/CREATE TABLE IF NOT EXISTS\s+(\w+)/g)].map((match) => match[1]);

  assert.deepEqual(names(postgresSchema).sort(), names(sqliteSchema).sort());
});

test('el esquema de Postgres usa tipos nativos y no funciones de SQLite', () => {
  assert.doesNotMatch(postgresSchema, /datetime\('now'\)/i);
  assert.doesNotMatch(postgresSchema, /AUTOINCREMENT/i);
  assert.doesNotMatch(postgresSchema, /\bPRAGMA\b/i);
  assert.match(postgresSchema, /SERIAL PRIMARY KEY/);
  assert.match(postgresSchema, /TIMESTAMPTZ/);
});

test('las banderas usan SMALLINT para que 0 y 1 sirvan en ambos motores', () => {
  for (const column of ['is_completed', 'is_active', 'is_demo']) {
    assert.match(postgresSchema, new RegExp(`${column}\\s+SMALLINT\\s+NOT NULL\\s+DEFAULT [01]`));
    assert.match(postgresSchema, new RegExp(`CHECK \\(${column} IN \\(0, 1\\)\\)`));
  }
});

test('las claves foraneas están declaradas en Postgres', () => {
  for (const table of [
    'pregnancies',
    'appointments',
    'reminders',
    'chat_messages',
    'checkup_logs',
    'symptom_logs',
    'bot_sessions',
    'bot_answers',
    'journal_entries',
  ]) {
    const block = new RegExp(
      `CREATE TABLE IF NOT EXISTS ${table} \\([\\s\\S]*?\\n\\);`,
    ).exec(postgresSchema);

    assert.ok(block, `falta la tabla ${table}`);
    assert.match(block[0], /REFERENCES \w+\(id\)/, `${table} sin clave foranea`);
  }
});

test('journal_entries tiene las mismas columnas en ambos esquemas', () => {
  const columnas = ['id', 'user_id', 'mood', 'content', 'entry_date', 'pregnancy_week'];

  for (const columna of columnas) {
    assert.match(
      sqliteSchema,
      new RegExp(`CREATE TABLE IF NOT EXISTS journal_entries \\([\\s\\S]*?\\b${columna}\\b`),
      `falta ${columna} en SQLite`,
    );
    assert.match(
      postgresSchema,
      new RegExp(`CREATE TABLE IF NOT EXISTS journal_entries \\([\\s\\S]*?\\b${columna}\\b`),
      `falta ${columna} en Postgres`,
    );
  }
});

test('content es el unico campo obligatorio del diario', () => {
  const bloque = /CREATE TABLE IF NOT EXISTS journal_entries \(([\s\S]*?)\n\);/.exec(
    postgresSchema,
  );

  assert.ok(bloque);
  assert.match(bloque[1], /content\s+TEXT\s+NOT NULL/);
  assert.match(bloque[1], /mood\s+VARCHAR\(\d+\)\s*,/);
  assert.doesNotMatch(bloque[1], /mood\s+VARCHAR\(\d+\)\s+NOT NULL/);
});
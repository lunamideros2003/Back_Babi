import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import env from '../config/env.js';
import { toPostgres } from './dialect.js';

/**
 * Two drivers behind one API:
 *
 *  - sqlite   default, a local file, no setup needed
 *  - postgres used when DATABASE_URL points to Supabase (or any Postgres)
 *
 * The driver is chosen once at startup. Every call returns a promise because
 * the Postgres path is network based, even though the SQLite path resolves
 * immediately.
 */

export const DRIVER = env.databaseUrl ? 'postgres' : 'sqlite';

let sqlite = null;
let pool = null;
let txClient = null;

function getSqlite() {
  if (sqlite) return sqlite;

  fs.mkdirSync(path.dirname(env.databaseFile), { recursive: true });

  sqlite = new DatabaseSync(env.databaseFile);
  sqlite.exec('PRAGMA journal_mode = WAL;');
  sqlite.exec('PRAGMA foreign_keys = ON;');

  return sqlite;
}

async function getPool() {
  if (pool) return pool;

  const { default: pg } = await import('pg');
  pool = new pg.Pool({
    connectionString: env.databaseUrl,
    ssl: env.databaseUrl.includes('localhost') ? undefined : { rejectUnauthorized: false },
    max: 10,
  });

  pool.on('error', (error) => {
    console.error('[db] error del pool de Postgres:', error.message);
  });

  return pool;
}

function plain(row) {
  if (!row) return row;
  return { ...row };
}

function plainAll(rows) {
  return rows.map((row) => plain(row));
}

/** Runs a statement that may return rows. */
async function query(sql, params = {}) {
  if (DRIVER === 'sqlite') {
    return getSqlite().prepare(sql).all(params);
  }

  const client = txClient ?? (await getPool());
  const { sql: text, values } = toPostgres(sql, params);
  const result = await client.query(text, values);

  return result.rows;
}

/** Runs raw DDL. Several statements separated by semicolons are allowed. */
export async function exec(sql) {
  if (DRIVER === 'sqlite') {
    getSqlite().exec(sql);
    return;
  }

  const client = await getPool();
  await client.query(sql);
}

export async function run(sql, params = {}) {
  if (DRIVER === 'sqlite') {
    const result = getSqlite().prepare(sql).run(params);
    return {
      lastInsertRowid: Number(result.lastInsertRowid),
      changes: Number(result.changes),
    };
  }

  const client = txClient ?? (await getPool());
  const { sql: text, values } = toPostgres(sql, params);
  const result = await client.query(text, values);

  return {
    lastInsertRowid: result.rows?.[0]?.id ?? null,
    changes: result.rowCount ?? 0,
  };
}

export async function get(sql, params = {}) {
  const rows = await query(sql, params);
  return plain(rows[0]);
}

export async function all(sql, params = {}) {
  return plainAll(await query(sql, params));
}

/**
 * Runs `fn` inside a transaction. The connection used by `run`, `get` and
 * `all` inside the callback is the same one that opened the transaction.
 */
export async function transaction(fn) {
  if (DRIVER === 'sqlite') {
    getSqlite().exec('BEGIN');
    try {
      const result = await fn();
      getSqlite().exec('COMMIT');
      return result;
    } catch (error) {
      getSqlite().exec('ROLLBACK');
      throw error;
    }
  }

  const client = await (await getPool()).connect();
  const previous = txClient;
  txClient = client;

  try {
    await client.query('BEGIN');
    const result = await fn();
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    txClient = previous;
    client.release();
  }
}

export async function closeDatabase() {
  if (sqlite) {
    sqlite.close();
    sqlite = null;
  }

  if (pool) {
    const current = pool;
    pool = null;
    await current.end().catch(() => {});
  }
}

/** Used by tests and diagnostics to confirm the driver is reachable. */
export async function ping() {
  if (DRIVER === 'sqlite') {
    getSqlite().prepare('SELECT 1 AS ok').get();
    return { driver: 'sqlite', ok: true };
  }

  const client = await getPool();
  const result = await client.query('SELECT 1 AS ok');
  return { driver: 'postgres', ok: result.rows[0]?.ok === 1 };
}
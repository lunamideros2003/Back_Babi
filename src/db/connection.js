import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import env from '../config/env.js';

fs.mkdirSync(path.dirname(env.databaseFile), { recursive: true });

export const db = new DatabaseSync(env.databaseFile);

db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

export function run(sql, params = {}) {
  return db.prepare(sql).run(params);
}

export function get(sql, params = {}) {
  return db.prepare(sql).get(params);
}

export function all(sql, params = {}) {
  return db.prepare(sql).all(params);
}

export function transaction(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function closeDatabase() {
  db.close();
}

export default db;

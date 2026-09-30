export const schema = `
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  email         TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  due_date      TEXT,
  is_demo       INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pregnancies (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  due_date          TEXT    NOT NULL,
  start_date        TEXT    NOT NULL,
  current_week      INTEGER NOT NULL,
  current_day       INTEGER NOT NULL,
  cycle_day         INTEGER,
  baby_name         TEXT,
  notes             TEXT,
  is_active         INTEGER NOT NULL DEFAULT 1,
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS weeks (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  week_number       INTEGER NOT NULL UNIQUE,
  title             TEXT    NOT NULL,
  summary           TEXT    NOT NULL,
  baby_development  TEXT    NOT NULL,
  mother_changes    TEXT    NOT NULL,
  size_comparison   TEXT    NOT NULL,
  typical_weight    TEXT,
  typical_length    TEXT,
  tips              TEXT,
  food_focus        TEXT,
  exercise_tip      TEXT,
  checkup_focus     TEXT
);

CREATE TABLE IF NOT EXISTS appointments (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title             TEXT    NOT NULL,
  category          TEXT    NOT NULL DEFAULT 'checkup',
  scheduled_at      TEXT    NOT NULL,
  location          TEXT,
  provider_name     TEXT,
  notes             TEXT,
  status            TEXT    NOT NULL DEFAULT 'scheduled',
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reminders (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title             TEXT    NOT NULL,
  description       TEXT,
  category          TEXT    NOT NULL DEFAULT 'general',
  due_at            TEXT    NOT NULL,
  recurrence        TEXT    NOT NULL DEFAULT 'none',
  is_completed      INTEGER NOT NULL DEFAULT 0,
  source            TEXT    NOT NULL DEFAULT 'manual',
  created_at        TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role              TEXT    NOT NULL CHECK (role IN ('user','assistant')),
  content           TEXT    NOT NULL,
  category          TEXT,
  pregnancy_week    INTEGER,
  provider          TEXT,
  tokens_used       INTEGER,
  created_at        TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS checkup_logs (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pregnancy_week    INTEGER,
  weight_kg         REAL,
  blood_pressure    TEXT,
  notes             TEXT,
  recorded_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS symptom_logs (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pregnancy_week    INTEGER,
  symptom           TEXT    NOT NULL,
  severity          INTEGER NOT NULL DEFAULT 1,
  notes             TEXT,
  created_at        TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_appt_user_date ON appointments(user_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_reminders_user_due ON reminders(user_id, due_at);
CREATE TABLE IF NOT EXISTS bot_sessions (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status            TEXT    NOT NULL DEFAULT 'in_progress',
  current_index     INTEGER NOT NULL DEFAULT 0,
  pregnancy_week    INTEGER,
  answers_count     INTEGER NOT NULL DEFAULT 0,
  summary           TEXT,
  score             INTEGER,
  started_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  completed_at      TEXT
);

CREATE TABLE IF NOT EXISTS bot_answers (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id        INTEGER NOT NULL REFERENCES bot_sessions(id) ON DELETE CASCADE,
  question_id       TEXT    NOT NULL,
  question_text     TEXT    NOT NULL,
  category          TEXT    NOT NULL,
  answer_value      TEXT,
  answer_text       TEXT,
  feedback          TEXT,
  created_at        TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_bot_sessions_user ON bot_sessions(user_id, started_at);
CREATE INDEX IF NOT EXISTS idx_bot_answers_session ON bot_answers(session_id, id);
CREATE INDEX IF NOT EXISTS idx_chat_user_created ON chat_messages(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_checkups_user ON checkup_logs(user_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_symptoms_user ON symptom_logs(user_id, created_at);
`;

export default schema;

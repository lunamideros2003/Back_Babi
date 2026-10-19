/**
 * PostgreSQL schema. Same tables and columns as the SQLite schema, with
 * native Postgres types.
 *
 * Flag columns stay SMALLINT with a CHECK instead of BOOLEAN on purpose: the
 * application writes 0 and 1 in its queries, and keeping that identical across
 * both drivers means one set of queries works everywhere without coercion.
 */
export const postgresSchema = `
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(80)  NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT         NOT NULL,
  due_date      DATE,
  is_demo       SMALLINT     NOT NULL DEFAULT 0 CHECK (is_demo IN (0, 1)),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pregnancies (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  due_date      DATE    NOT NULL,
  start_date    DATE    NOT NULL,
  current_week  INTEGER NOT NULL,
  current_day   INTEGER NOT NULL,
  cycle_day     INTEGER,
  baby_name     VARCHAR(60),
  notes         TEXT,
  is_active     SMALLINT NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS weeks (
  id               SERIAL PRIMARY KEY,
  week_number      INTEGER NOT NULL UNIQUE,
  title            TEXT    NOT NULL,
  summary          TEXT    NOT NULL,
  baby_development TEXT    NOT NULL,
  mother_changes   TEXT    NOT NULL,
  size_comparison  TEXT    NOT NULL,
  typical_weight   TEXT,
  typical_length   TEXT,
  tips             TEXT,
  food_focus       TEXT,
  exercise_tip     TEXT,
  checkup_focus    TEXT
);

CREATE TABLE IF NOT EXISTS appointments (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         VARCHAR(120) NOT NULL,
  category      VARCHAR(40)  NOT NULL DEFAULT 'checkup',
  scheduled_at  TIMESTAMPTZ  NOT NULL,
  location      VARCHAR(160),
  provider_name VARCHAR(120),
  notes         TEXT,
  status        VARCHAR(24)  NOT NULL DEFAULT 'scheduled',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reminders (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        VARCHAR(140) NOT NULL,
  description  TEXT,
  category     VARCHAR(40)  NOT NULL DEFAULT 'general',
  due_at       TIMESTAMPTZ  NOT NULL,
  recurrence   VARCHAR(24)  NOT NULL DEFAULT 'none',
  is_completed SMALLINT     NOT NULL DEFAULT 0 CHECK (is_completed IN (0, 1)),
  source       VARCHAR(24)  NOT NULL DEFAULT 'manual',
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role           VARCHAR(16) NOT NULL CHECK (role IN ('user', 'assistant')),
  content        TEXT    NOT NULL,
  category       VARCHAR(40),
  pregnancy_week INTEGER,
  provider       VARCHAR(64),
  tokens_used    INTEGER,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS checkup_logs (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pregnancy_week INTEGER,
  weight_kg      DOUBLE PRECISION,
  blood_pressure VARCHAR(20),
  notes          TEXT,
  recorded_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS symptom_logs (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pregnancy_week INTEGER,
  symptom        VARCHAR(120) NOT NULL,
  severity       INTEGER NOT NULL DEFAULT 1,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bot_sessions (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status         VARCHAR(24) NOT NULL DEFAULT 'in_progress',
  current_index  INTEGER NOT NULL DEFAULT 0,
  pregnancy_week INTEGER,
  answers_count  INTEGER NOT NULL DEFAULT 0,
  summary        TEXT,
  score          INTEGER,
  started_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS bot_answers (
  id            SERIAL PRIMARY KEY,
  session_id    INTEGER NOT NULL REFERENCES bot_sessions(id) ON DELETE CASCADE,
  question_id   VARCHAR(40) NOT NULL,
  question_text TEXT NOT NULL,
  category      VARCHAR(40) NOT NULL,
  answer_value  TEXT,
  answer_text   TEXT,
  feedback      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mood           VARCHAR(24),
  content        TEXT    NOT NULL,
  entry_date     DATE    NOT NULL,
  pregnancy_week INTEGER,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_appt_user_date ON appointments(user_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_reminders_user_due ON reminders(user_id, due_at);
CREATE INDEX IF NOT EXISTS idx_chat_user_created ON chat_messages(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_checkups_user ON checkup_logs(user_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_symptoms_user ON symptom_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_bot_sessions_user ON bot_sessions(user_id, started_at);
CREATE INDEX IF NOT EXISTS idx_bot_answers_session ON bot_answers(session_id, id);
`;

export default postgresSchema;
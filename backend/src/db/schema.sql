-- GymMatrix Database Schema
-- SQLite / Cloudflare D1

CREATE TABLE IF NOT EXISTS training_days (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  order_idx     INTEGER NOT NULL UNIQUE,
  muscle_targets TEXT   NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS exercises (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  training_day_id  INTEGER NOT NULL REFERENCES training_days(id) ON DELETE CASCADE,
  name             TEXT    NOT NULL,
  order_idx        INTEGER NOT NULL,
  default_sets     INTEGER NOT NULL DEFAULT 3,
  reps_min         INTEGER,
  reps_max         INTEGER,
  equipment        TEXT,
  is_custom        INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS training_sessions (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  training_day_id  INTEGER NOT NULL REFERENCES training_days(id),
  session_date     TEXT    NOT NULL,
  started_at       TEXT    NOT NULL,
  completed_at     TEXT    DEFAULT NULL,
  notes            TEXT    DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_day_date ON training_sessions(training_day_id, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON training_sessions(session_date DESC);

CREATE TABLE IF NOT EXISTS session_exercises (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id    INTEGER NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  exercise_id   INTEGER REFERENCES exercises(id),
  exercise_name TEXT    NOT NULL,
  weight_kg     REAL    DEFAULT NULL,
  reps          INTEGER DEFAULT NULL,
  sets          INTEGER DEFAULT NULL,
  input_raw     TEXT    DEFAULT NULL,
  method_id     TEXT    DEFAULT NULL,
  method_label  TEXT    DEFAULT NULL,
  logged_at     TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_session_exercises_session ON session_exercises(session_id);

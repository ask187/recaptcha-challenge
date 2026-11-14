import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

export type DB = DatabaseSync;

/**
 * Schema uses only portable types (TEXT / INTEGER / REAL / BIGINT-compatible
 * integers) so it can be moved to PostgreSQL by swapping the driver:
 *   INTEGER PRIMARY KEY AUTOINCREMENT  →  BIGSERIAL PRIMARY KEY
 *   TEXT (JSON)                         →  JSONB
 */
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS attempts (
  id                 TEXT PRIMARY KEY,
  created_at         INTEGER NOT NULL,
  expires_at         INTEGER NOT NULL,
  mode               TEXT NOT NULL,
  agent_type         TEXT,
  run_label          TEXT,
  seed               INTEGER NOT NULL,
  injections         INTEGER NOT NULL DEFAULT 1,
  strict             INTEGER NOT NULL DEFAULT 0,
  status             TEXT NOT NULL DEFAULT 'active',
  current_level      INTEGER NOT NULL DEFAULT 0,
  token              TEXT,
  honeypot_triggered INTEGER NOT NULL DEFAULT 0,
  honeypot_first_at  INTEGER,
  honeypot_detail    TEXT,
  invalidated        INTEGER NOT NULL DEFAULT 0,
  a11y_used          INTEGER NOT NULL DEFAULT 0,
  completed_at       INTEGER,
  total_ms           INTEGER,
  retries            INTEGER NOT NULL DEFAULT 0,
  interactions       INTEGER NOT NULL DEFAULT 0,
  failed_clicks      INTEGER NOT NULL DEFAULT 0,
  observations       INTEGER,
  harness_actions    INTEGER,
  harness_notes      TEXT,
  verify_token       TEXT,
  verify_redeemed    INTEGER NOT NULL DEFAULT 0,
  webdriver          INTEGER NOT NULL DEFAULT 0,
  user_agent         TEXT,
  is_demo            INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS level_runs (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  attempt_id         TEXT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  level_id           TEXT NOT NULL,
  level_index        INTEGER NOT NULL,
  try_no             INTEGER NOT NULL,
  config_public      TEXT NOT NULL,
  config_secret      TEXT NOT NULL,
  started_at         INTEGER NOT NULL,
  ended_at           INTEGER,
  outcome            TEXT NOT NULL DEFAULT 'pending',
  reason             TEXT,
  submission         TEXT,
  injection_exposed  INTEGER NOT NULL DEFAULT 0,
  injection_complied INTEGER NOT NULL DEFAULT 0,
  duration_ms        INTEGER
);
CREATE TABLE IF NOT EXISTS events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  attempt_id  TEXT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  level_id    TEXT,
  t           INTEGER NOT NULL,
  wall        INTEGER NOT NULL,
  type        TEXT NOT NULL,
  x           REAL,
  y           REAL,
  data        TEXT
);
CREATE TABLE IF NOT EXISTS frames (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  attempt_id  TEXT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  t           INTEGER NOT NULL,
  level_id    TEXT,
  label       TEXT,
  data_url    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_runs_attempt ON level_runs(attempt_id);
CREATE INDEX IF NOT EXISTS idx_events_attempt ON events(attempt_id, t);
CREATE INDEX IF NOT EXISTS idx_frames_attempt ON frames(attempt_id, t);
`;

export function openDb(file?: string): DB {
  const target = file ?? process.env.BBS_DB ?? path.resolve(process.cwd(), 'data', 'bbs.sqlite');
  if (target !== ':memory:') fs.mkdirSync(path.dirname(target), { recursive: true });
  const db = new DatabaseSync(target);
  db.exec('PRAGMA foreign_keys = ON;');
  if (target !== ':memory:') db.exec('PRAGMA journal_mode = WAL;');
  db.exec(SCHEMA);
  return db;
}

export function tx<T>(db: DB, fn: () => T): T {
  db.exec('BEGIN');
  try {
    const out = fn();
    db.exec('COMMIT');
    return out;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import * as schema from './schema.js';

const DB_PATH = process.env.DB_PATH || './data/kalku.db';

mkdirSync(dirname(DB_PATH), { recursive: true });

const sqlite = new Database(DB_PATH);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });

export function runMigrations() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      company_name TEXT NOT NULL DEFAULT '',
      company_logo_url TEXT NOT NULL DEFAULT '',
      must_change_password INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL REFERENCES users(id),
      data TEXT NOT NULL,
      version_number INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);

    CREATE TABLE IF NOT EXISTS shares (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      visible_position_ids TEXT NOT NULL,
      settings TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      revoked_at INTEGER,
      last_viewed_at INTEGER,
      view_count INTEGER NOT NULL DEFAULT 0,
      snapshot_data TEXT,
      snapshot_hash TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_shares_project ON shares(project_id);
    CREATE INDEX IF NOT EXISTS idx_shares_token ON shares(token);
  `);

  // Idempotent column-add for DBs that predate the snapshot columns.
  // SQLite ALTER TABLE ADD COLUMN has no IF NOT EXISTS, so probe pragma first.
  const sharesCols = sqlite.prepare("PRAGMA table_info(shares)").all() as Array<{ name: string }>;
  const sharesHas = (n: string) => sharesCols.some((c) => c.name === n);
  if (!sharesHas('snapshot_data')) sqlite.exec('ALTER TABLE shares ADD COLUMN snapshot_data TEXT');
  if (!sharesHas('snapshot_hash')) sqlite.exec('ALTER TABLE shares ADD COLUMN snapshot_hash TEXT');
  if (!sharesHas('snapshot_version')) sqlite.exec('ALTER TABLE shares ADD COLUMN snapshot_version INTEGER NOT NULL DEFAULT 1');
  if (!sharesHas('parent_share_id')) sqlite.exec('ALTER TABLE shares ADD COLUMN parent_share_id TEXT');
  if (!sharesHas('nachtrag_number')) sqlite.exec('ALTER TABLE shares ADD COLUMN nachtrag_number INTEGER NOT NULL DEFAULT 0');

  const usersCols = sqlite.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
  const usersHas = (n: string) => usersCols.some((c) => c.name === n);
  if (!usersHas('company_phone')) sqlite.exec("ALTER TABLE users ADD COLUMN company_phone TEXT NOT NULL DEFAULT ''");
  if (!usersHas('company_contact_email')) sqlite.exec("ALTER TABLE users ADD COLUMN company_contact_email TEXT NOT NULL DEFAULT ''");
  if (!usersHas('last_feedback_viewed_at')) sqlite.exec('ALTER TABLE users ADD COLUMN last_feedback_viewed_at INTEGER');
  if (!usersHas('last_digest_sent_at')) sqlite.exec('ALTER TABLE users ADD COLUMN last_digest_sent_at INTEGER');

  sqlite.exec(`

    CREATE TABLE IF NOT EXISTS share_responses (
      id TEXT PRIMARY KEY,
      share_id TEXT NOT NULL REFERENCES shares(id) ON DELETE CASCADE,
      response_type TEXT NOT NULL,
      customer_name TEXT,
      customer_email TEXT,
      ip TEXT,
      user_agent TEXT,
      payload TEXT NOT NULL,
      responded_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_responses_share ON share_responses(share_id);

    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY,
      share_id TEXT,
      project_id TEXT,
      event_type TEXT NOT NULL,
      actor_kind TEXT NOT NULL,
      actor_ref TEXT,
      ip TEXT,
      user_agent TEXT,
      payload TEXT NOT NULL,
      prev_hash TEXT NOT NULL,
      row_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_audit_share ON audit_events(share_id);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_events(created_at);

    CREATE TABLE IF NOT EXISTS view_presets (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      visible_position_ids TEXT NOT NULL,
      settings TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_view_presets_project ON view_presets(project_id);
  `);
}

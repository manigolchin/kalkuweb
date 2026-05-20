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
      view_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_shares_project ON shares(project_id);
    CREATE INDEX IF NOT EXISTS idx_shares_token ON shares(token);

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
  `);
}

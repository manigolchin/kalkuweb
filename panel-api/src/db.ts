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

/**
 * Cheap liveness probe for the SQLite handle. Used by the health endpoint
 * + graceful-shutdown logic. Returns true if the DB answers within ~1 ms.
 */
export function pingDb(): boolean {
  try {
    const row = sqlite.prepare('SELECT 1 AS ok').get() as { ok: number } | undefined;
    return row?.ok === 1;
  } catch {
    return false;
  }
}

/**
 * Closes the underlying SQLite handle. Used by the graceful-shutdown path
 * after the HTTP server has stopped accepting new requests. Safe to call
 * multiple times — better-sqlite3 throws on a double close, so we swallow.
 */
export function closeDb(): void {
  try {
    sqlite.close();
  } catch {
    /* already closed */
  }
}

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
  // PART J (Round 3) — password gate + expiry.
  if (!sharesHas('password_hash')) sqlite.exec('ALTER TABLE shares ADD COLUMN password_hash TEXT');
  if (!sharesHas('expires_at')) sqlite.exec('ALTER TABLE shares ADD COLUMN expires_at INTEGER');

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

    CREATE TABLE IF NOT EXISTS position_templates (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      oz TEXT NOT NULL DEFAULT '',
      short_text TEXT NOT NULL,
      long_text TEXT NOT NULL DEFAULT '',
      unit TEXT NOT NULL DEFAULT '',
      default_material_cost_cents INTEGER NOT NULL DEFAULT 0,
      default_time_minutes INTEGER NOT NULL DEFAULT 0,
      default_nu_cost_cents INTEGER NOT NULL DEFAULT 0,
      use_count INTEGER NOT NULL DEFAULT 0,
      last_used_at INTEGER,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_position_templates_user ON position_templates(user_id);

    -- PART J (Round 3) — share password gate access log.
    CREATE TABLE IF NOT EXISTS share_access_log (
      id TEXT PRIMARY KEY,
      share_id TEXT NOT NULL REFERENCES shares(id) ON DELETE CASCADE,
      ip TEXT,
      success INTEGER NOT NULL,
      reason TEXT NOT NULL,
      user_agent TEXT,
      ts INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_access_log_share_ts ON share_access_log(share_id, ts);
    CREATE INDEX IF NOT EXISTS idx_access_log_share_ip_ts ON share_access_log(share_id, ip, ts);

    -- PART K (Round 3) — per-position customer comments.
    CREATE TABLE IF NOT EXISTS position_comments (
      id TEXT PRIMARY KEY,
      share_id TEXT NOT NULL REFERENCES shares(id) ON DELETE CASCADE,
      position_oz TEXT NOT NULL,
      intent TEXT NOT NULL,
      text TEXT NOT NULL,
      author_name TEXT,
      author_email TEXT,
      ip TEXT,
      user_agent TEXT,
      created_at INTEGER NOT NULL,
      resolved_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_pos_comments_share ON position_comments(share_id);
    CREATE INDEX IF NOT EXISTS idx_pos_comments_share_oz ON position_comments(share_id, position_oz);

    -- Round 5 Firma integration — per-Firma calculation defaults.
    -- Keyed by (preisanfrage_firma_id, firma_kind); panel-api owns these,
    -- preisanfrage owns the rest of the Firma master data.
    -- See docs/v2_redesign/multi_company_integration_architecture.md.
    CREATE TABLE IF NOT EXISTS firma_calc_defaults (
      preisanfrage_firma_id INTEGER NOT NULL,
      firma_kind TEXT NOT NULL CHECK (firma_kind IN ('managed','external')),
      display_name TEXT NOT NULL DEFAULT '',
      material_zuschlag_bp INTEGER NOT NULL DEFAULT 1200,
      nu_zuschlag_bp INTEGER NOT NULL DEFAULT 1200,
      verrechnungslohn_cents INTEGER NOT NULL DEFAULT 4990,
      geraete_satz_cents INTEGER NOT NULL DEFAULT 50,
      last_edited_by TEXT REFERENCES users(id),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (preisanfrage_firma_id, firma_kind)
    );

    -- Round 11 — local Firmen (panel-only; never synced to preisanfrage).
    CREATE TABLE IF NOT EXISTS local_firmen (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      display_name TEXT NOT NULL,
      trade_type TEXT,
      notes TEXT,
      archived_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_local_firmen_owner ON local_firmen(owner_id);
    CREATE INDEX IF NOT EXISTS idx_local_firmen_archived ON local_firmen(archived_at);

    -- Round 11 — local Ausschreibungen. firmaKind/firmaId is composite ref to
    -- (managed | external | local) Firma. Status enum mirrors the panel UI badges.
    CREATE TABLE IF NOT EXISTS local_auschreibungen (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      firma_kind TEXT NOT NULL CHECK (firma_kind IN ('managed','external','local')),
      firma_id TEXT NOT NULL,
      project_number TEXT,
      name TEXT NOT NULL,
      auftraggeber_name TEXT,
      anschrift_plz_ort TEXT,
      submission_date TEXT,
      submission_time TEXT,
      status TEXT NOT NULL DEFAULT 'offen' CHECK (status IN ('offen','in_arbeit','abgegeben','gewonnen','verloren')),
      notes TEXT,
      archived_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_local_aus_owner ON local_auschreibungen(owner_id);
    CREATE INDEX IF NOT EXISTS idx_local_aus_firma ON local_auschreibungen(firma_kind, firma_id);
    CREATE INDEX IF NOT EXISTS idx_local_aus_archived ON local_auschreibungen(archived_at);
  `);
}

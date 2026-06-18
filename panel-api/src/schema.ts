import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

/**
 * Panel feature-permission keys. Each maps to a gateable area of the panel
 * sidebar. An `admin` implicitly has every key; a `user` sees an area only
 * when its key is `true` in their `permissions` map. Dashboard + Einstellungen
 * are always available to any active user and are deliberately NOT listed
 * here. Mirrored verbatim on the frontend in src/lib/panelPermissions.ts.
 */
export const PANEL_PERMISSION_KEYS = [
  'kalkulation',
  'firmen',
  'vorlagen',
  'feedback',
  'submissionskarte',
  'statistik',
] as const;

export type PanelPermissionKey = (typeof PANEL_PERMISSION_KEYS)[number];
export type PanelPermissions = Partial<Record<PanelPermissionKey, boolean>>;
export type UserRole = 'admin' | 'user';

/**
 * Resolve a user's effective permission map. Admins are granted every key
 * regardless of their stored `permissions`; non-admins get exactly what was
 * assigned (missing/false → no access). Single source of truth the auth
 * routes serialize to the client and the admin routes read.
 */
export function effectivePermissions(user: {
  role: string;
  permissions: PanelPermissions | null;
}): Record<PanelPermissionKey, boolean> {
  const isAdmin = user.role === 'admin';
  const out = {} as Record<PanelPermissionKey, boolean>;
  for (const key of PANEL_PERMISSION_KEYS) {
    out[key] = isAdmin ? true : user.permissions?.[key] === true;
  }
  return out;
}

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  /** 'admin' can manage users + has every feature; 'user' is gated by
   *  `permissions`. The seed user is an admin (see seed.ts); the migration
   *  backfills pre-existing rows to 'admin' (they are original owners). */
  role: text('role', { enum: ['admin', 'user'] }).notNull().default('user'),
  /** Soft deactivate. Inactive users cannot log in and are rejected by
   *  requireAuth. We never hard-delete (projects reference ownerId). */
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  /** Per-user feature flags (PanelPermissionKey → boolean). Ignored for
   *  admins. Stored as JSON; absent keys mean "no access". */
  permissions: text('permissions', { mode: 'json' })
    .notNull()
    .$type<PanelPermissions>()
    .$defaultFn(() => ({})),
  companyName: text('company_name').notNull().default(''),
  companyLogoUrl: text('company_logo_url').notNull().default(''),
  companyPhone: text('company_phone').notNull().default(''),
  companyContactEmail: text('company_contact_email').notNull().default(''),
  mustChangePassword: integer('must_change_password', { mode: 'boolean' }).notNull().default(false),
  /** When the owner last opened the feedback inbox. Drives the unread-count
   *  badge on the Kunden-Feedback tab and the digest "since" cursor. */
  lastFeedbackViewedAt: integer('last_feedback_viewed_at', { mode: 'timestamp_ms' }),
  /** When the most recent digest email was sent to this user. Lets the cron
   *  job skip days with no events and resume after gaps. */
  lastDigestSentAt: integer('last_digest_sent_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull().references(() => users.id),
  data: text('data', { mode: 'json' }).notNull().$type<ProjectData>(),
  versionNumber: integer('version_number').notNull().default(1),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const shares = sqliteTable('shares', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  visiblePositionIds: text('visible_position_ids', { mode: 'json' }).notNull().$type<string[]>(),
  settings: text('settings', { mode: 'json' }).notNull().$type<ShareSettings>(),
  snapshotData: text('snapshot_data', { mode: 'json' }).$type<ShareSnapshot | null>(),
  snapshotHash: text('snapshot_hash'),
  snapshotVersion: integer('snapshot_version').notNull().default(1),
  /** If non-null, this share is a Nachtrag (VOB §2 Nr.3/5/6 addendum) chained
   *  to a previously-approved parent share. nachtragNumber starts at 1 and
   *  increments per sibling so a chain reads N1, N2, N3 to the customer. */
  parentShareId: text('parent_share_id'),
  nachtragNumber: integer('nachtrag_number').notNull().default(0),
  /** PART J: bcrypt hash (cost 12). Null = no password gate. Plaintext NEVER
   *  persists, NEVER returns to the client. Argon2id was specified in the
   *  brief but isn't in this stack's dep tree (bcryptjs is already installed
   *  and used for user passwords) — bcrypt is the documented alternative
   *  per the Round-3 progress doc. */
  passwordHash: text('password_hash'),
  /** PART J: ISO timestamp (stored as epoch-ms) past which GET /share/:token
   *  returns 410. Null = never expires. Distinct from settings.bindefristDays
   *  which is an informational offer-validity hint shown to the customer. */
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  revokedAt: integer('revoked_at', { mode: 'timestamp_ms' }),
  lastViewedAt: integer('last_viewed_at', { mode: 'timestamp_ms' }),
  viewCount: integer('view_count').notNull().default(0),
});

/**
 * PART J: per-attempt log for the password gate. Append-only. Used by
 *   (a) the rate-limiter to count failures per (token, ip) per 15-min window,
 *   (b) the audit trail when investigating "did the customer get in?",
 *   (c) the calculator-side "Sicherheits-Vorfall"-Anzeige in a future build.
 *
 * Indexed by (shareId, ip, ts) so the rate-limit query is cheap.
 */
export const shareAccessLog = sqliteTable('share_access_log', {
  id: text('id').primaryKey(),
  shareId: text('share_id').notNull().references(() => shares.id, { onDelete: 'cascade' }),
  ip: text('ip'),
  /** true = correct password (or no password required), false = 401 */
  success: integer('success', { mode: 'boolean' }).notNull(),
  /** Why the attempt was logged: 'unlock_attempt' (had password), 'gate_hit'
   *  (no password sent on a protected share), 'expired' (link past expiry),
   *  'revoked' (link revoked), 'ok' (allowed read of unprotected share). */
  reason: text('reason').notNull(),
  userAgent: text('user_agent'),
  ts: integer('ts', { mode: 'timestamp_ms' }).notNull(),
});

export const shareResponses = sqliteTable('share_responses', {
  id: text('id').primaryKey(),
  shareId: text('share_id').notNull().references(() => shares.id, { onDelete: 'cascade' }),
  responseType: text('response_type', { enum: ['approve', 'changes', 'reject'] }).notNull(),
  customerName: text('customer_name'),
  customerEmail: text('customer_email'),
  ip: text('ip'),
  userAgent: text('user_agent'),
  payload: text('payload', { mode: 'json' }).notNull().$type<ResponsePayload>(),
  respondedAt: integer('responded_at', { mode: 'timestamp_ms' }).notNull(),
});

/**
 * Append-only, hash-chained event log. Per audit-trail research:
 *   row_hash = SHA-256(prev_hash || canonical_json(this_row_without_row_hash))
 * The chain lets a third party verify the log has not been retroactively
 * mutated. The API role's GRANTS deliberately omit UPDATE/DELETE on this
 * table — only INSERT is exposed.
 */
/**
 * Saved "Kunden-Ansicht" presets per project. Lets the owner reuse a
 * (visible-positions + share-settings) combo across multiple shares — useful
 * when the same Inhaber sends "Privatkunden-Ansicht" or "AG-Ansicht" repeatedly.
 */
/**
 * Reusable position templates ("Vorlagen"). Lite STLB-Bau pattern: the owner
 * builds their own library of frequently-used positions over time and
 * inserts them into new projects with a single click. Last-used + use_count
 * drive the picker ordering.
 */
export const positionTemplates = sqliteTable('position_templates', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  oz: text('oz').notNull().default(''),
  shortText: text('short_text').notNull(),
  longText: text('long_text').notNull().default(''),
  unit: text('unit').notNull().default(''),
  defaultMaterialCost: integer('default_material_cost_cents').notNull().default(0),
  defaultTimeMinutes: integer('default_time_minutes').notNull().default(0),
  defaultNuCost: integer('default_nu_cost_cents').notNull().default(0),
  useCount: integer('use_count').notNull().default(0),
  lastUsedAt: integer('last_used_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});

export const viewPresets = sqliteTable('view_presets', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  visiblePositionIds: text('visible_position_ids', { mode: 'json' }).notNull().$type<string[]>(),
  settings: text('settings', { mode: 'json' }).notNull().$type<Partial<ShareSettings>>(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});

export const auditEvents = sqliteTable('audit_events', {
  id: text('id').primaryKey(),
  shareId: text('share_id'),
  projectId: text('project_id'),
  eventType: text('event_type', {
    enum: [
      'share.created',
      'share.revoked',
      'link.viewed',
      'response.submitted',
      'snapshot.regenerated',
    ],
  }).notNull(),
  actorKind: text('actor_kind', { enum: ['owner', 'customer', 'system'] }).notNull(),
  actorRef: text('actor_ref'),
  ip: text('ip'),
  userAgent: text('user_agent'),
  payload: text('payload', { mode: 'json' }).notNull().$type<Record<string, unknown>>(),
  prevHash: text('prev_hash').notNull(),
  rowHash: text('row_hash').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});

/**
 * Per-Firma calculation defaults. Keyed by preisanfrage's `companies.id`
 * (managed firms) OR `external_companies.id` (not-yet-adopted firms) —
 * distinguished by `firmaKind`. We do NOT mirror preisanfrage's Firma
 * master data here (that stays in preisanfrage); we only store the four
 * calculation knobs the calculator actually overrides per Firma.
 *
 * Per user decision 2026-05-22 (multi_company_integration_architecture.md
 * question 4): defaults live in panel-api, not in preisanfrage. Lets us
 * ship without a cross-system deploy. Cost: bauki can't reuse these
 * defaults from a single source.
 *
 * Cascade order in calc.ts (frontend):
 *   DEFAULT_CALC_PARAMS  →  firma defaults  →  project.calcParams override
 *
 * The 4 fields mirror the canonical Excel Vorlage (see
 * docs/v2_redesign/formula_audit_vs_real_excel.md).
 */
export const firmaCalcDefaults = sqliteTable('firma_calc_defaults', {
  /** preisanfrage's company id or external_companies id. Composite key
   *  with firmaKind — same numeric id can repeat across the two namespaces. */
  preisanfrageFirmaId: integer('preisanfrage_firma_id').notNull(),
  /** 'managed' = companies row, 'external' = external_companies row. */
  firmaKind: text('firma_kind', { enum: ['managed', 'external'] }).notNull(),
  /** Cached display name from preisanfrage so the panel can render the
   *  Firma list without an extra round-trip. Re-synced on Firma page load. */
  displayName: text('display_name').notNull().default(''),
  materialZuschlag: integer('material_zuschlag_bp').notNull().default(1200), // basis points (1200 = 0.12)
  nuZuschlag: integer('nu_zuschlag_bp').notNull().default(1200),
  verrechnungslohnCents: integer('verrechnungslohn_cents').notNull().default(4990), // 49.90 €
  geraeteSatzCents: integer('geraete_satz_cents').notNull().default(50), // 0.50 €/h
  /** Calculator who last edited these defaults — for audit. */
  lastEditedBy: text('last_edited_by').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

/**
 * Round 11 — local Firmen + local Ausschreibungen.
 *
 * "Local" firms + Ausschreibungen live ONLY in panel-api's DB. They never
 * touch preisanfrage. Use case: one-off Bauunternehmer / private Ausschreibung
 * the user wants to kalkulate without going through the full preisanfrage
 * onboarding (SMTP / SharePoint / classifier setup).
 *
 * Composite key model: every Ausschreibung references its parent Firma via
 * (firmaKind, firmaId). 'managed'+companies.id and 'external'+external_companies.id
 * come from preisanfrage (numeric id); 'local'+local_firmen.id is panel-local
 * (nanoid string). The text column holds both ids — the consumer reads `firmaKind`
 * to pick the right interpretation.
 *
 * Soft delete: `archivedAt` non-null hides the row from the standard list
 * endpoints but keeps history intact for audit / undo.
 */
export const localFirmen = sqliteTable('local_firmen', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  displayName: text('display_name').notNull(),
  /** Free-form. UI offers a curated set (galabau/elektro/tiefbau/leitungsbau/
   *  fenster/haustechnik/heizung/sanitaer/dach/fassade/putz/maler/sonstiges)
   *  but we don't enforce it in DB to stay flexible. */
  tradeType: text('trade_type'),
  notes: text('notes'),
  archivedAt: integer('archived_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const localAuschreibungen = sqliteTable('local_auschreibungen', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  /** The Firma this Ausschreibung belongs to. Composite (firmaKind, firmaId)
   *  — see schema comment above. Local Ausschreibungen on managed/external
   *  firms ARE allowed (e.g. a "private" tender the calculator wants to
   *  attach to a preisanfrage-tracked Bauunternehmer). */
  firmaKind: text('firma_kind', { enum: ['managed', 'external', 'local'] }).notNull(),
  firmaId: text('firma_id').notNull(),
  projectNumber: text('project_number'),
  name: text('name').notNull(),
  auftraggeberName: text('auftraggeber_name'),
  anschriftPlzOrt: text('anschrift_plz_ort'),
  /** ISO YYYY-MM-DD. Stored as text so SQLite's lexicographic sort matches
   *  chronological order without timezone gymnastics. */
  submissionDate: text('submission_date'),
  /** HH:MM (24h). */
  submissionTime: text('submission_time'),
  status: text('status', {
    enum: ['offen', 'in_arbeit', 'abgegeben', 'gewonnen', 'verloren'],
  }).notNull().default('offen'),
  notes: text('notes'),
  archivedAt: integer('archived_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export type User = typeof users.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Share = typeof shares.$inferSelect;
export type ShareResponse = typeof shareResponses.$inferSelect;
export type AuditEvent = typeof auditEvents.$inferSelect;
export type ViewPreset = typeof viewPresets.$inferSelect;
export type PositionTemplate = typeof positionTemplates.$inferSelect;
export type ShareAccessLog = typeof shareAccessLog.$inferSelect;
export type PositionComment = typeof positionComments.$inferSelect;
export type FirmaCalcDefaults = typeof firmaCalcDefaults.$inferSelect;
export type LocalFirma = typeof localFirmen.$inferSelect;
export type LocalAuschreibung = typeof localAuschreibungen.$inferSelect;

/**
 * PART K: customer comments per LV position. Routed via the share token
 * (the link is the credential — no panel auth). Keyed by `positionOz`
 * (the OZ string from the snapshot) rather than positionId, because
 * positionIds can change when the project is re-imported but OZ stays
 * stable across snapshots.
 *
 * Distinct from `shareResponses` (which is the legal-grade approve/
 * changes/reject envelope). Comments are higher-frequency, more granular,
 * and survive across re-snapshots; they're more like "Anmerkungen" than
 * "Stellungnahmen".
 */
export const positionComments = sqliteTable('position_comments', {
  id: text('id').primaryKey(),
  shareId: text('share_id').notNull().references(() => shares.id, { onDelete: 'cascade' }),
  /** Stable cross-snapshot key — the OZ string normalized (see ozParser). */
  positionOz: text('position_oz').notNull(),
  /** Customer intent. 5 values cover 95%+ of real-world feedback. */
  intent: text('intent', {
    enum: ['accept', 'change_menge', 'change_fabrikat', 'negotiate_ep', 'other'],
  }).notNull(),
  text: text('text').notNull(),
  authorName: text('author_name'),
  authorEmail: text('author_email'),
  ip: text('ip'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  /** Calculator-side workflow: marks a comment as addressed so it stops
   *  surfacing in the unread badge. Nullable; default null = open. */
  resolvedAt: integer('resolved_at', { mode: 'timestamp_ms' }),
});

/**
 * Round 12 — structured customer change requests ("Änderungswünsche").
 *
 * Distinct from `positionComments` (free-text per-position Anmerkungen) and
 * `shareResponses` (the legal approve/changes/reject envelope). A change
 * request is a STRUCTURED price/quantity wish the customer expresses on the
 * share: "Material auf 950 € statt 1.071,54 €", "Endbetrag 5 % günstiger",
 * "Menge 8 statt 10". It carries the field, the value the customer saw
 * (`currentValue`, lifted from the frozen snapshot so it cannot be spoofed),
 * the value they want (`requestedValue`, optional), a direction, and a note.
 *
 * `scope='global'` → the whole offer (Endbetrag / Lohn-Σ / Material-Σ / …),
 * `positionOz` null. `scope='position'` → one LV position, `positionOz` set
 * (stable cross-snapshot key, like positionComments). The owner resolves each
 * via `resolvedAt`, mirroring the comment workflow.
 */
export const CHANGE_REQUEST_FIELDS = [
  'endbetrag',   // global only — the offer net total
  'gesamtpreis', // position — the line GP
  'menge',       // position — quantity
  'material',    // Materialkosten
  'geraete',     // Geräte / Maschinenkosten
  'zeit',        // Arbeitszeit
  'lohn',        // Lohnkosten
  'sonstiges',   // free-form / catch-all
] as const;
export type ChangeRequestField = (typeof CHANGE_REQUEST_FIELDS)[number];
export type ChangeRequestScope = 'global' | 'position';
export type ChangeRequestDirection = 'lower' | 'higher' | 'exact' | 'unspecified';
/** How `currentValue`/`requestedValue` should be formatted by the UI. */
export type ChangeRequestUnit = 'eur' | 'min' | 'std' | 'qty' | 'pct';

export const changeRequests = sqliteTable('change_requests', {
  id: text('id').primaryKey(),
  shareId: text('share_id').notNull().references(() => shares.id, { onDelete: 'cascade' }),
  scope: text('scope', { enum: ['global', 'position'] }).notNull(),
  /** Stable cross-snapshot key; null for scope='global'. */
  positionOz: text('position_oz'),
  field: text('field', { enum: CHANGE_REQUEST_FIELDS }).notNull(),
  unit: text('unit', { enum: ['eur', 'min', 'std', 'qty', 'pct'] }).notNull().default('eur'),
  /** The value the customer was shown (server-lifted from the snapshot). Nullable
   *  for fields the share didn't display (then only the wish/note is captured). */
  currentValue: real('current_value'),
  /** The value the customer wants. Null when they only gave a direction + note. */
  requestedValue: real('requested_value'),
  direction: text('direction', {
    enum: ['lower', 'higher', 'exact', 'unspecified'],
  }).notNull().default('unspecified'),
  note: text('note').notNull().default(''),
  authorName: text('author_name'),
  authorEmail: text('author_email'),
  ip: text('ip'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  /** Owner-side workflow: marks the wish as addressed so it drops out of the
   *  unread badge. Null = open. */
  resolvedAt: integer('resolved_at', { mode: 'timestamp_ms' }),
});
export type ChangeRequest = typeof changeRequests.$inferSelect;

/**
 * Posteingang triage state — panel-LOCAL per-email flags (read / starred /
 * archived) over preisanfrage's incoming emails. SHARED across the team (one
 * row per preisanfrage email id). Crucially this NEVER touches the mailbox:
 * "archived" only hides the mail in the panel view, so preisanfrage keeps
 * polling + classifying it untouched. emailId = preisanfrage incoming_emails.id
 * (globally unique), so no company scoping is needed for the key.
 */
export const posteingangState = sqliteTable('posteingang_state', {
  emailId: integer('email_id').primaryKey(),
  companyId: integer('company_id').notNull(),
  read: integer('read', { mode: 'boolean' }).notNull().default(false),
  starred: integer('starred', { mode: 'boolean' }).notNull().default(false),
  archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
  /** Soft-delete → Papierkorb. Panel-local; never touches the mailbox. */
  deleted: integer('deleted', { mode: 'boolean' }).notNull().default(false),
  /** Free-form labels (JSON array of strings). Panel-local team tags. */
  labels: text('labels').notNull().default('[]'),
  updatedBy: text('updated_by').references(() => users.id),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});
export type PosteingangState = typeof posteingangState.$inferSelect;

/**
 * Posteingang DRAFTS — unsent reply/compose/forward kept for later, per company.
 * Panel-local; shared across the team. Reopened into the composer; deleted when
 * sent or discarded.
 */
export const posteingangDraft = sqliteTable('posteingang_draft', {
  id: text('id').primaryKey(),
  companyId: integer('company_id').notNull(),
  kind: text('kind', { enum: ['reply', 'compose', 'forward'] }).notNull(),
  toAddr: text('to_addr').notNull().default(''),
  subject: text('subject').notNull().default(''),
  body: text('body').notNull().default(''),
  /** For reply/forward: the incoming email this draft responds to. */
  inReplyToEmailId: integer('in_reply_to_email_id'),
  updatedBy: text('updated_by').references(() => users.id),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});
export type PosteingangDraft = typeof posteingangDraft.$inferSelect;

/**
 * Posteingang SENT log — records every email the panel sends (reply / compose /
 * forward), so the panel has a "Gesendet" folder. preisanfrage's SMTP engine
 * already drops a copy in the mailbox's Sent folder; this is the panel's own
 * view of what was sent FROM the panel. Shared across the team.
 */
export const posteingangSent = sqliteTable('posteingang_sent', {
  id: text('id').primaryKey(),
  companyId: integer('company_id').notNull(),
  kind: text('kind', { enum: ['reply', 'compose', 'forward'] }).notNull(),
  toAddr: text('to_addr').notNull(),
  subject: text('subject').notNull().default(''),
  body: text('body').notNull().default(''),
  /** For reply/forward: the incoming email this was sent in response to. */
  inReplyToEmailId: integer('in_reply_to_email_id'),
  messageId: text('message_id'),
  sentBy: text('sent_by').references(() => users.id),
  sentByName: text('sent_by_name').notNull().default(''),
  sentAt: integer('sent_at', { mode: 'timestamp_ms' }).notNull(),
});
export type PosteingangSent = typeof posteingangSent.$inferSelect;

export type PositionType = 'standard' | 'wagnis' | 'reserve' | 'nu_marge' | 'lohn_puffer';

export type Position = {
  id: string;
  oz: string;
  shortText: string;
  longText: string;
  hinweisText: string;
  quantity: number;
  unit: string;
  materialCost: number;
  timeMinutes: number;
  nuCost: number;
  /** Per-position Geräte-Stundensatz (€/h) — Vorlage "Zulage Geräte" (col Z).
   *  When set, overrides calcParams.geraeteStundensatz for this row. Internal. */
  geraeteSatz?: number;
  /** Per-position Geräte lump sum (€/unit) — Vorlage hard-coded "EP Geräte"
   *  (col AA). When set, used flat (ignores time × rate). Internal. */
  geraeteEp?: number;
  /** Custom formula for EP Geräte (col AA) — cached result in geraeteEp. Internal. */
  geraeteEpFormula?: string;
  /** Per-position EP Löhne override (€/unit) — Vorlage "EP Löhne" (col AB) when
   *  not the default time × Verrechnungslohn (specialist rate / custom). Internal. */
  lohnEp?: number;
  /** Custom formula for EP Löhne (col AB) — cached result in lohnEp. Internal. */
  lohnEpFormula?: string;
  /** Per-position Lohn-Faktor "W" — Vorlage per-row labor multiplier on the
   *  Verrechnungslohn (col AB = Zeit/60 × Verrechnungslohn × W). When set, Lohn
   *  re-prices with the global Verrechnungslohn instead of staying flat. Default 1. */
  lohnFaktor?: number;
  /** Per-position EP Stoffe VK override (col AJ) — flat Material VERKAUF when it
   *  deviates from Material × (1+Zuschlag). Internal. */
  materialEp?: number;
  /** Per-position EP Nachunternehmer VK override (col AK) — flat NU VERKAUF when
   *  it deviates from NU × (1+Zuschlag). Internal. */
  nuEp?: number;
  /** Per-position GP override (col F, the authoritative GESAMTPREIS) when the
   *  component rebuild deviates a lot — GP pinned, EP = GP/Menge. Internal. */
  gpOverride?: number;
  /** Bedarfs-/Eventualposition — priced but excluded from the Angebotssumme
   *  (Vorlage leaves col F blank). Excluded from totals, still shown. */
  bedarfsposition?: boolean;
  isHeader: boolean;
  sortOrder: number;
  sectionPath: string;
  epLohn: number;
  epMaterial: number;
  epGeraet: number;
  epNu: number;
  ep: number;
  gp: number;
  classification?: string | null;
  visibleToCustomer: boolean;
  internalNote?: string;
  positionType?: PositionType;
  /** REB-23.003-lite Aufmaß formula. When non-empty, server overwrites `quantity`
   *  with the parsed total before persistence. See lib/aufmass.ts. */
  aufmassFormula?: string;
};

export type CalcParams = {
  mittellohn: number;
  verrechnungslohn: number;
  materialZuschlag: number;
  nuZuschlag: number;
  geraeteZuschlagPct: number;
  geraeteStundensatz: number;
  zeitabzug: number;
  tagesstunden: number;
  personaleinsatz: number;
  mwst: number;
  /** Global Ziel-Aufschlag — effective factor `1 + zielAufschlag` scales
   *  every position's EP/GP so the bid hits a chosen Angebotssumme. 0 = no-op
   *  (default for projects predating the field). Mirror of the client type. */
  zielAufschlag: number;
};

/** Where a calculation was started from. Set once at "Kalkulation starten"
 *  (Firma → Ausschreibung) so the panel can re-resolve upstream data later —
 *  e.g. lazily mint the „04_Angebote" folder share link at share time instead
 *  of only at project creation. `projectId` is preisanfrage's globally-unique
 *  Ausschreibung id. */
export type ProjectSourceRef = {
  system: 'preisanfrage';
  kind: 'managed' | 'external' | 'local' | 'directory';
  firmaId: string | number;
  projectId: number;
};

export type ProjectData = {
  name: string;
  client: string;
  clientEmail?: string;
  clientAddress?: string;
  service: string;
  tenderNumber: string;
  deadline: string;
  bidder: string;
  calcParams: CalcParams;
  positions: Position[];
  notes?: string;
  /** SharePoint-Link zum „04_Angebote"-Ordner der Ausschreibung. Optional;
   *  round-trips via the projectData passthrough schema. */
  angeboteFolderUrl?: string;
  /** Provenance of the calc — lets the share flow re-resolve the upstream
   *  Ausschreibung (e.g. to auto-find the Angebote-folder link). Optional;
   *  round-trips via the projectData passthrough schema. */
  sourceRef?: ProjectSourceRef;
};

export type ShareSettings = {
  brandHeader: 'own' | 'co-branded' | 'minimal';
  customerName?: string;
  customerEmail?: string;
  message?: string;
  allowApproval: boolean;
  allowChangeRequests: boolean;
  showTotals: boolean;
  showMwst: boolean;
  /** Detail level per position. `true`/absent = full Langtext shown to the
   *  customer ("alle Details"); `false` = short version (Kurztext + Menge/Preis).
   *  Mirror of the client type. */
  showLongText?: boolean;
  /** Show the per-position Material/Gerät/Zeit cost split + the VERKAUF
   *  composition in the summary. Absent = treated as `true`. */
  showCostBreakdown?: boolean;
  /** Show the EINKAUF / Zuschlag / Überschuss calculation detail + project
   *  KPIs (Mitarbeiter/Stunden/Arbeitstage/Monate) in the summary. Absent =
   *  treated as `true`. Turn off for a margin-free "Kurzfassung". */
  showCalculation?: boolean;
  /** Show a button in the customer view linking to the „04_Angebote" folder.
   *  Mirror of the client type. The URL below only reaches the customer when
   *  this is true AND it is an http(s) URL (gated in routes/public.ts). */
  showAngebote?: boolean;
  /** Frozen SharePoint link to this Ausschreibung's „04_Angebote" folder. */
  angeboteFolderUrl?: string;
  /** Bindefrist in Tagen ab Erstellungs-/Snapshot-Zeit. Default 30, per BGB §§ 145 ff. */
  bindefristDays?: number;
};

export type ResponsePayload = {
  message?: string;
  changes?: Array<{
    positionId: string;
    type: 'modify' | 'remove' | 'comment';
    text: string;
  }>;
  signature?: {
    name: string;
    timestamp: number;
    ip: string;
  };
  /** SHA-256 of the share snapshot the customer was responding to. Lets the
   *  owner prove (and the customer verify) which exact pricing was approved. */
  snapshotHash?: string;
};

/** One cost-type row in the customer-facing Kalkulations-Übersicht: the
 *  EINKAUF (ek) / Zuschlag (zuschlagPct) / VERKAUF (vk) / DIFFERNZ split,
 *  mirroring the calculator's internal Zuschlag-Matrix. */
export type ShareCostType = { ek: number; vk: number; zuschlagPct: number; differnz: number };

/** Aggregate calculation summary over a share's VISIBLE non-header positions.
 *  Computed at snapshot-build time so the customer view never has to fetch the
 *  raw cost inputs (which stay server-side). Derived purely from calc.ts math,
 *  so `costTypes.*.vk` always reconciles with Σ position.gp = netto. */
export type ShareSnapshotSummary = {
  netto: number;
  mwst: number;
  brutto: number;
  totalHours: number;
  ekTotal: number;
  ueberschuss: number;
  costTypes: {
    lohn: ShareCostType;
    material: ShareCostType;
    geraete: ShareCostType;
    nu: ShareCostType;
  };
  mitarbeiter: number;
  arbeitstage: number;
  monate: number;
};

export type ShareSnapshot = {
  snapshottedAt: string;
  projectVersionNumber: number;
  project: {
    name: string;
    client: string;
    service: string;
    tenderNumber: string;
    deadline: string;
    notes?: string;
    mwst: number;
  };
  positions: Array<{
    id: string;
    oz: string;
    shortText: string;
    longText: string;
    quantity: number;
    unit: string;
    isHeader: boolean;
    sortOrder: number;
    ep: number;
    gp: number;
    /** GESAMTPREIS split into Lohn/Material/Gerät/NU (each round(qty × per-unit),
     *  so they sum to gp). Optional so legacy snapshots degrade gracefully. */
    gpLohn?: number;
    gpMaterial?: number;
    gpGeraet?: number;
    gpNu?: number;
  }>;
  /** Aggregate calculation summary. Optional for the same back-compat reason. */
  summary?: ShareSnapshotSummary;
};

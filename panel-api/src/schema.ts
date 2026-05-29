import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
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
  }>;
};

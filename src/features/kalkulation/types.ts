export const POSITION_TYPES = ['standard', 'wagnis', 'reserve', 'nu_marge', 'lohn_puffer'] as const;
export type PositionType = (typeof POSITION_TYPES)[number];
export const INTERNAL_POSITION_TYPES: ReadonlySet<PositionType> = new Set([
  'wagnis',
  'reserve',
  'nu_marge',
  'lohn_puffer',
]);
export const POSITION_TYPE_LABELS: Record<PositionType, string> = {
  standard: 'Position',
  wagnis: 'Wagnis',
  reserve: 'Reserve',
  nu_marge: 'NU-Marge',
  lohn_puffer: 'Lohn-Puffer',
};

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
  /** Per-position Geräte-Stundensatz (€/h) — the Vorlage's "Zulage Geräte"
   *  (col Z), overridable per row for special equipment (crane/lift: 5–50 €/h).
   *  When set, calc uses it for this position's Geräte cost; when absent, the
   *  project-global `calcParams.geraeteStundensatz` applies. Internal-only —
   *  never exposed in the customer share snapshot. */
  geraeteSatz?: number;
  /** Per-position Geräte lump sum (€/unit) — the Vorlage's hard-coded "EP
   *  Geräte" (col AA) for site-setup/crane rows where equipment is a fixed cost
   *  rather than time×rate. When set, calc uses it FLAT (ignores time and
   *  geraeteSatz), so the import reproduces the Excel's Geräte total exactly.
   *  Internal-only — never exposed in the customer share snapshot. */
  geraeteEp?: number;
  /** Custom formula for EP Geräte (col AA) — stored-formula-with-cached-value,
   *  same pattern as materialFormula. When set, geraeteEp holds the evaluated
   *  result and this string drives re-display + re-evaluation. Internal-only. */
  geraeteEpFormula?: string;
  /** Per-position EP Löhne override (€/unit) — the Vorlage's "EP Löhne" (col AB)
   *  when it is NOT the default (Zeit/60 × Verrechnungslohn): a hard-coded labor
   *  cost (e.g. 84,50 €/h for specialist work) or a custom rate. When set, calc
   *  uses it FLAT for this position's Lohn. Internal-only — never in the share. */
  lohnEp?: number;
  /** Custom formula for EP Löhne (col AB). Same stored-formula-with-cached-value
   *  pattern as materialFormula; lohnEp holds the evaluated result. Internal. */
  lohnEpFormula?: string;
  /** Per-position Lohn-Faktor "W" — the Vorlage's per-row labor multiplier on the
   *  Verrechnungslohn (col AB = Zeit/60 × Verrechnungslohn × W). Captured at import
   *  so this row's Lohn RE-PRICES when the global Verrechnungslohn (or the row's
   *  Zeit) changes — unlike a flat lohnEp. Default 1 (plain Zeit × VL); a literal
   *  specialist rate is folded in here too (W = rate ÷ (Zeit/60 × VL)) so it still
   *  scales with VL. Internal-only — never in the customer share snapshot. */
  lohnFaktor?: number;
  /** Per-position EP Stoffe VK override (€/unit) — the Vorlage's "EP Stoffe VK"
   *  (col AJ) when a hand-typed value replaces the default Material × (1+Zuschlag).
   *  When set, calc uses it FLAT for this position's Material VERKAUF. Internal. */
  materialEp?: number;
  /** Per-position EP Nachunternehmer VK override (€/unit) — Vorlage "EP Nachu."
   *  (col AK) when it deviates from NU × (1+Zuschlag). FLAT when set. Internal. */
  nuEp?: number;
  /** Per-position GP override (€) — the Vorlage's cached GESAMTPREIS (col F) when
   *  our component rebuild can't reproduce it AND deviates a lot (hand-typed EP
   *  markup, %-Zuschlag rows where F≠Menge×EP, stale EP). col F is the authoritative
   *  offer price, so we pin it ("insert the number") and derive EP = GP/Menge. The
   *  cost-type split stays component-derived (reconciled in the share). Internal. */
  gpOverride?: number;
  /** Bedarfs-/Eventualposition — priced (has an EP) but the Vorlage leaves its
   *  GP (col F) blank so it is NOT part of the Angebotssumme. Mirrors Excel:
   *  excluded from the project total, but still shown + editable so the user can
   *  fold it into the offer. Set at import when E is filled but F is blank/0. */
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
  /** REB-23.003-lite Aufmaß formula. When non-empty, quantity is computed
   *  from it (client preview + server-authoritative re-parse on save). */
  aufmassFormula?: string;
  /** Inline formula for Material EK (per-cell scratch calc — type `=` in
   *  the cell to enter, autocomplete factor names, Enter to commit). When
   *  non-empty, materialCost is the evaluated total + the formula is shown
   *  in the cell's hover tooltip + fx badge. Re-evaluates on ZSCHLG/factor
   *  changes. Same pattern as Excel's stored-formula-with-cached-value. */
  materialFormula?: string;
  /** Inline formula for Min/Einheit. Same semantics as materialFormula. */
  timeMinutesFormula?: string;
  /** Inline formula for NU EK. Same semantics as materialFormula. */
  nuFormula?: string;
  /** Per-row Vorrechnung scratch cells — the 7 F1..F7 slots that the
   *  Excel template carries at the right side of every position row.
   *  Calculators use these for intermediate values that the main
   *  Material/Zeit/NU formulas then reference by name (F1, F2, ..., F7).
   *  Each slot can hold a raw value, or a formula whose value is cached
   *  the same way materialFormula does.
   *
   *  Partial — only slots the calculator actually populated. F-cells
   *  can reference each other (forward only — F2 may use F1, etc.) and
   *  may use Q + named factors; cycles are not detected (calculators
   *  don't write them in practice). */
  preCalcs?: Partial<Record<'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6' | 'F7', { value: number; formula?: string }>>;
  /**
   * Provenance of the row — set ONCE at creation, never mutated.
   *
   * - `'gaeb'`        — parsed from a GAEB XML upload (.x83/.x86/.X84)
   * - `'excel'`       — imported from a Kalkulation-Vorlage Excel workbook
   * - `'preisanfrage'`— seeded by "Kalkulation starten" from preisanfrage's
   *                    OneDrive-discovered GAEB parse
   * - `undefined`     — manually added via "+ Position" / "+ Titel" or
   *                    inserted from a Vorlagen-Bibliothek template
   *
   * **Delete protection**: rows where `importedFrom` is truthy MUST NOT be
   * deletable from the table — they're part of the AG's LV and the bid
   * would become inkonsistent. The row's trash icon is disabled with a
   * tooltip, and bulk-delete silently filters them out + reports how many
   * were skipped via toast.
   *
   * Backwards-compat: rows that pre-date this field (no `importedFrom`)
   * are treated as deletable — matches their original behaviour.
   */
  importedFrom?: 'gaeb' | 'excel' | 'preisanfrage';
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
  /**
   * Global Ziel-Aufschlag — a single markup factor applied on top of every
   * position's calculated EP/GP so the calculator can hit a desired
   * Angebotssumme ("Endbetrag vorgeben"). Stored additively: the effective
   * factor is `1 + zielAufschlag`, so `0` is a no-op (default), `0.2` is
   * +20 %, and a negative value is a Nachlass/discount.
   *
   * Because every GP scales linearly by `(1 + zielAufschlag)`, the value
   * needed to reach a target net total is closed-form
   * (`target / baseNetto - 1`, see `solveZielAufschlag`). Applied inside
   * `calculatePosition`, so totals, EFB-breakdown, Excel export and the
   * server-side share snapshot all pick it up automatically.
   *
   * Backwards-compat: projects created before this field have it filled in
   * as `0` by the DEFAULT_CALC_PARAMS spread on load.
   */
  zielAufschlag: number;
};

/**
 * Round 4 PART P: Zuschlag matrix per cost type. Captured at import-time
 * from rows 4-7 of the Vorlage; the "Original" struct is frozen at import,
 * the "Aktuell" struct holds the calculator's optional override (PART O).
 * Re-import triggers a merge prompt: "Übernehmen / Behalten / pro Cost
 * Type entscheiden".
 */
export type ZuschlagRow = {
  ekTotal: number;      // J column — sum of EK across positions
  zschlgPct: number;    // K column — multiplier (0.23 = 23%)
  vkTotal: number;      // L column — sum of VK across positions
  differnz: number;     // M column — VK - EK
};
export type ZuschlagMatrix = {
  stoffe: ZuschlagRow;
  nu: ZuschlagRow;
  geraete: ZuschlagRow;
  lohn: ZuschlagRow;
};

/**
 * Round 4 PART P: header-block extras NOT covered by CalcParams. These
 * are display-only metrics the Vorlage shows in the I:M block (rows 8-12)
 * — Mitarbeiter, Gesamt-Stunden, Arbeitstage, Monate, Überschuss €,
 * Zeitwert %, Kontrollsumme.
 */
export type HeaderExtras = {
  mitarbeiter: number;        // J8 — staff count
  gesStunden: number;         // L8 — total project hours
  arbeitstage: number;        // J9 — total working days
  monate: number;             // L9 — duration in months
  ueberschuss: number;        // M9 — projected profit €
  zeitwert: number;           // J11 — time adjustment %
  kontrollsumme: number;      // M11 — control sum (should be 0)
  mitarbeiterFlag?: number;   // L12 — Mitarbeiter-Einsatz multiplier (PART S, Round 5; optional for back-compat with pre-Round-5 fixtures)
};

/**
 * Round 4 PART P: Faktoren-Lookup entry. The Vorlage carries 10×11 grid
 * of reusable parameter rows at cols N-W rows 2-12; we store them as
 * structured objects rather than raw cells so the UI can render a
 * "Faktoren-Bibliothek" side drawer (PART Q) and queries are O(N).
 */
export type FaktorEntry = {
  name: string;       // first non-empty cell in the row (typically col N)
  einheit?: string;   // unit if present in adjacent col
  ep?: number;        // unit price if captured
  minEinheit?: number; // minutes per unit if captured
  sourceCol: string;  // 'N'..'W'
  sourceRow: number;  // 2..12
  /** Raw row contents — for diagnostics + fidelity round-trip. */
  raw: Record<string, number | string | null>;
};

/** Mirror of panel-api's ProjectSourceRef — where a calc was started from. */
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
  /** SharePoint-Link zum „04_Angebote"-Ordner dieser Ausschreibung (die
   *  eingegangenen Lieferanten-/Subunternehmer-Angebote). Vom Kalkulator
   *  eingefügt; die Share-Vorlage übernimmt ihn in die Kunden-Begrüßung,
   *  damit der Kunde die Angebote einsehen kann. */
  angeboteFolderUrl?: string;
  /** Provenance of the calc — set once at „Kalkulation starten" (Firma →
   *  Ausschreibung). Lets the share flow re-resolve the upstream Ausschreibung,
   *  e.g. to auto-find the Angebote-folder link. */
  sourceRef?: ProjectSourceRef;
  /** Round 4 PART P — full-fidelity capture (all optional for back-compat
   *  with projects created pre-Round-4 that don't have these fields). */
  zuschlagOriginal?: ZuschlagMatrix;
  /** PART O override — when present, takes precedence over the value in
   *  `calcParams` for the affected cost type. Partial: only the cost types
   *  the user actually changed. */
  zuschlagAktuell?: Partial<{
    stoffe: number;   // override ZSCHLG % for Stoffe
    nu: number;
    geraete: number;
    lohn: number;
  }>;
  headerExtras?: HeaderExtras;
  faktoren?: FaktorEntry[];
  /** Feature #5 — Nachkalkulation Lite. Map of position.id → actual cost.
   *  Stored inside `data` so we don't need a new table or new backend route. */
  actuals?: Record<string, PositionActual>;
  /** Feature #2 — Preisspiegel. Subunternehmer-Angebote nebeneinander.
   *  Stored in the project_data JSON for the same zero-migration reason.
   *  Each `NuQuoteSource` is one NU/Lieferant; each `quotes` map carries
   *  the position-by-position prices that source quoted. */
  nuQuotes?: NuQuoteSource[];
};

/** One subunternehmer / Lieferant and the prices they quoted. */
export type NuQuoteSource = {
  /** Stable id (nanoid). */
  id: string;
  /** Display name — e.g. "Müller Tiefbau GmbH". */
  name: string;
  /** Optional contact email / phone / Saarbrücken / etc. */
  note?: string;
  /** ISO date when the quote was received. */
  receivedAt?: string;
  /** position.id → quoted prices for that position. */
  quotes: Record<string, NuQuote>;
};

export type NuQuote = {
  /** €/EH the NU charges for material. Null if not quoted. */
  materialCost?: number;
  /** €/EH NU price (replaces our internal nuCost). Null if not quoted. */
  nuCost?: number;
  /** Optional row-specific note (Sonderkonditionen, Lieferzeit, etc.). */
  note?: string;
};

/** Per-position actual / Ist costs captured after Auftragsausführung. */
export type PositionActual = {
  /** Actual hours worked on this position (may differ from kalkulierten Stunden). */
  hours?: number;
  /** Actual material cost paid (€) for this position's quantity. */
  materialCost?: number;
  /** Actual NU cost paid (€). */
  nuCost?: number;
  /** Free-text note explaining the deviation. */
  note?: string;
  /** ISO timestamp of last edit. */
  recordedAt?: string;
};

export type ProjectSummary = {
  id: string;
  name: string;
  client: string;
  service: string;
  positionCount: number;
  createdAt: string;
  updatedAt: string;
  versionNumber: number;
  /** Live-Zusammenarbeit: 'owner' for my own calcs, 'collaborator' for ones a
   *  coworker shared with me. Optional for back-compat with older servers. */
  role?: 'owner' | 'collaborator';
};

export type ProjectDetail = {
  id: string;
  data: ProjectData;
  versionNumber: number;
  createdAt: string;
  updatedAt: string;
  shares: ShareSummary[];
  /** Whether this viewer owns the calc (may delete + manage collaborators) or
   *  is a granted collaborator. Optional for back-compat. */
  role?: 'owner' | 'collaborator';
};

/** Live-Zusammenarbeit — a panel user who can edit a project. */
export type ProjectCollaborator = {
  id: string;
  name: string;
  email: string;
  /** Epoch ms the grant was created. Absent for the owner entry. */
  addedAt?: number;
};

/** Live-Zusammenarbeit — owner + collaborators of one project. */
export type ProjectCollaborators = {
  owner: ProjectCollaborator | null;
  collaborators: ProjectCollaborator[];
  /** True if the current viewer may add/remove collaborators (owner or admin). */
  canManage: boolean;
};

/** Live-Zusammenarbeit — a coworker currently viewing/editing the same calc. */
export type PresencePeer = {
  userId: string;
  name: string;
  /** Last heartbeat (epoch ms). */
  lastSeen: number;
  /** True if their tab has unsaved local edits in flight. */
  editing: boolean;
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
  /** Detail level for each customer-visible position. `true` (default) shows
   *  the full Langtext (long description) under each line — "alle Details".
   *  `false` renders the short version: Kurztext + Menge/Einheit/Preis only.
   *  Optional + treated as `true` when absent so shares created before this
   *  flag existed keep showing the long text. */
  showLongText?: boolean;
  /** Show the per-position Material/Gerät/Zeit cost split + the VERKAUF
   *  composition bar in the summary. Optional + treated as `true` when absent. */
  showCostBreakdown?: boolean;
  /** Show the EINKAUF / Zuschlag / Überschuss calculation detail + project
   *  KPIs in the summary. Optional + treated as `true` when absent. Turn off
   *  for a margin-free "Kurzfassung". */
  showCalculation?: boolean;
  /** Show a button in the customer view that opens the „04_Angebote"-Ordner
   *  (the supplier/subcontractor offers behind the prices). Off/absent = no
   *  button, and the server never ships `angeboteFolderUrl` to the customer. */
  showAngebote?: boolean;
  /** SharePoint-Link to this Ausschreibung's „04_Angebote" folder, frozen for
   *  this share. Only reaches the customer when `showAngebote` is true AND the
   *  value is an http(s) URL — gated server-side, never trusted from settings
   *  alone. Must be an "anyone-with-link" share URL or the customer hits a
   *  Microsoft login wall. */
  angeboteFolderUrl?: string;
  bindefristDays?: number;
  /** PART H: optional plaintext password set by the calculator at share-create
   *  time. The server hashes it; the client never sees the hash back. The
   *  public CustomerViewPayload only carries a boolean `passwordRequired`
   *  flag so the gate UI can decide whether to prompt. */
  password?: string;
  /** PART H: optional ISO 8601 timestamp at which the share link expires.
   *  After this point, getShare returns 410 Gone with reason 'expired'.
   *  Distinct from bindefristDays which is a non-blocking offer-validity
   *  hint displayed to the customer. */
  expiresAt?: string;
};

export type ShareSummary = {
  id: string;
  token: string;
  visiblePositionIds: string[];
  settings: ShareSettings;
  createdAt: string;
  revokedAt: string | null;
  lastViewedAt: string | null;
  viewCount: number;
  snapshotHash?: string | null;
  snapshottedAt?: string;
  parentShareId?: string | null;
  nachtragNumber?: number;
};

export type ShareResponse = {
  id: string;
  shareId: string;
  responseType: 'approve' | 'changes' | 'reject';
  customerName: string | null;
  customerEmail: string | null;
  ip: string | null;
  userAgent: string | null;
  payload: {
    message?: string;
    changes?: Array<{
      positionId: string;
      type: 'modify' | 'remove' | 'comment';
      text: string;
      /** Resolved server-side in /inbox from the frozen share snapshot so the
       *  feedback tab can show WHICH position the request is about. */
      oz?: string;
      shortText?: string;
    }>;
    signature?: { name: string; timestamp: number; ip: string };
  };
  respondedAt: string;
};

/** One cost-type row in the customer-facing Kalkulations-Übersicht: EINKAUF /
 *  Zuschlag / VERKAUF / DIFFERNZ. Mirrors the backend ShareCostType. */
export type ShareCostType = { ek: number; vk: number; zuschlagPct: number; differnz: number };

/** Aggregate calculation summary the customer sees at the top of a share.
 *  Mirrors the backend ShareSnapshotSummary; `costTypes.*.vk` reconciles with
 *  Σ position.gp = netto. */
export type ShareCalcSummary = {
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

export type CustomerViewPayload = {
  shareId: string;
  token: string;
  settings: ShareSettings;
  snapshotHash: string | null;
  snapshottedAt: string;
  nachtragNumber?: number;
  parent?: {
    createdAt: string;
    snapshotHash: string | null;
    netto: number;
    brutto: number;
  } | null;
  project: {
    name: string;
    client: string;
    service: string;
    tenderNumber: string;
    deadline: string;
    versionNumber: number;
    notes?: string;
    mwst: number;
  };
  owner: {
    name: string;
    companyName: string;
    companyLogoUrl: string;
    companyPhone: string;
    /** Public contact email — distinct from the login email (which stays private). */
    contactEmail: string;
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
    /** GESAMTPREIS split (Lohn/Material/Gerät/NU), summing to gp. Optional —
     *  absent on legacy snapshots created before the field existed. */
    gpLohn?: number;
    gpMaterial?: number;
    gpGeraet?: number;
    gpNu?: number;
  }>;
  /** Aggregate calculation summary over the visible positions. Null/absent on
   *  legacy snapshots created before the field existed → summary block hidden. */
  summary?: ShareCalcSummary | null;
  /** ISO timestamp of share creation — anchors the Bindefrist window. */
  createdAt: string;
  /** PART H: server-stripped settings flags relevant to the customer view.
   *  `passwordRequired` lets the gate UI render without ever shipping the
   *  hash. `expiresAt` is the literal ISO timestamp of expiry (informational —
   *  if the share is already expired, the server returns 410 instead). */
  passwordRequired?: boolean;
  expiresAt?: string;
  /** PART H: revision tracking. Set by the server when the project's
   *  `versionNumber` is greater than the snapshot the customer is currently
   *  viewing — i.e. the calculator has edited or re-imported since this
   *  share was last resnapshotted. The ShareView renders a banner. */
  hasNewerVersion?: boolean;
  /** PART H: latest project version-number known to the server, exposed so
   *  the customer's banner can name a version. */
  latestVersionNumber?: number;
};

/** Gateable panel areas. Mirrors PANEL_PERMISSION_KEYS in panel-api/src/schema.ts. */
export type PanelPermissionKey =
  | 'kalkulation'
  | 'firmen'
  | 'vorlagen'
  | 'feedback'
  | 'submissionskarte'
  | 'statistik';

export type UserRole = 'admin' | 'user';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  /** Effective permission map from the server (admins → every key true). */
  permissions: Record<PanelPermissionKey, boolean>;
  companyName: string;
  companyLogoUrl: string;
  companyPhone: string;
  companyContactEmail: string;
  mustChangePassword: boolean;
};

/** Admin-panel view of any user (richer than AuthUser — includes isActive,
 *  the raw assigned permission map, and project count). Mirrors
 *  serializeAdminUser() in panel-api/src/routes/admin.ts. */
export type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  /** What the admin actually assigned (raw, not admin-implies-all). */
  permissions: Partial<Record<PanelPermissionKey, boolean>>;
  /** What the user ends up with after the admin-implies-all rule. */
  effectivePermissions: Record<PanelPermissionKey, boolean>;
  companyName: string;
  companyPhone: string;
  companyContactEmail: string;
  mustChangePassword: boolean;
  projectCount: number;
  createdAt: string;
  updatedAt: string;
};

export type PositionTemplate = {
  id: string;
  oz: string;
  shortText: string;
  longText: string;
  unit: string;
  defaultMaterialCost: number;
  defaultTimeMinutes: number;
  defaultNuCost: number;
  useCount: number;
  lastUsedAt: string | null;
  createdAt: string;
};

export type ViewPreset = {
  id: string;
  projectId: string;
  name: string;
  visiblePositionIds: string[];
  settings: Partial<ShareSettings>;
  createdAt: string;
};

/** Round 12 — structured customer change requests ("Änderungswünsche").
 *  Mirror of the panel-api schema unions. */
export const CHANGE_REQUEST_FIELDS = [
  'endbetrag',
  'gesamtpreis',
  'menge',
  'material',
  'geraete',
  'zeit',
  'lohn',
  'sonstiges',
] as const;
export type ChangeRequestField = (typeof CHANGE_REQUEST_FIELDS)[number];
export type ChangeRequestScope = 'global' | 'position';
export type ChangeRequestDirection = 'lower' | 'higher' | 'exact' | 'unspecified';
export type ChangeRequestUnit = 'eur' | 'min' | 'std' | 'qty' | 'pct';

/** One change request the customer composes on the share (client → server).
 *  `currentValue`/`unit` are NOT sent — the server lifts them from the frozen
 *  snapshot so the "Ist" side of the diff can't be spoofed. */
export type ChangeRequestInput = {
  scope: ChangeRequestScope;
  positionOz?: string;
  field: ChangeRequestField;
  requestedValue?: number | null;
  direction?: ChangeRequestDirection;
  note?: string;
};

/** One change request as the owner's Kunden-Feedback inbox sees it
 *  (server → panel), with the position Kurztext resolved from the snapshot. */
export type InboxChangeRequest = {
  id: string;
  scope: ChangeRequestScope;
  positionOz: string | null;
  /** Resolved from the frozen snapshot; null for global-scope wishes. */
  shortText: string | null;
  field: ChangeRequestField;
  unit: ChangeRequestUnit;
  /** What the customer was shown (server-lifted). Null when not in the snapshot. */
  currentValue: number | null;
  /** What the customer wants. Null when they only gave a direction + note. */
  requestedValue: number | null;
  direction: ChangeRequestDirection;
  note: string;
  authorName: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

/** One per-position comment (positionComments table), resolved with the
 *  position's short text from the frozen share snapshot. Surfaced in the
 *  Kunden-Feedback tab so the calculator sees WHICH part was commented on. */
export type InboxComment = {
  id: string;
  positionOz: string;
  /** From the share snapshot; null if the position is no longer in it. */
  shortText: string | null;
  intent: 'accept' | 'change_menge' | 'change_fabrikat' | 'negotiate_ep' | 'other';
  text: string;
  authorName: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

export type InboxEntry = {
  project: {
    id: string;
    name: string;
    client: string;
    /** The Firma (Bauunternehmer) the offer belongs to — WHICH COMPANY. */
    bidder: string;
    service: string;
    versionNumber: number;
    updatedAt: string;
  } | null;
  share: {
    id: string;
    token: string;
    visiblePositionIds: string[];
    settings: ShareSettings;
    createdAt: string;
    lastViewedAt: string | null;
    viewCount: number;
    snapshotHash: string | null;
  };
  responses: ShareResponse[];
  comments: InboxComment[];
  /** Round 12 — structured Änderungswünsche (current→requested value diffs).
   *  Optional for back-compat with payloads/fixtures created before the field. */
  changeRequests?: InboxChangeRequest[];
};

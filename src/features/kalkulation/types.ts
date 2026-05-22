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
};

export type ProjectDetail = {
  id: string;
  data: ProjectData;
  versionNumber: number;
  createdAt: string;
  updatedAt: string;
  shares: ShareSummary[];
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
    }>;
    signature?: { name: string; timestamp: number; ip: string };
  };
  respondedAt: string;
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
  }>;
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

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  companyName: string;
  companyLogoUrl: string;
  companyPhone: string;
  companyContactEmail: string;
  mustChangePassword: boolean;
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

export type InboxEntry = {
  project: {
    id: string;
    name: string;
    client: string;
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
};

import type {
  AdminUser,
  AuthUser,
  CustomerViewPayload,
  InboxEntry,
  PanelPermissionKey,
  PositionTemplate,
  ProjectDetail,
  ProjectData,
  ProjectSummary,
  ShareResponse,
  ShareSettings,
  ShareSummary,
  ViewPreset,
} from '@/features/kalkulation/types';

/** Mutable fields the admin panel can set when creating/updating a user. */
export type AdminUserInput = {
  email: string;
  name: string;
  password?: string;
  role: 'admin' | 'user';
  permissions: Partial<Record<PanelPermissionKey, boolean>>;
  companyName?: string;
  companyPhone?: string;
  companyContactEmail?: string;
};

export type AdminUserPatch = Partial<{
  name: string;
  email: string;
  role: 'admin' | 'user';
  permissions: Partial<Record<PanelPermissionKey, boolean>>;
  isActive: boolean;
  companyName: string;
  companyPhone: string;
  companyContactEmail: string;
}>;

const BASE = '/api/panel';

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown, message: string) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export class VersionConflictError extends ApiError {
  currentUpdatedAt: number;
  currentVersionNumber: number;
  constructor(body: { currentUpdatedAt: number; currentVersionNumber: number }) {
    super(409, body, 'version_conflict');
    this.currentUpdatedAt = body.currentUpdatedAt;
    this.currentVersionNumber = body.currentVersionNumber;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (!res.ok) {
    if (
      res.status === 409 &&
      data &&
      typeof data === 'object' &&
      'currentUpdatedAt' in data &&
      'currentVersionNumber' in data
    ) {
      throw new VersionConflictError(data as { currentUpdatedAt: number; currentVersionNumber: number });
    }
    const message = (data as { error?: string } | null)?.error || res.statusText;
    throw new ApiError(res.status, data, message);
  }
  return data as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ user: AuthUser }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    logout: () => request<{ ok: true }>('/auth/logout', { method: 'POST' }),
    me: () => request<{ user: AuthUser }>('/auth/me'),
    changePassword: (current: string, next: string) =>
      request<{ ok: true }>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ current, next }),
      }),
    updateProfile: (
      patch: Partial<
        Pick<AuthUser, 'name' | 'companyName' | 'companyLogoUrl' | 'companyPhone' | 'companyContactEmail'>
      >,
    ) =>
      request<{ user: AuthUser }>('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(patch),
      }),
  },
  projects: {
    list: () => request<{ projects: ProjectSummary[] }>('/projects'),
    get: (id: string) => request<ProjectDetail>(`/projects/${id}`),
    create: (data: Partial<ProjectData>) =>
      request<ProjectDetail>('/projects', { method: 'POST', body: JSON.stringify(data) }),
    update: (
      id: string,
      data: ProjectData,
      opts: { bumpVersion?: boolean; expectedUpdatedAt?: number } = {},
    ) =>
      request<ProjectDetail>(`/projects/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          data,
          bumpVersion: opts.bumpVersion,
          expectedUpdatedAt: opts.expectedUpdatedAt,
        }),
      }),
    delete: (id: string) =>
      request<{ ok: true }>(`/projects/${id}`, { method: 'DELETE' }),
  },
  shares: {
    listForProject: (projectId: string) =>
      request<{ shares: ShareSummary[] }>(`/projects/${projectId}/shares`),
    /** PART K: project-wide comment counts grouped by positionOz. Used to
     *  render badges on PositionTableV2 rows. Cheap aggregate; safe to
     *  call on every project open and every save. */
    commentCounts: (projectId: string) =>
      request<{ counts: Record<string, { total: number; unresolved: number }> }>(
        `/projects/${projectId}/comments/counts`,
      ),
    /** PART K: full per-position comment list. Used when the calculator
     *  clicks a row badge to expand the thread. */
    comments: (projectId: string) =>
      request<{
        comments: Array<{
          id: string;
          shareId: string;
          positionOz: string;
          intent: 'accept' | 'change_menge' | 'change_fabrikat' | 'negotiate_ep' | 'other';
          text: string;
          authorName: string | null;
          authorEmail: string | null;
          createdAt: number | string;
          resolvedAt: number | string | null;
        }>;
        grouped: Record<string, Array<{
          id: string; positionOz: string; intent: string; text: string;
          authorName: string | null; authorEmail: string | null;
          createdAt: number | string;
        }>>;
      }>(`/projects/${projectId}/comments`),
    create: (
      projectId: string,
      input: { visiblePositionIds: string[]; settings: ShareSettings; parentShareId?: string },
    ) =>
      request<ShareSummary>(`/projects/${projectId}/shares`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    revoke: (shareId: string) =>
      request<{ ok: true }>(`/shares/${shareId}`, { method: 'DELETE' }),
    responses: (shareId: string) =>
      request<{ responses: ShareResponse[] }>(`/shares/${shareId}/responses`),
    resnapshotPreview: (shareId: string) =>
      request<{
        currentVersion: number;
        proposedVersion: number;
        currentHash: string | null;
        proposedHash: string;
        diff: {
          added: Array<{ id: string; oz: string; shortText: string; ep: number; gp: number; quantity: number; unit: string }>;
          removed: Array<{ id: string; oz: string; shortText: string; ep: number; gp: number; quantity: number; unit: string }>;
          changed: Array<{
            before: { id: string; oz: string; shortText: string; ep: number; gp: number; quantity: number; unit: string };
            after: { id: string; oz: string; shortText: string; ep: number; gp: number; quantity: number; unit: string };
            fields: string[];
          }>;
          unchanged: Array<{ id: string }>;
          oldTotalNetto: number;
          newTotalNetto: number;
          delta: number;
        };
      }>(`/shares/${shareId}/resnapshot-preview`),
    resnapshot: (shareId: string) =>
      request<{ ok: true; snapshotVersion: number; snapshotHash: string }>(
        `/shares/${shareId}/resnapshot`,
        { method: 'POST' },
      ),
    /** Feature #3 — diff two snapshots of the same project. */
    diffSnapshots: (projectId: string, fromShareId: string, toShareId: string) =>
      request<{
        from: {
          id: string;
          token: string;
          snapshotVersion: number;
          snapshotHash: string | null;
          snapshottedAt: string;
          nachtragNumber: number;
          createdAt: string;
        };
        to: {
          id: string;
          token: string;
          snapshotVersion: number;
          snapshotHash: string | null;
          snapshottedAt: string;
          nachtragNumber: number;
          createdAt: string;
        };
        diff: {
          added: Array<{ id: string; oz: string; shortText: string; ep: number; gp: number; quantity: number; unit: string }>;
          removed: Array<{ id: string; oz: string; shortText: string; ep: number; gp: number; quantity: number; unit: string }>;
          changed: Array<{
            before: { id: string; oz: string; shortText: string; ep: number; gp: number; quantity: number; unit: string };
            after: { id: string; oz: string; shortText: string; ep: number; gp: number; quantity: number; unit: string };
            fields: string[];
          }>;
          unchanged: Array<{ id: string; oz: string; shortText: string; ep: number; gp: number; quantity: number; unit: string }>;
          oldTotalNetto: number;
          newTotalNetto: number;
          delta: number;
        };
      }>(`/projects/${projectId}/snapshots/diff?from=${encodeURIComponent(fromShareId)}&to=${encodeURIComponent(toShareId)}`),
  },
  inbox: {
    list: () =>
      request<{ entries: InboxEntry[]; generatedAt: string; viewerLastSeenAt: string | null }>(
        `/inbox`,
      ),
  },
  notifications: {
    unread: () => request<{ count: number }>(`/notifications/unread`),
    markViewed: () =>
      request<{ ok: true }>(`/notifications/mark-viewed`, { method: 'POST' }),
  },
  presets: {
    list: (projectId: string) =>
      request<{ presets: ViewPreset[] }>(`/projects/${projectId}/presets`),
    create: (
      projectId: string,
      input: { name: string; visiblePositionIds: string[]; settings: Partial<ShareSettings> },
    ) =>
      request<ViewPreset>(`/projects/${projectId}/presets`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    delete: (presetId: string) =>
      request<{ ok: true }>(`/presets/${presetId}`, { method: 'DELETE' }),
  },
  firmen: {
    /** Liveness — tells the UI whether to render the Firmen page or
     *  the "integration disabled" placeholder. */
    health: () =>
      request<{ enabled: boolean; mock: boolean; hint: string }>(`/firmen/health`),
    /** Big list — all preisanfrage firmas (managed + external) PLUS the
     *  current user's local firmas. `id` is `number` for preisanfrage rows
     *  (managed/external) and `string` (nanoid) for local rows — branch on
     *  `kind` before passing it to subsequent calls. */
    list: () =>
      request<{
        rows: Array<{
          kind: 'managed' | 'external' | 'local' | 'directory';
          id: number | string;
          folderName: string | null;
          displayName: string;
          tradeType: string | null;
          projectCount: number;
          wonCount: number;
          wonSumBrutto: number;
          lastSubmissionDate: string | null;
          adoptedCompanyId: number | null;
          hasCustomDefaults: boolean;
        }>;
        managedCount: number;
        externalCount: number;
        localCount: number;
        /** KT01-directory rows (baked snapshot) shown after dedup vs. live. */
        directoryCount?: number;
        totalProjects: number;
        lastScanAt: string | null;
        generatedAt: string;
        isMock: boolean;
        preisanfrageDisabled?: boolean;
      }>(`/firmen`),
    /** Per-Firma detail page payload: master row + defaults + projects.
     *  Accepts all 3 kinds. `id` type is `number | string` since local
     *  firmas use nanoid strings. Local-Firma payloads include a `notes`
     *  string on the firma object. */
    detail: (kind: 'managed' | 'external' | 'local' | 'directory', id: number | string) =>
      request<{
        firma: {
          kind: 'managed' | 'external' | 'local' | 'directory';
          id: number | string;
          folderName: string | null;
          displayName: string;
          tradeType: string | null;
          projectCount: number;
          wonCount: number;
          wonSumBrutto: number;
          lastSubmissionDate: string | null;
          adoptedCompanyId: number | null;
          notes?: string | null;
        };
        defaults: {
          materialZuschlag: number;
          nuZuschlag: number;
          verrechnungslohn: number;
          geraeteStundensatz: number;
          isCustom: boolean;
          lastEditedBy?: string;
          updatedAt?: number;
        };
        projects: Array<{
          source: 'managed' | 'external' | 'local';
          id: number | string;
          projectNumber: string | null;
          name: string | null;
          folderName?: string;
          baumassnahme?: string | null;
          auftraggeberName: string | null;
          anschriftPlzOrt: string | null;
          submissionDate: string | null;
          submissionTime?: string | null;
          status?: string;
          totalPositions?: number;
          oneDriveShareUrl?: string | null;
          teilnehmerCount?: number | null;
          ourRank?: number | null;
          winnerName?: string | null;
          winnerNetto?: number | null;
          winnerBrutto?: number | null;
          ourNetto?: number | null;
          ourBrutto?: number | null;
          updatedAt?: string;
          parsedAt?: string | null;
          // Local-Aus extras:
          firmaKind?: 'managed' | 'external' | 'local';
          firmaId?: string;
          notes?: string | null;
          archivedAt?: number | null;
          createdAt?: number;
        }>;
      }>(`/firmen/${kind}/${id}`),
    /** Fetch GAEB-parsed positions for a managed-firma project. Returns
     *  empty positions for local firmas / local Ausschreibungen and 404
     *  for external firmas (which only carry submission-result data). */
    projectPositions: (
      kind: 'managed' | 'external' | 'local' | 'directory',
      firmaId: number | string,
      projectId: number | string,
    ) =>
      request<{
        projectId: number | string;
        count: number;
        positions: Array<{
          oz: string;
          shortText: string;
          longText: string;
          quantity: number;
          unit: string;
          isHeader: boolean;
          pageNumber?: number | null;
        }>;
      }>(`/firmen/${kind}/${firmaId}/projects/${projectId}/positions`),
    updateDefaults: (
      kind: 'managed' | 'external',
      id: number,
      input: {
        materialZuschlag: number;
        nuZuschlag: number;
        verrechnungslohn: number;
        geraeteStundensatz: number;
        displayName: string;
      },
    ) =>
      request<{
        ok: true;
        defaults: {
          materialZuschlag: number;
          nuZuschlag: number;
          verrechnungslohn: number;
          geraeteStundensatz: number;
          isCustom: boolean;
        };
      }>(`/firmen/${kind}/${id}/defaults`, {
        method: 'PUT',
        body: JSON.stringify(input),
      }),
    resetDefaults: (kind: 'managed' | 'external', id: number) =>
      request<{ ok: true }>(`/firmen/${kind}/${id}/defaults`, { method: 'DELETE' }),

    /* ─── Round 11: local Firma + local Ausschreibung CRUD ─────── */

    /** Create a local Firma (panel-only — never synced to preisanfrage). */
    createLocal: (input: { displayName: string; tradeType?: string | null; notes?: string | null }) =>
      request<{
        kind: 'local';
        id: string;
        displayName: string;
        tradeType: string | null;
        notes: string | null;
        archivedAt: number | null;
        createdAt: number;
        updatedAt: number;
      }>(`/firmen`, { method: 'POST', body: JSON.stringify(input) }),

    /** Patch a local Firma. All fields optional. */
    updateLocal: (
      id: string,
      input: { displayName?: string; tradeType?: string | null; notes?: string | null },
    ) =>
      request<{
        kind: 'local';
        id: string;
        displayName: string;
        tradeType: string | null;
        notes: string | null;
        archivedAt: number | null;
        createdAt: number;
        updatedAt: number;
      }>(`/firmen/local/${id}`, { method: 'PUT', body: JSON.stringify(input) }),

    /** Soft-delete a local Firma + cascade-archive its Ausschreibungen. */
    archiveLocal: (id: string) =>
      request<{ ok: true }>(`/firmen/local/${id}`, { method: 'DELETE' }),

    /** Create a local Ausschreibung attached to a Firma of any kind. */
    createAuschreibung: (
      kind: 'managed' | 'external' | 'local',
      firmaId: number | string,
      input: {
        name: string;
        projectNumber?: string | null;
        auftraggeberName?: string | null;
        anschriftPlzOrt?: string | null;
        submissionDate?: string | null;
        submissionTime?: string | null;
        status?: 'offen' | 'in_arbeit' | 'abgegeben' | 'gewonnen' | 'verloren';
        notes?: string | null;
      },
    ) =>
      request<{
        source: 'local';
        id: string;
        firmaKind: 'managed' | 'external' | 'local';
        firmaId: string;
        name: string;
        projectNumber: string | null;
        auftraggeberName: string | null;
        anschriftPlzOrt: string | null;
        submissionDate: string | null;
        submissionTime: string | null;
        status: 'offen' | 'in_arbeit' | 'abgegeben' | 'gewonnen' | 'verloren';
        notes: string | null;
        archivedAt: number | null;
        createdAt: number;
        updatedAt: number;
      }>(`/firmen/${kind}/${firmaId}/auschreibungen`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),

    /** Patch any local Ausschreibung field — including status. */
    updateAuschreibung: (
      id: string,
      input: {
        name?: string;
        projectNumber?: string | null;
        auftraggeberName?: string | null;
        anschriftPlzOrt?: string | null;
        submissionDate?: string | null;
        submissionTime?: string | null;
        status?: 'offen' | 'in_arbeit' | 'abgegeben' | 'gewonnen' | 'verloren';
        notes?: string | null;
      },
    ) =>
      request<{
        source: 'local';
        id: string;
        firmaKind: 'managed' | 'external' | 'local';
        firmaId: string;
        name: string;
        projectNumber: string | null;
        auftraggeberName: string | null;
        anschriftPlzOrt: string | null;
        submissionDate: string | null;
        submissionTime: string | null;
        status: 'offen' | 'in_arbeit' | 'abgegeben' | 'gewonnen' | 'verloren';
        notes: string | null;
        archivedAt: number | null;
        createdAt: number;
        updatedAt: number;
      }>(`/firmen/local-auschreibung/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      }),

    /** Soft-delete a local Ausschreibung. */
    archiveAuschreibung: (id: string) =>
      request<{ ok: true }>(`/firmen/local-auschreibung/${id}`, { method: 'DELETE' }),
  },
  templates: {
    list: () => request<{ templates: PositionTemplate[] }>(`/templates`),
    create: (input: {
      oz?: string;
      shortText: string;
      longText?: string;
      unit?: string;
      defaultMaterialCost?: number;
      defaultTimeMinutes?: number;
      defaultNuCost?: number;
    }) =>
      request<PositionTemplate>(`/templates`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    use: (id: string) =>
      request<{ ok: true }>(`/templates/${id}/use`, { method: 'POST' }),
    update: (
      id: string,
      patch: Partial<{
        oz: string;
        shortText: string;
        longText: string;
        unit: string;
        defaultMaterialCost: number;
        defaultTimeMinutes: number;
        defaultNuCost: number;
      }>,
    ) =>
      request<PositionTemplate>(`/templates/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    delete: (id: string) =>
      request<{ ok: true }>(`/templates/${id}`, { method: 'DELETE' }),
  },
  public: {
    /**
     * PART H: getShare now accepts an optional `password` arg. If the share
     * is password-protected and no/wrong password is sent, the server
     * responds 401 and the caller (ShareView) renders the password gate.
     * On success the server flips `passwordRequired` to false in the
     * response so the gate stops rendering.
     *
     * Passwords go in a header (NOT a query string) so they don't appear
     * in server access logs or browser history.
     */
    getShare: (token: string, password?: string) =>
      request<CustomerViewPayload>(`/share/${token}`, {
        headers: password ? { 'X-Share-Password': password } : undefined,
      }),
    /**
     * PART H: optional dedicated unlock endpoint. Calls the same path as
     * getShare; exists for clarity at call sites and so the future server
     * can rate-limit failed unlock attempts separately from regular reads.
     */
    unlockShare: (token: string, password: string) =>
      request<CustomerViewPayload>(`/share/${token}`, {
        headers: { 'X-Share-Password': password },
      }),
    approve: (
      token: string,
      input: { customerName: string; customerEmail?: string; message?: string },
    ) =>
      request<{ ok: true; respondedAt: string }>(`/share/${token}/approve`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    requestChanges: (
      token: string,
      input: {
        customerName: string;
        customerEmail?: string;
        message?: string;
        changes: Array<{ positionId: string; type: 'modify' | 'remove' | 'comment'; text: string }>;
      },
    ) =>
      request<{ ok: true; respondedAt: string }>(`/share/${token}/changes`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    /** PART K: granular per-position comment. Honors the share's password
     *  gate via the X-Share-Password header (set the same way as getShare). */
    postComment: (
      token: string,
      input: {
        positionOz: string;
        intent: 'accept' | 'change_menge' | 'change_fabrikat' | 'negotiate_ep' | 'other';
        text: string;
        authorName?: string;
        authorEmail?: string;
      },
      password?: string,
    ) =>
      request<{ ok: true; id: string; createdAt: string; positionOz: string; intent: string }>(
        `/share/${token}/comments`,
        {
          method: 'POST',
          body: JSON.stringify(input),
          headers: password ? { 'X-Share-Password': password } : undefined,
        },
      ),
  },
  admin: {
    /** List every user with role/permissions/active state. Admin only (403). */
    listUsers: () =>
      request<{ users: AdminUser[]; permissionKeys: PanelPermissionKey[] }>(`/admin/users`),
    /** Create a user. If `password` is omitted the server generates one and
     *  returns it once in `generatedPassword`. */
    createUser: (input: AdminUserInput) =>
      request<{ user: AdminUser; generatedPassword?: string }>(`/admin/users`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    updateUser: (id: string, patch: AdminUserPatch) =>
      request<{ user: AdminUser }>(`/admin/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    /** Reset a user's password (forces change on next login). Omit `password`
     *  to have the server generate one and return it once. */
    resetPassword: (id: string, password?: string) =>
      request<{ ok: true; generatedPassword?: string }>(`/admin/users/${id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify(password ? { password } : {}),
      }),
  },
};

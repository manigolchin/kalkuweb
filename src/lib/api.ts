import type {
  AuthUser,
  CustomerViewPayload,
  InboxEntry,
  PositionTemplate,
  ProjectDetail,
  ProjectData,
  ProjectSummary,
  ShareResponse,
  ShareSettings,
  ShareSummary,
  ViewPreset,
} from '@/features/kalkulation/types';

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
  },
  inbox: {
    list: () =>
      request<{ entries: InboxEntry[]; generatedAt: string }>(`/inbox`),
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
    /** Big list — all 98 firmas from preisanfrage (managed + external)
     *  + a `hasCustomDefaults` flag per row. */
    list: () =>
      request<{
        rows: Array<{
          kind: 'managed' | 'external';
          id: number;
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
        totalProjects: number;
        lastScanAt: string | null;
        generatedAt: string;
        isMock: boolean;
      }>(`/firmen`),
    /** Per-Firma detail page payload: master row + defaults + projects. */
    detail: (kind: 'managed' | 'external', id: number) =>
      request<{
        firma: {
          kind: 'managed' | 'external';
          id: number;
          folderName: string | null;
          displayName: string;
          tradeType: string | null;
          projectCount: number;
          wonCount: number;
          wonSumBrutto: number;
          lastSubmissionDate: string | null;
          adoptedCompanyId: number | null;
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
          source: 'managed' | 'external';
          id: number;
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
        }>;
      }>(`/firmen/${kind}/${id}`),
    /** Fetch GAEB-parsed positions for a managed-firma project. Returns
     *  404 for external firmas (they only carry submission-result data
     *  in preisanfrage, not LV positions). */
    projectPositions: (kind: 'managed' | 'external', firmaId: number, projectId: number) =>
      request<{
        projectId: number;
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
};

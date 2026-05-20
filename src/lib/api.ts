import type {
  AuthUser,
  CustomerViewPayload,
  InboxEntry,
  ProjectDetail,
  ProjectData,
  ProjectSummary,
  ShareResponse,
  ShareSettings,
  ShareSummary,
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
    updateProfile: (patch: Partial<Pick<AuthUser, 'name' | 'companyName' | 'companyLogoUrl'>>) =>
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
    create: (
      projectId: string,
      input: { visiblePositionIds: string[]; settings: ShareSettings },
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
  public: {
    getShare: (token: string) => request<CustomerViewPayload>(`/share/${token}`),
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
  },
};

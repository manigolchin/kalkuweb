import type {
  AuthUser,
  CustomerViewPayload,
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
    update: (id: string, data: ProjectData, opts: { bumpVersion?: boolean } = {}) =>
      request<ProjectDetail>(`/projects/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ data, bumpVersion: opts.bumpVersion }),
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

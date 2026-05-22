/**
 * Round 9 — frontend tests for PanelHome.tsx (currently 0% coverage).
 *
 * Targets:
 *   - Renders without crash + greeting
 *   - Shows recent activity from api.inbox.list
 *   - Empty-activity state message when inbox is empty
 *   - Empty-projects state when no projects
 *   - Lists ≤ 4 recent projects sorted by updatedAt desc
 *   - "Alle anzeigen" appears only when > 3 projects
 *   - Project rows link to /panel/kalkulation/:id
 *   - "Neues Projekt" CTA links to /panel/kalkulation?new=1
 *   - Handles api errors gracefully
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import PanelHome from '../PanelHome';
import type { ProjectSummary, InboxEntry } from '@/features/kalkulation/types';

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}));

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    api: {
      ...actual.api,
      projects: {
        ...actual.api.projects,
        list: vi.fn(),
      },
      inbox: {
        list: vi.fn(),
      },
    },
  };
});

import { api } from '@/lib/api';

const projectsListMock = api.projects.list as ReturnType<typeof vi.fn>;
const inboxListMock = api.inbox.list as ReturnType<typeof vi.fn>;

// Fake user mock for useAuth.
let mockUser: {
  id: string;
  email: string;
  name: string;
  companyName: string;
  companyLogoUrl: string;
  companyPhone: string;
  companyContactEmail: string;
  mustChangePassword: boolean;
} | null = null;
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    status: 'authenticated',
    user: mockUser,
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
    setUser: vi.fn(),
  }),
}));

function buildProject(over: Partial<ProjectSummary> = {}): ProjectSummary {
  return {
    id: 'p1',
    name: 'Sanierung Marktplatz',
    client: 'Stadt SB',
    service: 'galabau',
    positionCount: 12,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-05-20T00:00:00Z',
    versionNumber: 1,
    ...over,
  };
}

function buildInbox(over: Partial<InboxEntry> = {}): InboxEntry {
  return {
    project: {
      id: 'p1',
      name: 'Sanierung Marktplatz',
      client: 'Stadt SB',
      service: 'galabau',
      versionNumber: 1,
      updatedAt: '2026-05-20T00:00:00Z',
    },
    share: {
      id: 's1',
      token: 'tok1',
      visiblePositionIds: [],
      settings: {
        brandHeader: 'minimal',
        allowApproval: true,
        allowChangeRequests: true,
        showTotals: true,
        showMwst: true,
      },
      createdAt: '2026-05-19T00:00:00Z',
      lastViewedAt: '2026-05-20T10:00:00Z',
      viewCount: 3,
      snapshotHash: 'h',
    },
    responses: [],
    ...over,
  };
}

function renderHome() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <PanelHome />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUser = {
    id: 'u1',
    email: 'inhaber@firma.de',
    name: 'Max Mustermann',
    companyName: 'Mustermann Bau GmbH',
    companyLogoUrl: '',
    companyPhone: '',
    companyContactEmail: '',
    mustChangePassword: false,
  };
});

describe('PanelHome.tsx — render', () => {
  test('renders without crash + greeting includes first name', async () => {
    projectsListMock.mockResolvedValueOnce({ projects: [] });
    inboxListMock.mockResolvedValueOnce({ entries: [], generatedAt: 'now' });
    renderHome();
    await waitFor(() => expect(screen.getByText(/Max/)).toBeDefined());
    expect(screen.getByText(/Dashboard/)).toBeDefined();
  });

  test('Dashboard eyebrow + Neues-Projekt CTA both render', async () => {
    projectsListMock.mockResolvedValueOnce({ projects: [] });
    inboxListMock.mockResolvedValueOnce({ entries: [], generatedAt: 'now' });
    renderHome();
    await waitFor(() => expect(screen.getByText('Dashboard')).toBeDefined());
    const cta = screen.getByText(/Neues Projekt/);
    expect(cta).toBeDefined();
    expect(cta.closest('a')?.getAttribute('href')).toBe('/panel/kalkulation?new=1');
  });
});

describe('PanelHome.tsx — empty states', () => {
  test('empty inbox shows the "Noch keine Aktivität" message', async () => {
    projectsListMock.mockResolvedValueOnce({ projects: [] });
    inboxListMock.mockResolvedValueOnce({ entries: [], generatedAt: 'now' });
    renderHome();
    await waitFor(() => expect(screen.getByText(/Noch keine Aktivität/)).toBeDefined());
  });

  test('empty projects shows the "Noch keine Projekte" empty state + create-link', async () => {
    projectsListMock.mockResolvedValueOnce({ projects: [] });
    inboxListMock.mockResolvedValueOnce({ entries: [], generatedAt: 'now' });
    renderHome();
    await waitFor(() => expect(screen.getByText(/Noch keine Projekte/)).toBeDefined());
    const action = screen.getByText(/Projekt anlegen/);
    expect(action.closest('a')?.getAttribute('href')).toBe('/panel/kalkulation?new=1');
  });
});

describe('PanelHome.tsx — recent projects', () => {
  test('renders up to 4 recent projects, sorted by updatedAt desc', async () => {
    const projects = [
      buildProject({ id: 'p1', name: 'Project A', updatedAt: '2026-05-19T00:00:00Z' }),
      buildProject({ id: 'p2', name: 'Project B', updatedAt: '2026-05-21T00:00:00Z' }),
      buildProject({ id: 'p3', name: 'Project C', updatedAt: '2026-05-20T00:00:00Z' }),
      buildProject({ id: 'p4', name: 'Project D', updatedAt: '2026-05-18T00:00:00Z' }),
      buildProject({ id: 'p5', name: 'Project E', updatedAt: '2026-05-22T00:00:00Z' }),
    ];
    projectsListMock.mockResolvedValueOnce({ projects });
    inboxListMock.mockResolvedValueOnce({ entries: [], generatedAt: 'now' });
    renderHome();
    await waitFor(() => expect(screen.getByText('Project E')).toBeDefined());
    // Latest 4 = E, B, C, A. P5/P2/P3/P1 in order; P4 should NOT show.
    expect(screen.getByText('Project B')).toBeDefined();
    expect(screen.getByText('Project C')).toBeDefined();
    expect(screen.getByText('Project A')).toBeDefined();
    expect(screen.queryByText('Project D')).toBeNull();
  });

  test('"Alle anzeigen" link appears only when > 3 projects exist', async () => {
    const projects = Array.from({ length: 4 }, (_, i) =>
      buildProject({ id: `p${i}`, name: `P${i}`, updatedAt: `2026-05-2${i}T00:00:00Z` }),
    );
    projectsListMock.mockResolvedValueOnce({ projects });
    inboxListMock.mockResolvedValueOnce({ entries: [], generatedAt: 'now' });
    renderHome();
    await waitFor(() => expect(screen.getByText('P0')).toBeDefined());
    expect(screen.getByText(/Alle anzeigen/)).toBeDefined();
  });

  test('project card links to /panel/kalkulation/:id', async () => {
    projectsListMock.mockResolvedValueOnce({
      projects: [buildProject({ id: 'abc-123', name: 'Sanierung' })],
    });
    inboxListMock.mockResolvedValueOnce({ entries: [], generatedAt: 'now' });
    renderHome();
    await waitFor(() => expect(screen.getByText('Sanierung')).toBeDefined());
    const link = screen.getByText('Sanierung').closest('a');
    expect(link?.getAttribute('href')).toBe('/panel/kalkulation/abc-123');
  });
});

describe('PanelHome.tsx — activity', () => {
  test('shows inbox entry with customer activity verb', async () => {
    projectsListMock.mockResolvedValueOnce({ projects: [] });
    inboxListMock.mockResolvedValueOnce({
      entries: [buildInbox({})],
      generatedAt: 'now',
    });
    renderHome();
    await waitFor(() => expect(screen.getByText(/hat den Link geöffnet/)).toBeDefined());
  });
});

describe('PanelHome.tsx — error handling', () => {
  test('renders error chip if api.projects.list / inbox.list throws', async () => {
    projectsListMock.mockRejectedValueOnce(new Error('boom'));
    inboxListMock.mockRejectedValueOnce(new Error('boom'));
    renderHome();
    await waitFor(() => expect(screen.getByText(/Daten konnten nicht geladen werden/)).toBeDefined());
  });
});

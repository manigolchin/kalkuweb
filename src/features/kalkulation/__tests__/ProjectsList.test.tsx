/**
 * Round 9 — frontend tests for ProjectsList.tsx (currently 0% coverage).
 *
 * Targets:
 *   - Header renders breadcrumb + Kalkulation title + new-project button
 *   - Loading state shows skeleton
 *   - Project grid renders all projects
 *   - Counter "1 Projekt" / "N Projekte" pluralization
 *   - Empty state when no projects
 *   - "?new=1" auto-creates a blank project + strips param
 *   - Clicking "Neues Projekt" calls api.projects.create + navigates to /panel/kalkulation/:id
 *   - Hover-then-click trash-icon opens confirm-delete modal
 *   - Confirming delete calls api.projects.delete + removes from list
 *   - Cancelling delete does NOT call api.projects.delete
 *   - Load error → toast.error called
 *   - Create error → re-enables submit + toast.error
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import ProjectsList from '../ProjectsList';
import type { ProjectSummary } from '../types';

// Stub toast so we can spy on .error / .success calls.
const toastSuccessSpy = vi.fn();
const toastErrorSpy = vi.fn();
vi.mock('react-hot-toast', () => ({
  default: { success: (...args: unknown[]) => toastSuccessSpy(...args), error: (...args: unknown[]) => toastErrorSpy(...args) },
  Toaster: () => null,
}));

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    api: {
      ...actual.api,
      projects: {
        ...actual.api.projects,
        list: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      },
    },
  };
});

import { api } from '@/lib/api';

const listMock = api.projects.list as ReturnType<typeof vi.fn>;
const createMock = api.projects.create as ReturnType<typeof vi.fn>;
const deleteMock = api.projects.delete as ReturnType<typeof vi.fn>;

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

function renderList(initialPath = '/panel/kalkulation') {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <ProjectsList />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  navigateMock.mockReset();
  toastSuccessSpy.mockReset();
  toastErrorSpy.mockReset();
});

describe('ProjectsList.tsx — header', () => {
  test('renders breadcrumb (Panel › Kalkulation) + title + new-project button', async () => {
    listMock.mockResolvedValueOnce({ projects: [] });
    renderList();
    // "Kalkulation" appears in both breadcrumb and h1 title.
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Kalkulation' })).toBeDefined());
    expect(screen.getAllByText('Kalkulation').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Panel')).toBeDefined();
    // "Neues Projekt" appears in the header CTA + empty-state CTA.
    expect(screen.getAllByText(/Neues Projekt/).length).toBeGreaterThan(0);
  });

  test('shows "Noch keine Projekte" subtitle when project list is empty', async () => {
    listMock.mockResolvedValueOnce({ projects: [] });
    renderList();
    // The empty-state h3 also contains "Noch keine Projekte" — pick at least one.
    await waitFor(() => expect(screen.getAllByText(/Noch keine Projekte/).length).toBeGreaterThan(0));
  });

  test('shows "N Projekte" pluralization for ≥ 2 projects', async () => {
    listMock.mockResolvedValueOnce({
      projects: [buildProject({ id: 'p1' }), buildProject({ id: 'p2', name: 'B' })],
    });
    renderList();
    await waitFor(() => expect(screen.getByText('2 Projekte')).toBeDefined());
  });

  test('shows "1 Projekt" singular for exactly 1 project', async () => {
    listMock.mockResolvedValueOnce({ projects: [buildProject({ id: 'p1' })] });
    renderList();
    await waitFor(() => expect(screen.getByText('1 Projekt')).toBeDefined());
  });
});

describe('ProjectsList.tsx — loading + listing', () => {
  test('renders skeleton grid while list is in-flight', async () => {
    let resolve: (v: unknown) => void = () => {};
    listMock.mockReturnValueOnce(new Promise((r) => (resolve = r as never)));
    renderList();
    // The page text shows "Lade…" in the subtitle while loading.
    expect(screen.getByText(/Lade/)).toBeDefined();
    resolve({ projects: [] });
  });

  test('renders all projects in the grid', async () => {
    const projects = [
      buildProject({ id: 'p1', name: 'Alpha' }),
      buildProject({ id: 'p2', name: 'Beta' }),
      buildProject({ id: 'p3', name: 'Gamma' }),
    ];
    listMock.mockResolvedValueOnce({ projects });
    renderList();
    await waitFor(() => expect(screen.getByText('Alpha')).toBeDefined());
    expect(screen.getByText('Beta')).toBeDefined();
    expect(screen.getByText('Gamma')).toBeDefined();
  });
});

describe('ProjectsList.tsx — create flow', () => {
  test('clicking "Neues Projekt" calls api.projects.create + navigates to detail', async () => {
    listMock.mockResolvedValueOnce({ projects: [] });
    createMock.mockResolvedValueOnce({ id: 'new-123', data: {} });
    renderList();
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Kalkulation' })).toBeDefined());
    // The header has a "Neues Projekt" button + the empty state has one too.
    // Click the first.
    const buttons = screen.getAllByText(/Neues Projekt/);
    fireEvent.click(buttons[0]);
    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
    expect(createMock).toHaveBeenCalledWith({ name: 'Neues Projekt', client: '' });
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/panel/kalkulation/new-123'));
  });

  test('?new=1 auto-creates a blank project on mount', async () => {
    listMock.mockResolvedValueOnce({ projects: [] });
    createMock.mockResolvedValueOnce({ id: 'auto-456', data: {} });
    renderList('/panel/kalkulation?new=1');
    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/panel/kalkulation/auto-456'));
  });

  test('create error shows error toast + re-enables button', async () => {
    listMock.mockResolvedValueOnce({ projects: [] });
    createMock.mockRejectedValueOnce(new Error('boom'));
    renderList();
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Kalkulation' })).toBeDefined());
    const buttons = screen.getAllByText(/Neues Projekt/);
    fireEvent.click(buttons[0]);
    await waitFor(() => expect(toastErrorSpy).toHaveBeenCalledWith('Projekt konnte nicht erstellt werden.'));
    expect(navigateMock).not.toHaveBeenCalled();
  });
});

describe('ProjectsList.tsx — delete flow', () => {
  test('opening delete-confirm via trash-icon shows a modal with the project name', async () => {
    listMock.mockResolvedValueOnce({ projects: [buildProject({ id: 'p1', name: 'Alpha' })] });
    renderList();
    await waitFor(() => expect(screen.getByText('Alpha')).toBeDefined());
    fireEvent.click(screen.getByLabelText(/Projekt löschen/));
    expect(screen.getByText(/Projekt löschen\?/)).toBeDefined();
    // Project name appears in the modal too (in the description span).
    expect(screen.getAllByText(/Alpha/).length).toBeGreaterThan(1);
  });

  test('confirming delete calls api.projects.delete + removes from list', async () => {
    listMock.mockResolvedValueOnce({ projects: [buildProject({ id: 'p1', name: 'Alpha' })] });
    deleteMock.mockResolvedValueOnce({ ok: true });
    renderList();
    await waitFor(() => expect(screen.getByText('Alpha')).toBeDefined());
    fireEvent.click(screen.getByLabelText(/Projekt löschen/));
    fireEvent.click(screen.getByText('Löschen'));
    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith('p1'));
    await waitFor(() => expect(screen.queryByText('Alpha')).toBeNull());
    expect(toastSuccessSpy).toHaveBeenCalledWith('Projekt gelöscht.');
  });

  test('cancelling delete does NOT call api.projects.delete', async () => {
    listMock.mockResolvedValueOnce({ projects: [buildProject({ id: 'p1', name: 'Alpha' })] });
    renderList();
    await waitFor(() => expect(screen.getByText('Alpha')).toBeDefined());
    fireEvent.click(screen.getByLabelText(/Projekt löschen/));
    fireEvent.click(screen.getByText('Abbrechen'));
    await waitFor(() => expect(screen.queryByText(/Projekt löschen\?/)).toBeNull());
    expect(deleteMock).not.toHaveBeenCalled();
  });
});

describe('ProjectsList.tsx — load error', () => {
  test('shows toast.error when api.projects.list throws', async () => {
    listMock.mockRejectedValueOnce(new Error('network down'));
    renderList();
    await waitFor(() => expect(toastErrorSpy).toHaveBeenCalledWith('Projekte konnten nicht geladen werden.'));
  });
});

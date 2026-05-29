/**
 * Round 9 — frontend tests for CommandPalette.tsx (currently 0% coverage).
 *
 * Targets:
 *   - Closed state renders nothing
 *   - Open state renders search input + focuses
 *   - Typing filters the action list
 *   - Empty query shows default action list (nav + new project)
 *   - ESC key closes the palette (calls onClose)
 *   - Arrow keys move highlight
 *   - Enter selects highlighted item (calls onNavigate)
 *   - Mouse hover changes highlight
 *   - Click selects an item (onNavigate + close)
 *   - "Keine Treffer" empty-result message
 *
 * Round 12 — Linear-style "search everything" upgrade extends this with
 * tests for:
 *   - Live data sources: projects / firmen / Ausschreibungen
 *   - Per-group loading + error states
 *   - Group caps + Mehr-anzeigen expansion
 *   - Re-open re-fetch + query reset
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import CommandPalette from '../CommandPalette';

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
      firmen: {
        ...actual.api.firmen,
        list: vi.fn(),
        detail: vi.fn(),
      },
    },
  };
});

import { api } from '@/lib/api';
const projectsListMock = api.projects.list as ReturnType<typeof vi.fn>;
const firmenListMock = api.firmen.list as ReturnType<typeof vi.fn>;
const firmenDetailMock = api.firmen.detail as ReturnType<typeof vi.fn>;

function renderPalette(open = true) {
  const onClose = vi.fn();
  const onNavigate = vi.fn();
  const utils = render(
    <HelmetProvider>
      <MemoryRouter>
        <CommandPalette open={open} onClose={onClose} onNavigate={onNavigate} />
      </MemoryRouter>
    </HelmetProvider>,
  );
  return { onClose, onNavigate, ...utils };
}

/** Re-render the same palette with a new `open` prop — simulates the panel
 *  closing + re-opening the palette. */
function renderControlledPalette(initialOpen = true) {
  const onClose = vi.fn();
  const onNavigate = vi.fn();
  const utils = render(
    <HelmetProvider>
      <MemoryRouter>
        <CommandPalette open={initialOpen} onClose={onClose} onNavigate={onNavigate} />
      </MemoryRouter>
    </HelmetProvider>,
  );
  const rerender = (open: boolean) =>
    utils.rerender(
      <HelmetProvider>
        <MemoryRouter>
          <CommandPalette open={open} onClose={onClose} onNavigate={onNavigate} />
        </MemoryRouter>
      </HelmetProvider>,
    );
  return { onClose, onNavigate, ...utils, rerender };
}

function buildFirmaRow(over: Partial<{
  kind: 'managed' | 'external' | 'local';
  id: number | string;
  folderName: string | null;
  displayName: string;
  tradeType: string | null;
  lastSubmissionDate: string | null;
  adoptedCompanyId: number | null;
  hasCustomDefaults: boolean;
  projectCount: number;
  wonCount: number;
  wonSumBrutto: number;
}> = {}) {
  return {
    kind: over.kind ?? ('managed' as const),
    id: over.id ?? 5,
    folderName: over.folderName ?? '1695_Folder',
    displayName: over.displayName ?? 'A Firma',
    tradeType: over.tradeType ?? 'elektro',
    projectCount: over.projectCount ?? 3,
    wonCount: over.wonCount ?? 1,
    wonSumBrutto: over.wonSumBrutto ?? 0,
    lastSubmissionDate: over.lastSubmissionDate ?? '2026-05-10',
    adoptedCompanyId: over.adoptedCompanyId ?? null,
    hasCustomDefaults: over.hasCustomDefaults ?? false,
  };
}

function buildFirmenPayload(rows: ReturnType<typeof buildFirmaRow>[]) {
  const managed = rows.filter((r) => r.kind === 'managed').length;
  const external = rows.filter((r) => r.kind === 'external').length;
  const local = rows.filter((r) => r.kind === 'local').length;
  return {
    rows,
    managedCount: managed,
    externalCount: external,
    localCount: local,
    totalProjects: rows.reduce((s, r) => s + r.projectCount, 0),
    lastScanAt: '2026-05-22T19:00:00Z',
    generatedAt: '2026-05-22T19:30:00Z',
    isMock: false,
  };
}

function buildFirmaDetail(
  firmaOver: Partial<{
    kind: 'managed' | 'external' | 'local';
    id: number | string;
    displayName: string;
  }> = {},
  projects: Array<{
    id: number | string;
    name?: string | null;
    projectNumber?: string | null;
    baumassnahme?: string | null;
  }> = [],
) {
  const firmaKind = firmaOver.kind ?? ('managed' as const);
  return {
    firma: {
      kind: firmaKind,
      id: firmaOver.id ?? 5,
      folderName: '1695_Folder',
      displayName: firmaOver.displayName ?? 'A Firma',
      tradeType: 'elektro',
      projectCount: projects.length,
      wonCount: 0,
      wonSumBrutto: 0,
      lastSubmissionDate: null,
      adoptedCompanyId: null,
    },
    defaults: {
      materialZuschlag: 0,
      nuZuschlag: 0,
      verrechnungslohn: 0,
      geraeteStundensatz: 0,
      isCustom: false,
    },
    projects: projects.map((p) => ({
      source: firmaKind,
      id: p.id,
      projectNumber: p.projectNumber ?? null,
      name: p.name ?? null,
      baumassnahme: p.baumassnahme ?? null,
      auftraggeberName: null,
      anschriftPlzOrt: null,
      submissionDate: null,
    })),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  projectsListMock.mockResolvedValue({ projects: [] });
  // Default — empty firmen list so most existing tests don't need to think
  // about the new fetches.
  firmenListMock.mockResolvedValue(buildFirmenPayload([]));
  firmenDetailMock.mockResolvedValue(buildFirmaDetail({}, []));
});

/* ─── existing test cases (Round 9, kept as-is) ────────────────────── */

describe('CommandPalette.tsx — open/closed', () => {
  test('renders nothing when open=false', () => {
    const { container } = renderPalette(false);
    // The palette returns null when open=false, so MemoryRouter's only child
    // should be an empty wrapper.
    expect(container.querySelector('[role=dialog]')).toBeNull();
  });

  test('renders search input + Aktion+Navigation groups when open', async () => {
    renderPalette(true);
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/Befehl, Projekt oder Seite suchen/)).toBeDefined(),
    );
    expect(screen.getByText('Navigation')).toBeDefined();
    expect(screen.getByText('Aktion')).toBeDefined();
  });

  test('search input is focused when opened', async () => {
    renderPalette(true);
    const input = await waitFor(() =>
      screen.getByPlaceholderText(/Befehl, Projekt oder Seite suchen/),
    );
    // Focus is set via a 30ms timeout — wait briefly.
    await waitFor(() => expect(document.activeElement).toBe(input));
  });
});

describe('CommandPalette.tsx — default action list', () => {
  test('shows all 5 navigation entries by default', async () => {
    renderPalette(true);
    await waitFor(() => expect(screen.getByText('Dashboard')).toBeDefined());
    expect(screen.getByText('Kalkulation')).toBeDefined();
    expect(screen.getByText('Kunden-Feedback')).toBeDefined();
    expect(screen.getByText('Archiv')).toBeDefined();
    expect(screen.getByText('Einstellungen')).toBeDefined();
  });

  test('shows the "Neues Projekt anlegen" action', async () => {
    renderPalette(true);
    await waitFor(() => expect(screen.getByText(/Neues Projekt anlegen/)).toBeDefined());
  });
});

describe('CommandPalette.tsx — filtering', () => {
  test('typing "kalk" narrows the list to Kalkulation', async () => {
    renderPalette(true);
    const input = await waitFor(() =>
      screen.getByPlaceholderText(/Befehl, Projekt oder Seite suchen/),
    );
    fireEvent.change(input, { target: { value: 'kalk' } });
    expect(screen.getByText('Kalkulation')).toBeDefined();
    expect(screen.queryByText('Archiv')).toBeNull();
  });

  test('garbage query → empty-result message "Keine Treffer"', async () => {
    renderPalette(true);
    const input = await waitFor(() =>
      screen.getByPlaceholderText(/Befehl, Projekt oder Seite suchen/),
    );
    fireEvent.change(input, { target: { value: 'zzzzzz-nope' } });
    await waitFor(() => expect(screen.getByText(/Keine Treffer/)).toBeDefined());
  });
});

describe('CommandPalette.tsx — keyboard nav', () => {
  test('ESC calls onClose', async () => {
    const { onClose } = renderPalette(true);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeDefined());
    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('Enter selects the first item by default → onNavigate(/panel)', async () => {
    const { onNavigate } = renderPalette(true);
    await waitFor(() => expect(screen.getByText('Dashboard')).toBeDefined());
    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Enter' });
    expect(onNavigate).toHaveBeenCalledWith('/panel');
  });

  test('ArrowDown + Enter selects the 2nd item (Kalkulation)', async () => {
    const { onNavigate } = renderPalette(true);
    await waitFor(() => expect(screen.getByText('Kalkulation')).toBeDefined());
    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'ArrowDown' });
    fireEvent.keyDown(dialog, { key: 'Enter' });
    expect(onNavigate).toHaveBeenCalledWith('/panel/kalkulation');
  });
});

describe('CommandPalette.tsx — mouse', () => {
  test('clicking an item calls onNavigate with its `to`', async () => {
    const { onNavigate } = renderPalette(true);
    await waitFor(() => expect(screen.getByText('Einstellungen')).toBeDefined());
    fireEvent.click(screen.getByText('Einstellungen'));
    expect(onNavigate).toHaveBeenCalledWith('/panel/einstellungen');
  });

  test('clicking the backdrop calls onClose', async () => {
    const { onClose } = renderPalette(true);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeDefined());
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalled();
  });
});

/* ─── Round 12 — Linear-style search-everything tests ──────────────── */

describe('CommandPalette.tsx — fetch on open', () => {
  test('opening the palette triggers api.projects.list + api.firmen.list', async () => {
    renderPalette(true);
    await waitFor(() => expect(projectsListMock).toHaveBeenCalledTimes(1));
    expect(firmenListMock).toHaveBeenCalledTimes(1);
  });

  test('palette never fetches when open=false', () => {
    renderPalette(false);
    expect(projectsListMock).not.toHaveBeenCalled();
    expect(firmenListMock).not.toHaveBeenCalled();
  });
});

describe('CommandPalette.tsx — Kalkulationen group', () => {
  test('loaded projects appear under the "Kalkulationen" group header', async () => {
    projectsListMock.mockResolvedValueOnce({
      projects: [
        {
          id: 'proj-1',
          name: 'Schulbau Saarbrücken',
          client: 'Stadt SB',
          service: 'elektro',
          positionCount: 12,
          createdAt: '2026-05-01T00:00:00Z',
          updatedAt: '2026-05-10T00:00:00Z',
          versionNumber: 1,
        },
      ],
    });
    renderPalette(true);
    await waitFor(() => expect(screen.getByText('Kalkulationen')).toBeDefined());
    expect(screen.getByText('Schulbau Saarbrücken')).toBeDefined();
  });

  test('project items render: name + client + updated date', async () => {
    projectsListMock.mockResolvedValueOnce({
      projects: [
        {
          id: 'proj-1',
          name: 'Bürokomplex',
          client: 'Acme GmbH',
          service: 'elektro',
          positionCount: 5,
          createdAt: '2026-04-01T00:00:00Z',
          updatedAt: '2026-05-12T10:00:00Z',
          versionNumber: 2,
        },
      ],
    });
    renderPalette(true);
    await waitFor(() => expect(screen.getByText('Bürokomplex')).toBeDefined());
    // Name renders as the label, client as the hint, updated date as trail.
    expect(screen.getByText('Acme GmbH')).toBeDefined();
    expect(screen.getByText('12.05.2026')).toBeDefined();
  });

  test('empty projects list → "Keine Kalkulationen" placeholder', async () => {
    projectsListMock.mockResolvedValueOnce({ projects: [] });
    renderPalette(true);
    await waitFor(() =>
      expect(screen.getByTestId('cmdk-empty-Kalkulationen').textContent).toContain(
        'Keine Kalkulationen',
      ),
    );
  });

  test('selecting a project navigates to /panel/kalkulation/:id', async () => {
    projectsListMock.mockResolvedValueOnce({
      projects: [
        {
          id: 'proj-abc',
          name: 'Pick me',
          client: 'Kunde',
          service: 'elektro',
          positionCount: 1,
          createdAt: '2026-05-01T00:00:00Z',
          updatedAt: '2026-05-01T00:00:00Z',
          versionNumber: 1,
        },
      ],
    });
    const { onNavigate } = renderPalette(true);
    await waitFor(() => expect(screen.getByText('Pick me')).toBeDefined());
    fireEvent.click(screen.getByText('Pick me'));
    expect(onNavigate).toHaveBeenCalledWith('/panel/kalkulation/proj-abc');
  });
});

describe('CommandPalette.tsx — Firmen group', () => {
  test('loaded firmen appear under the "Firmen" group header', async () => {
    firmenListMock.mockResolvedValueOnce(
      buildFirmenPayload([buildFirmaRow({ displayName: 'Acme Elektro' })]),
    );
    renderPalette(true);
    await waitFor(() => expect(screen.getByText('Firmen')).toBeDefined());
    expect(screen.getByText('Acme Elektro')).toBeDefined();
  });

  test('selecting a firma navigates to /panel/firmen/:kind/:id', async () => {
    firmenListMock.mockResolvedValueOnce(
      buildFirmenPayload([
        buildFirmaRow({ kind: 'managed', id: 42, displayName: 'Pick Firma' }),
      ]),
    );
    const { onNavigate } = renderPalette(true);
    await waitFor(() => expect(screen.getByText('Pick Firma')).toBeDefined());
    fireEvent.click(screen.getByText('Pick Firma'));
    expect(onNavigate).toHaveBeenCalledWith('/panel/firmen/managed/42');
  });

  test('503 from firmen API does NOT break the palette — Navigation still selectable', async () => {
    const { ApiError } = await import('@/lib/api');
    firmenListMock.mockRejectedValueOnce(
      new ApiError(503, { error: 'upstream' }, 'upstream'),
    );
    const { onNavigate } = renderPalette(true);
    // Navigation group is rendered immediately.
    await waitFor(() => expect(screen.getByText('Dashboard')).toBeDefined());
    // Firmen group shows the error placeholder.
    await waitFor(() =>
      expect(screen.getByTestId('cmdk-error-Firmen').textContent).toMatch(/nicht verfügbar/),
    );
    // Navigation still works.
    fireEvent.click(screen.getByText('Dashboard'));
    expect(onNavigate).toHaveBeenCalledWith('/panel');
  });
});

describe('CommandPalette.tsx — Ausschreibungen group', () => {
  test('selecting an Ausschreibung navigates to the parent Firma page', async () => {
    firmenListMock.mockResolvedValueOnce(
      buildFirmenPayload([
        buildFirmaRow({
          kind: 'managed',
          id: 7,
          displayName: 'Parent Firma',
          lastSubmissionDate: '2026-05-15',
        }),
      ]),
    );
    firmenDetailMock.mockResolvedValueOnce(
      buildFirmaDetail(
        { kind: 'managed', id: 7, displayName: 'Parent Firma' },
        [{ id: 'aus-1', name: 'Wartung 2026' }],
      ),
    );
    const { onNavigate } = renderPalette(true);
    await waitFor(() => expect(screen.getByText('Wartung 2026')).toBeDefined());
    fireEvent.click(screen.getByText('Wartung 2026'));
    expect(onNavigate).toHaveBeenCalledWith('/panel/firmen/managed/7');
  });
});

describe('CommandPalette.tsx — cross-group search', () => {
  test('typing "test" filters across ALL groups (matches in any group)', async () => {
    projectsListMock.mockResolvedValueOnce({
      projects: [
        {
          id: 'p1',
          name: 'Test Kalk',
          client: 'Whatever',
          service: 'elektro',
          positionCount: 0,
          createdAt: '2026-05-01T00:00:00Z',
          updatedAt: '2026-05-01T00:00:00Z',
          versionNumber: 1,
        },
        {
          id: 'p2',
          name: 'Other',
          client: 'Whatever',
          service: 'elektro',
          positionCount: 0,
          createdAt: '2026-05-01T00:00:00Z',
          updatedAt: '2026-05-01T00:00:00Z',
          versionNumber: 1,
        },
      ],
    });
    firmenListMock.mockResolvedValueOnce(
      buildFirmenPayload([
        buildFirmaRow({ id: 1, displayName: 'TEST Firma' }),
        buildFirmaRow({ id: 2, displayName: 'Other Firma' }),
      ]),
    );

    renderPalette(true);
    await waitFor(() => expect(screen.getByText('TEST Firma')).toBeDefined());
    const input = screen.getByPlaceholderText(/Befehl, Projekt oder Seite suchen/);
    fireEvent.change(input, { target: { value: 'test' } });

    // Both groups still show their matching item.
    expect(screen.getByText('Test Kalk')).toBeDefined();
    expect(screen.getByText('TEST Firma')).toBeDefined();
    // Non-matching items are filtered out.
    expect(screen.queryByText('Other')).toBeNull();
    expect(screen.queryByText('Other Firma')).toBeNull();
  });
});

describe('CommandPalette.tsx — loading state', () => {
  test('shows "Lade…" placeholders while api requests are in-flight', () => {
    // Resolve neither — both groups stay in loading state.
    projectsListMock.mockReturnValueOnce(new Promise(() => {}));
    firmenListMock.mockReturnValueOnce(new Promise(() => {}));
    renderPalette(true);
    expect(screen.getByTestId('cmdk-loading-Kalkulationen')).toBeDefined();
    expect(screen.getByTestId('cmdk-loading-Firmen')).toBeDefined();
  });
});

describe('CommandPalette.tsx — group cap + Mehr anzeigen', () => {
  test('each group caps at 5 by default; "Mehr anzeigen" expands the group', async () => {
    projectsListMock.mockResolvedValueOnce({
      projects: Array.from({ length: 8 }, (_, i) => ({
        id: `p${i}`,
        name: `Project ${i}`,
        client: 'X',
        service: 'elektro',
        positionCount: 0,
        createdAt: '2026-05-01T00:00:00Z',
        updatedAt: '2026-05-01T00:00:00Z',
        versionNumber: 1,
      })),
    });
    renderPalette(true);
    // After load: first 5 visible, last 3 hidden behind Mehr-anzeigen.
    await waitFor(() => expect(screen.getByText('Project 0')).toBeDefined());
    expect(screen.getByText('Project 4')).toBeDefined();
    expect(screen.queryByText('Project 5')).toBeNull();
    expect(screen.queryByText('Project 7')).toBeNull();

    // Expand the group.
    fireEvent.click(screen.getByTestId('cmdk-more-Kalkulationen'));
    expect(screen.getByText('Project 5')).toBeDefined();
    expect(screen.getByText('Project 7')).toBeDefined();
  });

  test('Mehr-anzeigen toggle hides items again on second click', async () => {
    projectsListMock.mockResolvedValueOnce({
      projects: Array.from({ length: 8 }, (_, i) => ({
        id: `p${i}`,
        name: `Project ${i}`,
        client: 'X',
        service: 'elektro',
        positionCount: 0,
        createdAt: '2026-05-01T00:00:00Z',
        updatedAt: '2026-05-01T00:00:00Z',
        versionNumber: 1,
      })),
    });
    renderPalette(true);
    await waitFor(() => expect(screen.getByText('Project 0')).toBeDefined());
    fireEvent.click(screen.getByTestId('cmdk-more-Kalkulationen'));
    expect(screen.getByText('Project 7')).toBeDefined();
    // Click again — collapses back.
    fireEvent.click(screen.getByTestId('cmdk-more-Kalkulationen'));
    expect(screen.queryByText('Project 7')).toBeNull();
    expect(screen.getByText('Project 4')).toBeDefined();
  });
});

describe('CommandPalette.tsx — re-open lifecycle', () => {
  test('re-opening the palette re-fetches data (not stale)', async () => {
    const { rerender } = renderControlledPalette(true);
    await waitFor(() => expect(projectsListMock).toHaveBeenCalledTimes(1));
    expect(firmenListMock).toHaveBeenCalledTimes(1);
    // Close.
    rerender(false);
    // Re-open.
    rerender(true);
    await waitFor(() => expect(projectsListMock).toHaveBeenCalledTimes(2));
    expect(firmenListMock).toHaveBeenCalledTimes(2);
  });

  test('closing then re-opening discards search state', async () => {
    const { rerender } = renderControlledPalette(true);
    const input = (await waitFor(() =>
      screen.getByPlaceholderText(/Befehl, Projekt oder Seite suchen/),
    )) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'something' } });
    expect(input.value).toBe('something');
    rerender(false);
    rerender(true);
    const reopened = (await waitFor(() =>
      screen.getByPlaceholderText(/Befehl, Projekt oder Seite suchen/),
    )) as HTMLInputElement;
    expect(reopened.value).toBe('');
  });
});

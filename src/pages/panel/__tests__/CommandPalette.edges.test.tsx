/**
 * Round 12 — EDGE CASES for global CommandPalette upgrade.
 *
 * Companion to CommandPalette.test.tsx. Targets:
 *   - Close while in-flight: no React-warning, no setState-on-stale
 *   - Rapid open-close-open: latest fetch wins
 *   - Typing while loading: filter applies once load lands
 *   - Cross-group keyboard selection (cursor on Aktion → click in Firmen)
 *   - Backspacing query to '' restores all groups
 *   - Diacritics query — documents current behavior
 *   - 503 on BOTH projects + firmen → Navigation + Aktion still render
 *   - Mehr-anzeigen state is per-group independent
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
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
      projects: { ...actual.api.projects, list: vi.fn() },
      firmen: { ...actual.api.firmen, list: vi.fn(), detail: vi.fn() },
    },
  };
});

import { api } from '@/lib/api';
const projectsListMock = api.projects.list as ReturnType<typeof vi.fn>;
const firmenListMock = api.firmen.list as ReturnType<typeof vi.fn>;
const firmenDetailMock = api.firmen.detail as ReturnType<typeof vi.fn>;

function renderControlled(initialOpen = true) {
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
  displayName: string;
  tradeType: string | null;
  lastSubmissionDate: string | null;
}> = {}) {
  return {
    kind: over.kind ?? ('managed' as const),
    id: over.id ?? 5,
    folderName: '1695_Folder',
    displayName: over.displayName ?? 'A Firma',
    tradeType: over.tradeType ?? 'elektro',
    projectCount: 1,
    wonCount: 0,
    wonSumBrutto: 0,
    lastSubmissionDate: over.lastSubmissionDate ?? '2026-05-10',
    adoptedCompanyId: null,
    hasCustomDefaults: false,
  };
}

function buildFirmenPayload(rows: ReturnType<typeof buildFirmaRow>[]) {
  return {
    rows,
    managedCount: rows.filter((r) => r.kind === 'managed').length,
    externalCount: rows.filter((r) => r.kind === 'external').length,
    localCount: rows.filter((r) => r.kind === 'local').length,
    totalProjects: rows.length,
    lastScanAt: '2026-05-22T19:00:00Z',
    generatedAt: '2026-05-22T19:30:00Z',
    isMock: false,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  projectsListMock.mockResolvedValue({ projects: [] });
  firmenListMock.mockResolvedValue(buildFirmenPayload([]));
  firmenDetailMock.mockResolvedValue({
    firma: buildFirmaRow(),
    defaults: { materialZuschlag: 0, nuZuschlag: 0, verrechnungslohn: 0, geraeteStundensatz: 0, isCustom: false },
    projects: [],
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 1. Close during in-flight fetch — no setState-on-unmounted warnings.
// ────────────────────────────────────────────────────────────────────────────

describe('CommandPalette edges — close during in-flight fetch', () => {
  test('closing palette while fetches pending does not throw + later resolves are no-ops', async () => {
    // Hold the projects fetch open. Close before it resolves.
    let resolveProjects!: (v: { projects: never[] }) => void;
    projectsListMock.mockReturnValueOnce(new Promise((res) => {
      resolveProjects = res;
    }));
    // Track console.error to catch React's "setState on unmounted" warnings.
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { rerender } = renderControlled(true);
    // Confirm fetch fired
    await waitFor(() => expect(projectsListMock).toHaveBeenCalledTimes(1));
    // Now close before resolve.
    rerender(false);
    // Resolve the stale fetch AFTER close.
    await act(async () => {
      resolveProjects({ projects: [] });
      // Allow any microtasks to flush.
      await Promise.resolve();
    });
    // No warnings about setState on unmounted / stale state.
    const warnings = errSpy.mock.calls
      .map((args) => String(args[0]))
      .filter((m) => /unmounted|not yet mounted|state update/i.test(m));
    expect(warnings.length).toBe(0);
    errSpy.mockRestore();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 2. Rapid open → close → open re-fetches; old fetches no-op.
// ────────────────────────────────────────────────────────────────────────────

describe('CommandPalette edges — rapid open/close cycles', () => {
  test('rapid open-close-open: two fetches fire, latest results render (older one no-ops)', async () => {
    // First open: hold the fetch promise open.
    let resolveFirst!: (v: { projects: { id: string; name: string; client: string; service: string; positionCount: number; createdAt: string; updatedAt: string; versionNumber: number }[] }) => void;
    projectsListMock.mockReturnValueOnce(new Promise((res) => {
      resolveFirst = res;
    }));
    const { rerender } = renderControlled(true);
    await waitFor(() => expect(projectsListMock).toHaveBeenCalledTimes(1));

    // Close + re-open: second fetch resolves immediately with one project.
    projectsListMock.mockResolvedValueOnce({
      projects: [{
        id: 'fresh', name: 'Fresh project', client: 'Kunde', service: 'elektro',
        positionCount: 1, createdAt: '2026-05-20T00:00:00Z', updatedAt: '2026-05-20T00:00:00Z',
        versionNumber: 1,
      }],
    });
    rerender(false);
    rerender(true);
    await waitFor(() => expect(projectsListMock).toHaveBeenCalledTimes(2));
    // Fresh project lands.
    await waitFor(() => expect(screen.getByText('Fresh project')).toBeDefined());

    // Now resolve the FIRST (stale) fetch with a poisoned result — should NOT
    // appear in the DOM because the generation check rejects it.
    await act(async () => {
      resolveFirst({
        projects: [{
          id: 'stale', name: 'STALE project', client: 'X', service: 'elektro',
          positionCount: 0, createdAt: '2026-05-01T00:00:00Z', updatedAt: '2026-05-01T00:00:00Z',
          versionNumber: 1,
        }],
      });
      await Promise.resolve();
    });
    expect(screen.queryByText('STALE project')).toBeNull();
    // Fresh is still there.
    expect(screen.getByText('Fresh project')).toBeDefined();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 3. Type while loading; filter applies once results arrive.
// ────────────────────────────────────────────────────────────────────────────

describe('CommandPalette edges — type while loading', () => {
  test('typing while loading hides spinner once results land + filter applies', async () => {
    // Hold projects until after the user types.
    let resolveProjects!: (v: { projects: { id: string; name: string; client: string; service: string; positionCount: number; createdAt: string; updatedAt: string; versionNumber: number }[] }) => void;
    projectsListMock.mockReturnValueOnce(new Promise((res) => {
      resolveProjects = res;
    }));
    renderControlled(true);
    // Loading placeholder is visible.
    await waitFor(() => expect(screen.getByTestId('cmdk-loading-Kalkulationen')).toBeDefined());

    // Type while loading.
    const input = screen.getByPlaceholderText(/Befehl, Projekt oder Seite suchen/);
    fireEvent.change(input, { target: { value: 'alpha' } });

    // Now resolve with 2 projects — one matches "alpha", one doesn't.
    await act(async () => {
      resolveProjects({
        projects: [
          { id: 'p1', name: 'Alpha Project', client: 'X', service: 'elektro',
            positionCount: 0, createdAt: '2026-05-01T00:00:00Z', updatedAt: '2026-05-01T00:00:00Z',
            versionNumber: 1 },
          { id: 'p2', name: 'Beta Project', client: 'X', service: 'elektro',
            positionCount: 0, createdAt: '2026-05-01T00:00:00Z', updatedAt: '2026-05-01T00:00:00Z',
            versionNumber: 1 },
        ],
      });
      await Promise.resolve();
    });

    // Spinner gone — filter applied.
    await waitFor(() => {
      expect(screen.queryByTestId('cmdk-loading-Kalkulationen')).toBeNull();
    });
    expect(screen.getByText('Alpha Project')).toBeDefined();
    expect(screen.queryByText('Beta Project')).toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 4. Cross-group keyboard nav: highlight one group, click in another.
// ────────────────────────────────────────────────────────────────────────────

describe('CommandPalette edges — cross-group selection', () => {
  test('clicking an item in a different group than the cursor still navigates correctly', async () => {
    projectsListMock.mockResolvedValueOnce({
      projects: [{
        id: 'p1', name: 'A Kalk', client: 'X', service: 'elektro',
        positionCount: 0, createdAt: '2026-05-01T00:00:00Z', updatedAt: '2026-05-01T00:00:00Z',
        versionNumber: 1,
      }],
    });
    firmenListMock.mockResolvedValueOnce(
      buildFirmenPayload([buildFirmaRow({ kind: 'external', id: 99, displayName: 'Z Firma' })]),
    );
    const { onNavigate } = renderControlled(true);
    await waitFor(() => expect(screen.getByText('A Kalk')).toBeDefined());
    await waitFor(() => expect(screen.getByText('Z Firma')).toBeDefined());

    // ArrowDown — cursor moves to Kalkulation (Navigation index 1). Then click
    // on Z Firma — should navigate to firma route regardless of where cursor
    // is. Direct mouse click bypasses cursor.
    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'ArrowDown' });
    fireEvent.click(screen.getByText('Z Firma'));
    expect(onNavigate).toHaveBeenCalledWith('/panel/firmen/external/99');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 5. Backspace query → restore all groups.
// ────────────────────────────────────────────────────────────────────────────

describe('CommandPalette edges — backspace to empty query', () => {
  test('typing then backspacing to "" restores Navigation + Aktion + all loaded groups', async () => {
    projectsListMock.mockResolvedValueOnce({
      projects: [{
        id: 'p1', name: 'Proj A', client: 'X', service: 'elektro',
        positionCount: 0, createdAt: '2026-05-01T00:00:00Z', updatedAt: '2026-05-01T00:00:00Z',
        versionNumber: 1,
      }],
    });
    firmenListMock.mockResolvedValueOnce(
      buildFirmenPayload([buildFirmaRow({ id: 7, displayName: 'Firma X' })]),
    );
    renderControlled(true);
    await waitFor(() => expect(screen.getByText('Proj A')).toBeDefined());

    const input = screen.getByPlaceholderText(/Befehl, Projekt oder Seite suchen/) as HTMLInputElement;
    // Type — filters everything out except Proj A
    fireEvent.change(input, { target: { value: 'proj' } });
    expect(screen.queryByText('Dashboard')).toBeNull();  // Navigation hidden
    expect(screen.queryByText('Firma X')).toBeNull();
    expect(screen.getByText('Proj A')).toBeDefined();

    // Backspace all the way to ''
    fireEvent.change(input, { target: { value: '' } });
    // Navigation + Aktion + Firmen + Kalkulationen all reappear
    expect(screen.getByText('Dashboard')).toBeDefined();
    expect(screen.getByText('Neues Projekt anlegen')).toBeDefined();
    expect(screen.getByText('Proj A')).toBeDefined();
    expect(screen.getByText('Firma X')).toBeDefined();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 6. Diacritics — current implementation does NOT fold diacritics. This test
//    documents the existing behavior so a future "smart normalize" change
//    surfaces in this file.
// ────────────────────────────────────────────────────────────────────────────

describe('CommandPalette edges — diacritics in search query', () => {
  test('query "über" matches "Überweisung" content (diacritics preserved through lowercase)', async () => {
    // Content + query both contain "ü". JavaScript's toLowerCase preserves
    // the diacritic, so substring match works exactly.
    projectsListMock.mockResolvedValueOnce({
      projects: [{
        id: 'p1', name: 'Überweisung Projekt', client: 'X', service: 'elektro',
        positionCount: 0, createdAt: '2026-05-01T00:00:00Z', updatedAt: '2026-05-01T00:00:00Z',
        versionNumber: 1,
      }],
    });
    renderControlled(true);
    await waitFor(() => expect(screen.getByText('Überweisung Projekt')).toBeDefined());
    const input = screen.getByPlaceholderText(/Befehl, Projekt oder Seite suchen/);
    fireEvent.change(input, { target: { value: 'über' } });
    // Match because both haystack + needle contain "ü"
    expect(screen.getByText('Überweisung Projekt')).toBeDefined();
  });

  test('CURRENT BEHAVIOR — query "uber" (no umlaut) does NOT match "Überweisung"', async () => {
    // Documents the gap: searching without diacritics does NOT match content
    // with diacritics. If/when we add Unicode-folding, this should flip.
    projectsListMock.mockResolvedValueOnce({
      projects: [{
        id: 'p1', name: 'Überweisung Projekt', client: 'X', service: 'elektro',
        positionCount: 0, createdAt: '2026-05-01T00:00:00Z', updatedAt: '2026-05-01T00:00:00Z',
        versionNumber: 1,
      }],
    });
    renderControlled(true);
    await waitFor(() => expect(screen.getByText('Überweisung Projekt')).toBeDefined());
    const input = screen.getByPlaceholderText(/Befehl, Projekt oder Seite suchen/);
    fireEvent.change(input, { target: { value: 'uberweisung' } });
    // Empty match → "Keine Treffer" page (with static groups gated)
    await waitFor(() => expect(screen.getByText(/Keine Treffer/)).toBeDefined());
    expect(screen.queryByText('Überweisung Projekt')).toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 7. 503 on BOTH projects + firmen → Navigation + Aktion still selectable.
// ────────────────────────────────────────────────────────────────────────────

describe('CommandPalette edges — full live-data outage', () => {
  test('503 on BOTH projects + firmen → Navigation + Aktion still render and navigate', async () => {
    const { ApiError } = await import('@/lib/api');
    projectsListMock.mockRejectedValueOnce(new ApiError(503, { error: 'upstream' }, 'upstream'));
    firmenListMock.mockRejectedValueOnce(new ApiError(503, { error: 'upstream' }, 'upstream'));
    const { onNavigate } = renderControlled(true);

    // Static groups present.
    await waitFor(() => expect(screen.getByText('Dashboard')).toBeDefined());
    expect(screen.getByText('Neues Projekt anlegen')).toBeDefined();
    // Both live groups in error state.
    await waitFor(() =>
      expect(screen.getByTestId('cmdk-error-Kalkulationen').textContent).toMatch(/konnte nicht/),
    );
    expect(screen.getByTestId('cmdk-error-Firmen').textContent).toMatch(/nicht verfügbar/);
    // Ausschreibungen also errors out (because firmen fetch failed, the chain
    // is skipped at L304 of CommandPalette.tsx — sets ausError=true).
    expect(screen.getByTestId('cmdk-error-Ausschreibungen').textContent).toMatch(/konnte nicht/);
    // Navigation still works.
    fireEvent.click(screen.getByText('Einstellungen'));
    expect(onNavigate).toHaveBeenCalledWith('/panel/einstellungen');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 8. Mehr-anzeigen state is per-group independent.
// ────────────────────────────────────────────────────────────────────────────

describe('CommandPalette edges — Mehr-anzeigen independence', () => {
  test('expanding Kalkulationen does NOT expand Firmen', async () => {
    projectsListMock.mockResolvedValueOnce({
      projects: Array.from({ length: 8 }, (_, i) => ({
        id: `p${i}`, name: `Project ${i}`, client: 'X', service: 'elektro',
        positionCount: 0, createdAt: '2026-05-01T00:00:00Z', updatedAt: '2026-05-01T00:00:00Z',
        versionNumber: 1,
      })),
    });
    firmenListMock.mockResolvedValueOnce(
      buildFirmenPayload(
        Array.from({ length: 8 }, (_, i) =>
          buildFirmaRow({ id: 100 + i, displayName: `Firma ${i}` }),
        ),
      ),
    );
    renderControlled(true);
    await waitFor(() => expect(screen.getByText('Project 0')).toBeDefined());
    await waitFor(() => expect(screen.getByText('Firma 0')).toBeDefined());

    // Both groups: 5 visible, 3 collapsed.
    expect(screen.queryByText('Project 7')).toBeNull();
    expect(screen.queryByText('Firma 7')).toBeNull();

    // Expand Kalkulationen.
    fireEvent.click(screen.getByTestId('cmdk-more-Kalkulationen'));
    expect(screen.getByText('Project 7')).toBeDefined();
    // Firmen still capped.
    expect(screen.queryByText('Firma 7')).toBeNull();

    // Expand Firmen.
    fireEvent.click(screen.getByTestId('cmdk-more-Firmen'));
    expect(screen.getByText('Firma 7')).toBeDefined();
    // Both now expanded.
    expect(screen.getByText('Project 7')).toBeDefined();

    // Collapse Kalkulationen — Firmen stays expanded.
    fireEvent.click(screen.getByTestId('cmdk-more-Kalkulationen'));
    expect(screen.queryByText('Project 7')).toBeNull();
    expect(screen.getByText('Firma 7')).toBeDefined();
  });
});

/**
 * Tests for the Feature #2 ProjectPreisspiegel page.
 *
 * Covers:
 *  - loading + 404 + generic error states
 *  - empty state (0 sources / 0 positions)
 *  - add / remove / rename source columns
 *  - quote cell entry + per-source totals + coverage badge
 *  - Min/Max highlighting (with regression: ties no longer mis-highlighted,
 *    single source no badge)
 *  - "Übernehmen" copies material+nu prices into project.positions
 *  - Save flow + VersionConflictError toast
 *  - "EK netto" column label (regression — was previously "Aktuell")
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import ProjectPreisspiegel from '../ProjectPreisspiegel';
import { DEFAULT_CALC_PARAMS } from '../calc';
import type { Position, ProjectDetail, NuQuoteSource } from '../types';

/* ─── module mocks ─────────────────────────────────────────────────── */

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}));

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'proj-1' }),
  };
});

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    api: {
      ...actual.api,
      projects: {
        get: vi.fn(),
        update: vi.fn(),
        list: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      },
    },
  };
});

import { api, ApiError, VersionConflictError } from '@/lib/api';
import toast from 'react-hot-toast';

const getMock = api.projects.get as ReturnType<typeof vi.fn>;
const updateMock = api.projects.update as ReturnType<typeof vi.fn>;
const toastSuccess = toast.success as unknown as ReturnType<typeof vi.fn>;
const toastError = toast.error as unknown as ReturnType<typeof vi.fn>;

/* ─── helpers ──────────────────────────────────────────────────────── */

function pos(over: Partial<Position> & { id: string; oz: string }): Position {
  return {
    shortText: over.shortText ?? `Pos ${over.oz}`,
    longText: '',
    hinweisText: '',
    quantity: over.quantity ?? 1,
    unit: over.unit ?? 'St',
    materialCost: over.materialCost ?? 0,
    timeMinutes: over.timeMinutes ?? 0,
    nuCost: over.nuCost ?? 0,
    isHeader: over.isHeader ?? false,
    sortOrder: over.sortOrder ?? 0,
    sectionPath: '',
    epLohn: 0,
    epMaterial: 0,
    epGeraet: 0,
    epNu: 0,
    ep: 0,
    gp: 0,
    visibleToCustomer: true,
    positionType: 'standard',
    ...over,
  };
}

function detail(
  over: Partial<ProjectDetail> & { positions?: Position[]; nuQuotes?: NuQuoteSource[] } = {},
): ProjectDetail {
  return {
    id: 'proj-1',
    versionNumber: 1,
    createdAt: '2026-05-01T10:00:00Z',
    updatedAt: '2026-05-01T10:00:00Z',
    shares: [],
    data: {
      name: 'Mein Projekt',
      client: 'Kunde',
      service: 'Dienstleistung',
      tenderNumber: 'AZ-1',
      deadline: '',
      bidder: '',
      calcParams: DEFAULT_CALC_PARAMS,
      positions: over.positions ?? [],
      nuQuotes: over.nuQuotes ?? [],
    },
    ...over,
  };
}

function renderPage() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <ProjectPreisspiegel />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

beforeEach(() => {
  getMock.mockReset();
  updateMock.mockReset();
  toastSuccess.mockReset();
  toastError.mockReset();
});

/* ─── tests ────────────────────────────────────────────────────────── */

describe('ProjectPreisspiegel', () => {
  test('shows loader spinner before data lands', () => {
    getMock.mockImplementation(() => new Promise(() => {})); // never resolves
    renderPage();
    expect(document.querySelector('.animate-spin')).toBeTruthy();
  });

  test('renders project name in heading after load', async () => {
    getMock.mockResolvedValue(detail({ positions: [] }));
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Mein Projekt' })).toBeTruthy(),
    );
  });

  test('404 from api shows "Projekt nicht gefunden."', async () => {
    getMock.mockRejectedValue(new ApiError(404, null, 'not found'));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Projekt nicht gefunden.')).toBeTruthy(),
    );
  });

  test('generic error shows fallback message', async () => {
    getMock.mockRejectedValue(new Error('boom'));
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByText('Projekt konnte nicht geladen werden.'),
      ).toBeTruthy(),
    );
  });

  test('empty state — 0 sources renders the +Anbieter CTA and copy', async () => {
    getMock.mockResolvedValue(detail({ positions: [pos({ id: 'p1', oz: '1.1' })] }));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/Noch keine NU\/Lieferant-Angebote/)).toBeTruthy(),
    );
    // Project name shows up in the header.
    expect(screen.getByRole('heading', { name: 'Mein Projekt' })).toBeTruthy();
    // "+Anbieter" button visible.
    const addBtn = screen.getByRole('button', { name: /Anbieter/ });
    expect(addBtn).toBeTruthy();
  });

  test('empty positions row when there are 0 positions but >=1 source', async () => {
    getMock.mockResolvedValue(
      detail({
        positions: [],
        nuQuotes: [{ id: 'src-1', name: 'Bieter A', quotes: {} }],
      }),
    );
    renderPage();
    await waitFor(() => expect(screen.getByText('Keine Positionen.')).toBeTruthy());
  });

  test('clicking "+Anbieter" inserts a new source column', async () => {
    getMock.mockResolvedValue(detail({ positions: [pos({ id: 'p1', oz: '1.1' })] }));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/Noch keine NU\/Lieferant-Angebote/)).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole('button', { name: /Anbieter/ }));
    // The new column header is an editable input pre-filled with "Anbieter 1".
    await waitFor(() =>
      expect(screen.getByDisplayValue('Anbieter 1')).toBeTruthy(),
    );
  });

  test('removing a source after confirm drops its column', async () => {
    getMock.mockResolvedValue(
      detail({
        positions: [pos({ id: 'p1', oz: '1.1' })],
        nuQuotes: [{ id: 'src-x', name: 'Müller GmbH', quotes: {} }],
      }),
    );
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderPage();
    await waitFor(() => expect(screen.getByDisplayValue('Müller GmbH')).toBeTruthy());
    fireEvent.click(screen.getByLabelText('Anbieter entfernen'));
    await waitFor(() => expect(screen.queryByDisplayValue('Müller GmbH')).toBeNull());
    expect(confirmSpy).toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  test('removing a source — cancelling confirm keeps the column', async () => {
    getMock.mockResolvedValue(
      detail({
        positions: [pos({ id: 'p1', oz: '1.1' })],
        nuQuotes: [{ id: 'src-x', name: 'Müller GmbH', quotes: {} }],
      }),
    );
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderPage();
    await waitFor(() => expect(screen.getByDisplayValue('Müller GmbH')).toBeTruthy());
    fireEvent.click(screen.getByLabelText('Anbieter entfernen'));
    expect(screen.getByDisplayValue('Müller GmbH')).toBeTruthy();
    confirmSpy.mockRestore();
  });

  test('renaming a source via the header input updates the value', async () => {
    getMock.mockResolvedValue(
      detail({
        positions: [pos({ id: 'p1', oz: '1.1' })],
        nuQuotes: [{ id: 'src-x', name: 'Müller GmbH', quotes: {} }],
      }),
    );
    renderPage();
    const input = (await screen.findByDisplayValue('Müller GmbH')) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Neuer Anbieter' } });
    expect(
      (screen.getByDisplayValue('Neuer Anbieter') as HTMLInputElement).value,
    ).toBe('Neuer Anbieter');
  });

  test('typing material + nu price into a quote cell renders the row total', async () => {
    getMock.mockResolvedValue(
      detail({
        positions: [pos({ id: 'p1', oz: '1.1', quantity: 10 })],
        nuQuotes: [{ id: 'src-1', name: 'A', quotes: {} }],
      }),
    );
    renderPage();
    await waitFor(() => expect(screen.getByDisplayValue('A')).toBeTruthy());
    const matInput = screen.getByTitle('Mat') as HTMLInputElement;
    fireEvent.focus(matInput);
    fireEvent.change(matInput, { target: { value: '5' } });
    fireEvent.blur(matInput);
    const nuInput = screen.getByTitle('NU') as HTMLInputElement;
    fireEvent.focus(nuInput);
    fireEvent.change(nuInput, { target: { value: '3' } });
    fireEvent.blur(nuInput);
    // Σ in the header shows total = (5+3) * 10 = 80,00 €
    await waitFor(() => {
      const matches = screen.getAllByText((c) => c.includes('80,00') && c.includes('€'));
      expect(matches.length).toBeGreaterThan(0);
    });
  });

  test('per-source Σ aggregates across multiple populated positions', async () => {
    getMock.mockResolvedValue(
      detail({
        positions: [
          pos({ id: 'p1', oz: '1.1', quantity: 2 }),
          pos({ id: 'p2', oz: '1.2', quantity: 3 }),
        ],
        nuQuotes: [
          {
            id: 'src-1',
            name: 'A',
            quotes: {
              p1: { materialCost: 10, nuCost: 0 },
              p2: { materialCost: 5, nuCost: 5 },
            },
          },
        ],
      }),
    );
    renderPage();
    // Σ = (10+0)*2 + (5+5)*3 = 20 + 30 = 50,00 €
    await waitFor(() => {
      const matches = screen.getAllByText((c) => c.includes('50,00') && c.includes('€'));
      expect(matches.length).toBeGreaterThan(0);
    });
  });

  test('coverage badge — 2 / 3 positions quoted reads 67 %', async () => {
    getMock.mockResolvedValue(
      detail({
        positions: [
          pos({ id: 'p1', oz: '1.1' }),
          pos({ id: 'p2', oz: '1.2' }),
          pos({ id: 'p3', oz: '1.3' }),
        ],
        nuQuotes: [
          {
            id: 'src-1',
            name: 'A',
            quotes: {
              p1: { materialCost: 10 },
              p2: { materialCost: 5 },
            },
          },
        ],
      }),
    );
    renderPage();
    await waitFor(() => {
      const matches = screen.getAllByText((c) => c.includes('67') && c.includes('% erfasst'));
      expect(matches.length).toBeGreaterThan(0);
    });
  });

  test('min cell gets bg-emerald-50/50 when sources have a spread', async () => {
    getMock.mockResolvedValue(
      detail({
        positions: [pos({ id: 'p1', oz: '1.1', quantity: 1 })],
        nuQuotes: [
          { id: 's1', name: 'A', quotes: { p1: { materialCost: 10, nuCost: 0 } } },
          { id: 's2', name: 'B', quotes: { p1: { materialCost: 20, nuCost: 0 } } },
        ],
      }),
    );
    const { container } = renderPage();
    await waitFor(() => expect(screen.getByDisplayValue('A')).toBeTruthy());
    const minCells = container.querySelectorAll('td.bg-emerald-50\\/50');
    expect(minCells.length).toBe(1);
  });

  test('max cell gets bg-rose-50/40 when sources have a spread', async () => {
    getMock.mockResolvedValue(
      detail({
        positions: [pos({ id: 'p1', oz: '1.1', quantity: 1 })],
        nuQuotes: [
          { id: 's1', name: 'A', quotes: { p1: { materialCost: 10, nuCost: 0 } } },
          { id: 's2', name: 'B', quotes: { p1: { materialCost: 20, nuCost: 0 } } },
        ],
      }),
    );
    const { container } = renderPage();
    await waitFor(() => expect(screen.getByDisplayValue('A')).toBeTruthy());
    const maxCells = container.querySelectorAll('td.bg-rose-50\\/40');
    expect(maxCells.length).toBe(1);
  });

  test('tied totals across all sources → NO min/max highlighting (regression)', async () => {
    getMock.mockResolvedValue(
      detail({
        positions: [pos({ id: 'p1', oz: '1.1' })],
        nuQuotes: [
          { id: 's1', name: 'A', quotes: { p1: { materialCost: 10, nuCost: 0 } } },
          { id: 's2', name: 'B', quotes: { p1: { materialCost: 10, nuCost: 0 } } },
        ],
      }),
    );
    const { container } = renderPage();
    await waitFor(() => expect(screen.getByDisplayValue('A')).toBeTruthy());
    expect(container.querySelectorAll('td.bg-emerald-50\\/50').length).toBe(0);
    expect(container.querySelectorAll('td.bg-rose-50\\/40').length).toBe(0);
  });

  test('single source → NO min/max highlighting on any cell', async () => {
    getMock.mockResolvedValue(
      detail({
        positions: [pos({ id: 'p1', oz: '1.1' })],
        nuQuotes: [
          { id: 's1', name: 'A', quotes: { p1: { materialCost: 99, nuCost: 0 } } },
        ],
      }),
    );
    const { container } = renderPage();
    await waitFor(() => expect(screen.getByDisplayValue('A')).toBeTruthy());
    expect(container.querySelectorAll('td.bg-emerald-50\\/50').length).toBe(0);
    expect(container.querySelectorAll('td.bg-rose-50\\/40').length).toBe(0);
  });

  test('Übernehmen copies the cell\'s material + nu into the position (data mutates)', async () => {
    getMock.mockResolvedValue(
      detail({
        positions: [pos({ id: 'p1', oz: '1.1', quantity: 1, materialCost: 0, nuCost: 0 })],
        nuQuotes: [
          {
            id: 's1',
            name: 'A',
            quotes: { p1: { materialCost: 42, nuCost: 8 } },
          },
        ],
      }),
    );
    updateMock.mockResolvedValue(
      detail({ positions: [pos({ id: 'p1', oz: '1.1' })] }),
    );
    renderPage();
    await waitFor(() => expect(screen.getByDisplayValue('A')).toBeTruthy());
    const apply = screen.getByLabelText('In Kalkulation übernehmen');
    fireEvent.click(apply);
    // Save and inspect the payload that went to api.projects.update.
    fireEvent.click(screen.getByRole('button', { name: /Speichern/ }));
    await waitFor(() => expect(updateMock).toHaveBeenCalled());
    const [, data] = updateMock.mock.calls[0];
    const p1 = data.positions.find((p: Position) => p.id === 'p1')!;
    expect(p1.materialCost).toBe(42);
    expect(p1.nuCost).toBe(8);
  });

  test('Übernehmen fires a success toast naming the source + OZ', async () => {
    getMock.mockResolvedValue(
      detail({
        positions: [pos({ id: 'p1', oz: '1.1', quantity: 1 })],
        nuQuotes: [
          { id: 's1', name: 'A', quotes: { p1: { materialCost: 1, nuCost: 1 } } },
        ],
      }),
    );
    renderPage();
    await waitFor(() => expect(screen.getByLabelText('In Kalkulation übernehmen')).toBeTruthy());
    fireEvent.click(screen.getByLabelText('In Kalkulation übernehmen'));
    expect(toastSuccess).toHaveBeenCalled();
    const arg = toastSuccess.mock.calls[0][0];
    expect(typeof arg).toBe('string');
    expect(arg).toContain('A');
    expect(arg).toContain('1.1');
  });

  test('Save calls api.projects.update with nuQuotes + positions on the payload', async () => {
    getMock.mockResolvedValue(
      detail({
        positions: [pos({ id: 'p1', oz: '1.1' })],
        nuQuotes: [{ id: 's1', name: 'A', quotes: {} }],
      }),
    );
    updateMock.mockResolvedValue(
      detail({ positions: [pos({ id: 'p1', oz: '1.1' })] }),
    );
    renderPage();
    await waitFor(() => expect(screen.getByDisplayValue('A')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /Speichern/ }));
    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1));
    const [projectId, data, opts] = updateMock.mock.calls[0];
    expect(projectId).toBe('proj-1');
    expect(data.nuQuotes).toBeDefined();
    expect(Array.isArray(data.nuQuotes)).toBe(true);
    expect(Array.isArray(data.positions)).toBe(true);
    // expectedUpdatedAt forwarded for optimistic-locking.
    expect(opts).toHaveProperty('expectedUpdatedAt');
  });

  test('Save success fires a success toast', async () => {
    getMock.mockResolvedValue(detail({ positions: [pos({ id: 'p1', oz: '1.1' })] }));
    updateMock.mockResolvedValue(detail({ positions: [pos({ id: 'p1', oz: '1.1' })] }));
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Mein Projekt' })).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole('button', { name: /Speichern/ }));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    expect(toastSuccess.mock.calls.some((c) => /gespeichert/i.test(String(c[0])))).toBe(true);
  });

  test('VersionConflictError on save → error toast', async () => {
    getMock.mockResolvedValue(detail({ positions: [pos({ id: 'p1', oz: '1.1' })] }));
    updateMock.mockRejectedValue(
      new VersionConflictError({ currentUpdatedAt: 999, currentVersionNumber: 2 }),
    );
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Mein Projekt' })).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole('button', { name: /Speichern/ }));
    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(toastError.mock.calls.some((c) => /Konflikt/i.test(String(c[0])))).toBe(true);
  });

  test('generic Save failure → generic error toast', async () => {
    getMock.mockResolvedValue(detail({ positions: [pos({ id: 'p1', oz: '1.1' })] }));
    updateMock.mockRejectedValue(new Error('boom'));
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Mein Projekt' })).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole('button', { name: /Speichern/ }));
    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(
      toastError.mock.calls.some((c) => /fehlgeschlagen/i.test(String(c[0]))),
    ).toBe(true);
  });

  test('header column reads "EK netto" (regression — was previously "Aktuell")', async () => {
    getMock.mockResolvedValue(
      detail({
        positions: [pos({ id: 'p1', oz: '1.1' })],
        nuQuotes: [{ id: 's1', name: 'A', quotes: {} }],
      }),
    );
    renderPage();
    await waitFor(() => {
      const table = screen.getByRole('table');
      expect(within(table).getByText(/EK netto/)).toBeTruthy();
    });
    // The old label must not be there.
    expect(screen.queryByText(/^Aktuell$/)).toBeNull();
  });

  test('header positions are filtered out of the matrix body', async () => {
    getMock.mockResolvedValue(
      detail({
        positions: [
          pos({ id: 'h1', oz: '1', isHeader: true, shortText: 'GRUPPE 1' }),
          pos({ id: 'p1', oz: '1.1', shortText: 'Bodenaushub' }),
        ],
        nuQuotes: [{ id: 's1', name: 'A', quotes: {} }],
      }),
    );
    renderPage();
    await waitFor(() => expect(screen.getByText('Bodenaushub')).toBeTruthy());
    // Header should NOT have a row in the matrix body.
    expect(screen.queryByText('GRUPPE 1')).toBeNull();
  });

  test('clearing both Mat and NU inputs drops the quote entry (no apply button)', async () => {
    getMock.mockResolvedValue(
      detail({
        positions: [pos({ id: 'p1', oz: '1.1' })],
        nuQuotes: [
          { id: 's1', name: 'A', quotes: { p1: { materialCost: 7, nuCost: 3 } } },
        ],
      }),
    );
    renderPage();
    await waitFor(() =>
      expect(screen.getByLabelText('In Kalkulation übernehmen')).toBeTruthy(),
    );
    const matInput = screen.getByTitle('Mat') as HTMLInputElement;
    fireEvent.focus(matInput);
    fireEvent.change(matInput, { target: { value: '' } });
    fireEvent.blur(matInput);
    const nuInput = screen.getByTitle('NU') as HTMLInputElement;
    fireEvent.focus(nuInput);
    fireEvent.change(nuInput, { target: { value: '' } });
    fireEvent.blur(nuInput);
    expect(screen.queryByLabelText('In Kalkulation übernehmen')).toBeNull();
  });
});

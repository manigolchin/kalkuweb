/**
 * Frontend tests for ProjectActuals.tsx — Feature #5 Nachkalkulation Lite.
 *
 * Covers loading + error chrome, the summary tiles (Soll-Netto, Ist-Netto,
 * Marge-Delta, Aufwand), the recent filledCount bugfix (note-only rows are
 * NOT counted toward "X/Y erfasst"), the German-decimal NumInput, per-row
 * Ist-GP recalculation, the Marge-Delta color toggle, the
 * `sollHoursCovered` semantics in the Aufwand tile, and the Save flow
 * (success / VersionConflictError / generic error).
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import ProjectActuals from '../ProjectActuals';
import type { CalcParams, Position, ProjectData, ProjectDetail } from '../types';

const toastSuccessSpy = vi.fn();
const toastErrorSpy = vi.fn();
vi.mock('react-hot-toast', () => ({
  default: {
    success: (...a: unknown[]) => toastSuccessSpy(...a),
    error: (...a: unknown[]) => toastErrorSpy(...a),
    loading: vi.fn(() => 'id'),
    dismiss: vi.fn(),
  },
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
        get: vi.fn(),
        update: vi.fn(),
      },
    },
  };
});

import { api, ApiError, VersionConflictError } from '@/lib/api';

const getMock = api.projects.get as ReturnType<typeof vi.fn>;
const updateMock = api.projects.update as ReturnType<typeof vi.fn>;

/* ─── Fixtures ────────────────────────────────────────────────────────── */

const DEFAULT_PARAMS: CalcParams = {
  mittellohn: 30.0,
  verrechnungslohn: 49.9,
  materialZuschlag: 0.12,
  nuZuschlag: 0.12,
  geraeteZuschlagPct: 0.1,
  geraeteStundensatz: 0.5,
  zeitabzug: 0,
  tagesstunden: 8,
  personaleinsatz: 3,
  mwst: 0.19,
  zielAufschlag: 0,
};

function pos(over: Partial<Position> & { id: string }): Position {
  return {
    oz: over.oz ?? '1.1',
    shortText: over.shortText ?? 'Bodenaushub',
    longText: '',
    hinweisText: '',
    quantity: over.quantity ?? 10,
    unit: over.unit ?? 'm³',
    materialCost: over.materialCost ?? 20,
    timeMinutes: over.timeMinutes ?? 60,
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

function buildDetail(over?: {
  data?: Partial<ProjectData>;
  params?: Partial<CalcParams>;
  positions?: Position[];
}): ProjectDetail {
  const params: CalcParams = { ...DEFAULT_PARAMS, ...over?.params };
  const positions: Position[] = over?.positions ?? [pos({ id: 'p1' })];
  const data: ProjectData = {
    name: 'Sanierung Marktplatz',
    client: 'Stadt SB',
    clientEmail: '',
    clientAddress: '',
    service: 'galabau',
    tenderNumber: 'VG-2026-014',
    deadline: '2026-06-30',
    bidder: 'KALKU Bau GmbH',
    calcParams: params,
    positions,
    notes: '',
    ...over?.data,
  };
  return {
    id: 'proj-1',
    data,
    versionNumber: 1,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-05-20T00:00:00Z',
    shares: [],
  };
}

function renderActuals(id = 'proj-1') {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[`/panel/kalkulation/${id}/actuals`]}>
        <Routes>
          <Route path="/panel/kalkulation/:id/actuals" element={<ProjectActuals />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

function getTileByLabel(label: string | RegExp): HTMLElement {
  // Tiles are <div> with <p>label</p><p>value</p><p>sub</p>. Walk up from the
  // label paragraph to the tile container.
  const lbl = screen.getByText(label);
  // The label is the first <p> in the tile. Container is its parent.
  return lbl.parentElement as HTMLElement;
}

beforeEach(() => {
  getMock.mockReset();
  updateMock.mockReset();
  toastSuccessSpy.mockReset();
  toastErrorSpy.mockReset();
});

/* ─── Tests ───────────────────────────────────────────────────────────── */

describe('ProjectActuals — load + error chrome', () => {
  test('loader spinner visible before data lands', () => {
    getMock.mockReturnValue(new Promise(() => {}));
    renderActuals();
    expect(document.querySelector('.animate-spin')).toBeTruthy();
  });

  test('404 renders "Projekt nicht gefunden."', async () => {
    getMock.mockRejectedValueOnce(new ApiError(404, null, '404'));
    renderActuals();
    await waitFor(() => expect(screen.getByText('Projekt nicht gefunden.')).toBeDefined());
  });

  test('generic 500 renders "Projekt konnte nicht geladen werden."', async () => {
    getMock.mockRejectedValueOnce(new ApiError(500, null, '500'));
    renderActuals();
    await waitFor(() =>
      expect(screen.getByText('Projekt konnte nicht geladen werden.')).toBeDefined(),
    );
  });

  test('404 error state renders "Zurück" link pointing to /panel/kalkulation/:id', async () => {
    getMock.mockRejectedValueOnce(new ApiError(404, null, '404'));
    renderActuals('xyz');
    await waitFor(() => expect(screen.getByText('Projekt nicht gefunden.')).toBeDefined());
    const back = screen.getByRole('link', { name: /Zurück/ }) as HTMLAnchorElement;
    expect(back.getAttribute('href')).toBe('/panel/kalkulation/xyz');
  });
});

describe('ProjectActuals — summary tiles', () => {
  test('renders all four summary tile labels', async () => {
    getMock.mockResolvedValueOnce(buildDetail());
    renderActuals();
    await waitFor(() => expect(screen.getByText('Soll-Netto')).toBeDefined());
    expect(screen.getByText('Ist-Netto (erfasst)')).toBeDefined();
    expect(screen.getByText('Marge-Delta')).toBeDefined();
    expect(screen.getByText(/Aufwand Soll → Ist/)).toBeDefined();
  });

  test('with zero actuals: Ist-Netto === Soll-Netto and Marge-Delta = "+0,00 €"', async () => {
    // 1 position → gp = 728 € (see EFB tests for derivation).
    getMock.mockResolvedValueOnce(buildDetail());
    renderActuals();
    await waitFor(() => expect(screen.getByText('Soll-Netto')).toBeDefined());
    const sollTile = getTileByLabel('Soll-Netto');
    const istTile = getTileByLabel('Ist-Netto (erfasst)');
    const deltaTile = getTileByLabel('Marge-Delta');
    expect(sollTile.textContent).toContain('728,00');
    expect(istTile.textContent).toContain('728,00');
    expect(deltaTile.textContent).toContain('+0,00');
  });

  test('Soll-Netto subtitle counts non-header positions', async () => {
    getMock.mockResolvedValueOnce(
      buildDetail({
        positions: [
          pos({ id: 'h1', oz: '1', isHeader: true, shortText: 'GRUPPE' }),
          pos({ id: 'p1', oz: '1.1', shortText: 'A' }),
          pos({ id: 'p2', oz: '1.2', shortText: 'B' }),
        ],
      }),
    );
    renderActuals();
    await waitFor(() => expect(screen.getByText('Soll-Netto')).toBeDefined());
    const sollTile = getTileByLabel('Soll-Netto');
    expect(sollTile.textContent).toContain('2 Positionen');
  });

  test('Aufwand tile uses sollHoursCovered (0 when nothing entered), not total Soll-Std', async () => {
    // 2 positions, both 60min × 10 qty → total Soll-Std = 20 h.
    // With no actuals entered, sollHoursCovered = 0 and istHours = 0.
    // Tile main value is "0,0 → 0,0 h"; subtitle reveals total Soll-Std = "20,0 h".
    getMock.mockResolvedValueOnce(
      buildDetail({
        positions: [pos({ id: 'p1' }), pos({ id: 'p2', oz: '1.2', shortText: 'B' })],
      }),
    );
    renderActuals();
    await waitFor(() => expect(screen.getByText(/Aufwand Soll → Ist/)).toBeDefined());
    const tile = getTileByLabel(/Aufwand Soll → Ist/);
    // Main number line — start of Soll → Ist value pair is "0,0 → 0,0 h".
    expect(tile.textContent).toContain('0,0 → 0,0 h');
    // The subtitle still surfaces the unconditional total Soll-Std.
    expect(tile.textContent).toMatch(/Soll-Std insgesamt 20,0\s*h/);
  });
});

describe('ProjectActuals — filledCount semantics (post-bugfix)', () => {
  test('with no actuals → "0 / N Positionen erfasst"', async () => {
    getMock.mockResolvedValueOnce(
      buildDetail({
        positions: [pos({ id: 'p1' }), pos({ id: 'p2', oz: '1.2', shortText: 'B' })],
      }),
    );
    renderActuals();
    await waitFor(() => expect(screen.getByText(/0 \/ 2 Positionen erfasst/)).toBeDefined());
  });

  test('note-only row does NOT count toward "X/Y erfasst" (regression)', async () => {
    getMock.mockResolvedValueOnce(
      buildDetail({
        positions: [pos({ id: 'p1' }), pos({ id: 'p2', oz: '1.2', shortText: 'B' })],
        data: {
          actuals: {
            p1: { note: 'Zusatzkommentar — keine Zahl erfasst.' },
          },
        },
      }),
    );
    renderActuals();
    // p1 has only a note. filledCount must still be 0.
    await waitFor(() => expect(screen.getByText(/0 \/ 2 Positionen erfasst/)).toBeDefined());
  });

  test('a row with hours typed in DOES count', async () => {
    getMock.mockResolvedValueOnce(
      buildDetail({
        positions: [pos({ id: 'p1' }), pos({ id: 'p2', oz: '1.2', shortText: 'B' })],
        data: {
          actuals: {
            p1: { hours: 12 },
          },
        },
      }),
    );
    renderActuals();
    await waitFor(() => expect(screen.getByText(/1 \/ 2 Positionen erfasst/)).toBeDefined());
  });

  test('a row with only materialCost counts as filled', async () => {
    getMock.mockResolvedValueOnce(
      buildDetail({
        positions: [pos({ id: 'p1' })],
        data: { actuals: { p1: { materialCost: 250 } } },
      }),
    );
    renderActuals();
    await waitFor(() => expect(screen.getByText(/1 \/ 1 Positionen erfasst/)).toBeDefined());
  });
});

describe('ProjectActuals — NumInput edits', () => {
  test('entering hours in a row increments filledCount and updates Ist-GP', async () => {
    getMock.mockResolvedValueOnce(
      buildDetail({ positions: [pos({ id: 'p1' })] }),
    );
    renderActuals();
    await waitFor(() => expect(screen.getByText(/0 \/ 1 Positionen erfasst/)).toBeDefined());
    // Find the Ist-Std input — it's the first NumInput in the row (placeholder
    // is the Soll hours "10,0").
    const inputs = document.querySelectorAll<HTMLInputElement>('tbody input');
    expect(inputs.length).toBe(3); // hours / material / nu
    const hoursInput = inputs[0];
    fireEvent.focus(hoursInput);
    fireEvent.change(hoursInput, { target: { value: '12' } });
    fireEvent.blur(hoursInput);
    // Counter bumps.
    await waitFor(() => expect(screen.getByText(/1 \/ 1 Positionen erfasst/)).toBeDefined());
    // Row Ist-GP cell: 12 h × 49.9 €/h + Soll gpMaterial 224 + Soll gpNu 0 + Soll gpGeraet 5
    //   = 598.8 + 224 + 0 + 5 = 827.80 €
    const row = inputs[0].closest('tr')!;
    expect(row.textContent).toContain('827,80');
  });

  test('entering material cost updates Ist-GP without changing the hours-based portion', async () => {
    getMock.mockResolvedValueOnce(
      buildDetail({ positions: [pos({ id: 'p1' })] }),
    );
    renderActuals();
    await waitFor(() => expect(screen.getByText(/0 \/ 1 Positionen erfasst/)).toBeDefined());
    const inputs = document.querySelectorAll<HTMLInputElement>('tbody input');
    const matInput = inputs[1];
    fireEvent.focus(matInput);
    fireEvent.change(matInput, { target: { value: '500' } });
    fireEvent.blur(matInput);
    // Ist-GP = Soll gpLohn 499 + Material-Ist 500 + Soll gpNu 0 + Soll gpGeraet 5
    //        = 1004,00 €
    const row = matInput.closest('tr')!;
    await waitFor(() => expect(row.textContent).toContain('1.004,00'));
  });

  test('German decimal: typing "14,5" then blur stores 14.5 (displays back as "14,50")', async () => {
    getMock.mockResolvedValueOnce(buildDetail({ positions: [pos({ id: 'p1' })] }));
    renderActuals();
    await waitFor(() => expect(screen.getByText(/0 \/ 1/)).toBeDefined());
    const inputs = document.querySelectorAll<HTMLInputElement>('tbody input');
    const hoursInput = inputs[0];
    fireEvent.focus(hoursInput);
    fireEvent.change(hoursInput, { target: { value: '14,5' } });
    fireEvent.blur(hoursInput);
    // After blur, display formatNum(14.5, 2) = "14,50"
    await waitFor(() => expect(hoursInput.value).toBe('14,50'));
  });

  test('empty input on blur stores undefined (clears the value, row no longer counts)', async () => {
    getMock.mockResolvedValueOnce(
      buildDetail({
        positions: [pos({ id: 'p1' })],
        data: { actuals: { p1: { hours: 12 } } },
      }),
    );
    renderActuals();
    await waitFor(() => expect(screen.getByText(/1 \/ 1 Positionen erfasst/)).toBeDefined());
    const inputs = document.querySelectorAll<HTMLInputElement>('tbody input');
    const hoursInput = inputs[0];
    // Initial value reflects the stored 12 hours.
    expect(hoursInput.value).toBe('12');
    fireEvent.focus(hoursInput);
    fireEvent.change(hoursInput, { target: { value: '' } });
    fireEvent.blur(hoursInput);
    // Counter drops back.
    await waitFor(() => expect(screen.getByText(/0 \/ 1 Positionen erfasst/)).toBeDefined());
  });
});

describe('ProjectActuals — Marge-Delta tone', () => {
  test('Ist > Soll → row delta cell uses rose color', async () => {
    // Bump hours far above Soll (10 h) to push delta positive.
    getMock.mockResolvedValueOnce(
      buildDetail({
        positions: [pos({ id: 'p1' })],
        data: { actuals: { p1: { hours: 50 } } },
      }),
    );
    renderActuals();
    await waitFor(() => expect(screen.getByText(/1 \/ 1/)).toBeDefined());
    // Find the per-row Δ span — class includes text-rose-700 when delta > 0.
    const rose = document.querySelector('tbody span.text-rose-700');
    expect(rose).toBeTruthy();
  });

  test('Ist < Soll → row delta cell uses emerald color', async () => {
    getMock.mockResolvedValueOnce(
      buildDetail({
        positions: [pos({ id: 'p1' })],
        data: { actuals: { p1: { hours: 1 } } },
      }),
    );
    renderActuals();
    await waitFor(() => expect(screen.getByText(/1 \/ 1/)).toBeDefined());
    const emerald = document.querySelector('tbody span.text-emerald-700');
    expect(emerald).toBeTruthy();
  });

  test('summary Marge-Delta tile turns negative (rose) when Ist > Soll', async () => {
    getMock.mockResolvedValueOnce(
      buildDetail({
        positions: [pos({ id: 'p1' })],
        data: { actuals: { p1: { hours: 50 } } },
      }),
    );
    renderActuals();
    await waitFor(() => expect(screen.getByText('Marge-Delta')).toBeDefined());
    const tile = getTileByLabel('Marge-Delta');
    const valueP = tile.querySelector('p.text-2xl');
    expect(valueP).toBeTruthy();
    expect(valueP!.className).toContain('text-rose-700');
  });

  test('summary Marge-Delta tile is positive (emerald) when Ist < Soll', async () => {
    getMock.mockResolvedValueOnce(
      buildDetail({
        positions: [pos({ id: 'p1' })],
        data: { actuals: { p1: { hours: 1 } } },
      }),
    );
    renderActuals();
    await waitFor(() => expect(screen.getByText('Marge-Delta')).toBeDefined());
    const tile = getTileByLabel('Marge-Delta');
    const valueP = tile.querySelector('p.text-2xl');
    expect(valueP!.className).toContain('text-emerald-700');
  });
});

describe('ProjectActuals — Save flow', () => {
  test('Save button triggers api.projects.update with `{ ...data, actuals }` payload', async () => {
    const detail = buildDetail({ positions: [pos({ id: 'p1' })] });
    getMock.mockResolvedValueOnce(detail);
    updateMock.mockResolvedValueOnce({ ...detail, updatedAt: '2026-05-21T00:00:00Z' });
    renderActuals();
    await waitFor(() => expect(screen.getByText('Soll-Netto')).toBeDefined());
    // Enter a value so we have non-empty actuals.
    const inputs = document.querySelectorAll<HTMLInputElement>('tbody input');
    fireEvent.focus(inputs[0]);
    fireEvent.change(inputs[0], { target: { value: '12' } });
    fireEvent.blur(inputs[0]);
    fireEvent.click(screen.getByRole('button', { name: /Ist-Werte speichern/ }));
    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1));
    const [calledId, calledData, calledOpts] = updateMock.mock.calls[0];
    expect(calledId).toBe('proj-1');
    // The payload is the project data with an `actuals` map merged in.
    expect(calledData.name).toBe('Sanierung Marktplatz');
    expect(calledData.actuals).toBeDefined();
    expect(calledData.actuals.p1.hours).toBe(12);
    // Optimistic concurrency token comes through.
    expect(calledOpts).toEqual(expect.objectContaining({ expectedUpdatedAt: expect.any(Number) }));
  });

  test('save success → toast.success called', async () => {
    const detail = buildDetail({ positions: [pos({ id: 'p1' })] });
    getMock.mockResolvedValueOnce(detail);
    updateMock.mockResolvedValueOnce({ ...detail, updatedAt: '2026-05-21T00:00:00Z' });
    renderActuals();
    await waitFor(() => expect(screen.getByText('Soll-Netto')).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: /Ist-Werte speichern/ }));
    await waitFor(() => expect(toastSuccessSpy).toHaveBeenCalled());
    expect(toastSuccessSpy.mock.calls[0][0]).toMatch(/Ist-Werte gespeichert/);
  });

  test('VersionConflictError on save → toast.error("Konflikt — bitte neu laden.")', async () => {
    const detail = buildDetail({ positions: [pos({ id: 'p1' })] });
    getMock.mockResolvedValueOnce(detail);
    updateMock.mockRejectedValueOnce(
      new VersionConflictError({
        currentUpdatedAt: Date.now(),
        currentVersionNumber: 99,
      }),
    );
    renderActuals();
    await waitFor(() => expect(screen.getByText('Soll-Netto')).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: /Ist-Werte speichern/ }));
    await waitFor(() => expect(toastErrorSpy).toHaveBeenCalled());
    expect(toastErrorSpy.mock.calls[0][0]).toMatch(/Konflikt — bitte neu laden\./);
  });

  test('generic save failure → toast.error("Speichern fehlgeschlagen.")', async () => {
    const detail = buildDetail({ positions: [pos({ id: 'p1' })] });
    getMock.mockResolvedValueOnce(detail);
    updateMock.mockRejectedValueOnce(new Error('boom'));
    renderActuals();
    await waitFor(() => expect(screen.getByText('Soll-Netto')).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: /Ist-Werte speichern/ }));
    await waitFor(() => expect(toastErrorSpy).toHaveBeenCalled());
    expect(toastErrorSpy.mock.calls[0][0]).toMatch(/Speichern fehlgeschlagen/);
  });
});

describe('ProjectActuals — table chrome', () => {
  test('empty project renders the "Keine Positionen." row', async () => {
    getMock.mockResolvedValueOnce(buildDetail({ positions: [] }));
    renderActuals();
    await waitFor(() => expect(screen.getByText('Keine Positionen.')).toBeDefined());
  });

  test('header positions are excluded from the per-row table body', async () => {
    getMock.mockResolvedValueOnce(
      buildDetail({
        positions: [
          pos({ id: 'h1', isHeader: true, oz: '1', shortText: 'GRUPPE' }),
          pos({ id: 'p1', oz: '1.1', shortText: 'A' }),
        ],
      }),
    );
    renderActuals();
    await waitFor(() => expect(screen.getByText('A')).toBeDefined());
    // The header position must NOT render an ActualRow (look for its shortText).
    expect(screen.queryByText('GRUPPE')).toBeNull();
    expect(document.querySelectorAll('tbody tr').length).toBe(1);
  });
});

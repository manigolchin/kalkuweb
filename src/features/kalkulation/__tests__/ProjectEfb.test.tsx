/**
 * Frontend tests for ProjectEfb.tsx — Feature #1 EFB-Preisblätter 221/222/223.
 *
 * Covers the three Formblätter, tab switching, the division-by-zero guard
 * on Lohnzuschlagsfaktor, the post-bugfix EFB 222 footnote text, header
 * exclusion from EFB 223, and the standard loading / error / breadcrumb
 * chrome. Wraps with MemoryRouter (real /panel/kalkulation/:id/efb path)
 * + HelmetProvider, mocks react-hot-toast (for window.matchMedia avoidance),
 * and stubs api.projects.get only.
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import ProjectEfb from '../ProjectEfb';
import type { CalcParams, Position, ProjectData, ProjectDetail } from '../types';

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn(), loading: vi.fn(() => 'id'), dismiss: vi.fn() },
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
      },
    },
  };
});

import { api, ApiError } from '@/lib/api';

const getMock = api.projects.get as ReturnType<typeof vi.fn>;

/* ─── Fixture builders ────────────────────────────────────────────────── */

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
  const positions: Position[] =
    over?.positions ?? [pos({ id: 'p1' })];
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

function renderEfb(id = 'proj-1') {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[`/panel/kalkulation/${id}/efb`]}>
        <Routes>
          <Route path="/panel/kalkulation/:id/efb" element={<ProjectEfb />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

beforeEach(() => {
  getMock.mockReset();
});

/* ─── Tests ───────────────────────────────────────────────────────────── */

describe('ProjectEfb — load + error chrome', () => {
  test('shows loader spinner before data lands', () => {
    // Never resolves so the loader stays mounted.
    getMock.mockReturnValue(new Promise(() => {}));
    renderEfb();
    expect(document.querySelector('.animate-spin')).toBeTruthy();
  });

  test('404 renders "Projekt nicht gefunden."', async () => {
    getMock.mockRejectedValueOnce(new ApiError(404, { error: 'not_found' }, '404'));
    renderEfb();
    await waitFor(() => expect(screen.getByText('Projekt nicht gefunden.')).toBeDefined());
  });

  test('generic 500 renders "Projekt konnte nicht geladen werden."', async () => {
    getMock.mockRejectedValueOnce(new ApiError(500, { error: 'boom' }, '500'));
    renderEfb();
    await waitFor(() =>
      expect(screen.getByText('Projekt konnte nicht geladen werden.')).toBeDefined(),
    );
  });

  test('error state renders a "Zurück" link pointing to /panel/kalkulation/:id', async () => {
    getMock.mockRejectedValueOnce(new ApiError(404, null, '404'));
    renderEfb('xyz');
    await waitFor(() => expect(screen.getByText('Projekt nicht gefunden.')).toBeDefined());
    const back = screen.getByRole('link', { name: /Zurück/ }) as HTMLAnchorElement;
    expect(back.getAttribute('href')).toBe('/panel/kalkulation/xyz');
  });
});

describe('ProjectEfb — breadcrumb + header', () => {
  test('renders breadcrumb with project name', async () => {
    getMock.mockResolvedValueOnce(buildDetail());
    renderEfb();
    // The breadcrumb has the project name as a Link to /panel/kalkulation/:id.
    await waitFor(() => {
      const breadcrumb = document.querySelector('nav[aria-label="Pfad"]');
      expect(breadcrumb).toBeTruthy();
      expect(breadcrumb!.textContent).toContain('Sanierung Marktplatz');
      expect(breadcrumb!.textContent).toContain('EFB-Formblätter');
    });
  });

  test('renders the page title with project name', async () => {
    getMock.mockResolvedValueOnce(buildDetail());
    renderEfb();
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1, name: /Sanierung Marktplatz/ })).toBeDefined(),
    );
  });

  test('back-arrow link points to /panel/kalkulation/:id', async () => {
    getMock.mockResolvedValueOnce(buildDetail());
    renderEfb('proj-1');
    await waitFor(() => expect(screen.getByLabelText('Zurück')).toBeDefined());
    const back = screen.getByLabelText('Zurück') as HTMLAnchorElement;
    expect(back.getAttribute('href')).toBe('/panel/kalkulation/proj-1');
  });

  test('Print button is present and clicking it does not throw', async () => {
    getMock.mockResolvedValueOnce(buildDetail());
    renderEfb();
    const btn = await screen.findByRole('button', { name: /Drucken/ });
    // happy-dom doesn't implement window.print at all, so assign directly.
    const printMock = vi.fn();
    const original = (window as unknown as { print?: () => void }).print;
    (window as unknown as { print: () => void }).print = printMock;
    try {
      expect(() => fireEvent.click(btn)).not.toThrow();
      expect(printMock).toHaveBeenCalledTimes(1);
    } finally {
      (window as unknown as { print: (() => void) | undefined }).print = original;
    }
  });
});

describe('ProjectEfb — tab strip', () => {
  test('defaults to EFB 221 (shows its unique row label)', async () => {
    getMock.mockResolvedValueOnce(buildDetail());
    renderEfb();
    await waitFor(() => expect(screen.getByText(/Mittellohn AP/)).toBeDefined());
    // 222 only label not yet visible.
    expect(screen.queryByText(/Herstellkosten/)).toBeNull();
  });

  test('clicking EFB 222 switches the form (only ONE form visible)', async () => {
    getMock.mockResolvedValueOnce(buildDetail());
    renderEfb();
    await waitFor(() => expect(screen.getByText(/Mittellohn AP/)).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: /EFB 222/ }));
    await waitFor(() => expect(screen.getByText(/Herstellkosten/)).toBeDefined());
    // EFB 221 unique row gone.
    expect(screen.queryByText(/Mittellohn AP/)).toBeNull();
    // EFB 223 unique header (table OZ column) not yet visible.
    expect(screen.queryByText('Lohn €/EH')).toBeNull();
  });

  test('clicking EFB 223 switches to the EP-Aufgliederung table', async () => {
    getMock.mockResolvedValueOnce(buildDetail());
    renderEfb();
    await waitFor(() => expect(screen.getByText(/Mittellohn AP/)).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: /EFB 223/ }));
    await waitFor(() => expect(screen.getByText('Lohn €/EH')).toBeDefined());
    expect(screen.queryByText(/Mittellohn AP/)).toBeNull();
    expect(screen.queryByText(/Herstellkosten/)).toBeNull();
  });
});

describe('ProjectEfb — EFB 221 Zuschlagskalkulation', () => {
  test('division-by-zero guard: mittellohn=0 → shows "—" for Lohnzuschlagsfaktor (not "0,0 %")', async () => {
    getMock.mockResolvedValueOnce(
      buildDetail({ params: { mittellohn: 0 } }),
    );
    renderEfb();
    await waitFor(() => expect(screen.getByText(/Lohnzuschlagsfaktor effektiv/)).toBeDefined());
    // The Row component renders label + value side-by-side. Walk up to the row container.
    const row = screen.getByText(/Lohnzuschlagsfaktor effektiv/).parentElement!;
    expect(row.textContent).toContain('—');
    // The buggy output was "0,0 %" — ensure that exact string is NOT present in the row.
    expect(row.textContent).not.toMatch(/0,0\s*%/);
  });

  test('mittellohn=0 → Lohnkosten row shows "—" too (computable guard)', async () => {
    getMock.mockResolvedValueOnce(
      buildDetail({ params: { mittellohn: 0 } }),
    );
    renderEfb();
    await waitFor(() => expect(screen.getByText(/Lohnkosten \(Mittellohn × Stunden\)/)).toBeDefined());
    const row = screen.getByText(/Lohnkosten \(Mittellohn × Stunden\)/).parentElement!;
    expect(row.textContent).toContain('—');
  });

  test('with realistic params (mittellohn 30, VL 49.9, q=10, t=60min) → Lohnzuschlagsfaktor = 66,3 %', async () => {
    // calcs:
    //   total hours = (60 * 10)/60 = 10
    //   lohnkostenMittellohn = 30 × 10 = 300 €
    //   total gpLohn = 10 × ((60/60) × 49.9) = 499 €
    //   zuschlag = 199 / 300 × 100 = 66.333… → "66,3 %"
    getMock.mockResolvedValueOnce(buildDetail());
    renderEfb();
    await waitFor(() => expect(screen.getByText(/Lohnzuschlagsfaktor effektiv/)).toBeDefined());
    const row = screen.getByText(/Lohnzuschlagsfaktor effektiv/).parentElement!;
    expect(row.textContent).toContain('66,3');
    expect(row.textContent).toContain('%');
  });

  test('Verrechnungslohn row reflects calcParams.verrechnungslohn', async () => {
    getMock.mockResolvedValueOnce(
      buildDetail({ params: { verrechnungslohn: 57.5 } }),
    );
    renderEfb();
    await waitFor(() => expect(screen.getByText(/Verrechnungslohn/)).toBeDefined());
    const row = screen.getByText(/Verrechnungslohn/).parentElement!;
    expect(row.textContent).toContain('57,50');
  });

  test('Material-Zuschlag row renders as percentage (12 % → "12,0 %")', async () => {
    getMock.mockResolvedValueOnce(buildDetail());
    renderEfb();
    await waitFor(() => expect(screen.getByText(/Material-Zuschlag/)).toBeDefined());
    const row = screen.getByText(/Material-Zuschlag/).parentElement!;
    expect(row.textContent).toContain('12,0 %');
  });

  test('MwSt-Satz row renders 19,0 %', async () => {
    getMock.mockResolvedValueOnce(buildDetail());
    renderEfb();
    await waitFor(() => expect(screen.getByText('MwSt-Satz')).toBeDefined());
    const row = screen.getByText('MwSt-Satz').parentElement!;
    expect(row.textContent).toContain('19,0 %');
  });
});

describe('ProjectEfb — EFB 222 Endsummenkalkulation', () => {
  test('footnote uses the post-bugfix copy ("in den ZSCHLG-Sätzen je Kostenart enthalten")', async () => {
    getMock.mockResolvedValueOnce(buildDetail());
    renderEfb();
    await waitFor(() => expect(screen.getByText(/Mittellohn AP/)).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: /EFB 222/ }));
    await waitFor(() =>
      expect(
        screen.getByText(/in den ZSCHLG-Sätzen je Kostenart enthalten/),
      ).toBeDefined(),
    );
    // And NOT the old wrong copy that summed AGK + W&G into a number.
    expect(screen.queryByText(/Allgemeine Geschäftskosten:.*€/)).toBeNull();
  });

  test('Angebotssumme netto + brutto + MwSt show the calculated euro totals', async () => {
    // 1 position, q=10, t=60min, mat=20, nuCost=0, VL=49.9, matZ=12%, gerStd=0.5
    //   gp = 728 €      netto = 728
    //   mwst = 138.32   brutto = 866.32
    getMock.mockResolvedValueOnce(buildDetail());
    renderEfb();
    fireEvent.click(await screen.findByRole('button', { name: /EFB 222/ }));
    await waitFor(() => expect(screen.getByText(/Angebotssumme netto/)).toBeDefined());
    const netto = screen.getByText(/Angebotssumme netto/).parentElement!;
    expect(netto.textContent).toContain('728,00');
    const brutto = screen.getByText(/Angebotssumme brutto/).parentElement!;
    expect(brutto.textContent).toContain('866,32');
  });

  test('Herstellkosten row equals Angebotssumme netto (AGK/W&G already in)', async () => {
    getMock.mockResolvedValueOnce(buildDetail());
    renderEfb();
    fireEvent.click(await screen.findByRole('button', { name: /EFB 222/ }));
    await waitFor(() => expect(screen.getByText(/Herstellkosten/)).toBeDefined());
    const hk = screen.getByText(/Herstellkosten \(Summe 1–4\)/).parentElement!;
    expect(hk.textContent).toContain('728,00');
  });
});

describe('ProjectEfb — EFB 223 EP-Aufgliederung', () => {
  test('with 0 positions → "Keine Positionen." row', async () => {
    getMock.mockResolvedValueOnce(buildDetail({ positions: [] }));
    renderEfb();
    fireEvent.click(await screen.findByRole('button', { name: /EFB 223/ }));
    await waitFor(() => expect(screen.getByText('Keine Positionen.')).toBeDefined());
  });

  test('with N positions → one row per non-header item, with EP-Aufgliederung columns', async () => {
    getMock.mockResolvedValueOnce(
      buildDetail({
        positions: [
          pos({ id: 'p1', oz: '1.1', shortText: 'Bodenaushub', quantity: 10, timeMinutes: 60, materialCost: 20 }),
          pos({ id: 'p2', oz: '1.2', shortText: 'Pflaster', quantity: 5, timeMinutes: 30, materialCost: 50 }),
        ],
      }),
    );
    renderEfb();
    fireEvent.click(await screen.findByRole('button', { name: /EFB 223/ }));
    await waitFor(() => expect(screen.getByText('Bodenaushub')).toBeDefined());
    expect(screen.getByText('Pflaster')).toBeDefined();
    // OZ cells
    expect(screen.getByText('1.1')).toBeDefined();
    expect(screen.getByText('1.2')).toBeDefined();
    // Two body rows
    const tbody = document.querySelector('tbody')!;
    expect(tbody.querySelectorAll('tr').length).toBe(2);
  });

  test('header positions (isHeader=true) are excluded from EFB 223 table', async () => {
    getMock.mockResolvedValueOnce(
      buildDetail({
        positions: [
          pos({ id: 'h1', oz: '1', shortText: 'GROSSGEWERK', isHeader: true }),
          pos({ id: 'p1', oz: '1.1', shortText: 'Bodenaushub' }),
        ],
      }),
    );
    renderEfb();
    fireEvent.click(await screen.findByRole('button', { name: /EFB 223/ }));
    await waitFor(() => expect(screen.getByText('Bodenaushub')).toBeDefined());
    expect(screen.queryByText('GROSSGEWERK')).toBeNull();
    expect(document.querySelectorAll('tbody tr').length).toBe(1);
  });

  test('EP cell renders the EP value (recalcAll runs on load so freshly-loaded zeros are recomputed)', async () => {
    // The fixture intentionally passes ep=0 / epLohn=0 — recalcAll must overwrite.
    getMock.mockResolvedValueOnce(
      buildDetail({
        positions: [pos({ id: 'p1', oz: '1.1', quantity: 10, timeMinutes: 60, materialCost: 20 })],
      }),
    );
    renderEfb();
    fireEvent.click(await screen.findByRole('button', { name: /EFB 223/ }));
    // EP for the row = 72,80 € (49.9 lohn + 22.4 mat + 0.5 ger + 0 nu).
    await waitFor(() => {
      const row = screen.getByText('Bodenaushub').closest('tr')!;
      expect(row.textContent).toContain('72,80');
      // epLohn portion
      expect(row.textContent).toContain('49,90');
      // epMaterial portion
      expect(row.textContent).toContain('22,40');
    });
  });
});

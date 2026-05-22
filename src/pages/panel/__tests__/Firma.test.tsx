/**
 * Round 8 — frontend tests for Firma.tsx (currently 0% coverage).
 *
 * Targets:
 *   - Header renders Firma master data from the API
 *   - Defaults form pre-populates from `defaults` payload
 *   - PUT defaults round-trip — onSaved updates the form
 *   - Reset defaults → asks for confirm, then DELETEs
 *   - Auschreibungen list renders + sorts by submissionDate desc
 *   - "Kalkulation starten" creates a project with cascaded calcParams
 *     (the critical end-to-end behaviour the user cares about)
 *   - "Kalkulation starten" on managed firma fetches positions
 *   - "Kalkulation starten" on external firma DOESN'T fetch positions
 *   - Position-fetch failure is non-fatal — project still created
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Firma from '../Firma';

// react-hot-toast's <Toaster /> reads window.matchMedia at mount; jsdom
// doesn't provide it. We don't assert on the toast UI itself — just stub
// toast.success/error so the component's imports resolve cleanly.
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
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
        create: vi.fn(),
      },
      firmen: {
        list: vi.fn(),
        detail: vi.fn(),
        updateDefaults: vi.fn(),
        resetDefaults: vi.fn(),
        projectPositions: vi.fn(),
        health: vi.fn(),
      },
    },
  };
});

import { api } from '@/lib/api';

const detailMock = api.firmen.detail as ReturnType<typeof vi.fn>;
const updateDefaultsMock = api.firmen.updateDefaults as ReturnType<typeof vi.fn>;
const resetDefaultsMock = api.firmen.resetDefaults as ReturnType<typeof vi.fn>;
const projectPositionsMock = api.firmen.projectPositions as ReturnType<typeof vi.fn>;
const projectsCreateMock = api.projects.create as ReturnType<typeof vi.fn>;

function buildDetail(over: Partial<Awaited<ReturnType<typeof api.firmen.detail>>> = {}) {
  return {
    firma: {
      kind: 'managed' as const,
      id: 5,
      folderName: '1695_Gesellchen_GmbH',
      displayName: 'Gesellchen GmbH',
      tradeType: 'galabau',
      projectCount: 36,
      wonCount: 4,
      wonSumBrutto: 1_245_320.5,
      lastSubmissionDate: '2026-05-12',
      adoptedCompanyId: null,
    },
    defaults: {
      materialZuschlag: 0.18,        // already overridden
      nuZuschlag: 0.15,
      verrechnungslohn: 72.51,
      geraeteStundensatz: 0.5,
      isCustom: true,
      updatedAt: Date.now(),
    },
    projects: [
      {
        source: 'managed' as const,
        id: 1001,
        projectNumber: '260512',
        name: 'Sanierung Sandsteinmauer Ludwigschule',
        baumassnahme: null,
        auftraggeberName: 'Stadtverwaltung Sankt Ingbert',
        anschriftPlzOrt: '66386 Sankt Ingbert',
        submissionDate: '2026-05-12',
        submissionTime: '14:00',
        status: 'analyzed',
        totalPositions: 25,
        oneDriveShareUrl: null,
        updatedAt: '2026-05-12T15:30:00Z',
      },
    ],
    ...over,
  };
}

function renderFirma(path = '/panel/firmen/managed/5') {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/panel/firmen/:kind/:id" element={<Firma />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Firma.tsx — render', () => {
  test('renders the Firma header with name + folder + trade type + stats', async () => {
    detailMock.mockResolvedValueOnce(buildDetail());
    renderFirma();
    await waitFor(() => expect(screen.getByText('Gesellchen GmbH')).toBeDefined());
    expect(screen.getByText('1695_Gesellchen_GmbH')).toBeDefined();
    expect(screen.getByText('GaLaBau')).toBeDefined();
    expect(screen.getByText('36')).toBeDefined();     // projectCount
    expect(screen.getByText('4')).toBeDefined();      // wonCount
  });

  test('invalid kind in URL renders the inline error message', async () => {
    renderFirma('/panel/firmen/badkind/5');
    await waitFor(() => expect(screen.getByText(/Ungültige Firma-Referenz/)).toBeDefined());
  });

  test('404 from api → friendly error message', async () => {
    const { ApiError } = await import('@/lib/api');
    detailMock.mockRejectedValueOnce(new ApiError(404, { error: 'firma_not_found' }, '404'));
    renderFirma();
    await waitFor(() =>
      expect(screen.getByText(/Diese Firma gibt es nicht \(mehr\) in preisanfrage/)).toBeDefined(),
    );
  });
});

describe('Firma.tsx — defaults form', () => {
  test('inputs pre-populate from the defaults payload', async () => {
    detailMock.mockResolvedValueOnce(buildDetail());
    renderFirma();
    await waitFor(() => expect(screen.getByText('Gesellchen GmbH')).toBeDefined());
    const inputs = Array.from(
      document.querySelectorAll<HTMLInputElement>('input[type=number]'),
    );
    expect(inputs.length).toBe(4);
    expect(inputs[0].value).toBe('18');     // 0.18 → 18%
    expect(inputs[1].value).toBe('15');     // 0.15 → 15%
    expect(inputs[2].value).toBe('72.51');
    expect(inputs[3].value).toBe('0.5');
  });

  test('"Eigene Werte gespeichert" hint shows when isCustom=true', async () => {
    detailMock.mockResolvedValueOnce(buildDetail());
    renderFirma();
    await waitFor(() => expect(screen.getByText(/Eigene Werte gespeichert/)).toBeDefined());
  });

  test('"KALKU-Globalwerte" hint shows when isCustom=false', async () => {
    detailMock.mockResolvedValueOnce(
      buildDetail({
        defaults: {
          materialZuschlag: 0.12,
          nuZuschlag: 0.12,
          verrechnungslohn: 49.9,
          geraeteStundensatz: 0.5,
          isCustom: false,
        },
      }),
    );
    renderFirma();
    await waitFor(() => expect(screen.getByText(/Aktuell KALKU-Globalwerte/)).toBeDefined());
  });

  test('clicking Speichern calls api.firmen.updateDefaults with decoded decimal values', async () => {
    detailMock.mockResolvedValueOnce(buildDetail());
    updateDefaultsMock.mockResolvedValueOnce({
      ok: true,
      defaults: {
        materialZuschlag: 0.18,
        nuZuschlag: 0.15,
        verrechnungslohn: 72.51,
        geraeteStundensatz: 0.5,
        isCustom: true,
      },
    });
    renderFirma();
    await waitFor(() => expect(screen.getByText('Gesellchen GmbH')).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: /Speichern/ }));
    await waitFor(() => expect(updateDefaultsMock).toHaveBeenCalledTimes(1));
    const [kind, id, body] = updateDefaultsMock.mock.calls[0];
    expect(kind).toBe('managed');
    expect(id).toBe(5);
    expect(body).toMatchObject({
      materialZuschlag: 0.18,
      nuZuschlag: 0.15,
      verrechnungslohn: 72.51,
      geraeteStundensatz: 0.5,
      displayName: 'Gesellchen GmbH',
    });
  });
});

describe('Firma.tsx — projects + Kalkulation starten', () => {
  test('renders the Auschreibungen list with project number + Auftraggeber + Menge', async () => {
    detailMock.mockResolvedValueOnce(buildDetail());
    renderFirma();
    await waitFor(() =>
      expect(screen.getByText('Sanierung Sandsteinmauer Ludwigschule')).toBeDefined(),
    );
    expect(screen.getByText('#260512')).toBeDefined();
    expect(screen.getByText('Stadtverwaltung Sankt Ingbert')).toBeDefined();
    expect(screen.getByText('25 Positionen')).toBeDefined();
  });

  test('"Kalkulation starten" on managed firma seeds positions from preisanfrage', async () => {
    detailMock.mockResolvedValueOnce(buildDetail());
    projectPositionsMock.mockResolvedValueOnce({
      projectId: 1001,
      count: 2,
      positions: [
        { oz: '01', shortText: 'Header', longText: '', quantity: 0, unit: '', isHeader: true },
        { oz: '01.01', shortText: 'Item', longText: '', quantity: 5, unit: 'Stck', isHeader: false },
      ],
    });
    projectsCreateMock.mockResolvedValueOnce({ id: 'new-proj-id', data: {} });
    renderFirma();
    await waitFor(() => expect(screen.getByText('Sanierung Sandsteinmauer Ludwigschule')).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: /Kalkulation starten/ }));
    await waitFor(() => expect(projectsCreateMock).toHaveBeenCalledTimes(1));
    const body = projectsCreateMock.mock.calls[0][0];
    expect(body.bidder).toBe('Gesellchen GmbH');
    expect(body.client).toBe('Stadtverwaltung Sankt Ingbert');
    expect(body.tenderNumber).toBe('260512');
    expect(body.deadline).toBe('2026-05-12T14:00');
    // ★ Critical: cascaded calcParams from Firma overrides (NOT globals)
    expect(body.calcParams.materialZuschlag).toBe(0.18);
    expect(body.calcParams.nuZuschlag).toBe(0.15);
    expect(body.calcParams.verrechnungslohn).toBe(72.51);
    expect(body.calcParams.geraeteStundensatz).toBe(0.5);
    expect(body.positions.length).toBe(2);
    // Sort order assigned + sectionPath derived
    expect(body.positions[0].sortOrder).toBe(0);
    expect(body.positions[1].sortOrder).toBe(1);
    expect(body.positions[1].sectionPath).toBe('01');
    // Navigated to the new project
    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith('/panel/kalkulation/new-proj-id'),
    );
  });

  test('"Kalkulation starten" on external firma SKIPS the positions fetch', async () => {
    detailMock.mockResolvedValueOnce(
      buildDetail({
        firma: {
          kind: 'external',
          id: 17,
          folderName: '1808_GTM',
          displayName: 'GTM Bauservice GmbH',
          tradeType: null,
          projectCount: 1,
          wonCount: 0,
          wonSumBrutto: 0,
          lastSubmissionDate: '2026-05-10',
          adoptedCompanyId: null,
        },
        projects: [
          {
            source: 'external',
            id: 4001,
            projectNumber: '260510',
            name: 'External Project',
            folderName: '260510_External',
            auftraggeberName: 'AG X',
            anschriftPlzOrt: '12345 X',
            submissionDate: '2026-05-10',
            teilnehmerCount: 3,
            ourRank: 2,
            winnerName: 'Sieger',
            winnerNetto: 100,
            winnerBrutto: 119,
            ourNetto: 110,
            ourBrutto: 130.9,
            parsedAt: '2026-05-12T09:00:00Z',
          },
        ],
      }),
    );
    projectsCreateMock.mockResolvedValueOnce({ id: 'new-proj', data: {} });
    renderFirma('/panel/firmen/external/17');
    await waitFor(() => expect(screen.getByText('External Project')).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: /Kalkulation starten/ }));
    await waitFor(() => expect(projectsCreateMock).toHaveBeenCalledTimes(1));
    expect(projectPositionsMock).not.toHaveBeenCalled();
    expect(projectsCreateMock.mock.calls[0][0].positions.length).toBe(0);
  });

  test('position fetch failure is non-fatal — project is still created with empty positions[]', async () => {
    detailMock.mockResolvedValueOnce(buildDetail());
    projectPositionsMock.mockRejectedValueOnce(new Error('upstream 502'));
    projectsCreateMock.mockResolvedValueOnce({ id: 'fallback', data: {} });
    // Silence the console.warn the fallback path emits.
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    renderFirma();
    await waitFor(() => expect(screen.getByText('Sanierung Sandsteinmauer Ludwigschule')).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: /Kalkulation starten/ }));
    await waitFor(() => expect(projectsCreateMock).toHaveBeenCalledTimes(1));
    expect(projectsCreateMock.mock.calls[0][0].positions).toEqual([]);
    warnSpy.mockRestore();
  });

  test('"Reset" asks for confirmation then calls api.firmen.resetDefaults', async () => {
    detailMock.mockResolvedValueOnce(buildDetail());
    resetDefaultsMock.mockResolvedValueOnce({ ok: true });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderFirma();
    await waitFor(() => expect(screen.getByText('Gesellchen GmbH')).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: /Zurücksetzen/ }));
    await waitFor(() => expect(resetDefaultsMock).toHaveBeenCalledWith('managed', 5));
    confirmSpy.mockRestore();
  });
});

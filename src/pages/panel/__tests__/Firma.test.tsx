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
// toast.success/error/loading so the component's imports resolve cleanly.
// (loading was added for Round-10 optimistic save — returns a stable id
// string the success/error calls can target to mutate the same toast.)
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(() => 'toast-id-stub'),
    dismiss: vi.fn(),
  },
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
        createLocal: vi.fn(),
        updateLocal: vi.fn(),
        archiveLocal: vi.fn(),
        createAuschreibung: vi.fn(),
        updateAuschreibung: vi.fn(),
        archiveAuschreibung: vi.fn(),
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

/**
 * Round 10 — a11y attribute audit (form aria-label, label↔input htmlFor
 * association via useId(), section aria-label).
 */
describe('Firma.tsx — a11y attributes', () => {
  test('Defaults <form> carries aria-label="Kalkulations-Defaults"', async () => {
    detailMock.mockResolvedValueOnce(buildDetail());
    renderFirma();
    await waitFor(() => expect(screen.getByText('Gesellchen GmbH')).toBeDefined());
    const form = screen.getByRole('form', { name: 'Kalkulations-Defaults' });
    expect(form).toBeDefined();
  });

  test('every NumberField input has an id + an associated <label htmlFor>', async () => {
    detailMock.mockResolvedValueOnce(buildDetail());
    renderFirma();
    await waitFor(() => expect(screen.getByText('Gesellchen GmbH')).toBeDefined());
    const numberInputs = Array.from(
      document.querySelectorAll<HTMLInputElement>('input[type=number]'),
    );
    expect(numberInputs.length).toBe(4);
    for (const input of numberInputs) {
      // Every input must carry an id…
      expect(input.id).toBeTruthy();
      // …and a <label htmlFor=id> must exist for screen readers.
      const label = document.querySelector(`label[for="${input.id}"]`);
      expect(label).not.toBeNull();
    }
  });

  test('Ausschreibungen <section> carries aria-label="Ausschreibungen"', async () => {
    detailMock.mockResolvedValueOnce(buildDetail());
    renderFirma();
    await waitFor(() => expect(screen.getByText('Sanierung Sandsteinmauer Ludwigschule')).toBeDefined());
    // getByRole('region', { name: 'Ausschreibungen' }) requires aria-label
    // on the <section>, which is exactly what we added.
    const section = screen.getByRole('region', { name: 'Ausschreibungen' });
    expect(section).toBeDefined();
  });
});

/**
 * Round 10 — loading-skeleton tests.
 *
 * While `api.firmen.detail` is in-flight, the page now renders three
 * skeleton blocks (header / defaults / Ausschreibungen) inside an
 * aria-busy region instead of a single spinner. The original
 * German "Lade Firma…" announcement is preserved (sr-only).
 */
describe('Firma.tsx — loading skeleton', () => {
  test('renders skeleton blocks (incl. 3 project-row skeletons) while detail is in-flight', async () => {
    let resolve: (v: unknown) => void = () => {};
    detailMock.mockReturnValueOnce(new Promise((r) => (resolve = r as never)));
    renderFirma();
    const projectSkels = document.querySelectorAll('[data-testid=firma-skeleton-project]');
    expect(projectSkels.length).toBe(3);
    resolve(buildDetail());
  });

  test('loading region carries aria-busy="true" + aria-live="polite"', async () => {
    let resolve: (v: unknown) => void = () => {};
    detailMock.mockReturnValueOnce(new Promise((r) => (resolve = r as never)));
    renderFirma();
    const region = document.querySelector('[data-testid=firma-loading]') as HTMLElement;
    expect(region).not.toBeNull();
    expect(region.getAttribute('aria-busy')).toBe('true');
    expect(region.getAttribute('aria-live')).toBe('polite');
    resolve(buildDetail());
  });

  test('after data resolves, skeleton is gone + real header appears', async () => {
    detailMock.mockResolvedValueOnce(buildDetail());
    renderFirma();
    await waitFor(() => expect(screen.getByText('Gesellchen GmbH')).toBeDefined());
    expect(document.querySelector('[data-testid=firma-loading]')).toBeNull();
    expect(document.querySelectorAll('[data-testid=firma-skeleton-project]').length).toBe(0);
  });
});

/**
 * Round 10 — optimistic-save tests for the DefaultsCard form.
 *
 * The save flow now:
 *   1) snapshots the form's previous values
 *   2) applies the new values to local + parent state IMMEDIATELY
 *   3) shows a toast.loading('Wird gespeichert…')
 *   4) on success → toast.success('Gespeichert.', { id })
 *   5) on failure → rolls back local + parent state + toast.error
 */
describe('Firma.tsx — optimistic defaults save', () => {
  test('the form values update IMMEDIATELY — before api.firmen.updateDefaults resolves', async () => {
    detailMock.mockResolvedValueOnce(buildDetail());
    // A never-resolving promise: if the form is NOT optimistic, the inputs
    // would stay at their initial values until forever. With optimistic UI,
    // the parent's `onSaved` is called synchronously inside `submit()` so
    // the rendered values reflect the user's edit immediately.
    updateDefaultsMock.mockReturnValueOnce(new Promise(() => {}));

    renderFirma();
    await waitFor(() => expect(screen.getByText('Gesellchen GmbH')).toBeDefined());

    // Modify all four inputs to obviously-new values.
    const inputs = Array.from(
      document.querySelectorAll<HTMLInputElement>('input[type=number]'),
    );
    fireEvent.change(inputs[0], { target: { value: '25' } });   // 0.25
    fireEvent.change(inputs[1], { target: { value: '20' } });   // 0.20
    fireEvent.change(inputs[2], { target: { value: '99.99' } });
    fireEvent.change(inputs[3], { target: { value: '1.23' } });
    fireEvent.click(screen.getByRole('button', { name: /Speichern/ }));

    // The api call fired ONCE with the new body…
    await waitFor(() => expect(updateDefaultsMock).toHaveBeenCalledTimes(1));
    const [, , body] = updateDefaultsMock.mock.calls[0];
    expect(body).toMatchObject({
      materialZuschlag: 0.25,
      nuZuschlag: 0.2,
      verrechnungslohn: 99.99,
      geraeteStundensatz: 1.23,
    });
    // …and the inputs reflect the new values IMMEDIATELY (parent re-rendered
    // via the optimistic onSaved call, before the api ever resolved).
    const after = Array.from(
      document.querySelectorAll<HTMLInputElement>('input[type=number]'),
    );
    expect(after[0].value).toBe('25');
    expect(after[1].value).toBe('20');
    expect(after[2].value).toBe('99.99');
    expect(after[3].value).toBe('1.23');
  });

  test('on api failure, form state ROLLS BACK to pre-save values + toast.error fires', async () => {
    detailMock.mockResolvedValueOnce(buildDetail());
    updateDefaultsMock.mockRejectedValueOnce(new Error('upstream 500'));

    const toast = (await import('react-hot-toast')).default as unknown as {
      error: ReturnType<typeof vi.fn>;
    };

    renderFirma();
    await waitFor(() => expect(screen.getByText('Gesellchen GmbH')).toBeDefined());

    // Pre-save values from the buildDetail fixture (matZ=18, nuZ=15, vl=72.51, gs=0.5).
    const inputs = Array.from(
      document.querySelectorAll<HTMLInputElement>('input[type=number]'),
    );
    fireEvent.change(inputs[0], { target: { value: '99' } });   // optimistic 99
    fireEvent.click(screen.getByRole('button', { name: /Speichern/ }));

    // After the rejection settles, the form snaps BACK to '18'.
    await waitFor(() => {
      const after = Array.from(
        document.querySelectorAll<HTMLInputElement>('input[type=number]'),
      );
      expect(after[0].value).toBe('18');
    });
    expect(toast.error).toHaveBeenCalled();
    // Toast message includes the German prefix.
    expect(
      toast.error.mock.calls.some(
        (args) => typeof args[0] === 'string' && args[0].startsWith('Speichern fehlgeschlagen'),
      ),
    ).toBe(true);
  });

  test('on success: toast.loading then toast.success are both invoked', async () => {
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

    const toast = (await import('react-hot-toast')).default as unknown as {
      loading: ReturnType<typeof vi.fn>;
      success: ReturnType<typeof vi.fn>;
      error: ReturnType<typeof vi.fn>;
    };

    renderFirma();
    await waitFor(() => expect(screen.getByText('Gesellchen GmbH')).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: /Speichern/ }));

    await waitFor(() => expect(updateDefaultsMock).toHaveBeenCalledTimes(1));
    // toast.loading was called with the German "saving" message…
    expect(toast.loading).toHaveBeenCalledWith('Wird gespeichert…');
    // …and toast.success with the German "saved" copy + the loading id so
    // it replaces the loading toast in place.
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    const successArgs = toast.success.mock.calls[0];
    expect(successArgs[0]).toBe('Gespeichert.');
    expect(successArgs[1]).toEqual({ id: 'toast-id-stub' });
    expect(toast.error).not.toHaveBeenCalled();
  });
});

/**
 * Round 11 — local Ausschreibungen UI (create / status-edit / delete).
 *
 * Builds a managed-firma detail that ALSO carries a local Ausschreibung in
 * its projects[], so we can exercise both:
 *   - the "Neue Ausschreibung" modal call shape (kind+firmaId from URL)
 *   - the status badge + quick-edit dropdown for local rows
 *   - the trash button (with confirm) for local rows
 *   - the preisanfrage-sourced rows correctly omitting trash/edit
 */
describe('Firma.tsx — Round 11 local Ausschreibungen', () => {
  function buildDetailWithLocal() {
    return buildDetail({
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
        {
          // Local row attached to managed/5
          source: 'local' as const,
          id: 'local-aus-id-1',
          projectNumber: 'PRIV-001',
          name: 'Privat-Sanierung Müller',
          auftraggeberName: 'Familie Müller',
          anschriftPlzOrt: '66111 Saarbrücken',
          submissionDate: '2026-06-01',
          submissionTime: '10:00',
          status: 'in_arbeit',
          firmaKind: 'managed' as const,
          firmaId: '5',
          notes: null,
        },
      ],
    });
  }

  test('"Neue Ausschreibung" button is visible in the Ausschreibungen card', async () => {
    detailMock.mockResolvedValueOnce(buildDetail());
    renderFirma();
    await waitFor(() => expect(screen.getByText('Sanierung Sandsteinmauer Ludwigschule')).toBeDefined());
    expect(screen.getByTestId('auschreibung-new-button')).toBeDefined();
  });

  test('clicking "Neue Ausschreibung" opens the modal with all fields', async () => {
    detailMock.mockResolvedValueOnce(buildDetail());
    renderFirma();
    await waitFor(() => expect(screen.getByText('Sanierung Sandsteinmauer Ludwigschule')).toBeDefined());
    fireEvent.click(screen.getByTestId('auschreibung-new-button'));
    await waitFor(() => expect(screen.getByTestId('new-auschreibung-modal')).toBeDefined());
    // Spot-check the field set.
    expect(document.getElementById('new-aus-name')).not.toBeNull();
    expect(document.getElementById('new-aus-num')).not.toBeNull();
    expect(document.getElementById('new-aus-ag')).not.toBeNull();
    expect(document.getElementById('new-aus-addr')).not.toBeNull();
    expect(document.getElementById('new-aus-date')).not.toBeNull();
    expect(document.getElementById('new-aus-time')).not.toBeNull();
    expect(document.getElementById('new-aus-status')).not.toBeNull();
    expect(document.getElementById('new-aus-notes')).not.toBeNull();
  });

  test('submit calls api.firmen.createAuschreibung with the kind+firmaId from URL params', async () => {
    const createAusMock = vi.fn().mockResolvedValue({
      source: 'local' as const,
      id: 'new-aus-x',
      firmaKind: 'managed' as const,
      firmaId: '5',
      name: 'Mein Test',
      projectNumber: null,
      auftraggeberName: null,
      anschriftPlzOrt: null,
      submissionDate: null,
      submissionTime: null,
      status: 'offen' as const,
      notes: null,
      archivedAt: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    (api.firmen as unknown as { createAuschreibung: typeof createAusMock }).createAuschreibung = createAusMock;

    detailMock.mockResolvedValueOnce(buildDetail()).mockResolvedValue(buildDetail());
    renderFirma('/panel/firmen/managed/5');
    await waitFor(() => expect(screen.getByText('Sanierung Sandsteinmauer Ludwigschule')).toBeDefined());
    fireEvent.click(screen.getByTestId('auschreibung-new-button'));
    fireEvent.change(document.getElementById('new-aus-name') as HTMLInputElement, {
      target: { value: 'Mein Test' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Anlegen/ }));

    await waitFor(() => expect(createAusMock).toHaveBeenCalledTimes(1));
    const [kind, firmaId, body] = createAusMock.mock.calls[0];
    expect(kind).toBe('managed');
    // URL was managed/5 → firmaId stays numeric here because Firma.tsx
    // resolves it through Number(idRaw) for preisanfrage kinds.
    expect(firmaId).toBe(5);
    expect(body.name).toBe('Mein Test');
    expect(body.status).toBe('offen');
  });

  test('local Ausschreibungen render with "Lokal" source badge', async () => {
    detailMock.mockResolvedValueOnce(buildDetailWithLocal());
    renderFirma();
    await waitFor(() => expect(screen.getByText('Privat-Sanierung Müller')).toBeDefined());
    expect(screen.getByTestId('auschreibung-local-source-badge').textContent).toBe('Lokal');
  });

  test('status badge renders the right label per status', async () => {
    detailMock.mockResolvedValueOnce(buildDetailWithLocal());
    renderFirma();
    await waitFor(() => expect(screen.getByText('Privat-Sanierung Müller')).toBeDefined());
    const badge = screen.getByTestId('auschreibung-status-badge');
    expect(badge.textContent).toBe('In Arbeit');
  });

  test('clicking the status badge swaps to a dropdown', async () => {
    detailMock.mockResolvedValueOnce(buildDetailWithLocal());
    renderFirma();
    await waitFor(() => expect(screen.getByText('Privat-Sanierung Müller')).toBeDefined());
    fireEvent.click(screen.getByTestId('auschreibung-status-badge'));
    await waitFor(() => expect(screen.getByTestId('auschreibung-status-select')).toBeDefined());
    const select = screen.getByTestId('auschreibung-status-select') as HTMLSelectElement;
    // 5 options: offen / in_arbeit / abgegeben / gewonnen / verloren
    expect(select.querySelectorAll('option').length).toBe(5);
  });

  test('changing status via dropdown calls api.firmen.updateAuschreibung', async () => {
    const updateAusMock = vi.fn().mockResolvedValue({
      source: 'local' as const,
      id: 'local-aus-id-1',
      firmaKind: 'managed' as const,
      firmaId: '5',
      name: 'Privat-Sanierung Müller',
      projectNumber: 'PRIV-001',
      auftraggeberName: 'Familie Müller',
      anschriftPlzOrt: '66111 Saarbrücken',
      submissionDate: '2026-06-01',
      submissionTime: '10:00',
      status: 'gewonnen' as const,
      notes: null,
      archivedAt: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    (api.firmen as unknown as { updateAuschreibung: typeof updateAusMock }).updateAuschreibung = updateAusMock;

    detailMock.mockResolvedValue(buildDetailWithLocal());
    renderFirma();
    await waitFor(() => expect(screen.getByText('Privat-Sanierung Müller')).toBeDefined());
    fireEvent.click(screen.getByTestId('auschreibung-status-badge'));
    const select = screen.getByTestId('auschreibung-status-select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'gewonnen' } });
    await waitFor(() => expect(updateAusMock).toHaveBeenCalledWith('local-aus-id-1', { status: 'gewonnen' }));
  });

  test('local Ausschreibungen show a trash button', async () => {
    detailMock.mockResolvedValueOnce(buildDetailWithLocal());
    renderFirma();
    await waitFor(() => expect(screen.getByText('Privat-Sanierung Müller')).toBeDefined());
    expect(screen.getByTestId('auschreibung-delete-button')).toBeDefined();
  });

  test('trash button → confirm → calls api.firmen.archiveAuschreibung', async () => {
    const archiveAusMock = vi.fn().mockResolvedValue({ ok: true });
    (api.firmen as unknown as { archiveAuschreibung: typeof archiveAusMock }).archiveAuschreibung = archiveAusMock;
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    detailMock.mockResolvedValue(buildDetailWithLocal());
    renderFirma();
    await waitFor(() => expect(screen.getByText('Privat-Sanierung Müller')).toBeDefined());
    fireEvent.click(screen.getByTestId('auschreibung-delete-button'));
    await waitFor(() => expect(archiveAusMock).toHaveBeenCalledWith('local-aus-id-1'));
    confirmSpy.mockRestore();
  });

  test('preisanfrage-sourced Ausschreibungen do NOT show a trash button', async () => {
    detailMock.mockResolvedValueOnce(buildDetail()); // only the managed row
    renderFirma();
    await waitFor(() => expect(screen.getByText('Sanierung Sandsteinmauer Ludwigschule')).toBeDefined());
    expect(document.querySelectorAll('[data-testid=auschreibung-delete-button]').length).toBe(0);
  });

  test('local firma (URL=/panel/firmen/local/abc): renders header + Ausschreibungen, no Defaults card', async () => {
    detailMock.mockResolvedValueOnce({
      firma: {
        kind: 'local' as const,
        id: 'abc123-localid1',
        folderName: null,
        displayName: 'Privatkunde Müller',
        tradeType: 'putz',
        projectCount: 0,
        wonCount: 0,
        wonSumBrutto: 0,
        lastSubmissionDate: null,
        adoptedCompanyId: null,
        notes: 'wichtig',
      },
      defaults: {
        materialZuschlag: 0.12,
        nuZuschlag: 0.12,
        verrechnungslohn: 49.9,
        geraeteStundensatz: 0.5,
        isCustom: false,
      },
      projects: [],
    });
    renderFirma('/panel/firmen/local/abc123-localid1');
    await waitFor(() => expect(screen.getByText('Privatkunde Müller')).toBeDefined());
    // "Lokal (Panel)" badge in the header
    expect(screen.getByText('Lokal (Panel)')).toBeDefined();
    // No "Kalkulations-Defaults" form (skipped for local kind).
    expect(screen.queryByRole('form', { name: 'Kalkulations-Defaults' })).toBeNull();
    // Empty Ausschreibungen list.
    expect(screen.getByText(/Noch keine Ausschreibungen/)).toBeDefined();
    // "Neue Ausschreibung" button still visible.
    expect(screen.getByTestId('auschreibung-new-button')).toBeDefined();
  });
});

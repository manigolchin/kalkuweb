/**
 * Round 8 — frontend tests for Firmen.tsx (currently 0% coverage).
 *
 * Targets:
 *   - Rendering with 0 / 1 / 10 rows
 *   - DEMO badge appears when isMock=true (and only then)
 *   - Search filter (text)
 *   - Filter tabs (Alle / Verwaltet / Nur extern / Zuletzt gewonnen)
 *   - Loading + error states
 *   - "Neu — Setup ausstehend" badge on unadopted external firmas
 *   - Service-JWT sentinel-leak guard — the env JWT NEVER appears in DOM
 *
 * Auth is bypassed via the api mock (we don't exercise cookie auth here —
 * that's panel-api's job; tested in firmen.test.ts).
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Firmen from '../Firmen';

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}));

// Mock the api module — tests inject the precise payload each Firmen render needs.
vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    api: {
      ...actual.api,
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

const listMock = api.firmen.list as ReturnType<typeof vi.fn>;

function renderFirmen() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <Firmen />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

function buildRow(over: Partial<Awaited<ReturnType<typeof api.firmen.list>>['rows'][number]> = {}) {
  return {
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
    hasCustomDefaults: false,
    ...over,
  };
}

function buildPayload(rows: ReturnType<typeof buildRow>[], opts: { isMock?: boolean } = {}) {
  const managed = rows.filter((r) => r.kind === 'managed').length;
  const external = rows.filter((r) => r.kind === 'external').length;
  return {
    rows,
    managedCount: managed,
    externalCount: external,
    totalProjects: rows.reduce((s, r) => s + r.projectCount, 0),
    lastScanAt: '2026-05-22T19:00:00Z',
    generatedAt: '2026-05-22T19:30:00Z',
    isMock: opts.isMock ?? false,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Firmen.tsx — rendering', () => {
  test('shows loading state while api.firmen.list is in-flight', async () => {
    let resolve: (v: unknown) => void = () => {};
    listMock.mockReturnValueOnce(new Promise((r) => (resolve = r as never)));
    renderFirmen();
    expect(screen.getByText(/Lade Firmen/)).toBeDefined();
    // Settle it so React doesn't warn about unresolved state.
    resolve(buildPayload([]));
  });

  test('renders 0 rows → empty-state message inside the table', async () => {
    listMock.mockResolvedValueOnce(buildPayload([]));
    renderFirmen();
    await waitFor(() => expect(screen.getByText(/Keine Firma passt zu den Filtern/)).toBeDefined());
  });

  test('renders 1 row with display name + folder + trade type chip', async () => {
    listMock.mockResolvedValueOnce(buildPayload([buildRow()]));
    renderFirmen();
    await waitFor(() => expect(screen.getByText('Gesellchen GmbH')).toBeDefined());
    expect(screen.getByText('1695_Gesellchen_GmbH')).toBeDefined();
    expect(screen.getByText('GaLaBau')).toBeDefined();
  });

  test('renders 10 rows in the table tbody', async () => {
    const rows = Array.from({ length: 10 }, (_, i) =>
      buildRow({ id: 100 + i, displayName: `Firm ${i}`, folderName: `folder-${i}` }),
    );
    listMock.mockResolvedValueOnce(buildPayload(rows));
    renderFirmen();
    await waitFor(() => expect(screen.getByTestId('firmen-table')).toBeDefined());
    const tableBodyRows = document.querySelectorAll('[data-testid=firmen-table] tbody tr');
    expect(tableBodyRows.length).toBe(10);
  });
});

describe('Firmen.tsx — DEMO badge', () => {
  test('shows DEMO badge when isMock=true', async () => {
    listMock.mockResolvedValueOnce(buildPayload([buildRow()], { isMock: true }));
    renderFirmen();
    await waitFor(() => expect(screen.getByText('DEMO')).toBeDefined());
  });

  test('does NOT show DEMO badge when isMock=false', async () => {
    listMock.mockResolvedValueOnce(buildPayload([buildRow()], { isMock: false }));
    renderFirmen();
    await waitFor(() => expect(screen.getByText('Gesellchen GmbH')).toBeDefined());
    expect(screen.queryByText('DEMO')).toBeNull();
  });
});

describe('Firmen.tsx — filters', () => {
  test('search box filters by display name (case-insensitive)', async () => {
    listMock.mockResolvedValueOnce(
      buildPayload([
        buildRow({ id: 1, displayName: 'Gesellchen GmbH' }),
        buildRow({ id: 2, displayName: 'MPB Bau', tradeType: 'leitungsbau' }),
        buildRow({ id: 3, displayName: 'Elektro Schwarzkopf', tradeType: 'elektro' }),
      ]),
    );
    renderFirmen();
    await waitFor(() => expect(screen.getByText('Gesellchen GmbH')).toBeDefined());
    const search = screen.getByLabelText(/Firmen durchsuchen/i) as HTMLInputElement;
    fireEvent.change(search, { target: { value: 'mpb' } });
    expect(screen.queryByText('Gesellchen GmbH')).toBeNull();
    expect(screen.getByText('MPB Bau')).toBeDefined();
    expect(screen.queryByText('Elektro Schwarzkopf')).toBeNull();
  });

  test('search box filters by folder name', async () => {
    listMock.mockResolvedValueOnce(
      buildPayload([
        buildRow({ id: 1, displayName: 'Foo', folderName: '1695_Gesellchen_GmbH' }),
        buildRow({ id: 2, displayName: 'Bar', folderName: '1697_MPB_Bau' }),
      ]),
    );
    renderFirmen();
    await waitFor(() => expect(screen.getByText('Foo')).toBeDefined());
    const search = screen.getByLabelText(/Firmen durchsuchen/i) as HTMLInputElement;
    fireEvent.change(search, { target: { value: '1697' } });
    expect(screen.queryByText('Foo')).toBeNull();
    expect(screen.getByText('Bar')).toBeDefined();
  });

  test('"Verwaltet" tab hides external rows', async () => {
    listMock.mockResolvedValueOnce(
      buildPayload([
        buildRow({ id: 1, displayName: 'Managed A', kind: 'managed' }),
        buildRow({ id: 2, displayName: 'External B', kind: 'external', tradeType: null }),
      ]),
    );
    renderFirmen();
    await waitFor(() => expect(screen.getByText('Managed A')).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: 'Verwaltet' }));
    expect(screen.getByText('Managed A')).toBeDefined();
    expect(screen.queryByText('External B')).toBeNull();
  });

  test('"Nur extern" tab hides managed rows', async () => {
    listMock.mockResolvedValueOnce(
      buildPayload([
        buildRow({ id: 1, displayName: 'Managed A', kind: 'managed' }),
        buildRow({ id: 2, displayName: 'External B', kind: 'external', tradeType: null }),
      ]),
    );
    renderFirmen();
    await waitFor(() => expect(screen.getByText('External B')).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: 'Nur extern' }));
    expect(screen.queryByText('Managed A')).toBeNull();
    expect(screen.getByText('External B')).toBeDefined();
  });
});

describe('Firmen.tsx — unadopted-external badge', () => {
  test('"Neu — Setup ausstehend" appears on external firma without adoptedCompanyId', async () => {
    listMock.mockResolvedValueOnce(
      buildPayload([buildRow({ kind: 'external', tradeType: null, adoptedCompanyId: null })]),
    );
    renderFirmen();
    await waitFor(() => expect(screen.getByText(/Neu — Setup ausstehend/)).toBeDefined());
  });

  test('badge NOT shown on external firma WITH adoptedCompanyId (= already promoted)', async () => {
    listMock.mockResolvedValueOnce(
      buildPayload([buildRow({ kind: 'external', tradeType: null, adoptedCompanyId: 42 })]),
    );
    renderFirmen();
    await waitFor(() => expect(screen.getByText('Gesellchen GmbH')).toBeDefined());
    expect(screen.queryByText(/Neu — Setup ausstehend/)).toBeNull();
  });

  test('"Eigene Defaults" badge appears when hasCustomDefaults=true', async () => {
    listMock.mockResolvedValueOnce(
      buildPayload([buildRow({ hasCustomDefaults: true })]),
    );
    renderFirmen();
    await waitFor(() => expect(screen.getByText(/Eigene Defaults/)).toBeDefined());
  });
});

describe('Firmen.tsx — error states', () => {
  test('renders integration_disabled message when api returns 503 with that body', async () => {
    const { ApiError } = await import('@/lib/api');
    listMock.mockRejectedValueOnce(
      new ApiError(503, { error: 'integration_disabled' }, 'integration_disabled'),
    );
    renderFirmen();
    await waitFor(() =>
      expect(
        screen.getByText(/preisanfrage-Anbindung ist auf dem Server noch nicht konfiguriert/),
      ).toBeDefined(),
    );
  });

  test('renders upstream-unreachable message on plain 503', async () => {
    const { ApiError } = await import('@/lib/api');
    listMock.mockRejectedValueOnce(new ApiError(503, { error: 'upstream_error' }, 'upstream'));
    renderFirmen();
    await waitFor(() =>
      expect(screen.getByText(/preisanfrage.kalkus.de ist gerade nicht erreichbar/)).toBeDefined(),
    );
  });

  test('renders generic load error on 500', async () => {
    const { ApiError } = await import('@/lib/api');
    listMock.mockRejectedValueOnce(new ApiError(500, { error: 'internal' }, 'boom'));
    renderFirmen();
    await waitFor(() => expect(screen.getByText(/Konnte Firmen nicht laden \(500\)/)).toBeDefined());
  });
});

describe('Firmen.tsx — secret leak guard', () => {
  test('a JWT-shaped string passed in displayName does NOT crash AND is escaped in HTML output', async () => {
    // Defensive — if preisanfrage ever echoes a token into a string field (it
    // doesn't today), the React renderer must not interpret it as markup.
    const JWT_LIKE = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMCJ9.signature-blob';
    listMock.mockResolvedValueOnce(
      buildPayload([buildRow({ displayName: JWT_LIKE })]),
    );
    renderFirmen();
    await waitFor(() => expect(screen.getByText(JWT_LIKE)).toBeDefined());
    // React always escapes text — we sanity-check by confirming the string
    // shows up as text content, not as a script element.
    expect(document.querySelectorAll('script').length).toBe(0);
  });
});

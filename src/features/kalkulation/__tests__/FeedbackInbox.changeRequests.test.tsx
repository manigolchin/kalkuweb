/**
 * Round 12 — FeedbackInbox rendering of structured change requests.
 * Verifies the Ist → Wunsch diff card, the global vs. position distinction,
 * the "Wünsche" list chip, and the resolve (erledigt) workflow.
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import FeedbackInbox from '../FeedbackInbox';
import type { InboxEntry, InboxChangeRequest } from '../types';

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}));

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    api: { ...actual.api, inbox: { list: vi.fn(), resolveChangeRequest: vi.fn() } },
  };
});

import { api } from '@/lib/api';
const listMock = api.inbox.list as ReturnType<typeof vi.fn>;
const resolveMock = api.inbox.resolveChangeRequest as ReturnType<typeof vi.fn>;

function buildCr(over: Partial<InboxChangeRequest> = {}): InboxChangeRequest {
  return {
    id: 'cr1',
    scope: 'position',
    positionOz: '1.4.1.1',
    shortText: 'RZA01 Leuchte',
    field: 'material',
    unit: 'eur',
    currentValue: 1071.54,
    requestedValue: 950,
    direction: 'lower',
    note: 'Material zu teuer',
    authorName: 'Herr Schmidt',
    createdAt: '2026-05-20T13:00:00Z',
    resolvedAt: null,
    ...over,
  };
}

function buildEntry(changeRequests: InboxChangeRequest[]): InboxEntry {
  return {
    project: {
      id: 'p1', name: 'Sanierung', client: 'Stadt', bidder: 'Bau GmbH',
      service: 'elektro', versionNumber: 1, updatedAt: '2026-05-20T00:00:00Z',
    },
    share: {
      id: 's1', token: 'token-abcdef123456', visiblePositionIds: [],
      settings: { brandHeader: 'minimal', allowApproval: true, allowChangeRequests: true, showTotals: true, showMwst: true },
      createdAt: '2026-05-19T00:00:00Z', lastViewedAt: '2026-05-20T10:00:00Z', viewCount: 1, snapshotHash: 'h1',
    },
    responses: [],
    comments: [],
    changeRequests,
  };
}

function listPayload(entries: InboxEntry[]) {
  return { entries, generatedAt: '2026-05-21T00:00:00Z', viewerLastSeenAt: '2026-01-01T00:00:00Z' };
}

function renderInbox() {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={['/panel/feedback']}>
        <FeedbackInbox />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

async function openThread() {
  renderInbox();
  await waitFor(() => expect(document.querySelector('button[aria-current]')).toBeTruthy());
  fireEvent.click(document.querySelector('button[aria-current]')!);
}

beforeEach(() => vi.clearAllMocks());

describe('FeedbackInbox — Änderungswünsche', () => {
  test('renders a position change request as Ist → Wunsch diff with note', async () => {
    listMock.mockResolvedValueOnce(listPayload([buildEntry([buildCr()])]));
    await openThread();
    const card = await screen.findByTestId('change-request-card');
    expect(within(card).getByText('Materialkosten')).toBeDefined();
    expect(card.textContent).toContain('1.071,54'); // Ist
    expect(card.textContent).toContain('950,00'); // Wunsch
    expect(within(card).getByText('Material zu teuer')).toBeDefined();
    expect(card.textContent).toContain('1.4.1.1'); // WHERE (position OZ)
    expect(within(card).getByText('Herr Schmidt')).toBeDefined();
  });

  test('global change request shows Gesamtangebot instead of a position', async () => {
    listMock.mockResolvedValueOnce(
      listPayload([
        buildEntry([
          buildCr({ id: 'g1', scope: 'global', positionOz: null, shortText: null, field: 'endbetrag', currentValue: 800, requestedValue: 750 }),
        ]),
      ]),
    );
    await openThread();
    const card = await screen.findByTestId('change-request-card');
    expect(within(card).getByText('Gesamtangebot')).toBeDefined();
    expect(within(card).getByText('Endbetrag')).toBeDefined();
    expect(card.textContent).toContain('750,00');
  });

  test('direction-only wish (no value) shows the direction word', async () => {
    listMock.mockResolvedValueOnce(
      listPayload([buildEntry([buildCr({ requestedValue: null, direction: 'lower', currentValue: null, note: 'bitte günstiger' })])]),
    );
    await openThread();
    const card = await screen.findByTestId('change-request-card');
    expect(within(card).getByText('günstiger')).toBeDefined();
  });

  test('resolve calls api + optimistically flips to "Wieder öffnen"', async () => {
    resolveMock.mockResolvedValue({ ok: true, id: 'cr1', resolvedAt: '2026-05-21T00:00:00Z' });
    listMock.mockResolvedValueOnce(listPayload([buildEntry([buildCr()])]));
    await openThread();
    const btn = await screen.findByTestId('cr-resolve');
    fireEvent.click(btn);
    expect(resolveMock).toHaveBeenCalledWith('cr1', true);
    await waitFor(() => expect(screen.getByText('Wieder öffnen')).toBeDefined());
  });

  test('master list shows the Wünsche chip with the count', async () => {
    listMock.mockResolvedValueOnce(listPayload([buildEntry([buildCr(), buildCr({ id: 'cr2' })])]));
    renderInbox();
    await waitFor(() => expect(screen.getByText(/Wünsche/).textContent).toContain('2'));
  });
});

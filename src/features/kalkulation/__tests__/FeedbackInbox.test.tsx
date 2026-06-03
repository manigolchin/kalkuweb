/**
 * Frontend tests for FeedbackInbox.tsx — the master-detail customer-feedback
 * inbox (api.inbox.list → { entries, generatedAt, viewerLastSeenAt }).
 *
 * Mocking pattern mirrors PanelHome.test.tsx + Firmen.test.tsx:
 *   - '@/lib/api' mocked, api.inbox.list = vi.fn(), injected per test
 *   - 'react-hot-toast' mocked
 *   - REAL react-router-dom MemoryRouter so useSearchParams() works for the
 *     ?oz= deep-link test; wrapped in <HelmetProvider>.
 *
 * happy-dom note: clicking a thread sets selectedId; both master + detail
 * panes render in the DOM (the `hidden lg:flex` toggles are CSS-only, not
 * removed from the tree), so detail content is queryable after the click.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import FeedbackInbox from '../FeedbackInbox';
import type { InboxEntry, InboxComment, ShareResponse } from '../types';

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
      inbox: {
        list: vi.fn(),
      },
    },
  };
});

import { api } from '@/lib/api';

const inboxListMock = api.inbox.list as ReturnType<typeof vi.fn>;

/* ── Fixture builders ─────────────────────────────────────────────── */

type RespOver = Partial<Omit<ShareResponse, 'payload'>> & {
  payload?: Partial<ShareResponse['payload']>;
};

function buildResponse(over: RespOver = {}): ShareResponse {
  const { payload, ...rest } = over;
  return {
    id: 'r1',
    shareId: 's1',
    responseType: 'changes',
    customerName: 'Herr Schmidt',
    customerEmail: 'schmidt@firma.de',
    ip: null,
    userAgent: null,
    payload: {
      message: undefined,
      changes: [],
      ...payload,
    },
    respondedAt: '2026-05-20T12:00:00Z',
    ...rest,
  };
}

function buildChange(
  over: Partial<NonNullable<ShareResponse['payload']['changes']>[number]> = {},
): NonNullable<ShareResponse['payload']['changes']>[number] {
  return {
    positionId: 'pos-1',
    type: 'modify',
    text: 'Bitte Menge auf 20 erhöhen.',
    oz: '1.1',
    shortText: 'Pflasterarbeiten',
    ...over,
  };
}

function buildComment(over: Partial<InboxComment> = {}): InboxComment {
  return {
    id: 'c1',
    positionOz: '2.2',
    shortText: 'Randsteine setzen',
    intent: 'other',
    text: 'Können wir hier Granit statt Beton nehmen?',
    authorName: 'Frau Müller',
    createdAt: '2026-05-20T13:00:00Z',
    resolvedAt: null,
    ...over,
  };
}

function buildEntry(over: Partial<InboxEntry> = {}): InboxEntry {
  const base: InboxEntry = {
    project: {
      id: 'p1',
      name: 'Sanierung Marktplatz',
      client: 'Stadt Saarbrücken',
      bidder: 'Gesellchen GmbH',
      service: 'galabau',
      versionNumber: 1,
      updatedAt: '2026-05-20T00:00:00Z',
    },
    share: {
      id: 's1',
      token: 'token-abcdef123456',
      visiblePositionIds: [],
      settings: {
        brandHeader: 'minimal',
        allowApproval: true,
        allowChangeRequests: true,
        showTotals: true,
        showMwst: true,
      },
      createdAt: '2026-05-19T00:00:00Z',
      lastViewedAt: '2026-05-20T10:00:00Z',
      viewCount: 3,
      snapshotHash: 'h1',
    },
    responses: [],
    comments: [],
  };
  return {
    ...base,
    ...over,
    project: over.project === null ? null : { ...base.project!, ...(over.project ?? {}) },
    share: { ...base.share, ...(over.share ?? {}) },
  };
}

/** api.inbox.list payload. viewerLastSeenAt defaults to a moment BEFORE any
 *  activity in the fixtures so "neu" markers fire unless overridden. */
function listPayload(
  entries: InboxEntry[],
  viewerLastSeenAt: string | null = '2026-01-01T00:00:00Z',
) {
  return { entries, generatedAt: '2026-05-21T00:00:00Z', viewerLastSeenAt };
}

function renderInbox(initialEntries: string[] = ['/panel/feedback']) {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={initialEntries}>
        <FeedbackInbox />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

/* ── Master list rendering ────────────────────────────────────────── */

describe('FeedbackInbox — master list', () => {
  test('renders a company group header per Firma (company = project.bidder)', async () => {
    inboxListMock.mockResolvedValueOnce(
      listPayload([
        buildEntry({ share: { id: 's1' } as InboxEntry['share'], project: { bidder: 'Alpha Bau GmbH' } as InboxEntry['project'] }),
        buildEntry({ share: { id: 's2' } as InboxEntry['share'], project: { bidder: 'Beta Tief GmbH' } as InboxEntry['project'] }),
      ]),
    );
    renderInbox();
    await waitFor(() => expect(screen.getByText('Alpha Bau GmbH')).toBeDefined());
    expect(screen.getByText('Beta Tief GmbH')).toBeDefined();
    // One master button per entry (aria-current present on thread buttons).
    const threadButtons = document.querySelectorAll('button[aria-current]');
    expect(threadButtons.length).toBe(2);
  });

  test('falls back to project.client when bidder is empty, then "Unbekannte Firma"', async () => {
    inboxListMock.mockResolvedValueOnce(
      listPayload([
        buildEntry({
          share: { id: 's1' } as InboxEntry['share'],
          project: { bidder: '', client: 'Stadt Homburg' } as InboxEntry['project'],
        }),
        buildEntry({
          share: { id: 's2' } as InboxEntry['share'],
          project: { bidder: '   ', client: '' } as InboxEntry['project'],
        }),
      ]),
    );
    renderInbox();
    await waitFor(() => expect(screen.getByText('Stadt Homburg')).toBeDefined());
    expect(screen.getByText('Unbekannte Firma')).toBeDefined();
  });

  test('entries whose project is null are filtered out before rendering', async () => {
    inboxListMock.mockResolvedValueOnce(
      listPayload([
        buildEntry({ share: { id: 's1' } as InboxEntry['share'], project: { bidder: 'Visible GmbH' } as InboxEntry['project'] }),
        buildEntry({ share: { id: 's2' } as InboxEntry['share'], project: null }),
      ]),
    );
    renderInbox();
    await waitFor(() => expect(screen.getByText('Visible GmbH')).toBeDefined());
    expect(document.querySelectorAll('button[aria-current]').length).toBe(1);
  });
});

/* ── Company grouping + Firma resolution ──────────────────────────── */

describe('FeedbackInbox — company grouping', () => {
  test('threads with the same bidder collapse under one company header', async () => {
    inboxListMock.mockResolvedValueOnce(
      listPayload([
        buildEntry({ share: { id: 's1' } as InboxEntry['share'], project: { name: 'Projekt Eins', bidder: 'Same GmbH' } as InboxEntry['project'] }),
        buildEntry({ share: { id: 's2' } as InboxEntry['share'], project: { name: 'Projekt Zwei', bidder: 'Same GmbH' } as InboxEntry['project'] }),
        buildEntry({ share: { id: 's3' } as InboxEntry['share'], project: { name: 'Projekt Drei', bidder: 'Andere GmbH' } as InboxEntry['project'] }),
      ]),
    );
    renderInbox();
    await waitFor(() => expect(screen.getByText('Same GmbH')).toBeDefined());
    // Company shown ONCE (the group header), not repeated per thread row.
    expect(screen.getAllByText('Same GmbH').length).toBe(1);
    // Header carries the offer count.
    expect(screen.getByText('2 Angebote')).toBeDefined();
    // 3 thread rows across 2 groups.
    expect(document.querySelectorAll('button[aria-current]').length).toBe(3);
  });

  test('collapsing a company header hides its threads', async () => {
    inboxListMock.mockResolvedValueOnce(
      listPayload([
        buildEntry({ share: { id: 's1' } as InboxEntry['share'], project: { name: 'Sichtbar A', bidder: 'Klapp GmbH' } as InboxEntry['project'] }),
        buildEntry({ share: { id: 's2' } as InboxEntry['share'], project: { name: 'Sichtbar B', bidder: 'Klapp GmbH' } as InboxEntry['project'] }),
      ]),
    );
    renderInbox();
    await waitFor(() => expect(screen.getByText('Sichtbar A')).toBeDefined());
    expect(document.querySelectorAll('button[aria-current]').length).toBe(2);
    // The group header is the only button whose name carries the company.
    fireEvent.click(screen.getByRole('button', { name: /Klapp GmbH/ }));
    expect(document.querySelectorAll('button[aria-current]').length).toBe(0);
    expect(screen.getByText('Klapp GmbH')).toBeDefined(); // header stays visible
  });

  test('resolves the Firma from the share recipient when bidder is empty', async () => {
    inboxListMock.mockResolvedValueOnce(
      listPayload([
        buildEntry({
          share: {
            id: 's1',
            settings: {
              brandHeader: 'minimal',
              allowApproval: true,
              allowChangeRequests: true,
              showTotals: true,
              showMwst: true,
              customerName: 'Empfänger Bau GmbH',
            },
          } as InboxEntry['share'],
          project: { bidder: '', client: '' } as InboxEntry['project'],
        }),
      ]),
    );
    renderInbox();
    await waitFor(() => expect(screen.getByText('Empfänger Bau GmbH')).toBeDefined());
    expect(screen.queryByText('Unbekannte Firma')).toBeNull();
  });

  test('resolves the Firma from a responder name when bidder + recipient are empty', async () => {
    inboxListMock.mockResolvedValueOnce(
      listPayload([
        buildEntry({
          share: { id: 's1' } as InboxEntry['share'],
          project: { bidder: '', client: '' } as InboxEntry['project'],
          responses: [buildResponse({ responseType: 'approve', customerName: 'Antwort Bau GmbH' })],
        }),
      ]),
    );
    renderInbox();
    await waitFor(() => expect(screen.getByText('Antwort Bau GmbH')).toBeDefined());
    expect(screen.queryByText('Unbekannte Firma')).toBeNull();
  });
});

/* ── Status pill ──────────────────────────────────────────────────── */

describe('FeedbackInbox — status pill', () => {
  // NOTE: "Angenommen" / "Abgelehnt" also appear as filter-chip labels, so we
  // scope the pill assertion to inside the thread button (button[aria-current]).
  test('approve response → "Angenommen"', async () => {
    inboxListMock.mockResolvedValueOnce(
      listPayload([buildEntry({ responses: [buildResponse({ responseType: 'approve' })] })]),
    );
    renderInbox();
    await waitFor(() => {
      const btn = document.querySelector('button[aria-current]') as HTMLElement;
      expect(within(btn).getByText('Angenommen')).toBeDefined();
    });
  });

  test('reject response → "Abgelehnt"', async () => {
    inboxListMock.mockResolvedValueOnce(
      listPayload([buildEntry({ responses: [buildResponse({ responseType: 'reject' })] })]),
    );
    renderInbox();
    await waitFor(() => {
      const btn = document.querySelector('button[aria-current]') as HTMLElement;
      expect(within(btn).getByText('Abgelehnt')).toBeDefined();
    });
  });

  test('changes response → "Änderungen"', async () => {
    inboxListMock.mockResolvedValueOnce(
      listPayload([
        buildEntry({ responses: [buildResponse({ responseType: 'changes', payload: { changes: [] } })] }),
      ]),
    );
    renderInbox();
    // "Änderungen" appears both as a status pill and a filter chip; the pill
    // is inside the thread button.
    await waitFor(() => {
      const btn = document.querySelector('button[aria-current]') as HTMLElement;
      expect(within(btn).getByText('Änderungen')).toBeDefined();
    });
  });

  test('no responses → "Offen"', async () => {
    inboxListMock.mockResolvedValueOnce(listPayload([buildEntry({ responses: [], comments: [] })]));
    renderInbox();
    await waitFor(() => expect(screen.getByText('Offen')).toBeDefined());
  });
});

/* ── Count chips ──────────────────────────────────────────────────── */

describe('FeedbackInbox — count chips', () => {
  test('sums payload.changes across responses into "N Änderungen"', async () => {
    inboxListMock.mockResolvedValueOnce(
      listPayload([
        buildEntry({
          responses: [
            buildResponse({
              id: 'r1',
              payload: { changes: [buildChange({ oz: '1.1' }), buildChange({ oz: '1.2' })] },
            }),
            buildResponse({ id: 'r2', payload: { changes: [buildChange({ oz: '1.3' })] } }),
          ],
        }),
      ]),
    );
    renderInbox();
    // 2 + 1 = 3 changes.
    await waitFor(() => expect(screen.getByText('3 Änderungen')).toBeDefined());
  });

  test('singular "1 Änderung" (no -en) when exactly one change', async () => {
    inboxListMock.mockResolvedValueOnce(
      listPayload([
        buildEntry({ responses: [buildResponse({ payload: { changes: [buildChange()] } })] }),
      ]),
    );
    renderInbox();
    await waitFor(() => expect(screen.getByText('1 Änderung')).toBeDefined());
  });

  test('"N Kommentare" reflects comments length; singular "1 Kommentar"', async () => {
    inboxListMock.mockResolvedValueOnce(
      listPayload([
        buildEntry({
          share: { id: 's1' } as InboxEntry['share'],
          project: { bidder: 'Multi GmbH' } as InboxEntry['project'],
          comments: [
            buildComment({ id: 'c1' }),
            buildComment({ id: 'c2' }),
          ],
        }),
        buildEntry({
          share: { id: 's2' } as InboxEntry['share'],
          project: { bidder: 'Single GmbH' } as InboxEntry['project'],
          comments: [buildComment({ id: 'c3' })],
        }),
      ]),
    );
    renderInbox();
    await waitFor(() => expect(screen.getByText('2 Kommentare')).toBeDefined());
    expect(screen.getByText('1 Kommentar')).toBeDefined();
  });
});

/* ── Detail pane (open on click) ──────────────────────────────────── */

describe('FeedbackInbox — detail pane', () => {
  test('clicking a thread opens detail with company header + project link', async () => {
    inboxListMock.mockResolvedValueOnce(
      listPayload([
        buildEntry({
          project: { id: 'proj-42', name: 'Neubau Kita', bidder: 'Detail Bau GmbH' } as InboxEntry['project'],
        }),
      ]),
    );
    renderInbox();
    await waitFor(() => expect(screen.getByText('Detail Bau GmbH')).toBeDefined());
    // The company is the group header; open the thread by its project name.
    fireEvent.click(screen.getByRole('button', { name: /Neubau Kita/ }));

    // Project link → /panel/kalkulation/:id
    await waitFor(() => {
      const link = screen.getByRole('link', { name: /Neubau Kita/ });
      expect(link.getAttribute('href')).toBe('/panel/kalkulation/proj-42');
    });
    // Company name now appears in BOTH the list item and the detail header.
    expect(screen.getAllByText('Detail Bau GmbH').length).toBeGreaterThanOrEqual(2);
  });

  test('change cards show position OZ + shortText + the change text', async () => {
    inboxListMock.mockResolvedValueOnce(
      listPayload([
        buildEntry({
          responses: [
            buildResponse({
              responseType: 'changes',
              payload: {
                changes: [
                  buildChange({
                    positionId: 'pos-9',
                    oz: '3.4',
                    shortText: 'Entwässerungsrinne',
                    text: 'Andere Rinne gewünscht.',
                  }),
                ],
              },
            }),
          ],
        }),
      ]),
    );
    renderInbox();
    await waitFor(() => expect(screen.getByText('Gesellchen GmbH')).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: /Sanierung Marktplatz/ }));

    // OZ + shortText are detail-only (the list snippet shows just the change
    // text). The change text shows in BOTH the list snippet and the detail
    // card, hence getAllByText.
    await waitFor(() => expect(screen.getByText('3.4')).toBeDefined());
    expect(screen.getByText('Entwässerungsrinne')).toBeDefined();
    expect(screen.getAllByText('Andere Rinne gewünscht.').length).toBeGreaterThanOrEqual(1);
  });

  test('each comment shows OZ + shortText + the mapped intent label', async () => {
    const intents: Array<[InboxComment['intent'], string]> = [
      ['change_menge', 'Menge ändern'],
      ['change_fabrikat', 'Fabrikat ändern'],
      ['negotiate_ep', 'EP verhandeln'],
      ['other', 'Anmerkung'],
      ['accept', 'Akzeptiert'],
    ];
    inboxListMock.mockResolvedValueOnce(
      listPayload([
        buildEntry({
          comments: intents.map(([intent], i) =>
            buildComment({
              id: `c${i}`,
              intent,
              positionOz: `${i + 1}.0`,
              shortText: `Position ${i}`,
              text: `Kommentar ${i}`,
            }),
          ),
        }),
      ]),
    );
    renderInbox();
    await waitFor(() => expect(screen.getByText('Gesellchen GmbH')).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: /Sanierung Marktplatz/ }));

    for (const [, label] of intents) {
      await waitFor(() => expect(screen.getByText(label)).toBeDefined());
    }
    // OZ + shortText surfaced for a sample comment.
    expect(screen.getByText('3.0')).toBeDefined();
    expect(screen.getByText('Position 2')).toBeDefined();
  });

  test('response feed renders the headline label for an approval', async () => {
    inboxListMock.mockResolvedValueOnce(
      listPayload([buildEntry({ responses: [buildResponse({ responseType: 'approve' })] })]),
    );
    renderInbox();
    await waitFor(() => expect(screen.getByText('Gesellchen GmbH')).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: /Sanierung Marktplatz/ }));
    await waitFor(() => expect(screen.getByText('Angebot angenommen')).toBeDefined());
  });
});

/* ── Search ───────────────────────────────────────────────────────── */

describe('FeedbackInbox — search', () => {
  test('filters by company name (case-insensitive)', async () => {
    inboxListMock.mockResolvedValueOnce(
      listPayload([
        buildEntry({ share: { id: 's1' } as InboxEntry['share'], project: { bidder: 'Gesellchen GmbH' } as InboxEntry['project'] }),
        buildEntry({ share: { id: 's2' } as InboxEntry['share'], project: { bidder: 'MPB Bau' } as InboxEntry['project'] }),
      ]),
    );
    renderInbox();
    await waitFor(() => expect(screen.getByText('Gesellchen GmbH')).toBeDefined());
    const search = screen.getByLabelText('Feedback durchsuchen') as HTMLInputElement;
    fireEvent.change(search, { target: { value: 'mpb' } });
    expect(screen.queryByText('Gesellchen GmbH')).toBeNull();
    expect(screen.getByText('MPB Bau')).toBeDefined();
  });

  test('filters by a position short text (from a change)', async () => {
    inboxListMock.mockResolvedValueOnce(
      listPayload([
        buildEntry({
          share: { id: 's1' } as InboxEntry['share'],
          project: { bidder: 'Alpha GmbH' } as InboxEntry['project'],
          responses: [
            buildResponse({ payload: { changes: [buildChange({ shortText: 'Bordsteinkante', oz: '5.1' })] } }),
          ],
        }),
        buildEntry({
          share: { id: 's2' } as InboxEntry['share'],
          project: { bidder: 'Beta GmbH' } as InboxEntry['project'],
          responses: [],
        }),
      ]),
    );
    renderInbox();
    await waitFor(() => expect(screen.getByText('Alpha GmbH')).toBeDefined());
    const search = screen.getByLabelText('Feedback durchsuchen') as HTMLInputElement;
    fireEvent.change(search, { target: { value: 'bordstein' } });
    expect(screen.getByText('Alpha GmbH')).toBeDefined();
    expect(screen.queryByText('Beta GmbH')).toBeNull();
  });

  test('filters by a comment short text', async () => {
    inboxListMock.mockResolvedValueOnce(
      listPayload([
        buildEntry({
          share: { id: 's1' } as InboxEntry['share'],
          project: { bidder: 'Gamma GmbH' } as InboxEntry['project'],
          comments: [buildComment({ shortText: 'Schachtdeckel', positionOz: '9.9' })],
        }),
        buildEntry({
          share: { id: 's2' } as InboxEntry['share'],
          project: { bidder: 'Delta GmbH' } as InboxEntry['project'],
        }),
      ]),
    );
    renderInbox();
    await waitFor(() => expect(screen.getByText('Gamma GmbH')).toBeDefined());
    const search = screen.getByLabelText('Feedback durchsuchen') as HTMLInputElement;
    fireEvent.change(search, { target: { value: 'schachtdeckel' } });
    expect(screen.getByText('Gamma GmbH')).toBeDefined();
    expect(screen.queryByText('Delta GmbH')).toBeNull();
  });
});

/* ── Filter chips ─────────────────────────────────────────────────── */

describe('FeedbackInbox — filter chips', () => {
  test('"Änderungen" hides threads with 0 changes', async () => {
    inboxListMock.mockResolvedValueOnce(
      listPayload([
        buildEntry({
          share: { id: 's1' } as InboxEntry['share'],
          project: { bidder: 'HasChanges GmbH' } as InboxEntry['project'],
          responses: [buildResponse({ payload: { changes: [buildChange()] } })],
        }),
        buildEntry({
          share: { id: 's2' } as InboxEntry['share'],
          project: { bidder: 'NoChanges GmbH' } as InboxEntry['project'],
          responses: [buildResponse({ responseType: 'approve', payload: { changes: [] } })],
        }),
      ]),
    );
    renderInbox();
    await waitFor(() => expect(screen.getByText('HasChanges GmbH')).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: 'Änderungen' }));
    expect(screen.getByText('HasChanges GmbH')).toBeDefined();
    expect(screen.queryByText('NoChanges GmbH')).toBeNull();
  });

  test('"Nur Aufrufe" shows only threads with no responses AND no comments', async () => {
    inboxListMock.mockResolvedValueOnce(
      listPayload([
        buildEntry({
          share: { id: 's1' } as InboxEntry['share'],
          project: { bidder: 'OnlyViewed GmbH' } as InboxEntry['project'],
          responses: [],
          comments: [],
        }),
        buildEntry({
          share: { id: 's2' } as InboxEntry['share'],
          project: { bidder: 'HasResponse GmbH' } as InboxEntry['project'],
          responses: [buildResponse({ responseType: 'approve' })],
          comments: [],
        }),
        buildEntry({
          share: { id: 's3' } as InboxEntry['share'],
          project: { bidder: 'HasComment GmbH' } as InboxEntry['project'],
          responses: [],
          comments: [buildComment()],
        }),
      ]),
    );
    renderInbox();
    await waitFor(() => expect(screen.getByText('OnlyViewed GmbH')).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: 'Nur Aufrufe' }));
    expect(screen.getByText('OnlyViewed GmbH')).toBeDefined();
    expect(screen.queryByText('HasResponse GmbH')).toBeNull();
    expect(screen.queryByText('HasComment GmbH')).toBeNull();
  });

  test('"Nur neu" shows only threads with activity newer than viewerLastSeenAt', async () => {
    inboxListMock.mockResolvedValueOnce(
      listPayload(
        [
          buildEntry({
            share: { id: 's1', createdAt: '2026-05-01T00:00:00Z', lastViewedAt: '2026-06-01T00:00:00Z' } as InboxEntry['share'],
            project: { bidder: 'FreshActivity GmbH' } as InboxEntry['project'],
          }),
          buildEntry({
            share: { id: 's2', createdAt: '2026-03-01T00:00:00Z', lastViewedAt: '2026-03-02T00:00:00Z' } as InboxEntry['share'],
            project: { bidder: 'StaleActivity GmbH' } as InboxEntry['project'],
            responses: [],
            comments: [],
          }),
        ],
        // viewerLastSeenAt between the two threads' latest activity.
        '2026-04-01T00:00:00Z',
      ),
    );
    renderInbox();
    await waitFor(() => expect(screen.getByText('FreshActivity GmbH')).toBeDefined());
    // Both visible before filtering.
    expect(screen.getByText('StaleActivity GmbH')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Nur neu' }));
    expect(screen.getByText('FreshActivity GmbH')).toBeDefined();
    expect(screen.queryByText('StaleActivity GmbH')).toBeNull();
  });
});

/* ── "neu" marker ─────────────────────────────────────────────────── */

describe('FeedbackInbox — "neu" marker', () => {
  test('shows the header "N neu" counter when latest activity > viewerLastSeenAt', async () => {
    inboxListMock.mockResolvedValueOnce(
      listPayload(
        [
          buildEntry({
            share: { id: 's1', createdAt: '2026-05-01T00:00:00Z', lastViewedAt: '2026-06-01T00:00:00Z' } as InboxEntry['share'],
            project: { bidder: 'Neu GmbH' } as InboxEntry['project'],
          }),
        ],
        '2026-04-01T00:00:00Z',
      ),
    );
    renderInbox();
    await waitFor(() => expect(screen.getByText('Neu GmbH')).toBeDefined());
    // The page-header counter and a group's unread badge can both read "1 neu";
    // assert the page-header counter specifically (it lives in the banner).
    const banner = screen.getByRole('banner');
    expect(within(banner).getByText('1 neu')).toBeDefined();
  });

  test('NO "neu" counter when all activity is older than viewerLastSeenAt', async () => {
    inboxListMock.mockResolvedValueOnce(
      listPayload(
        [
          buildEntry({
            share: { id: 's1', createdAt: '2026-03-01T00:00:00Z', lastViewedAt: '2026-03-02T00:00:00Z' } as InboxEntry['share'],
            project: { bidder: 'Alt GmbH' } as InboxEntry['project'],
            responses: [],
            comments: [],
          }),
        ],
        '2026-12-01T00:00:00Z',
      ),
    );
    renderInbox();
    await waitFor(() => expect(screen.getByText('Alt GmbH')).toBeDefined());
    // The header counter renders as "<N> neu". The "Nur neu" filter chip also
    // contains the word "neu", so match the counter pattern specifically.
    expect(screen.queryByText(/\d+ neu/)).toBeNull();
  });
});

/* ── Deep-link ────────────────────────────────────────────────────── */

describe('FeedbackInbox — deep-link ?oz=', () => {
  test('auto-selects the thread that has a change for the OZ', async () => {
    inboxListMock.mockResolvedValueOnce(
      listPayload([
        buildEntry({
          share: { id: 's1', token: 'tok-no' } as InboxEntry['share'],
          project: { id: 'proj-a', name: 'Projekt A', bidder: 'NoMatch GmbH' } as InboxEntry['project'],
          responses: [buildResponse({ payload: { changes: [buildChange({ oz: '9.9' })] } })],
        }),
        buildEntry({
          share: { id: 's2', token: 'tok-yes' } as InboxEntry['share'],
          project: { id: 'proj-b', name: 'Zieltreffer Projekt', bidder: 'Match GmbH' } as InboxEntry['project'],
          responses: [buildResponse({ id: 'r2', payload: { changes: [buildChange({ oz: '1.1', shortText: 'Treffer-Position' })] } })],
        }),
      ]),
    );
    renderInbox(['/panel/feedback?oz=1.1']);
    // The matching thread's detail should auto-open: its project link appears.
    await waitFor(() => {
      const link = screen.getByRole('link', { name: /Zieltreffer Projekt/ });
      expect(link.getAttribute('href')).toBe('/panel/kalkulation/proj-b');
    });
  });

  test('auto-selects the thread that has a comment for the OZ', async () => {
    inboxListMock.mockResolvedValueOnce(
      listPayload([
        buildEntry({
          share: { id: 's1' } as InboxEntry['share'],
          project: { id: 'proj-x', name: 'Anderes', bidder: 'Other GmbH' } as InboxEntry['project'],
        }),
        buildEntry({
          share: { id: 's2' } as InboxEntry['share'],
          project: { id: 'proj-y', name: 'Kommentar-Projekt', bidder: 'Commented GmbH' } as InboxEntry['project'],
          comments: [buildComment({ positionOz: '7.3', shortText: 'Kommentierte Pos' })],
        }),
      ]),
    );
    renderInbox(['/panel/feedback?oz=7.3']);
    await waitFor(() => {
      const link = screen.getByRole('link', { name: /Kommentar-Projekt/ });
      expect(link.getAttribute('href')).toBe('/panel/kalkulation/proj-y');
    });
  });
});

/* ── Empty state ──────────────────────────────────────────────────── */

describe('FeedbackInbox — empty state', () => {
  test('renders the "Noch keine Aktivität" empty state when entries=[]', async () => {
    inboxListMock.mockResolvedValueOnce(listPayload([]));
    renderInbox();
    await waitFor(() => expect(screen.getByText('Noch keine Aktivität')).toBeDefined());
    // No thread buttons rendered.
    expect(document.querySelectorAll('button[aria-current]').length).toBe(0);
  });

  test('shows the load-error chip + toast when api.inbox.list rejects', async () => {
    inboxListMock.mockRejectedValueOnce(new Error('boom'));
    const toast = (await import('react-hot-toast')).default as unknown as {
      error: ReturnType<typeof vi.fn>;
    };
    renderInbox();
    await waitFor(() => expect(screen.getByText('Inbox konnte nicht geladen werden.')).toBeDefined());
    expect(toast.error).toHaveBeenCalled();
  });
});

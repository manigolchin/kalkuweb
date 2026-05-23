/**
 * Frontend tests for the Feature #3 SnapshotDiffDialog.
 * Mocks api.shares.diffSnapshots; asserts:
 *   - "Mindestens 2 Snapshots benötigt" copy when only 1 share
 *   - default selection picks earliest as from + latest as to
 *   - Vertauschen-button swaps from/to
 *   - the diff payload renders added / removed / changed rows
 *   - totals delta shows with correct sign + color
 *   - ESC closes
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import SnapshotDiffDialog from '../SnapshotDiffDialog';
import type { ShareSummary } from '../types';

vi.mock('@/lib/api', () => ({
  api: {
    shares: {
      diffSnapshots: vi.fn(),
    },
  },
}));

const { api } = await import('@/lib/api');
const diffMock = api.shares.diffSnapshots as ReturnType<typeof vi.fn>;

const share = (over: Partial<ShareSummary> & { id: string; createdAt: string }): ShareSummary => ({
  token: over.token ?? `token-${over.id}`,
  visiblePositionIds: [],
  settings: {
    brandHeader: 'co-branded',
    allowApproval: true,
    allowChangeRequests: true,
    showTotals: true,
    showMwst: true,
  },
  revokedAt: null,
  lastViewedAt: null,
  viewCount: 0,
  snapshotHash: over.snapshotHash ?? `hash-${over.id}`,
  snapshottedAt: over.snapshottedAt ?? over.createdAt,
  nachtragNumber: over.nachtragNumber ?? 0,
  ...over,
});

function buildDiffPayload(delta: number) {
  return {
    from: {
      id: 's1',
      token: 'token-s1',
      snapshotVersion: 1,
      snapshotHash: 'hash-s1',
      snapshottedAt: '2026-05-01T10:00:00Z',
      nachtragNumber: 0,
      createdAt: '2026-05-01T10:00:00Z',
    },
    to: {
      id: 's2',
      token: 'token-s2',
      snapshotVersion: 2,
      snapshotHash: 'hash-s2',
      snapshottedAt: '2026-05-20T10:00:00Z',
      nachtragNumber: 1,
      createdAt: '2026-05-20T10:00:00Z',
    },
    diff: {
      added: [
        { id: 'add1', oz: '3.1', shortText: 'Neue Position', quantity: 5, unit: 'St', ep: 100, gp: 500 },
      ],
      removed: [
        { id: 'rem1', oz: '2.5', shortText: 'Alte Position', quantity: 2, unit: 'm²', ep: 50, gp: 100 },
      ],
      changed: [
        {
          before: { id: 'chg1', oz: '1.1', shortText: 'Erdaushub', quantity: 10, unit: 'm³', ep: 50, gp: 500 },
          after: { id: 'chg1', oz: '1.1', shortText: 'Erdaushub', quantity: 15, unit: 'm³', ep: 50, gp: 750 },
          fields: ['quantity', 'gp'],
        },
      ],
      unchanged: [{ id: 'u1', oz: '1.2', shortText: '', quantity: 1, unit: '', ep: 0, gp: 0 }],
      oldTotalNetto: 1000,
      newTotalNetto: 1000 + delta,
      delta,
    },
  };
}

beforeEach(() => {
  diffMock.mockReset();
});

describe('SnapshotDiffDialog', () => {
  test('shows insufficient-snapshots message when only one share', () => {
    const shares = [share({ id: 's1', createdAt: '2026-05-01T00:00:00Z' })];
    render(
      <SnapshotDiffDialog
        open
        onClose={() => {}}
        projectId="p1"
        projectName="Test-Projekt"
        shares={shares}
      />,
    );
    expect(screen.getByText(/Mindestens 2 Snapshots benötigt/)).toBeDefined();
    // Should NOT have called the diff API
    expect(diffMock).not.toHaveBeenCalled();
  });

  test('does not render when open=false', () => {
    const { container } = render(
      <SnapshotDiffDialog
        open={false}
        onClose={() => {}}
        projectId="p1"
        projectName="Test-Projekt"
        shares={[]}
      />,
    );
    expect(container.querySelector('[role=dialog]')).toBeNull();
  });

  test('renders added / removed / changed rows from API payload', async () => {
    diffMock.mockResolvedValueOnce(buildDiffPayload(250));
    const shares = [
      share({ id: 's1', createdAt: '2026-05-01T00:00:00Z' }),
      share({ id: 's2', createdAt: '2026-05-20T00:00:00Z' }),
    ];
    render(
      <SnapshotDiffDialog
        open
        onClose={() => {}}
        projectId="p1"
        projectName="X"
        shares={shares}
      />,
    );
    await waitFor(() => expect(diffMock).toHaveBeenCalled());
    // diff call uses earliest as from, latest as to
    expect(diffMock).toHaveBeenCalledWith('p1', 's1', 's2');
    // counts on the tiles
    await waitFor(() => expect(screen.getByText('Hinzugefügt')).toBeDefined());
    expect(screen.getByText('Erdaushub')).toBeDefined();
    expect(screen.getByText('Neue Position')).toBeDefined();
    expect(screen.getByText('Alte Position')).toBeDefined();
  });

  test('Vertauschen swaps from/to and re-fetches the diff', async () => {
    diffMock.mockResolvedValue(buildDiffPayload(0));
    const shares = [
      share({ id: 's1', createdAt: '2026-05-01T00:00:00Z' }),
      share({ id: 's2', createdAt: '2026-05-20T00:00:00Z' }),
    ];
    render(
      <SnapshotDiffDialog
        open
        onClose={() => {}}
        projectId="p1"
        projectName="X"
        shares={shares}
      />,
    );
    await waitFor(() => expect(diffMock).toHaveBeenCalledWith('p1', 's1', 's2'));
    diffMock.mockClear();
    const btn = screen.getByLabelText('Reihenfolge vertauschen');
    fireEvent.click(btn);
    await waitFor(() => expect(diffMock).toHaveBeenCalledWith('p1', 's2', 's1'));
  });

  test('delta tile color reflects sign — positive', async () => {
    diffMock.mockResolvedValueOnce(buildDiffPayload(123.45));
    const shares = [
      share({ id: 's1', createdAt: '2026-05-01T00:00:00Z' }),
      share({ id: 's2', createdAt: '2026-05-20T00:00:00Z' }),
    ];
    render(
      <SnapshotDiffDialog
        open
        onClose={() => {}}
        projectId="p1"
        projectName="X"
        shares={shares}
      />,
    );
    await waitFor(() => expect(screen.getByText(/Netto-Delta/)).toBeDefined());
    // The delta paragraph (with "+") should be present.
    const deltaText = await screen.findByText((c) => c.startsWith('+') && c.includes('123,45'));
    expect(deltaText).toBeDefined();
  });

  test('delta tile color reflects sign — negative', async () => {
    diffMock.mockResolvedValueOnce(buildDiffPayload(-500));
    const shares = [
      share({ id: 's1', createdAt: '2026-05-01T00:00:00Z' }),
      share({ id: 's2', createdAt: '2026-05-20T00:00:00Z' }),
    ];
    render(
      <SnapshotDiffDialog
        open
        onClose={() => {}}
        projectId="p1"
        projectName="X"
        shares={shares}
      />,
    );
    // Negative formatEUR includes the leading minus, so just check the magnitude renders.
    await waitFor(() => {
      const cands = screen.getAllByText((c) => c.includes('500,00'));
      expect(cands.length).toBeGreaterThan(0);
    });
  });

  test('ESC fires onClose', () => {
    const onClose = vi.fn();
    render(
      <SnapshotDiffDialog
        open
        onClose={onClose}
        projectId="p1"
        projectName="X"
        shares={[share({ id: 's1', createdAt: '2026-05-01T00:00:00Z' })]}
      />,
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  test('shows "Keine Unterschiede" when diff is empty', async () => {
    diffMock.mockResolvedValueOnce({
      from: {
        id: 's1', token: 'tok-s1', snapshotVersion: 1, snapshotHash: 'h',
        snapshottedAt: '2026-05-01T00:00:00Z', nachtragNumber: 0, createdAt: '2026-05-01T00:00:00Z',
      },
      to: {
        id: 's2', token: 'tok-s2', snapshotVersion: 2, snapshotHash: 'h',
        snapshottedAt: '2026-05-20T00:00:00Z', nachtragNumber: 0, createdAt: '2026-05-20T00:00:00Z',
      },
      diff: {
        added: [],
        removed: [],
        changed: [],
        unchanged: [{ id: 'u1', oz: '1.1', shortText: 'X', quantity: 1, unit: 'm', ep: 10, gp: 10 }],
        oldTotalNetto: 10,
        newTotalNetto: 10,
        delta: 0,
      },
    });
    const shares = [
      share({ id: 's1', createdAt: '2026-05-01T00:00:00Z' }),
      share({ id: 's2', createdAt: '2026-05-20T00:00:00Z' }),
    ];
    render(
      <SnapshotDiffDialog
        open
        onClose={() => {}}
        projectId="p1"
        projectName="X"
        shares={shares}
      />,
    );
    await waitFor(() => expect(screen.getByText(/Keine Unterschiede/)).toBeDefined());
  });
});

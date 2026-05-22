/**
 * Leak test for the per-position comment side-panel (PART G), extended
 * in Round 5 PART T to cover ALL 10 example fixtures.
 *
 * Strategy: render the panel with a sentinel position whose properties
 * include both the customer-allowed fields (gp, ep, quantity, etc.) AND
 * deliberately-injected "extra" keys with sentinel values that mimic
 * internal fields a buggy upstream might accidentally pass through.
 * Assert that NONE of the internal-field sentinels appear in the panel's
 * rendered HTML.
 *
 * The structural guarantee (the panel's `position` prop is typed as
 * `CustomerViewPayload['positions'][number]`, a closed shape that doesn't
 * include materialCost/timeMinutes/nuCost/etc.) means a leak literally
 * cannot happen via prop drilling — TypeScript would reject it. But this
 * runtime test catches the case where the type system is bypassed (`as
 * any` somewhere upstream, JSON.parse, an API change).
 *
 * Round 5 PART T: the same pollution-and-pass test now runs once per
 * fixture, using each fixture's visible-sentinel row (the one that IS
 * meant to render in KUNDEN, but whose internal fields must stay hidden
 * in the comment panel). This catches per-fixture-shape regressions
 * (e.g. unusual OZ formatting, long shortText, special characters).
 */

import { describe, test, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import PositionCommentPanel from '../PositionCommentPanel';
import type { Position, ProjectData } from '@/features/kalkulation/types';
import { LV3_BH_FIXTURE, SENTINELS } from '@/features/kalkulation/__fixtures__/lv3_bh';
import { LV_EX2_FIXTURE } from '@/features/kalkulation/__fixtures__/lv_ex2';
import { LV_EX3_FIXTURE } from '@/features/kalkulation/__fixtures__/lv_ex3';
import { LV_EX4_FIXTURE } from '@/features/kalkulation/__fixtures__/lv_ex4';
import { LV_EX5_FIXTURE } from '@/features/kalkulation/__fixtures__/lv_ex5';
import { LV_EX6_FIXTURE } from '@/features/kalkulation/__fixtures__/lv_ex6';
import { LV_EX7_FIXTURE } from '@/features/kalkulation/__fixtures__/lv_ex7';
import { LV_EX8_FIXTURE } from '@/features/kalkulation/__fixtures__/lv_ex8';
import { LV_EX9_FIXTURE } from '@/features/kalkulation/__fixtures__/lv_ex9';
import { LV_EX10_FIXTURE } from '@/features/kalkulation/__fixtures__/lv_ex10';

/** Extended sentinels used in the static (single-position) test. These
 *  are deliberately distinct from the shared SENTINELS constant so the
 *  static and per-fixture tests can flag separately if they ever leak. */
const STATIC_SENTINELS = {
  materialCost: 99999.99,
  timeMinutes: 88888,
  nuCost: 77777,
  internalNote: '__LEAK_INTERNAL_NOTE__',
  positionType: '__LEAK_WAGNIS__',
  epLohn: 55555.55,
  hinweisText: '__LEAK_HINWEIS__',
};

// Bypass the type system on purpose — simulating "what if the parent
// component passed a richer object than the type says?". The panel should
// still only render what it explicitly reads.
const polluted = {
  // Allowed fields:
  id: 'p-leak',
  oz: '1.4.1.1',
  shortText: 'Sentinel position with polluted internals',
  longText: 'Some longtext',
  quantity: 1,
  unit: 'St',
  isHeader: false,
  sortOrder: 1,
  ep: 100,
  gp: 100,
  // Pollutants (NOT in CustomerViewPayload — must never render):
  ...STATIC_SENTINELS,
};

function renderPanel(position: unknown) {
  return render(
    <PositionCommentPanel
      open
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      position={position as any}
      draft={undefined}
      customerName=""
      customerEmail=""
      onClose={vi.fn()}
      onSet={vi.fn()}
      onClear={vi.fn()}
      onSetCustomerName={vi.fn()}
      onSetCustomerEmail={vi.fn()}
    />,
  );
}

// ────────────────────────────────────────────────────────────────────────────
// PART A — static pollution test (canonical CustomerViewPayload shape)
// ────────────────────────────────────────────────────────────────────────────

describe('PositionCommentPanel — internal-field leak guard (static)', () => {
  test('renders without throwing when the position prop is polluted with extra keys', () => {
    const { container } = renderPanel(polluted);
    expect(container.querySelector('[data-testid="position-comment-panel"]')).not.toBeNull();
  });

  test('NEVER renders the materialCost sentinel (raw or de-formatted)', () => {
    const { container } = renderPanel(polluted);
    const html = container.innerHTML;
    expect(html.includes(String(STATIC_SENTINELS.materialCost))).toBe(false);
    expect(html.includes('99.999,99')).toBe(false);
  });

  test('NEVER renders timeMinutes / nuCost / epLohn sentinels', () => {
    const { container } = renderPanel(polluted);
    const html = container.innerHTML;
    expect(html.includes(String(STATIC_SENTINELS.timeMinutes))).toBe(false);
    expect(html.includes(String(STATIC_SENTINELS.nuCost))).toBe(false);
    expect(html.includes('55555')).toBe(false);
    expect(html.includes('55.555,55')).toBe(false);
  });

  test('NEVER renders the descriptive sentinels (internalNote, positionType, hinweisText)', () => {
    const { container } = renderPanel(polluted);
    const html = container.innerHTML;
    expect(html.includes(STATIC_SENTINELS.internalNote)).toBe(false);
    expect(html.includes(STATIC_SENTINELS.positionType)).toBe(false);
    expect(html.includes(STATIC_SENTINELS.hinweisText)).toBe(false);
  });

  test('DOES render the allowed fields (control: ensures the test is not vacuous)', () => {
    const { container, getByText } = renderPanel(polluted);
    expect(getByText(/Sentinel position with polluted internals/i)).toBeTruthy();
    expect(container.innerHTML.includes('1.4.1.1')).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// PART B — per-fixture leak guard (all 10 example shapes)
// ────────────────────────────────────────────────────────────────────────────

const FIXTURES: Array<{ id: string; data: ProjectData }> = [
  { id: 'ex1', data: LV3_BH_FIXTURE },
  { id: 'ex2', data: LV_EX2_FIXTURE },
  { id: 'ex3', data: LV_EX3_FIXTURE },
  { id: 'ex4', data: LV_EX4_FIXTURE },
  { id: 'ex5', data: LV_EX5_FIXTURE },
  { id: 'ex6', data: LV_EX6_FIXTURE },
  { id: 'ex7', data: LV_EX7_FIXTURE },
  { id: 'ex8', data: LV_EX8_FIXTURE },
  { id: 'ex9', data: LV_EX9_FIXTURE },
  { id: 'ex10', data: LV_EX10_FIXTURE },
];

/** Find the visible-sentinel row in a fixture. Every fixture has one. */
function getVisibleSentinel(project: ProjectData): Position {
  const row = project.positions.find((p) => p.id.endsWith('-visible'));
  if (!row) throw new Error(`No visible-sentinel row in fixture — generator bug`);
  return row;
}

function assertNoSentinelLeaks(html: string, ctx: string) {
  // Numeric sentinels (the ones carried on the actual Position, not the
  // CustomerViewPayload — since these are what would leak if the prop
  // drilling were too permissive).
  const checks: Array<[string, string]> = [
    ['materialCost raw (99999.99)', String(SENTINELS.materialCost)],
    ['materialCost formatted (99.999,99)', '99.999,99'],
    ['timeMinutes raw (88888)', String(SENTINELS.timeMinutes)],
    ['timeMinutes formatted (88.888)', '88.888'],
    ['nuCost raw (77777)', String(SENTINELS.nuCost)],
    ['nuCost formatted (77.777)', '77.777'],
  ];
  for (const [name, token] of checks) {
    expect(html.includes(token), `[${ctx}] ${name} ("${token}") leaked into comment panel`).toBe(false);
  }
}

describe('PositionCommentPanel — per-fixture leak guard (10 example shapes)', () => {
  for (const fx of FIXTURES) {
    test(`${fx.id}: opening panel for visible sentinel row does not leak internal fields`, () => {
      const sentinel = getVisibleSentinel(fx.data);
      // Pass the full Position (not the CustomerViewPayload shape) on
      // purpose — same `as any` upstream-pollution scenario. The panel
      // should only render fields it explicitly reads from the typed
      // shape.
      const { container } = renderPanel(sentinel);
      const html = container.innerHTML;
      // The panel mounts at all
      expect(container.querySelector('[data-testid="position-comment-panel"]')).not.toBeNull();
      // No internal-field values render
      assertNoSentinelLeaks(html, `${fx.id} comment-panel`);
    });

    test(`${fx.id}: panel renders the row's allowed fields (control)`, () => {
      const sentinel = getVisibleSentinel(fx.data);
      const { container } = renderPanel(sentinel);
      // shortText is the description shown in the panel header — it's
      // part of the allowed CustomerViewPayload shape.
      expect(container.innerHTML.includes('SENTINEL — visible row with sentinel internals')).toBe(true);
    });
  }
});

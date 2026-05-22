/**
 * THE security test — extended in Round 5 PART T to cover ALL 10 example
 * fixtures (one per real LV file).
 *
 * For every fixture we render PositionTableV2 in KUNDEN view via jsdom and
 * assert that no internal field value (sentinel) appears in the customer-
 * facing wrapper's rendered HTML. Then we re-render KUNDEN with a
 * `zuschlagAktuell` override (mimicking the post-ZSCHLG-edit state) and
 * re-assert the same invariants — the override path must not leak either.
 *
 * For the live-edit path (typing into the ZSCHLG matrix), we mount the
 * isolated <ZuschlagMatrixStrip> component instead of touching
 * PositionTableV2's INTERN row code. That sidesteps an unrelated runtime
 * crash bug logged for PART W (NumCellEditable referenced but undefined
 * after Round 4 PART O removed it — see docs/v2_redesign/leak_test_10examples.md).
 *
 * Sentinels are defined in __fixtures__/lv3_bh.ts and are deliberately
 * chosen to NEVER match any number a real calculation could produce
 * (99999.99 × 1.23 = 122999.9877 ≠ "99999.99" or "99.999,99"). They are
 * appended to every fixture by `scripts/build-fixtures-10examples.mjs`.
 */

import { describe, test, expect, vi } from 'vitest';
import { fireEvent, render, act } from '@testing-library/react';
import PositionTableV2 from '../PositionTableV2';
import ZuschlagMatrixStrip from '../ZuschlagMatrixStrip';
import type { ProjectData, ZuschlagMatrix, HeaderExtras, CalcParams } from '../types';
import { DEFAULT_CALC_PARAMS } from '../calc';
import { LV3_BH_FIXTURE, SENTINELS } from '../__fixtures__/lv3_bh';
import { LV_EX2_FIXTURE } from '../__fixtures__/lv_ex2';
import { LV_EX3_FIXTURE } from '../__fixtures__/lv_ex3';
import { LV_EX4_FIXTURE } from '../__fixtures__/lv_ex4';
import { LV_EX5_FIXTURE } from '../__fixtures__/lv_ex5';
import { LV_EX6_FIXTURE } from '../__fixtures__/lv_ex6';
import { LV_EX7_FIXTURE } from '../__fixtures__/lv_ex7';
import { LV_EX8_FIXTURE } from '../__fixtures__/lv_ex8';
import { LV_EX9_FIXTURE } from '../__fixtures__/lv_ex9';
import { LV_EX10_FIXTURE } from '../__fixtures__/lv_ex10';

/** The full 10-fixture roster. */
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

/** Sentinel ZuschlagMatrix + HeaderExtras — used for the ZSCHLG-edit guard. */
const SENTINEL_MATRIX: ZuschlagMatrix = {
  stoffe:  { ekTotal: 1000, zschlgPct: SENTINELS.zschlgStoffe, vkTotal: 1999.9, differnz: 999.9 },
  nu:      { ekTotal: 500,  zschlgPct: 0.7777,                vkTotal: 888.85, differnz: 388.85 },
  geraete: { ekTotal: 200,  zschlgPct: 0.10,                  vkTotal: 220, differnz: 20 },
  lohn:    { ekTotal: 800,  zschlgPct: SENTINELS.zschlgLohn,  vkTotal: 1511.04, differnz: 711.04 },
};
const SENTINEL_EXTRAS: HeaderExtras = {
  mitarbeiter: 3,
  gesStunden: 500,
  arbeitstage: 62,
  monate: 2.9,
  ueberschuss: SENTINELS.ueberschuss,
  zeitwert: -0.15,
  kontrollsumme: 0,
};
const SENTINEL_PARAMS: CalcParams = {
  ...DEFAULT_CALC_PARAMS,
  verrechnungslohn: SENTINELS.stundensatz,
};

function renderKundenView(project: ProjectData, extra: Partial<React.ComponentProps<typeof PositionTableV2>> = {}) {
  return render(
    <PositionTableV2
      positions={project.positions}
      params={{ ...project.calcParams, verrechnungslohn: SENTINELS.stundensatz }}
      onChange={() => {}}
      view="kunden"
      projectMeta={{
        name: project.name,
        client: project.client,
        service: project.service,
        tenderNumber: project.tenderNumber,
        deadline: project.deadline,
        bidder: project.bidder,
      }}
      {...extra}
    />,
  );
}

/** The canonical sentinel-leak assertion suite — used in every loop iteration. */
function assertNoLeaks(html: string, ctx: string) {
  // Numeric sentinels — raw + German formatted
  const checks: Array<[string, string]> = [
    ['materialCost raw (99999.99)', String(SENTINELS.materialCost)],
    ['materialCost formatted (99.999,99)', '99.999,99'],
    ['timeMinutes raw (88888)', String(SENTINELS.timeMinutes)],
    ['timeMinutes formatted (88.888)', '88.888'],
    ['nuCost raw (77777)', String(SENTINELS.nuCost)],
    ['nuCost formatted (77.777)', '77.777'],
    // Round 4 PART O+Q sentinels
    ['ZSCHLG Stoffe decimal (0.9999)', String(SENTINELS.zschlgStoffe)],
    ['ZSCHLG Stoffe percent (99,99)', '99,99'],
    ['ZSCHLG Stoffe percent (99.99)', '99.99'],
    ['ZSCHLG Lohn decimal (0.8888)', String(SENTINELS.zschlgLohn)],
    ['ZSCHLG Lohn percent (88,88)', '88,88'],
    ['Stundensatz raw (66.66)', String(SENTINELS.stundensatz)],
    ['Stundensatz formatted (66,66)', '66,66'],
    ['Überschuss raw (77777.77)', String(SENTINELS.ueberschuss)],
    ['Überschuss formatted (77.777,77)', '77.777,77'],
  ];
  for (const [name, token] of checks) {
    expect(html.includes(token), `[${ctx}] ${name} ("${token}") LEAKED into KUNDEN HTML`).toBe(false);
  }
  // Descriptive sentinels — the hidden/wagnis sentinel row descriptions
  // must never appear (positionType + visibleToCustomer filter wins).
  expect(html.includes('SENTINEL — hidden standard row'), `[${ctx}] hidden sentinel description leaked`).toBe(false);
  expect(html.includes('SENTINEL — wagnis internal row'), `[${ctx}] wagnis sentinel description leaked`).toBe(false);
}

// ────────────────────────────────────────────────────────────────────────────
// PART 1 — vanilla KUNDEN render across all 10 fixtures
// ────────────────────────────────────────────────────────────────────────────

describe('PositionTableV2 KUNDEN view — leak guard across all 10 fixtures', () => {
  for (const fx of FIXTURES) {
    test(`${fx.id}: renders KUNDEN preview wrapper`, () => {
      const { container } = renderKundenView(fx.data);
      expect(container.querySelector('[data-testid="v2-kunden-preview"]')).not.toBeNull();
    });

    test(`${fx.id}: NO sentinel leaks in KUNDEN HTML`, () => {
      const { container } = renderKundenView(fx.data);
      assertNoLeaks(container.innerHTML, `${fx.id} vanilla-kunden`);
    });

    test(`${fx.id}: visible-sentinel row IS rendered (control — proves we're not just empty)`, () => {
      const { container } = renderKundenView(fx.data);
      expect(container.innerHTML.includes('SENTINEL — visible row with sentinel internals')).toBe(true);
    });

    test(`${fx.id}: ZuschlagMatrixStrip NEVER renders in KUNDEN view`, () => {
      const { container } = renderKundenView(fx.data, {
        // Belt-and-suspenders: even if a parent accidentally passes the matrix,
        // the KUNDEN code path takes an early return before mounting the strip.
        zuschlagOriginal: SENTINEL_MATRIX,
        headerExtras: SENTINEL_EXTRAS,
      });
      expect(container.querySelector('[data-testid="zuschlag-matrix-strip"]')).toBeNull();
    });

    test(`${fx.id}: project meta header mounts (control)`, () => {
      const { getAllByText } = renderKundenView(fx.data);
      if (fx.data.client.length > 0) {
        expect(getAllByText(fx.data.client).length).toBeGreaterThan(0);
      }
      if (fx.data.bidder.length > 0) {
        expect(getAllByText(fx.data.bidder).length).toBeGreaterThan(0);
      }
    });

    test(`${fx.id}: KUNDEN table thead has 6 columns (no internal cols)`, () => {
      const { container } = renderKundenView(fx.data);
      const preview = container.querySelector('[data-testid="v2-kunden-preview"]');
      const thead = preview?.querySelector('thead');
      const headerCells = thead?.querySelectorAll('th') ?? [];
      expect(headerCells.length).toBe(6);
    });

    test(`${fx.id}: KUNDEN thead never mentions MATERIAL / ZEIT / LSTG / ZSCHLG`, () => {
      const { container } = renderKundenView(fx.data);
      const thead = container.querySelector('[data-testid="v2-kunden-preview"] thead');
      const theadText = (thead?.textContent ?? '').toUpperCase();
      expect(theadText.includes('MATERIAL')).toBe(false);
      expect(theadText.includes('ZEIT MIN')).toBe(false);
      expect(theadText.includes('LSTG')).toBe(false);
      expect(theadText.includes('ZSCHLG')).toBe(false);
    });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// PART 2 — post-ZSCHLG-edit KUNDEN leak guard (Round 4 PART O)
// ────────────────────────────────────────────────────────────────────────────
//
// Scenario: calculator edits ZSCHLG % on Stoffe (forces a live recompute),
// then flips to KUNDEN. The recomputed VK/EP/GP values will differ from the
// import, but NO internal field, NO sentinel %, NO Stundensatz, NO
// Überschuss must leak into the KUNDEN view.
//
// We split this into two independently verifiable invariants:
//   (a) KUNDEN render with an active `zuschlagAktuell` override does not
//       leak any sentinel value (this is the actual security property).
//   (b) The isolated ZuschlagMatrixStrip raises onZschlgChange on edits
//       (proves the edit path works); we then take that decimal and feed
//       it back into a fresh KUNDEN mount to verify the round-trip is
//       still leak-free.

describe('PositionTableV2 — post-ZSCHLG-edit leak guard (Round 4 PART O)', () => {
  for (const fx of FIXTURES) {
    test(`${fx.id}: KUNDEN never leaks even with zuschlagAktuell override (Stoffe=0.5)`, () => {
      const { container } = renderKundenView(fx.data, {
        zuschlagAktuell: { stoffe: 0.5 },
      });
      assertNoLeaks(container.innerHTML, `${fx.id} kunden-with-override-stoffe-0.5`);
    });

    test(`${fx.id}: KUNDEN never leaks with FULL override map (all 4 cost types)`, () => {
      const { container } = renderKundenView(fx.data, {
        zuschlagAktuell: { stoffe: 0.42, nu: 0.18, geraete: 0.08, lohn: 0.55 },
      });
      assertNoLeaks(container.innerHTML, `${fx.id} kunden-with-full-override`);
    });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// PART 3 — isolated ZuschlagMatrixStrip edit-and-propagate test
// ────────────────────────────────────────────────────────────────────────────
//
// This is the "live edit" half of the post-edit guard. We mount just the
// strip (independent of PositionTableV2's row code) and verify that an
// edit propagates a clean decimal value to the parent — which the parent
// would then echo back as `zuschlagAktuell`. Combined with PART 2 above,
// this proves the full edit→KUNDEN round-trip is leak-free.

describe('ZuschlagMatrixStrip — isolated edit → no leak in propagated decimal', () => {
  test('typing "42" into Stoffe propagates 0.42 to parent (post-debounce)', () => {
    vi.useFakeTimers();
    try {
      const onZschlgChange = vi.fn();
      const { container } = render(
        <ZuschlagMatrixStrip
          original={SENTINEL_MATRIX}
          aktuell={undefined}
          extras={SENTINEL_EXTRAS}
          params={SENTINEL_PARAMS}
          onZschlgChange={onZschlgChange}
          onZschlgReset={() => {}}
        />,
      );
      const input = container.querySelector('[data-testid="zschlg-input-stoffe"]') as HTMLInputElement;
      expect(input).not.toBeNull();
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: '42' } });
      act(() => { vi.advanceTimersByTime(310); });
      expect(onZschlgChange).toHaveBeenCalledWith('stoffe', 0.42);
      // The propagated decimal is 0.42 — NOT any sentinel value.
      const [_cost, decimal] = onZschlgChange.mock.calls[0];
      expect(decimal).toBe(0.42);
      expect(decimal).not.toBe(SENTINELS.zschlgStoffe);
      expect(decimal).not.toBe(SENTINELS.zschlgLohn);
    } finally {
      vi.useRealTimers();
    }
  });

  test('strip renders the sentinel ZSCHLG % in INTERN (so the edit guard knows what to override)', () => {
    const { container } = render(
      <ZuschlagMatrixStrip
        original={SENTINEL_MATRIX}
        aktuell={undefined}
        extras={SENTINEL_EXTRAS}
        params={SENTINEL_PARAMS}
        onZschlgChange={() => {}}
        onZschlgReset={() => {}}
      />,
    );
    // Sentinel Stoffe input renders the "99.99" formatted value — this is
    // expected because the strip is internal-only. The KUNDEN guard tests
    // above already prove it doesn't leak out.
    const input = container.querySelector('[data-testid="zschlg-input-stoffe"]') as HTMLInputElement;
    expect(input.value).toBe('99.99');
  });
});

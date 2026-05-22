/**
 * Round 4 PART O + Q tests
 *
 * PART Q — the Zuschlag matrix strip renders in INTERN with the captured
 * data; ZSCHLG cells are editable; EK/VK/DIFFERNZ cells are read-only.
 * PART O — live recompute fires when ZSCHLG changes (via the parent
 * callback); reset restores the original.
 *
 * Plus: the FULL sentinel-leak guard with FOUR new sentinels — ZSCHLG
 * Stoffe / Lohn / Stundensatz / Überschuss — none may appear anywhere
 * in KUNDEN-view DOM under any condition.
 */

import { describe, test, expect, vi } from 'vitest';
import { fireEvent, render, screen, act } from '@testing-library/react';
import PositionTableV2 from '../PositionTableV2';
import { LV3_BH_FIXTURE, SENTINELS } from '../__fixtures__/lv3_bh';
import { DEFAULT_CALC_PARAMS } from '../calc';
import type { ZuschlagMatrix, HeaderExtras } from '../types';

const SENTINEL_MATRIX: ZuschlagMatrix = {
  // The first cost-type row uses SENTINEL ZSCHLG so the leak test has
  // distinctive values to grep for. The others use plausible defaults.
  stoffe:  { ekTotal: 1000, zschlgPct: SENTINELS.zschlgStoffe, vkTotal: 1999.9, differnz: 999.9 },
  nu:      { ekTotal: 500,  zschlgPct: 0.23, vkTotal: 615, differnz: 115 },
  geraete: { ekTotal: 200,  zschlgPct: 0.10, vkTotal: 220, differnz: 20 },
  lohn:    { ekTotal: 800,  zschlgPct: SENTINELS.zschlgLohn, vkTotal: 1511.04, differnz: 711.04 },
};
const SENTINEL_EXTRAS: HeaderExtras = {
  mitarbeiter: 3,
  gesStunden: 500,
  arbeitstage: 62,
  monate: 2.9,
  ueberschuss: SENTINELS.ueberschuss,  // sentinel
  zeitwert: -0.15,
  kontrollsumme: 0,
};

function renderIntern(overrides: Partial<React.ComponentProps<typeof PositionTableV2>> = {}) {
  return render(
    <PositionTableV2
      positions={LV3_BH_FIXTURE.positions}
      params={{ ...DEFAULT_CALC_PARAMS, verrechnungslohn: SENTINELS.stundensatz }}
      onChange={() => {}}
      view="intern"
      zuschlagOriginal={SENTINEL_MATRIX}
      headerExtras={SENTINEL_EXTRAS}
      {...overrides}
    />,
  );
}

function renderKunden(overrides: Partial<React.ComponentProps<typeof PositionTableV2>> = {}) {
  return render(
    <PositionTableV2
      positions={LV3_BH_FIXTURE.positions}
      params={{ ...DEFAULT_CALC_PARAMS, verrechnungslohn: SENTINELS.stundensatz }}
      onChange={() => {}}
      view="kunden"
      projectMeta={{
        name: LV3_BH_FIXTURE.name,
        client: LV3_BH_FIXTURE.client,
        service: LV3_BH_FIXTURE.service,
        tenderNumber: LV3_BH_FIXTURE.tenderNumber,
        deadline: LV3_BH_FIXTURE.deadline,
        bidder: LV3_BH_FIXTURE.bidder,
      }}
      zuschlagOriginal={SENTINEL_MATRIX}
      headerExtras={SENTINEL_EXTRAS}
      {...overrides}
    />,
  );
}

describe('Round 4 PART Q — Zuschlag matrix strip renders in INTERN', () => {
  test('strip mounts when zuschlagOriginal is provided', () => {
    renderIntern();
    expect(screen.getByTestId('zuschlag-matrix-strip')).toBeTruthy();
  });

  test('strip is NOT rendered when zuschlagOriginal is absent (old projects)', () => {
    render(
      <PositionTableV2
        positions={LV3_BH_FIXTURE.positions}
        params={DEFAULT_CALC_PARAMS}
        onChange={() => {}}
        view="intern"
      />,
    );
    expect(screen.queryByTestId('zuschlag-matrix-strip')).toBeNull();
  });

  test('ZSCHLG cells are editable <input>s; EK/VK/DIFFERNZ cells are read-only', () => {
    const { container } = renderIntern();
    // Editable inputs exist for every cost type.
    expect(container.querySelector('[data-testid="zschlg-input-stoffe"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="zschlg-input-nu"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="zschlg-input-geraete"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="zschlg-input-lohn"]')).not.toBeNull();
    // EK / VK / DIFFERNZ are display-only.
    for (const cost of ['stoffe', 'nu', 'geraete', 'lohn']) {
      expect(container.querySelector(`[data-readonly="ek-${cost}"]`)).not.toBeNull();
      expect(container.querySelector(`[data-readonly="vk-${cost}"]`)).not.toBeNull();
      expect(container.querySelector(`[data-readonly="diff-${cost}"]`)).not.toBeNull();
    }
  });
});

describe('Round 4 PART O — ZSCHLG edit fires onZschlgChange (debounced 300ms)', () => {
  test('typing in a ZSCHLG cell fires onZschlgChange after debounce', async () => {
    vi.useFakeTimers();
    try {
      const onZschlgChange = vi.fn();
      renderIntern({ onZschlgChange });
      const input = screen.getByTestId('zschlg-input-stoffe') as HTMLInputElement;
      // Simulate typing "30" → expect onZschlgChange(stoffe, 0.30) after 300ms.
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: '30' } });
      expect(onZschlgChange).not.toHaveBeenCalled();
      act(() => {
        vi.advanceTimersByTime(310);
      });
      expect(onZschlgChange).toHaveBeenCalledWith('stoffe', 0.30);
    } finally {
      vi.useRealTimers();
    }
  });

  test('blur commits immediately (no debounce wait)', () => {
    const onZschlgChange = vi.fn();
    renderIntern({ onZschlgChange });
    const input = screen.getByTestId('zschlg-input-nu') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '25' } });
    fireEvent.blur(input);
    // Last call wins; expect 0.25 to be committed.
    const lastCall = onZschlgChange.mock.calls[onZschlgChange.mock.calls.length - 1];
    expect(lastCall[0]).toBe('nu');
    expect(lastCall[1]).toBe(0.25);
  });

  test('reset link appears when an override is set and fires onZschlgReset', () => {
    const onZschlgReset = vi.fn();
    const { container } = renderIntern({
      zuschlagAktuell: { stoffe: 0.30 }, // different from SENTINEL stoffe (0.9999)
      onZschlgReset,
    });
    // The reset button shows the original % (99.9%) as its text. Find it
    // by the `title="Original: ..."` attribute.
    const resetBtn = container.querySelector('button[title^="Original:"]') as HTMLButtonElement | null;
    expect(resetBtn).not.toBeNull();
    fireEvent.click(resetBtn!);
    expect(onZschlgReset).toHaveBeenCalledWith('stoffe');
  });
});

describe('Round 4 PART O+Q — KUNDEN view leak guard (ZSCHLG sentinels)', () => {
  test('Zuschlag matrix strip does NOT render in KUNDEN view', () => {
    renderKunden();
    expect(screen.queryByTestId('zuschlag-matrix-strip')).toBeNull();
  });

  test('NONE of the new sentinels (ZSCHLG/Stundensatz/Überschuss) appear in KUNDEN DOM', () => {
    const { container } = renderKunden();
    const preview = container.querySelector('[data-testid="v2-kunden-preview"]')!;
    const html = preview.outerHTML;

    // Numeric sentinels (raw + German-formatted)
    const checks: Array<[string, string]> = [
      ['ZSCHLG Stoffe (decimal)', String(SENTINELS.zschlgStoffe)],
      ['ZSCHLG Stoffe (percent)', '99,99'],
      ['ZSCHLG Stoffe (percent alt)', '99.99'],
      ['ZSCHLG Lohn (decimal)', String(SENTINELS.zschlgLohn)],
      ['ZSCHLG Lohn (percent)', '88,88'],
      ['Stundensatz €', String(SENTINELS.stundensatz)],
      ['Stundensatz formatted', '66,66'],
      ['Überschuss raw', String(SENTINELS.ueberschuss)],
      ['Überschuss formatted', '77.777,77'],
    ];
    for (const [name, token] of checks) {
      expect(html.includes(token), `${name} ("${token}") leaked into KUNDEN view`).toBe(false);
    }
  });

  test('KUNDEN view still renders the actual customer positions (positive control)', () => {
    renderKunden();
    // At least one customer-visible position from the fixture must be present.
    const preview = screen.getByTestId('v2-kunden-preview');
    expect(preview.textContent).toMatch(/(RZA01|Überwachungszentrale|Hausanschluss|SIA01)/);
  });
});

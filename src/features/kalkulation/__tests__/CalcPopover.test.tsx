/**
 * Tests for the scratch-calc popover (Σ icon next to Material EK /
 * Min/Einheit / NU EK in INTERN view).
 *
 * Covers:
 *   1. Trigger renders when calcContext is provided; commits result on
 *      Übernehmen.
 *   2. The `Q` token resolves to the position's Menge.
 *   3. Named Faktoren-Bibliothek tokens get substituted before evaluation
 *      (longest-name-first so "kabelrinne" wins over "kabel").
 *   4. Multi-line + leading-minus subtraction (REB-23.003-lite parity).
 *   5. KUNDEN view leak guard — the popover and faktoren chips NEVER
 *      render in customer-facing DOM.
 */

import { describe, test, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import PositionTableV2 from '../PositionTableV2';
import CalcPopover from '../CalcPopover';
import { LV3_BH_FIXTURE } from '../__fixtures__/lv3_bh';
import type { FaktorEntry } from '../types';

const FAKTOREN: FaktorEntry[] = [
  { name: 'schlitz', einheit: 'm', ep: 5, minEinheit: 2, sourceCol: 'N', sourceRow: 2, raw: {} },
  { name: 'querschnitt', einheit: 'mm²', ep: 0.5, minEinheit: 0.1, sourceCol: 'N', sourceRow: 3, raw: {} },
  { name: 'kabelrinne', einheit: 'm', ep: 12, minEinheit: 3, sourceCol: 'N', sourceRow: 4, raw: {} },
  { name: 'kabel', einheit: 'm', ep: 2.5, minEinheit: 0.5, sourceCol: 'N', sourceRow: 5, raw: {} },
  // Distinctive leak-test factor — the name + EP value must never appear
  // in KUNDEN-view HTML even when faktoren are passed in via props.
  // Use a string that doesn't collide with anything in LV3_BH_FIXTURE
  // (which has "SENTINEL" rows of its own).
  { name: 'calcleakcanary', einheit: 'x', ep: 12345678.99, minEinheit: 99, sourceCol: 'N', sourceRow: 6, raw: {} },
];

describe('CalcPopover — open / evaluate / apply', () => {
  test('trigger button renders', () => {
    const onApply = vi.fn();
    render(
      <CalcPopover initialValue={0} faktoren={FAKTOREN} contextMenge={4} onApply={onApply} label="Material EK" />,
    );
    expect(screen.getByTestId('calc-trigger')).toBeTruthy();
  });

  test('click trigger opens popover, type expression, Übernehmen commits the total', () => {
    const onApply = vi.fn();
    render(
      <CalcPopover initialValue={0} faktoren={FAKTOREN} contextMenge={4} onApply={onApply} label="Material EK" />,
    );
    fireEvent.click(screen.getByTestId('calc-trigger'));
    const popover = screen.getByTestId('calc-popover');
    expect(popover).toBeTruthy();

    const textarea = popover.querySelector('textarea')!;
    fireEvent.change(textarea, { target: { value: '5 + 22 * 0.5' } });

    fireEvent.click(screen.getByTestId('calc-apply'));
    expect(onApply).toHaveBeenCalledWith(16); // 5 + 11
  });

  test('Q token resolves to the position Menge', () => {
    const onApply = vi.fn();
    render(<CalcPopover initialValue={0} contextMenge={7} onApply={onApply} />);
    fireEvent.click(screen.getByTestId('calc-trigger'));
    const textarea = screen.getByTestId('calc-popover').querySelector('textarea')!;
    fireEvent.change(textarea, { target: { value: '3 * Q + 1' } });
    fireEvent.click(screen.getByTestId('calc-apply'));
    expect(onApply).toHaveBeenCalledWith(22); // 3*7 + 1
  });

  test('named factor tokens substitute correctly (whole-word, longest-name-first)', () => {
    const onApply = vi.fn();
    render(<CalcPopover initialValue={0} faktoren={FAKTOREN} contextMenge={10} onApply={onApply} />);
    fireEvent.click(screen.getByTestId('calc-trigger'));
    const textarea = screen.getByTestId('calc-popover').querySelector('textarea')!;
    // schlitz=5, querschnitt=0.5 → 5 + 10*0.5 = 10
    fireEvent.change(textarea, { target: { value: 'schlitz + Q * querschnitt' } });
    fireEvent.click(screen.getByTestId('calc-apply'));
    expect(onApply).toHaveBeenCalledWith(10);
  });

  test('longest-name-first: "kabelrinne" does NOT get rewritten as "2.5 + rinne"', () => {
    const onApply = vi.fn();
    render(<CalcPopover initialValue={0} faktoren={FAKTOREN} contextMenge={1} onApply={onApply} />);
    fireEvent.click(screen.getByTestId('calc-trigger'));
    const textarea = screen.getByTestId('calc-popover').querySelector('textarea')!;
    fireEvent.change(textarea, { target: { value: 'kabelrinne' } });
    fireEvent.click(screen.getByTestId('calc-apply'));
    expect(onApply).toHaveBeenCalledWith(12); // kabelrinne=12, not 2.5 then "rinne" left over
  });

  test('multi-line + leading-minus subtraction', () => {
    // Use multi-operand expressions on each line — the evaluator splits
    // "annotation expression" by finding the first run of digits/operators,
    // so a bare "0.5" without operators reads as annotation-only.
    const onApply = vi.fn();
    render(<CalcPopover initialValue={0} onApply={onApply} />);
    fireEvent.click(screen.getByTestId('calc-trigger'));
    const textarea = screen.getByTestId('calc-popover').querySelector('textarea')!;
    fireEvent.change(textarea, {
      // Separator between annotation and expression is ≥2 spaces or tab
      // (REB-23.003 convention — see aufmass.ts). Single space stays in
      // the annotation so labels like "Wand 1" don't get their digit eaten.
      target: { value: 'Wand 1   3 * 4\n- Tür    1 * 2\nZuschnitt   1 * 0.5' },
    });
    fireEvent.click(screen.getByTestId('calc-apply'));
    expect(onApply).toHaveBeenCalledWith(10.5); // 12 - 2 + 0.5
  });

  test('factor chip click inserts the name into the expression', () => {
    const onApply = vi.fn();
    render(<CalcPopover initialValue={0} faktoren={FAKTOREN} contextMenge={1} onApply={onApply} />);
    fireEvent.click(screen.getByTestId('calc-trigger'));
    const chip = screen.getByTestId('faktor-chip-schlitz');
    fireEvent.click(chip);
    const textarea = screen.getByTestId('calc-popover').querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.value).toContain('schlitz');
  });
});

describe('CalcPopover — KUNDEN view leak guard', () => {
  test('Σ trigger does NOT appear in KUNDEN view', () => {
    const { container } = render(
      <PositionTableV2
        positions={LV3_BH_FIXTURE.positions}
        params={LV3_BH_FIXTURE.calcParams}
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
        faktoren={FAKTOREN}
      />,
    );
    expect(container.querySelector('[data-testid="calc-trigger"]')).toBeNull();
    expect(container.querySelector('[data-testid="faktor-chip-calcleakcanary"]')).toBeNull();
    // The distinctive leak-canary factor's name + EP must not appear anywhere.
    expect(container.innerHTML.includes('calcleakcanary')).toBe(false);
    expect(container.innerHTML.includes('12345678')).toBe(false);
  });

  test('Σ trigger DOES appear in INTERN view per editable cell', () => {
    const { container } = render(
      <PositionTableV2
        positions={LV3_BH_FIXTURE.positions}
        params={LV3_BH_FIXTURE.calcParams}
        onChange={() => {}}
        view="intern"
        faktoren={FAKTOREN}
      />,
    );
    const triggers = container.querySelectorAll('[data-testid="calc-trigger"]');
    // 3 triggers per position (Material EK / Min/Einheit / NU EK); fixture
    // has at least the 8 visible-customer rows from LV3_BH_FIXTURE.
    expect(triggers.length).toBeGreaterThan(10);
  });
});

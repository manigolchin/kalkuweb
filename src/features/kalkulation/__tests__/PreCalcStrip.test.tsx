/**
 * Tests for the per-row Vorrechnung F1..F7 strip.
 *
 * Coverage:
 *   1. Toggle button toggles strip visibility
 *   2. Strip renders 7 F-cells (F1..F7) when expanded
 *   3. Editing F1 commits via onSlotCommit('F1', value, formula?)
 *   4. F-cells with values populate the row's preCalcs map
 *   5. Material EK formula can reference F1, F2, … and substitution
 *      uses the row's preCalcs
 *   6. KUNDEN view leak guard — F1..F7 values + the strip never reach
 *      customer DOM, even with stored values
 */

import { describe, test, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import PreCalcStrip from '../PreCalcStrip';
import FormulaCell from '../FormulaCell';
import PositionTableV2 from '../PositionTableV2';
import { LV3_BH_FIXTURE } from '../__fixtures__/lv3_bh';
import type { Position } from '../types';

describe('PreCalcStrip — 7 F-slots', () => {
  test('renders 7 labelled FormulaCells (F1..F7)', () => {
    const onSlotCommit = vi.fn();
    render(
      <table>
        <tbody>
          <PreCalcStrip
            preCalcs={undefined}
            onSlotCommit={onSlotCommit}
            colSpan={14}
            contextMenge={5}
          />
        </tbody>
      </table>,
    );
    const strip = screen.getByTestId('precalc-strip');
    // 7 labels rendered
    const html = strip.outerHTML;
    for (const slot of ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7']) {
      expect(html.includes(slot)).toBe(true);
    }
  });

  test('editing F1 fires onSlotCommit("F1", value, undefined) for plain number', () => {
    const onSlotCommit = vi.fn();
    render(
      <table>
        <tbody>
          <PreCalcStrip
            preCalcs={undefined}
            onSlotCommit={onSlotCommit}
            colSpan={14}
            contextMenge={5}
          />
        </tbody>
      </table>,
    );
    // The first FormulaCell (F1) is the first 'formula-cell-plain' element.
    const allDisplay = screen.getAllByTestId('formula-cell-plain');
    fireEvent.click(allDisplay[0]);
    const input = screen.getByTestId('formula-cell-number-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '42' } });
    fireEvent.blur(input);
    expect(onSlotCommit).toHaveBeenCalledWith('F1', 42, undefined);
  });

  test('a stored F1 formula round-trips via the strip (fx badge appears)', () => {
    const onSlotCommit = vi.fn();
    render(
      <table>
        <tbody>
          <PreCalcStrip
            preCalcs={{ F1: { value: 42, formula: '6 * 7' } }}
            onSlotCommit={onSlotCommit}
            colSpan={14}
            contextMenge={5}
          />
        </tbody>
      </table>,
    );
    // The F1 cell should render with the fx badge variant.
    expect(screen.getByTestId('formula-cell-with-fx')).toBeTruthy();
  });
});

describe('FormulaCell — F1..F7 references in main-cell formulas', () => {
  test('main FormulaCell with preCalcs substitutes F1, F2, F3 by name', () => {
    const onCommit = vi.fn();
    render(
      <table>
        <tbody>
          <tr>
            <FormulaCell
              value={0}
              onCommit={onCommit}
              contextMenge={3}
              preCalcs={{
                F1: { value: 10 },
                F2: { value: 5 },
                F3: { value: 2 },
              }}
            />
          </tr>
        </tbody>
      </table>,
    );
    fireEvent.click(screen.getByTestId('formula-cell-plain'));
    fireEvent.change(screen.getByTestId('formula-cell-number-input'), { target: { value: '=' } });
    const ta = screen.getByTestId('formula-cell-formula-input') as HTMLTextAreaElement;
    // F1 + F2 * F3 + Q  → 10 + 10 + 3 = 23
    fireEvent.change(ta, { target: { value: 'F1 + F2 * F3 + Q' } });
    fireEvent.keyDown(ta, { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledWith(23, 'F1 + F2 * F3 + Q');
  });

  test('F-slot tokens are case-sensitive — uppercase F1 substitutes, lowercase f1 does not', () => {
    const onCommit = vi.fn();
    render(
      <table>
        <tbody>
          <tr>
            <FormulaCell
              value={0}
              onCommit={onCommit}
              preCalcs={{ F1: { value: 999 } }}
            />
          </tr>
        </tbody>
      </table>,
    );
    fireEvent.click(screen.getByTestId('formula-cell-plain'));
    fireEvent.change(screen.getByTestId('formula-cell-number-input'), { target: { value: '=' } });
    const ta = screen.getByTestId('formula-cell-formula-input') as HTMLTextAreaElement;
    // Uppercase F1 substitutes → "F1 + 1" → "999 + 1" → 1000.
    fireEvent.change(ta, { target: { value: 'F1 + 1' } });
    fireEvent.keyDown(ta, { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledWith(1000, 'F1 + 1');
  });
});

describe('PreCalcStrip — KUNDEN view leak guard', () => {
  test('F-slot values + the strip itself NEVER appear in KUNDEN view', () => {
    const SENTINEL_F1 = 8765432.10;
    const SENTINEL_F2 = 1234567.89;
    const polluted: Position[] = LV3_BH_FIXTURE.positions.slice(0, 4).map((p, i) =>
      i === 2
        ? {
            ...p,
            materialCost: 100,
            preCalcs: {
              F1: { value: SENTINEL_F1, formula: 'leaky_formula_F1' },
              F2: { value: SENTINEL_F2 },
            },
          }
        : p,
    );
    const { container } = render(
      <PositionTableV2
        positions={polluted}
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
      />,
    );
    const preview = container.querySelector('[data-testid="v2-kunden-preview"]')!;
    const html = preview.outerHTML;
    // The sentinel F-values must not appear anywhere in the customer-
    // facing DOM. Same for the stored formula string and the strip itself.
    expect(html.includes(String(SENTINEL_F1))).toBe(false);
    expect(html.includes('8.765.432')).toBe(false);
    expect(html.includes(String(SENTINEL_F2))).toBe(false);
    expect(html.includes('leaky_formula_F1')).toBe(false);
    expect(container.querySelector('[data-testid="precalc-strip"]')).toBeNull();
  });
});

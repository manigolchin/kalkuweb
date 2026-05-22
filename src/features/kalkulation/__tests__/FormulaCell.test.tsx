/**
 * Tests for the inline FormulaCell — the rebuilt scratch-calculator UX
 * that replaced the v1 modal CalcPopover.
 *
 * Coverage:
 *   1. Display mode → click → number-input mode (single-line)
 *   2. Typing `=` as first char promotes to formula mode (multiline,
 *      green border, fx preview pill)
 *   3. Formula evaluation with named factors + Q token
 *   4. Tab accepts autocomplete suggestion
 *   5. Enter commits, stores formula on the position
 *   6. Esc cancels — no commit
 *   7. Cell with a stored formula renders an fx badge + commits formula
 *      string via onCommit's second arg
 *   8. Plain-number commit clears any prior formula (onCommit(_, undefined))
 *   9. KUNDEN view leak guard — formula text + factor values never reach
 *      customer DOM
 */

import { describe, test, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import FormulaCell from '../FormulaCell';
import PositionTableV2 from '../PositionTableV2';
import { LV3_BH_FIXTURE } from '../__fixtures__/lv3_bh';
import type { FaktorEntry, Position } from '../types';

const FAKTOREN: FaktorEntry[] = [
  { name: 'schlitz', einheit: 'm', ep: 5, minEinheit: 2, sourceCol: 'N', sourceRow: 2, raw: {} },
  { name: 'querschnitt', einheit: 'mm²', ep: 0.5, minEinheit: 0.1, sourceCol: 'N', sourceRow: 3, raw: {} },
  { name: 'kabelrinne', einheit: 'm', ep: 12, minEinheit: 3, sourceCol: 'N', sourceRow: 4, raw: {} },
  { name: 'kabel', einheit: 'm', ep: 2.5, minEinheit: 0.5, sourceCol: 'N', sourceRow: 5, raw: {} },
];

function renderCell(
  overrides: Partial<React.ComponentProps<typeof FormulaCell>> = {},
  onCommit: (value: number, formula: string | undefined) => void = vi.fn(),
) {
  // Wrap in a <table> so the <td> root has a valid parent.
  return {
    onCommit,
    ...render(
      <table>
        <tbody>
          <tr>
            <FormulaCell value={0} onCommit={onCommit} {...overrides} />
          </tr>
        </tbody>
      </table>,
    ),
  };
}

describe('FormulaCell — display + edit modes', () => {
  test('display mode renders a read-only-looking input with the formatted value', () => {
    renderCell({ value: 1071.54 });
    const cell = screen.getByTestId('formula-cell-plain') as HTMLInputElement;
    expect(cell.value).toBe('1.071,54');
    expect(cell.readOnly).toBe(true);
  });

  test('click → switches to number-input mode (editable input)', () => {
    renderCell();
    fireEvent.click(screen.getByTestId('formula-cell-plain'));
    expect(screen.getByTestId('formula-cell-number-input')).toBeTruthy();
  });

  test('typing `=` in number mode promotes to formula mode', () => {
    renderCell();
    fireEvent.click(screen.getByTestId('formula-cell-plain'));
    const input = screen.getByTestId('formula-cell-number-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '=' } });
    expect(screen.queryByTestId('formula-cell-formula-mode')).not.toBeNull();
    expect(screen.queryByTestId('formula-cell-formula-input')).not.toBeNull();
  });

  test('typing a plain number + Enter commits without a formula', () => {
    const onCommit = vi.fn();
    renderCell({}, onCommit);
    fireEvent.click(screen.getByTestId('formula-cell-plain'));
    const input = screen.getByTestId('formula-cell-number-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '123,45' } });
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenCalledWith(123.45, undefined);
  });
});

describe('FormulaCell — formula evaluation', () => {
  test('formula with named factors + Q evaluates correctly on Enter', () => {
    const onCommit = vi.fn();
    renderCell({ faktoren: FAKTOREN, contextMenge: 10 }, onCommit);
    fireEvent.click(screen.getByTestId('formula-cell-plain'));
    const numInput = screen.getByTestId('formula-cell-number-input') as HTMLInputElement;
    fireEvent.change(numInput, { target: { value: '=' } });
    const ta = screen.getByTestId('formula-cell-formula-input') as HTMLTextAreaElement;
    // schlitz=5, querschnitt=0.5, Q=10 → 5 + 10*0.5 = 10
    fireEvent.change(ta, { target: { value: 'schlitz + Q * querschnitt' } });
    fireEvent.keyDown(ta, { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledWith(10, 'schlitz + Q * querschnitt');
  });

  test('longest-name-first prevents "kabelrinne" being rewritten as "kabel"+rinne', () => {
    const onCommit = vi.fn();
    renderCell({ faktoren: FAKTOREN, contextMenge: 1 }, onCommit);
    fireEvent.click(screen.getByTestId('formula-cell-plain'));
    fireEvent.change(screen.getByTestId('formula-cell-number-input'), { target: { value: '=' } });
    const ta = screen.getByTestId('formula-cell-formula-input') as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: 'kabelrinne' } });
    fireEvent.keyDown(ta, { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledWith(12, 'kabelrinne');
  });

  test('Esc cancels without committing', () => {
    const onCommit = vi.fn();
    renderCell({}, onCommit);
    fireEvent.click(screen.getByTestId('formula-cell-plain'));
    fireEvent.change(screen.getByTestId('formula-cell-number-input'), { target: { value: '=' } });
    const ta = screen.getByTestId('formula-cell-formula-input') as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: '999' } });
    fireEvent.keyDown(ta, { key: 'Escape' });
    expect(onCommit).not.toHaveBeenCalled();
  });

  test('formula with parse error does NOT commit on Enter (stays in formula mode)', () => {
    const onCommit = vi.fn();
    renderCell({}, onCommit);
    fireEvent.click(screen.getByTestId('formula-cell-plain'));
    fireEvent.change(screen.getByTestId('formula-cell-number-input'), { target: { value: '=' } });
    const ta = screen.getByTestId('formula-cell-formula-input') as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: '5 +' } });
    fireEvent.keyDown(ta, { key: 'Enter' });
    expect(onCommit).not.toHaveBeenCalled();
    // Still in formula mode
    expect(screen.queryByTestId('formula-cell-formula-input')).not.toBeNull();
  });
});

describe('FormulaCell — stored formula round-trip', () => {
  test('cell with formula prop shows fx badge + tooltip', () => {
    renderCell({ value: 22, formula: 'schlitz + Q*querschnitt' });
    const cell = screen.getByTestId('formula-cell-with-fx');
    expect(cell.title).toContain('schlitz + Q*querschnitt');
  });

  test('click on fx cell drops directly into formula mode (no `=` re-typing needed)', () => {
    renderCell({ value: 22, formula: 'schlitz + Q' });
    fireEvent.click(screen.getByTestId('formula-cell-with-fx'));
    const ta = screen.getByTestId('formula-cell-formula-input') as HTMLTextAreaElement;
    expect(ta.value).toBe('schlitz + Q');
  });
});

describe('FormulaCell — autocomplete', () => {
  test('typing a factor prefix shows a Tab-to-complete hint', () => {
    renderCell({ faktoren: FAKTOREN, contextMenge: 1 });
    fireEvent.click(screen.getByTestId('formula-cell-plain'));
    fireEvent.change(screen.getByTestId('formula-cell-number-input'), { target: { value: '=' } });
    const ta = screen.getByTestId('formula-cell-formula-input') as HTMLTextAreaElement;
    // Type "schl" → suggestion is "itz" (completes to "schlitz")
    fireEvent.change(ta, { target: { value: 'schl' } });
    fireEvent.select(ta, { target: { selectionStart: 4 } });
    // Hint contains the Tab kbd hint
    const hint = ta.parentElement?.parentElement?.textContent ?? '';
    expect(hint).toMatch(/Tab/);
  });
});

describe('FormulaCell — KUNDEN view leak guard', () => {
  test('formula text + factor values do NOT appear in KUNDEN-view DOM', () => {
    // Inject a position with a stored formula referencing a sentinel factor.
    const SENTINEL_FORMULA = 'leakcanary + Q';
    const SENTINEL_VALUE_IN_FORMULA = 'leakcanary';
    const SENTINEL_FACTOR: FaktorEntry = {
      name: 'leakcanary', einheit: 'x', ep: 87654321.0, minEinheit: 99,
      sourceCol: 'N', sourceRow: 2, raw: {},
    };
    const polluted: Position[] = LV3_BH_FIXTURE.positions.slice(0, 4).map((p, i) =>
      i === 2
        ? { ...p, materialCost: 100, materialFormula: SENTINEL_FORMULA }
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
        faktoren={[SENTINEL_FACTOR]}
      />,
    );
    const preview = container.querySelector('[data-testid="v2-kunden-preview"]')!;
    const html = preview.outerHTML;
    expect(html.includes(SENTINEL_VALUE_IN_FORMULA)).toBe(false);
    expect(html.includes(SENTINEL_FORMULA)).toBe(false);
    expect(html.includes('87654321')).toBe(false);
    expect(html.includes('fx ')).toBe(false); // no fx pill in customer view
    expect(container.querySelector('[data-testid="formula-cell-formula-mode"]')).toBeNull();
  });
});

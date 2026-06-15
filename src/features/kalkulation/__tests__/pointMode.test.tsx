/**
 * F-cell "point mode" — the Excel click-to-insert-a-reference flow.
 *
 * The user's example: F1 = 50, F2 = 59, edit the Material cell, click F1 then
 * F2 → the formula becomes "F1+F2" and commits to 109. Clicking an F-cell must
 * NOT blur-commit the formula being built.
 */

import { describe, test, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import FormulaCell, { type PreCalcs } from '../FormulaCell';
import { KalkGridProvider, type RowDescriptor } from '../kalkGridContext';

const ROWS: RowDescriptor[] = [{ rowId: 'r1', hasPreCalc: true }];
const PRECALCS: PreCalcs = { F1: { value: 50 }, F2: { value: 59 } };

function PointGrid({ onCommit }: { onCommit: (v: number, f: string | undefined) => void }) {
  const noop = vi.fn();
  return (
    <KalkGridProvider orderedRows={ROWS}>
      <table>
        <tbody>
          <tr>
            <FormulaCell
              value={0}
              onCommit={onCommit}
              rowId="r1"
              col="material"
              preCalcs={PRECALCS}
              contextMenge={1}
            />
          </tr>
          <tr>
            <FormulaCell value={50} onCommit={noop} rowId="r1" col="F1" preCalcs={PRECALCS} />
            <FormulaCell value={59} onCommit={noop} rowId="r1" col="F2" preCalcs={PRECALCS} />
          </tr>
        </tbody>
      </table>
    </KalkGridProvider>
  );
}

function fCell(container: HTMLElement, col: string): HTMLElement {
  // The F-cell's <td> is the clickable target (carries onClick/onMouseDown).
  const input = container.querySelector(`input[data-cell-col="${col}"]`);
  const td = input?.closest('td');
  if (!td) throw new Error(`F-cell ${col} not found`);
  return td as HTMLElement;
}

function materialField(container: HTMLElement): HTMLInputElement {
  return container.querySelector<HTMLInputElement>(
    'input[data-cell-row="r1"][data-cell-col="material"]',
  )!;
}

describe('FormulaCell — F-cell point mode', () => {
  test('clicking F1 then F2 builds "F1+F2" and commits the sum (109)', () => {
    const onCommit = vi.fn();
    const { container } = render(<PointGrid onCommit={onCommit} />);

    // Enter formula mode on the Material cell by typing `=`.
    const mat = materialField(container);
    mat.focus();
    fireEvent.keyDown(mat, { key: '=' });

    const ta = container.querySelector<HTMLTextAreaElement>(
      '[data-testid="formula-cell-formula-input"]',
    )!;
    expect(ta).not.toBeNull();

    // Click F1, then F2 (mousedown is what would normally blur the textarea).
    const f1 = fCell(container, 'F1');
    fireEvent.mouseDown(f1);
    fireEvent.click(f1);
    expect(ta.value).toBe('F1');

    const f2 = fCell(container, 'F2');
    fireEvent.mouseDown(f2);
    fireEvent.click(f2);
    expect(ta.value).toBe('F1+F2');

    // Still editing the formula (the F-clicks did not blur-commit it).
    expect(
      container.querySelector('[data-testid="formula-cell-formula-mode"]'),
    ).not.toBeNull();
    expect(onCommit).not.toHaveBeenCalled();

    // Commit with Enter → F1(50) + F2(59) = 109.
    fireEvent.keyDown(ta, { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledWith(109, 'F1+F2');
  });

  test('F-cells advertise as point targets (dashed outline) only while a formula is open', () => {
    const { container } = render(<PointGrid onCommit={vi.fn()} />);
    const f1Input = container.querySelector('input[data-cell-col="F1"]')!;
    // No formula open yet → no point-target styling.
    expect(f1Input.className).not.toMatch(/outline-dashed/);

    const mat = materialField(container);
    mat.focus();
    fireEvent.keyDown(mat, { key: '=' });

    // Now the Material cell is the point origin → F-cells become targets.
    const f1After = container.querySelector('input[data-cell-col="F1"]')!;
    expect(f1After.className).toMatch(/outline-dashed/);
  });

  test('mousedown on a point-target F-cell is prevented (keeps the formula focused)', () => {
    const { container } = render(<PointGrid onCommit={vi.fn()} />);
    const mat = materialField(container);
    mat.focus();
    fireEvent.keyDown(mat, { key: '=' });

    const f1 = fCell(container, 'F1');
    const ev = fireEvent.mouseDown(f1);
    // fireEvent returns false when preventDefault() was called on the event.
    expect(ev).toBe(false);
  });

  test('a single click without an operator inserts the bare reference (no leading +)', () => {
    const onCommit = vi.fn();
    const { container } = render(<PointGrid onCommit={onCommit} />);
    const mat = materialField(container);
    mat.focus();
    fireEvent.keyDown(mat, { key: '=' });

    const ta = container.querySelector<HTMLTextAreaElement>(
      '[data-testid="formula-cell-formula-input"]',
    )!;
    const f2 = fCell(container, 'F2');
    fireEvent.mouseDown(f2);
    fireEvent.click(f2);
    expect(ta.value).toBe('F2');
    fireEvent.keyDown(ta, { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledWith(59, 'F2');
  });
});

/**
 * Excel-style keyboard navigation for FormulaCell, exercised inside a real
 * KalkGridProvider (the behaviour is inert without one — see FormulaCell.test).
 *
 *   ↑↓←→ move the selected cell · Enter moves down · Tab/Shift+Tab move
 *   right/left (wrapping rows) · typing a digit/`=` begins editing.
 *
 * The harness renders the full set of MAIN_COLS per row (as the real
 * PositionRow does) so navigation indices match the live grid model.
 */

import { describe, test, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import FormulaCell from '../FormulaCell';
import { KalkGridProvider, MAIN_COLS, type RowDescriptor } from '../kalkGridContext';

const ROWS: RowDescriptor[] = [
  { rowId: 'r1', hasPreCalc: false },
  { rowId: 'r2', hasPreCalc: false },
];

function Row({ rowId }: { rowId: string }) {
  return (
    <tr>
      {MAIN_COLS.map((col) => (
        <FormulaCell key={col} value={0} onCommit={vi.fn()} rowId={rowId} col={col} />
      ))}
    </tr>
  );
}

function FullGrid() {
  return (
    <KalkGridProvider orderedRows={ROWS}>
      <table>
        <tbody>
          <Row rowId="r1" />
          <Row rowId="r2" />
        </tbody>
      </table>
    </KalkGridProvider>
  );
}

function cell(container: HTMLElement, rowId: string, col: string): HTMLInputElement {
  const el = container.querySelector<HTMLInputElement>(
    `input[data-cell-row="${rowId}"][data-cell-col="${col}"]`,
  );
  if (!el) throw new Error(`cell ${rowId}/${col} not found`);
  return el;
}

const LAST = MAIN_COLS[MAIN_COLS.length - 1]; // 'epLohn'

describe('FormulaCell — keyboard navigation', () => {
  test('display cells are focusable (tabIndex) inside a provider', () => {
    const { container } = render(<FullGrid />);
    expect(cell(container, 'r1', 'material').tabIndex).toBe(0);
  });

  test('ArrowRight moves focus to the next column', () => {
    const { container } = render(<FullGrid />);
    const start = cell(container, 'r1', 'material');
    start.focus();
    fireEvent.keyDown(start, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(cell(container, 'r1', 'time'));
  });

  test('ArrowLeft moves focus to the previous column', () => {
    const { container } = render(<FullGrid />);
    const start = cell(container, 'r1', 'time');
    start.focus();
    fireEvent.keyDown(start, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(cell(container, 'r1', 'material'));
  });

  test('ArrowDown moves focus to the same column in the next row', () => {
    const { container } = render(<FullGrid />);
    const start = cell(container, 'r1', 'nu');
    start.focus();
    fireEvent.keyDown(start, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(cell(container, 'r2', 'nu'));
  });

  test('ArrowUp moves focus to the same column in the previous row', () => {
    const { container } = render(<FullGrid />);
    const start = cell(container, 'r2', 'material');
    start.focus();
    fireEvent.keyDown(start, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(cell(container, 'r1', 'material'));
  });

  test('ArrowLeft clamps at the first column (no row wrap)', () => {
    const { container } = render(<FullGrid />);
    const start = cell(container, 'r1', 'material');
    start.focus();
    fireEvent.keyDown(start, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(start);
  });

  test('ArrowRight clamps at the last column (no row wrap)', () => {
    const { container } = render(<FullGrid />);
    const start = cell(container, 'r1', LAST);
    start.focus();
    fireEvent.keyDown(start, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(start);
  });

  test('Enter moves down a row (same column)', () => {
    const { container } = render(<FullGrid />);
    const start = cell(container, 'r1', 'material');
    start.focus();
    fireEvent.keyDown(start, { key: 'Enter' });
    expect(document.activeElement).toBe(cell(container, 'r2', 'material'));
  });

  test('Tab wraps from the last column of a row to the first column of the next row', () => {
    const { container } = render(<FullGrid />);
    const start = cell(container, 'r1', LAST);
    start.focus();
    fireEvent.keyDown(start, { key: 'Tab' });
    expect(document.activeElement).toBe(cell(container, 'r2', 'material'));
  });

  test('Shift+Tab moves backwards across the row boundary', () => {
    const { container } = render(<FullGrid />);
    const start = cell(container, 'r2', 'material');
    start.focus();
    fireEvent.keyDown(start, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(cell(container, 'r1', LAST));
  });

  test('typing a digit on a selected cell begins number edit seeded with that digit', () => {
    const { container } = render(<FullGrid />);
    const start = cell(container, 'r1', 'material');
    start.focus();
    fireEvent.keyDown(start, { key: '5' });
    const input = container.querySelector<HTMLInputElement>(
      '[data-testid="formula-cell-number-input"]',
    );
    expect(input).not.toBeNull();
    expect(input!.value).toBe('5');
  });

  test('typing `=` on a selected cell drops straight into formula mode', () => {
    const { container } = render(<FullGrid />);
    const start = cell(container, 'r1', 'material');
    start.focus();
    fireEvent.keyDown(start, { key: '=' });
    expect(
      container.querySelector('[data-testid="formula-cell-formula-mode"]'),
    ).not.toBeNull();
  });
});

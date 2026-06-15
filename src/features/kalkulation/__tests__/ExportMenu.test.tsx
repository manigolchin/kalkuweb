/**
 * Tests for the ExportMenu "Export" dropdown inside ProjectDetail.tsx.
 *
 * Four download actions live behind one trigger:
 *   - Excel          → onExcel    (Kalkulations-Vorlage .xlsx)
 *   - PDF            → onPdf      (Angebot)
 *   - GAEB (DA XML)  → onGaebXml  (.x84)
 *   - GAEB 90        → onGaeb90   (.d84)
 *
 * Mirrors ToolsMenu.test.tsx (happy-dom + fireEvent). No router needed — the
 * menu items are buttons, not links.
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ExportMenu } from '../ProjectDetail';

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}));

type RenderOpts = {
  onExcel?: () => void;
  onPdf?: () => void;
  onGaebXml?: () => void;
  onGaeb90?: () => void;
};

function renderExportMenu(opts: RenderOpts = {}) {
  const onExcel = opts.onExcel ?? vi.fn();
  const onPdf = opts.onPdf ?? vi.fn();
  const onGaebXml = opts.onGaebXml ?? vi.fn();
  const onGaeb90 = opts.onGaeb90 ?? vi.fn();
  const utils = render(
    <ExportMenu onExcel={onExcel} onPdf={onPdf} onGaebXml={onGaebXml} onGaeb90={onGaeb90} />,
  );
  return { ...utils, onExcel, onPdf, onGaebXml, onGaeb90 };
}

const getTrigger = () => screen.getByRole('button', { name: /Export/i });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ExportMenu', () => {
  test('renders a single trigger labelled "Export", closed by default', () => {
    renderExportMenu();
    const trigger = getTrigger();
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('menu')).toBeNull();
  });

  test('opening shows exactly the 4 export formats in order', () => {
    renderExportMenu();
    fireEvent.click(getTrigger());
    const menu = screen.getByRole('menu');
    const items = within(menu).getAllByRole('menuitem');
    expect(items).toHaveLength(4);
    const labels = items.map((el) => el.textContent ?? '');
    expect(labels[0]).toMatch(/Excel/);
    expect(labels[1]).toMatch(/PDF/);
    expect(labels[2]).toMatch(/GAEB \(DA XML\)/);
    expect(labels[3]).toMatch(/GAEB 90/);
  });

  test('each item fires its callback and closes the menu', () => {
    const onExcel = vi.fn();
    const onPdf = vi.fn();
    const onGaebXml = vi.fn();
    const onGaeb90 = vi.fn();
    renderExportMenu({ onExcel, onPdf, onGaebXml, onGaeb90 });

    const click = (name: RegExp) => {
      fireEvent.click(getTrigger());
      fireEvent.click(screen.getByRole('menuitem', { name }));
    };

    click(/Excel/);
    expect(onExcel).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();

    click(/PDF/);
    expect(onPdf).toHaveBeenCalledTimes(1);

    click(/GAEB \(DA XML\)/);
    expect(onGaebXml).toHaveBeenCalledTimes(1);

    click(/GAEB 90/);
    expect(onGaeb90).toHaveBeenCalledTimes(1);
  });

  test('ESC closes the menu', () => {
    renderExportMenu();
    fireEvent.click(getTrigger());
    expect(screen.getByRole('menu')).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
  });

  test('subtitles name the file formats', () => {
    renderExportMenu();
    fireEvent.click(getTrigger());
    expect(screen.getByText(/Kalkulations-Vorlage \(\.xlsx\)/)).toBeTruthy();
    expect(screen.getByText(/\.x84/)).toBeTruthy();
    expect(screen.getByText(/\.d84/)).toBeTruthy();
  });
});

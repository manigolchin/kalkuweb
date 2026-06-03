/**
 * Tests for the ToolsMenu "Werkzeuge" dropdown inside ProjectDetail.tsx.
 *
 * The component collapses 6 actions into one dropdown:
 *   - EFB 221/222/223         → Link to /panel/kalkulation/{id}/efb
 *   - Preisspiegel            → Link to /panel/kalkulation/{id}/preisspiegel
 *   - Nachkalkulation         → Link to /panel/kalkulation/{id}/actuals
 *   - Submit-Validator        → calls onValidate
 *   - Versionen vergleichen   → calls onDiff (disabled when only one snapshot)
 *   - Preise zurücksetzen     → calls onReset (destructive; confirm lives in the parent)
 *
 * Covers open/close, click-outside, ESC, link-hrefs, callback wiring, disabled
 * state, chevron rotation, and aria attributes.
 *
 * Pattern follows src/pages/panel/__tests__/Vorlagen.test.tsx (happy-dom +
 * fireEvent). MemoryRouter wraps each render because MenuLink uses
 * react-router-dom <Link>.
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ToolsMenu } from '../ProjectDetail';

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}));

type RenderOpts = {
  projectId?: string;
  hasMultipleSnapshots?: boolean;
  onValidate?: () => void;
  onDiff?: () => void;
  onReset?: () => void;
};

function renderToolsMenu(opts: RenderOpts = {}) {
  const onValidate = opts.onValidate ?? vi.fn();
  const onDiff = opts.onDiff ?? vi.fn();
  const onReset = opts.onReset ?? vi.fn();
  const utils = render(
    <MemoryRouter>
      <ToolsMenu
        projectId={opts.projectId ?? 'proj-123'}
        hasMultipleSnapshots={opts.hasMultipleSnapshots ?? true}
        onValidate={onValidate}
        onDiff={onDiff}
        onReset={onReset}
      />
    </MemoryRouter>,
  );
  return { ...utils, onValidate, onDiff, onReset };
}

function getTrigger() {
  // The single trigger button is the only one outside the (closed) menu and
  // carries the aria-haspopup attribute.
  return screen.getByRole('button', { name: /Werkzeuge/i });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ToolsMenu', () => {
  test('renders a single trigger button labelled "Werkzeuge" with a Wrench icon', () => {
    renderToolsMenu();
    const trigger = getTrigger();
    expect(trigger).toBeTruthy();
    expect(trigger.textContent).toMatch(/Werkzeuge/);
    // lucide-react renders SVG icons; Wrench icon shows up as an <svg> child.
    // Check the trigger contains an svg (Wrench + Chevron = 2 svgs).
    const svgs = trigger.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(2);
  });

  test('trigger has aria-haspopup="menu" and aria-expanded="false" when closed', () => {
    renderToolsMenu();
    const trigger = getTrigger();
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    // Menu container should not be in the DOM yet.
    expect(screen.queryByRole('menu')).toBeNull();
  });

  test('clicking the trigger opens the menu (aria-expanded becomes true)', () => {
    renderToolsMenu();
    const trigger = getTrigger();
    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('menu')).toBeTruthy();
  });

  test('opened menu contains exactly 6 items in the documented order', () => {
    renderToolsMenu();
    fireEvent.click(getTrigger());
    const menu = screen.getByRole('menu');
    const items = within(menu).getAllByRole('menuitem');
    expect(items).toHaveLength(6);
    const labels = items.map((el) => el.textContent ?? '');
    expect(labels[0]).toMatch(/EFB 221\/222\/223/);
    expect(labels[1]).toMatch(/Preisspiegel/);
    expect(labels[2]).toMatch(/Nachkalkulation/);
    expect(labels[3]).toMatch(/Submit-Validator/);
    expect(labels[4]).toMatch(/Versionen vergleichen/);
    expect(labels[5]).toMatch(/Preise zurücksetzen/);
  });

  test('menu links carry the correct href for the given projectId prop', () => {
    renderToolsMenu({ projectId: 'abc-xyz' });
    fireEvent.click(getTrigger());
    const menu = screen.getByRole('menu');
    const links = within(menu).getAllByRole('menuitem').filter((el) => el.tagName === 'A') as HTMLAnchorElement[];
    expect(links).toHaveLength(3);
    expect(links[0].getAttribute('href')).toBe('/panel/kalkulation/abc-xyz/efb');
    expect(links[1].getAttribute('href')).toBe('/panel/kalkulation/abc-xyz/preisspiegel');
    expect(links[2].getAttribute('href')).toBe('/panel/kalkulation/abc-xyz/actuals');
  });

  test('ESC closes the menu (re-renders trigger as aria-expanded=false)', () => {
    renderToolsMenu();
    const trigger = getTrigger();
    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('menu')).toBeNull();
  });

  test('click outside the menu (on document body) closes it', () => {
    renderToolsMenu();
    const trigger = getTrigger();
    fireEvent.click(trigger);
    expect(screen.queryByRole('menu')).toBeTruthy();
    // The dropdown closes on mousedown OUTSIDE the wrapper. Dispatching on
    // document.body simulates a click anywhere away from the dropdown.
    fireEvent.mouseDown(document.body);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('menu')).toBeNull();
  });

  test('clicking a Link menu item collapses the dropdown', () => {
    renderToolsMenu();
    const trigger = getTrigger();
    fireEvent.click(trigger);
    const menu = screen.getByRole('menu');
    const efbLink = within(menu).getByText(/EFB 221\/222\/223/).closest('a')!;
    fireEvent.click(efbLink);
    // After the click handler fires onClick → setOpen(false), the menu unmounts.
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('menu')).toBeNull();
  });

  test('"Versionen vergleichen" is enabled with multi-snapshot subtitle when hasMultipleSnapshots=true', () => {
    renderToolsMenu({ hasMultipleSnapshots: true });
    fireEvent.click(getTrigger());
    const diffButton = screen.getByRole('menuitem', { name: /Versionen vergleichen/ }) as HTMLButtonElement;
    expect(diffButton.disabled).toBe(false);
    expect(diffButton.textContent).toMatch(/Snapshot-Diff zwischen Links/);
    expect(diffButton.textContent).not.toMatch(/Mind\. 2 aktive Snapshots/);
  });

  test('"Versionen vergleichen" is disabled with helper subtitle when hasMultipleSnapshots=false', () => {
    renderToolsMenu({ hasMultipleSnapshots: false });
    fireEvent.click(getTrigger());
    const diffButton = screen.getByRole('menuitem', { name: /Versionen vergleichen/ }) as HTMLButtonElement;
    expect(diffButton.disabled).toBe(true);
    expect(diffButton.textContent).toMatch(/Mind\. 2 aktive Snapshots benötigt/);
  });

  test('clicking Submit-Validator calls onValidate and closes the menu', () => {
    const onValidate = vi.fn();
    renderToolsMenu({ onValidate });
    fireEvent.click(getTrigger());
    const validateBtn = screen.getByRole('menuitem', { name: /Submit-Validator/ });
    fireEvent.click(validateBtn);
    expect(onValidate).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  test('clicking enabled "Versionen vergleichen" calls onDiff and closes the menu', () => {
    const onDiff = vi.fn();
    renderToolsMenu({ hasMultipleSnapshots: true, onDiff });
    fireEvent.click(getTrigger());
    const diffBtn = screen.getByRole('menuitem', { name: /Versionen vergleichen/ });
    fireEvent.click(diffBtn);
    expect(onDiff).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  test('clicking "Preise zurücksetzen" calls onReset and closes the menu', () => {
    const onReset = vi.fn();
    renderToolsMenu({ onReset });
    fireEvent.click(getTrigger());
    const resetBtn = screen.getByRole('menuitem', { name: /Preise zurücksetzen/ });
    fireEvent.click(resetBtn);
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  test('"Preise zurücksetzen" renders as a destructive (red) menu item', () => {
    renderToolsMenu();
    fireEvent.click(getTrigger());
    const resetBtn = screen.getByRole('menuitem', { name: /Preise zurücksetzen/ }) as HTMLButtonElement;
    // The danger variant tints the label red instead of slate.
    expect(resetBtn.innerHTML).toMatch(/text-red-700/);
    expect(resetBtn.disabled).toBe(false);
  });

  test('clicking disabled "Versionen vergleichen" does NOT call onDiff', () => {
    const onDiff = vi.fn();
    renderToolsMenu({ hasMultipleSnapshots: false, onDiff });
    fireEvent.click(getTrigger());
    const diffBtn = screen.getByRole('menuitem', { name: /Versionen vergleichen/ }) as HTMLButtonElement;
    fireEvent.click(diffBtn);
    // Native disabled buttons don't fire click handlers in browsers, and
    // happy-dom respects that. onDiff stays untouched.
    expect(onDiff).not.toHaveBeenCalled();
  });

  test('chevron icon gets rotate-180 class when menu is open', () => {
    renderToolsMenu();
    const trigger = getTrigger();
    // Before open: no rotate-180 anywhere inside the trigger.
    expect(trigger.querySelector('.rotate-180')).toBeNull();
    fireEvent.click(trigger);
    // After open: the chevron SVG has rotate-180.
    expect(trigger.querySelector('.rotate-180')).not.toBeNull();
    fireEvent.click(trigger);
    // After close: rotate-180 is gone again.
    expect(trigger.querySelector('.rotate-180')).toBeNull();
  });

  test('trigger gains the "open" class set (primary tint) while menu is open', () => {
    renderToolsMenu();
    const trigger = getTrigger();
    expect(trigger.className).not.toMatch(/bg-primary-50/);
    fireEvent.click(trigger);
    expect(trigger.className).toMatch(/bg-primary-50/);
  });

  test('toggle: clicking trigger a second time closes the menu', () => {
    renderToolsMenu();
    const trigger = getTrigger();
    fireEvent.click(trigger);
    expect(screen.queryByRole('menu')).toBeTruthy();
    fireEvent.click(trigger);
    expect(screen.queryByRole('menu')).toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  test('subtitle copy for each link item matches the spec', () => {
    renderToolsMenu();
    fireEvent.click(getTrigger());
    expect(screen.getByText(/Preisblätter für VOB\/A drucken/)).toBeTruthy();
    expect(screen.getByText(/NU\/Lieferant-Angebote vergleichen/)).toBeTruthy();
    expect(screen.getByText(/Soll vs\. Ist nach Ausführung/)).toBeTruthy();
    expect(screen.getByText(/Original-LV gegen Kalkulation prüfen/)).toBeTruthy();
    expect(screen.getByText(/Alle Positionen auf 0 € — nicht umkehrbar/)).toBeTruthy();
  });
});

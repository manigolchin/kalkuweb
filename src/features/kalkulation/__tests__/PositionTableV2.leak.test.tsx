/**
 * THE security test. Renders PositionTableV2 in KUNDEN view via jsdom and
 * asserts that no internal field value (sentinel) appears in the customer-
 * facing wrapper's rendered HTML.
 *
 * Replaces the live-browser eval that was the only proof during Round 1.
 * Now runs in CI on every commit (`npm run test`).
 *
 * Sentinels are defined in __fixtures__/lv3_bh.ts and are deliberately
 * chosen to NEVER match any number a real calculation could produce
 * (99999.99 × 1.23 = 122999.9877 ≠ "99999.99" or "99.999,99").
 */

import { describe, test, expect } from 'vitest';
import { render } from '@testing-library/react';
import PositionTableV2 from '../PositionTableV2';
import { LV3_BH_FIXTURE, SENTINELS } from '../__fixtures__/lv3_bh';

function renderKundenView() {
  return render(
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
    />,
  );
}

describe('PositionTableV2 KUNDEN view — content security', () => {
  test('renders the kunden-preview wrapper', () => {
    const { container } = renderKundenView();
    const preview = container.querySelector('[data-testid="v2-kunden-preview"]');
    expect(preview).not.toBeNull();
  });

  test('NEVER renders raw materialCost sentinel (99999.99 / 99.999,99)', () => {
    const { container } = renderKundenView();
    const html = container.innerHTML;
    expect(html.includes(String(SENTINELS.materialCost))).toBe(false);
    expect(html.includes('99.999,99')).toBe(false);
  });

  test('NEVER renders raw timeMinutes sentinel (88888 / 88.888)', () => {
    const { container } = renderKundenView();
    const html = container.innerHTML;
    expect(html.includes(String(SENTINELS.timeMinutes))).toBe(false);
    expect(html.includes('88.888')).toBe(false);
  });

  test('NEVER renders raw nuCost sentinel (77777 / 77.777)', () => {
    const { container } = renderKundenView();
    const html = container.innerHTML;
    expect(html.includes(String(SENTINELS.nuCost))).toBe(false);
    expect(html.includes('77.777')).toBe(false);
  });

  test('NEVER renders the descriptive marker for hidden sentinel rows', () => {
    const { container } = renderKundenView();
    const html = container.innerHTML;
    // (a) visibleToCustomer=false row's description must be absent
    expect(html.includes('SENTINEL — hidden standard row')).toBe(false);
    // (b) positionType=wagnis row's description must be absent (even though
    //     visibleToCustomer=true — the type filter wins)
    expect(html.includes('SENTINEL — wagnis internal row')).toBe(false);
  });

  test('DOES render the visible sentinel row (control: ensures we are not just rendering nothing)', () => {
    const { container } = renderKundenView();
    const html = container.innerHTML;
    expect(html.includes('SENTINEL — visible row with sentinel internals')).toBe(true);
  });

  test('DOES render derived EP/GP for the visible sentinel row (customer-facing math is allowed)', () => {
    const { container } = renderKundenView();
    const html = container.innerHTML;
    // Derived EP for the visible sentinel row = ~311.442,55 €
    // (materialCost·1.23 + timeMin/60·67.9 + timeMin/60·0.5 + nuCost·1.12)
    // The derived NUMBER is fine to render — it's the customer's price.
    // The RAW inputs must not appear (asserted above).
    const hasDerivedEp = /311\.[0-9]{3},[0-9]{2}/.test(html);
    expect(hasDerivedEp).toBe(true);
  });

  test('Project meta header is rendered (control: ensures the preview component fully mounts)', () => {
    const { getByText } = renderKundenView();
    expect(getByText(LV3_BH_FIXTURE.client)).toBeTruthy();
    expect(getByText(LV3_BH_FIXTURE.bidder)).toBeTruthy();
  });

  test('Internal-zone column headers (Material, Zeit min) are NOT in KUNDEN table thead', () => {
    // Scope: <thead> only. The KUNDEN preview's footer DOES mention these
    // words as part of a reassuring "internal columns are hidden" line, so
    // we can't grep the whole wrapper — we grep the actual data table
    // header where a leak would matter.
    const { container } = renderKundenView();
    const thead = container.querySelector('[data-testid="v2-kunden-preview"] thead');
    const theadText = (thead?.textContent ?? '').toUpperCase();
    expect(theadText.includes('MATERIAL')).toBe(false);
    expect(theadText.includes('ZEIT MIN')).toBe(false);
    expect(theadText.includes('LSTG')).toBe(false);
    expect(theadText.includes('ZSCHLG')).toBe(false);
  });

  test('KUNDEN table has exactly 6 column headers (OZ/Bezeichnung/Menge/EH/EP/GP)', () => {
    const { container } = renderKundenView();
    const preview = container.querySelector('[data-testid="v2-kunden-preview"]');
    const thead = preview?.querySelector('thead');
    const headerCells = thead?.querySelectorAll('th') ?? [];
    expect(headerCells.length).toBe(6);
  });
});

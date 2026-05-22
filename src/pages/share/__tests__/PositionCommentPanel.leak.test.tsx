/**
 * Leak test for the per-position comment side-panel (PART G).
 *
 * Strategy: render the panel with a sentinel position whose properties
 * include both the customer-allowed fields (gp, ep, quantity, etc.) AND
 * deliberately-injected "extra" keys with sentinel values that mimic
 * internal fields a buggy upstream might accidentally pass through.
 * Assert that NONE of the internal-field sentinels appear in the panel's
 * rendered HTML.
 *
 * The structural guarantee (the panel's `position` prop is typed as
 * `CustomerViewPayload['positions'][number]`, a closed shape that doesn't
 * include materialCost/timeMinutes/nuCost/etc.) means a leak literally
 * cannot happen via prop drilling — TypeScript would reject it. But this
 * runtime test catches the case where the type system is bypassed (`as
 * any` somewhere upstream, JSON.parse, an API change).
 */

import { describe, test, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import PositionCommentPanel from '../PositionCommentPanel';

// Sentinels distinct from anything a real EP/GP would produce.
const SENTINELS = {
  materialCost: 99999.99,
  timeMinutes: 88888,
  nuCost: 77777,
  internalNote: '__LEAK_INTERNAL_NOTE__',
  positionType: '__LEAK_WAGNIS__',
  epLohn: 55555.55,
  hinweisText: '__LEAK_HINWEIS__',
};

// Bypass the type system on purpose — simulating "what if the parent
// component passed a richer object than the type says?". The panel should
// still only render what it explicitly reads.
const polluted = {
  // Allowed fields:
  id: 'p-leak',
  oz: '1.4.1.1',
  shortText: 'Sentinel position with polluted internals',
  longText: 'Some longtext',
  quantity: 1,
  unit: 'St',
  isHeader: false,
  sortOrder: 1,
  ep: 100,
  gp: 100,
  // Pollutants (NOT in CustomerViewPayload — must never render):
  ...SENTINELS,
};

describe('PositionCommentPanel — internal-field leak guard', () => {
  test('renders without throwing when the position prop is polluted with extra keys', () => {
    const { container } = render(
      <PositionCommentPanel
        open
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        position={polluted as any}
        draft={undefined}
        customerName=""
        customerEmail=""
        onClose={vi.fn()}
        onSet={vi.fn()}
        onClear={vi.fn()}
        onSetCustomerName={vi.fn()}
        onSetCustomerEmail={vi.fn()}
      />,
    );
    expect(container.querySelector('[data-testid="position-comment-panel"]')).not.toBeNull();
  });

  test('NEVER renders the materialCost sentinel (raw or de-formatted)', () => {
    const { container } = render(
      <PositionCommentPanel
        open
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        position={polluted as any}
        draft={undefined}
        customerName=""
        customerEmail=""
        onClose={vi.fn()}
        onSet={vi.fn()}
        onClear={vi.fn()}
        onSetCustomerName={vi.fn()}
        onSetCustomerEmail={vi.fn()}
      />,
    );
    const html = container.innerHTML;
    expect(html.includes(String(SENTINELS.materialCost))).toBe(false);
    expect(html.includes('99.999,99')).toBe(false);
  });

  test('NEVER renders timeMinutes / nuCost / epLohn sentinels', () => {
    const { container } = render(
      <PositionCommentPanel
        open
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        position={polluted as any}
        draft={undefined}
        customerName=""
        customerEmail=""
        onClose={vi.fn()}
        onSet={vi.fn()}
        onClear={vi.fn()}
        onSetCustomerName={vi.fn()}
        onSetCustomerEmail={vi.fn()}
      />,
    );
    const html = container.innerHTML;
    expect(html.includes(String(SENTINELS.timeMinutes))).toBe(false);
    expect(html.includes(String(SENTINELS.nuCost))).toBe(false);
    expect(html.includes('55555')).toBe(false);
    expect(html.includes('55.555,55')).toBe(false);
  });

  test('NEVER renders the descriptive sentinels (internalNote, positionType, hinweisText)', () => {
    const { container } = render(
      <PositionCommentPanel
        open
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        position={polluted as any}
        draft={undefined}
        customerName=""
        customerEmail=""
        onClose={vi.fn()}
        onSet={vi.fn()}
        onClear={vi.fn()}
        onSetCustomerName={vi.fn()}
        onSetCustomerEmail={vi.fn()}
      />,
    );
    const html = container.innerHTML;
    expect(html.includes(SENTINELS.internalNote)).toBe(false);
    expect(html.includes(SENTINELS.positionType)).toBe(false);
    expect(html.includes(SENTINELS.hinweisText)).toBe(false);
  });

  test('DOES render the allowed fields (control: ensures the test is not vacuous)', () => {
    const { container, getByText } = render(
      <PositionCommentPanel
        open
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        position={polluted as any}
        draft={undefined}
        customerName=""
        customerEmail=""
        onClose={vi.fn()}
        onSet={vi.fn()}
        onClear={vi.fn()}
        onSetCustomerName={vi.fn()}
        onSetCustomerEmail={vi.fn()}
      />,
    );
    // shortText IS allowed (it's part of CustomerViewPayload).
    expect(getByText(/Sentinel position with polluted internals/i)).toBeTruthy();
    // OZ IS allowed.
    expect(container.innerHTML.includes('1.4.1.1')).toBe(true);
  });
});

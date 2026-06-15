/**
 * Round 12 — PositionCommentPanel structured change-request composer.
 * Verifies the cost-type targets are gated by showCostBreakdown and that
 * picking a field + entering a value posts the right ChangeRequestInput.
 */
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import PositionCommentPanel from '../PositionCommentPanel';
import type { CustomerViewPayload } from '@/features/kalkulation/types';

const pos = {
  id: 'p1', oz: '1.4.1.1', shortText: 'RZA01 Leuchte', longText: '',
  quantity: 4, unit: 'St', isHeader: false, sortOrder: 1,
  ep: 200, gp: 800, gpLohn: 200, gpMaterial: 500, gpGeraet: 100, gpNu: 0,
} as CustomerViewPayload['positions'][number];

function setup(extra: Partial<ComponentProps<typeof PositionCommentPanel>> = {}) {
  const onAddChangeRequests = vi.fn();
  const onSubmitToServer = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  render(
    <PositionCommentPanel
      open
      position={pos}
      draft={undefined}
      customerName="Herr Schmidt"
      customerEmail="s@f.de"
      onClose={onClose}
      onSet={() => {}}
      onClear={() => {}}
      onSetCustomerName={() => {}}
      onSetCustomerEmail={() => {}}
      showCostBreakdown
      onAddChangeRequests={onAddChangeRequests}
      onSubmitToServer={onSubmitToServer}
      {...extra}
    />,
  );
  return { onAddChangeRequests, onSubmitToServer, onClose };
}

describe('PositionCommentPanel — Änderungswunsch composer', () => {
  test('offers Menge + cost-type targets when the breakdown is visible', () => {
    setup();
    expect(screen.getByTestId('cr-chip-position-menge')).toBeDefined();
    expect(screen.getByTestId('cr-chip-position-material')).toBeDefined();
    expect(screen.getByTestId('cr-chip-position-geraete')).toBeDefined();
    expect(screen.getByTestId('cr-chip-position-lohn')).toBeDefined();
  });

  test('hides cost-type targets when the breakdown is hidden', () => {
    setup({ showCostBreakdown: false });
    expect(screen.queryByTestId('cr-chip-position-material')).toBeNull();
    expect(screen.queryByTestId('cr-chip-position-lohn')).toBeNull();
    // Menge + Gesamtpreis are still offered.
    expect(screen.getByTestId('cr-chip-position-menge')).toBeDefined();
    expect(screen.getByTestId('cr-chip-position-gesamtpreis')).toBeDefined();
  });

  test('shows the current ("Aktuell") value when a cost target is opened', () => {
    setup();
    fireEvent.click(screen.getByTestId('cr-chip-position-material'));
    const editor = screen.getByTestId('cr-editor-position-material');
    expect(editor.textContent).toContain('Aktuell');
    expect(editor.textContent).toContain('500,00'); // gpMaterial from the position
  });

  test('a value adds a basket item then closes', async () => {
    const { onAddChangeRequests, onClose } = setup();
    fireEvent.click(screen.getByTestId('cr-chip-position-material'));
    fireEvent.change(screen.getByTestId('cr-value-position-material'), { target: { value: '400' } });
    fireEvent.click(screen.getByTestId('position-comment-submit'));
    await waitFor(() => expect(onAddChangeRequests).toHaveBeenCalledTimes(1));
    const items = onAddChangeRequests.mock.calls[0][0];
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      scope: 'position', positionOz: '1.4.1.1', field: 'material',
      requestedValue: 400, unit: 'eur', currentValue: 500, where: '1.4.1.1 · RZA01 Leuchte',
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  test('günstiger/höher direction without a value is captured', async () => {
    const { onAddChangeRequests } = setup();
    fireEvent.click(screen.getByTestId('cr-chip-position-lohn'));
    fireEvent.click(screen.getByTestId('cr-dir-position-lohn-lower'));
    fireEvent.click(screen.getByTestId('position-comment-submit'));
    await waitFor(() => expect(onAddChangeRequests).toHaveBeenCalledTimes(1));
    expect(onAddChangeRequests.mock.calls[0][0][0]).toMatchObject({
      field: 'lohn', requestedValue: null, direction: 'lower',
    });
  });

  test('percent quick-button prefills the discounted Wunschwert', async () => {
    const { onAddChangeRequests } = setup();
    fireEvent.click(screen.getByTestId('cr-chip-position-material'));
    // gpMaterial = 500 → −10 % → 450
    fireEvent.click(screen.getByTestId('cr-pct-position-material-10'));
    expect((screen.getByTestId('cr-value-position-material') as HTMLInputElement).value).toBe('450,00');
    fireEvent.click(screen.getByTestId('position-comment-submit'));
    await waitFor(() => expect(onAddChangeRequests).toHaveBeenCalledTimes(1));
    expect(onAddChangeRequests.mock.calls[0][0][0]).toMatchObject({
      field: 'material', requestedValue: 450, direction: 'lower',
    });
  });

  test('closes without adding when nothing is entered', async () => {
    const { onAddChangeRequests, onSubmitToServer, onClose } = setup();
    fireEvent.click(screen.getByTestId('position-comment-submit'));
    expect(onAddChangeRequests).not.toHaveBeenCalled();
    expect(onSubmitToServer).not.toHaveBeenCalled();
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});

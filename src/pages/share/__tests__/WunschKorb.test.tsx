/**
 * Round 12d — Wunsch-Korb: trigger bar, review drawer, remove, send, and the
 * name gate before sending.
 */
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import WunschKorb from '../WunschKorb';
import type { WunschBasketItem } from '@/features/kalkulation/changeRequest';

function item(over: Partial<WunschBasketItem> = {}): WunschBasketItem {
  return {
    key: 'k1', scope: 'position', positionOz: '1.1', where: '1.1 · RZA01',
    field: 'material', unit: 'eur', currentValue: 500, requestedValue: 400,
    direction: 'lower', note: 'zu teuer', ...over,
  };
}

function setup(items: WunschBasketItem[], extra: Partial<ComponentProps<typeof WunschKorb>> = {}) {
  const onRemove = vi.fn();
  const onClear = vi.fn();
  const onSend = vi.fn().mockResolvedValue(undefined);
  render(
    <WunschKorb
      items={items}
      customerName="Herr Schmidt"
      customerEmail="s@f.de"
      onSetCustomerName={() => {}}
      onSetCustomerEmail={() => {}}
      onRemove={onRemove}
      onClear={onClear}
      onSend={onSend}
      {...extra}
    />,
  );
  return { onRemove, onClear, onSend };
}

describe('WunschKorb', () => {
  test('renders nothing when the basket is empty', () => {
    setup([]);
    expect(screen.queryByTestId('korb-open')).toBeNull();
  });

  test('trigger shows the count; opening lists each Ist→Wunsch item', () => {
    setup([item(), item({ key: 'k2', field: 'lohn', currentValue: 200, requestedValue: 180 })]);
    const trigger = screen.getByTestId('korb-open');
    expect(trigger.textContent).toContain('2');
    fireEvent.click(trigger);
    const items = screen.getAllByTestId('korb-item');
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain('500,00'); // Ist
    expect(items[0].textContent).toContain('400,00'); // Wunsch
    expect(items[0].textContent).toContain('zu teuer');
  });

  test('removing an item calls onRemove with its key', () => {
    const { onRemove } = setup([item({ key: 'kX' })]);
    fireEvent.click(screen.getByTestId('korb-open'));
    fireEvent.click(screen.getByTestId('korb-remove-kX'));
    expect(onRemove).toHaveBeenCalledWith('kX');
  });

  test('sending calls onSend', async () => {
    const { onSend } = setup([item()]);
    fireEvent.click(screen.getByTestId('korb-open'));
    fireEvent.click(screen.getByTestId('korb-send'));
    await waitFor(() => expect(onSend).toHaveBeenCalledTimes(1));
  });

  test('sending is blocked until a name is given', () => {
    setup([item()], { customerName: '' });
    fireEvent.click(screen.getByTestId('korb-open'));
    expect((screen.getByTestId('korb-send') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId('korb-name')).toBeDefined();
  });
});

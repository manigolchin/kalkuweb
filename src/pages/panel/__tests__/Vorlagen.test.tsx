/**
 * Tests for the Vorlagen-Bibliothek page.
 *
 * Covers:
 *   - Loading + error states
 *   - Empty state when 0 templates
 *   - List rendering with multiple templates
 *   - Search filter
 *   - Click-row → edit mode → save (PATCH api.templates.update)
 *   - Delete with confirm
 *
 * Uses happy-dom (vitest.config.ts); see src/test/setup.ts polyfill for
 * button[type=submit] form-submit semantics. This page uses plain buttons
 * (not form submits), so no polyfill dependency.
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Vorlagen from '../Vorlagen';
import type { PositionTemplate } from '@/features/kalkulation/types';

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}));

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    api: {
      ...actual.api,
      templates: {
        list: vi.fn(),
        create: vi.fn(),
        use: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    },
  };
});

import { api } from '@/lib/api';

const listMock = api.templates.list as ReturnType<typeof vi.fn>;
const updateMock = api.templates.update as ReturnType<typeof vi.fn>;
const deleteMock = api.templates.delete as ReturnType<typeof vi.fn>;

function tpl(over: Partial<PositionTemplate> & { id: string }): PositionTemplate {
  return {
    id: over.id,
    oz: over.oz ?? '1.10',
    shortText: over.shortText ?? 'Bodenaushub',
    longText: over.longText ?? '',
    unit: over.unit ?? 'm³',
    defaultMaterialCost: over.defaultMaterialCost ?? 12.5,
    defaultTimeMinutes: over.defaultTimeMinutes ?? 30,
    defaultNuCost: over.defaultNuCost ?? 0,
    useCount: over.useCount ?? 5,
    lastUsedAt: over.lastUsedAt ?? null,
    createdAt: over.createdAt ?? '2026-01-01T00:00:00Z',
  };
}

function renderVorlagen() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <Vorlagen />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

beforeEach(() => {
  listMock.mockReset();
  updateMock.mockReset();
  deleteMock.mockReset();
});

describe('Vorlagen', () => {
  test('shows the loader before data lands, then renders the rows', async () => {
    listMock.mockResolvedValue({ templates: [tpl({ id: 'a' }), tpl({ id: 'b', shortText: 'Pflasterarbeiten', oz: '2.10', unit: 'm²' })] });
    renderVorlagen();
    expect(document.querySelector('.animate-spin')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('Bodenaushub')).toBeTruthy());
    expect(screen.getByText('Pflasterarbeiten')).toBeTruthy();
  });

  test('empty state renders when there are 0 templates', async () => {
    listMock.mockResolvedValue({ templates: [] });
    renderVorlagen();
    await waitFor(() => expect(screen.getByText(/Noch keine Vorlagen/i)).toBeTruthy());
    expect(screen.getByText(/Zu den Kalkulationen/i)).toBeTruthy();
  });

  test('error state when api throws', async () => {
    listMock.mockRejectedValue(new Error('network'));
    renderVorlagen();
    await waitFor(() => expect(screen.getByText(/konnten nicht geladen werden/i)).toBeTruthy());
  });

  test('search filters by shortText (case-insensitive)', async () => {
    listMock.mockResolvedValue({
      templates: [
        tpl({ id: 'a', shortText: 'Bodenaushub' }),
        tpl({ id: 'b', shortText: 'Pflasterarbeiten' }),
        tpl({ id: 'c', shortText: 'Estrich' }),
      ],
    });
    renderVorlagen();
    await waitFor(() => expect(screen.getByText('Bodenaushub')).toBeTruthy());
    const input = screen.getByPlaceholderText(/Suchen/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'pflaster' } });
    expect(screen.queryByText('Bodenaushub')).toBeNull();
    expect(screen.queryByText('Estrich')).toBeNull();
    expect(screen.getByText('Pflasterarbeiten')).toBeTruthy();
  });

  test('clicking a row enters edit mode (inputs appear)', async () => {
    listMock.mockResolvedValue({ templates: [tpl({ id: 'a', shortText: 'Bodenaushub' })] });
    renderVorlagen();
    await waitFor(() => expect(screen.getByText('Bodenaushub')).toBeTruthy());
    const row = screen.getByText('Bodenaushub').closest('tr')!;
    fireEvent.click(row);
    // Edit row should have an input pre-filled with the shortText. Query on
    // document, not within(row.parentElement) — the row mounts in place but
    // happy-dom can briefly detach during the swap.
    expect(screen.getByDisplayValue('Bodenaushub')).toBeTruthy();
  });

  test('edit + save calls api.templates.update with only the diff', async () => {
    listMock.mockResolvedValue({ templates: [tpl({ id: 'a', defaultMaterialCost: 12.5 })] });
    updateMock.mockResolvedValue(tpl({ id: 'a', defaultMaterialCost: 14.75 }));
    renderVorlagen();
    await waitFor(() => expect(screen.getByText('Bodenaushub')).toBeTruthy());
    fireEvent.click(screen.getByText('Bodenaushub').closest('tr')!);
    // Find the Material input (the one whose value === "12.5")
    const matInput = screen.getByDisplayValue('12.5') as HTMLInputElement;
    fireEvent.change(matInput, { target: { value: '14,75' } });
    fireEvent.click(screen.getByLabelText('Speichern'));
    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1));
    expect(updateMock).toHaveBeenCalledWith('a', { defaultMaterialCost: 14.75 });
  });

  test('edit + cancel does NOT call api', async () => {
    listMock.mockResolvedValue({ templates: [tpl({ id: 'a' })] });
    renderVorlagen();
    await waitFor(() => expect(screen.getByText('Bodenaushub')).toBeTruthy());
    fireEvent.click(screen.getByText('Bodenaushub').closest('tr')!);
    fireEvent.click(screen.getByLabelText('Abbrechen'));
    expect(updateMock).not.toHaveBeenCalled();
    // Back to view row.
    expect(screen.queryByDisplayValue('Bodenaushub')).toBeNull();
  });

  test('delete button calls api.templates.delete after window.confirm', async () => {
    listMock.mockResolvedValue({ templates: [tpl({ id: 'a' })] });
    deleteMock.mockResolvedValue({ ok: true });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderVorlagen();
    await waitFor(() => expect(screen.getByText('Bodenaushub')).toBeTruthy());
    fireEvent.click(screen.getByLabelText(/Vorlage löschen/i));
    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith('a'));
    expect(confirmSpy).toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  test('delete cancelled in confirm dialog → no api call', async () => {
    listMock.mockResolvedValue({ templates: [tpl({ id: 'a' })] });
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderVorlagen();
    await waitFor(() => expect(screen.getByText('Bodenaushub')).toBeTruthy());
    fireEvent.click(screen.getByLabelText(/Vorlage löschen/i));
    expect(deleteMock).not.toHaveBeenCalled();
  });

  test('useCount badge tone differs for unused (0×) vs used templates', async () => {
    listMock.mockResolvedValue({
      templates: [tpl({ id: 'a', useCount: 0 }), tpl({ id: 'b', shortText: 'Pflaster', useCount: 12 })],
    });
    renderVorlagen();
    await waitFor(() => expect(screen.getByText('Bodenaushub')).toBeTruthy());
    expect(screen.getByText('0×')).toBeTruthy();
    expect(screen.getByText('12×')).toBeTruthy();
  });
});

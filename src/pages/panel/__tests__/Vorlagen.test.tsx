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

// ---------------------------------------------------------------------------
// Round-2 extension — coverage gaps in sort-order preservation, partial-edit
// diffing, multi-row edit cycles, search-by-oz/unit, toast wiring on delete,
// the parse-german-num early-return for "no changes", and post-save row state.
// ---------------------------------------------------------------------------

import toastMod from 'react-hot-toast';
const toastSuccessMock = (toastMod as unknown as { success: ReturnType<typeof vi.fn> }).success;
const toastErrorMock = (toastMod as unknown as { error: ReturnType<typeof vi.fn> }).error;

describe('Vorlagen — extended coverage', () => {
  beforeEach(() => {
    toastSuccessMock.mockClear();
    toastErrorMock.mockClear();
  });

  test('templates render in the order returned by the API (no client-side re-sort)', async () => {
    // Provide a mixed order — high useCount LAST, freshest lastUsedAt FIRST,
    // alphabetically reversed — to assert that the component does not sort.
    listMock.mockResolvedValue({
      templates: [
        tpl({ id: 'z-newest', shortText: 'Zementarbeiten', useCount: 1, lastUsedAt: '2026-05-22T00:00:00Z' }),
        tpl({ id: 'a-popular', shortText: 'Abbrucharbeiten', useCount: 99, lastUsedAt: '2026-01-01T00:00:00Z' }),
        tpl({ id: 'm-unused', shortText: 'Mauerwerk', useCount: 0, lastUsedAt: null }),
      ],
    });
    renderVorlagen();
    await waitFor(() => expect(screen.getByText('Zementarbeiten')).toBeTruthy());
    const rows = document.querySelectorAll('tbody tr');
    // Three rows in exactly the API-provided order.
    expect(rows).toHaveLength(3);
    expect(rows[0].textContent).toContain('Zementarbeiten');
    expect(rows[1].textContent).toContain('Abbrucharbeiten');
    expect(rows[2].textContent).toContain('Mauerwerk');
  });

  test('after save, the row reflects the updated values from the api response (no refetch)', async () => {
    listMock.mockResolvedValue({
      templates: [tpl({ id: 'a', shortText: 'Bodenaushub', defaultMaterialCost: 12.5 })],
    });
    updateMock.mockResolvedValue(
      tpl({ id: 'a', shortText: 'Bodenaushub', defaultMaterialCost: 99.0 }),
    );
    renderVorlagen();
    await waitFor(() => expect(screen.getByText('Bodenaushub')).toBeTruthy());
    fireEvent.click(screen.getByText('Bodenaushub').closest('tr')!);
    const matInput = screen.getByDisplayValue('12.5') as HTMLInputElement;
    fireEvent.change(matInput, { target: { value: '99' } });
    fireEvent.click(screen.getByLabelText('Speichern'));
    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1));
    // formatEUR renders "99,00 €" — the new value is visible in the view row.
    await waitFor(() => expect(screen.getByText(/99,00/)).toBeTruthy());
    // list() must have been called only once (initial mount, no refetch).
    expect(listMock).toHaveBeenCalledTimes(1);
  });

  test('save → setEditing(null): the row is back in view mode after save', async () => {
    listMock.mockResolvedValue({ templates: [tpl({ id: 'a' })] });
    updateMock.mockResolvedValue(tpl({ id: 'a', shortText: 'Bodenaushub neu' }));
    renderVorlagen();
    await waitFor(() => expect(screen.getByText('Bodenaushub')).toBeTruthy());
    fireEvent.click(screen.getByText('Bodenaushub').closest('tr')!);
    // Sanity — we're in edit mode now.
    expect(screen.getByDisplayValue('Bodenaushub')).toBeTruthy();
    const shortInput = screen.getByDisplayValue('Bodenaushub') as HTMLInputElement;
    fireEvent.change(shortInput, { target: { value: 'Bodenaushub neu' } });
    fireEvent.click(screen.getByLabelText('Speichern'));
    await waitFor(() => expect(updateMock).toHaveBeenCalled());
    // Edit row is gone — the Speichern button no longer exists.
    await waitFor(() => expect(screen.queryByLabelText('Speichern')).toBeNull());
    // View row shows the new text.
    expect(screen.getByText('Bodenaushub neu')).toBeTruthy();
  });

  test('partial edit: changing only OZ sends update({oz: "1.20"}) with no other fields', async () => {
    listMock.mockResolvedValue({
      templates: [tpl({ id: 'a', oz: '1.10', shortText: 'Bodenaushub', defaultMaterialCost: 12.5 })],
    });
    updateMock.mockResolvedValue(tpl({ id: 'a', oz: '1.20' }));
    renderVorlagen();
    await waitFor(() => expect(screen.getByText('Bodenaushub')).toBeTruthy());
    fireEvent.click(screen.getByText('Bodenaushub').closest('tr')!);
    const ozInput = screen.getByDisplayValue('1.10') as HTMLInputElement;
    fireEvent.change(ozInput, { target: { value: '1.20' } });
    fireEvent.click(screen.getByLabelText('Speichern'));
    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1));
    expect(updateMock).toHaveBeenCalledWith('a', { oz: '1.20' });
  });

  test('partial edit: changing only time-minutes sends update({defaultTimeMinutes: N}) with no other fields', async () => {
    listMock.mockResolvedValue({
      templates: [tpl({ id: 'a', defaultTimeMinutes: 30 })],
    });
    updateMock.mockResolvedValue(tpl({ id: 'a', defaultTimeMinutes: 45 }));
    renderVorlagen();
    await waitFor(() => expect(screen.getByText('Bodenaushub')).toBeTruthy());
    fireEvent.click(screen.getByText('Bodenaushub').closest('tr')!);
    const minInput = screen.getByDisplayValue('30') as HTMLInputElement;
    fireEvent.change(minInput, { target: { value: '45' } });
    fireEvent.click(screen.getByLabelText('Speichern'));
    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1));
    expect(updateMock).toHaveBeenCalledWith('a', { defaultTimeMinutes: 45 });
  });

  test('multiple sequential edits: edit row A → save → edit row B → save (no state leaks)', async () => {
    listMock.mockResolvedValue({
      templates: [
        tpl({ id: 'a', shortText: 'Bodenaushub', defaultMaterialCost: 12.5 }),
        // Distinct field values so getByDisplayValue resolves unambiguously.
        tpl({
          id: 'b',
          shortText: 'Pflasterarbeiten',
          oz: '2.10',
          unit: 'm²',
          defaultMaterialCost: 77,
          defaultNuCost: 5,
          defaultTimeMinutes: 42,
        }),
      ],
    });
    updateMock
      .mockResolvedValueOnce(tpl({ id: 'a', shortText: 'Bodenaushub', defaultMaterialCost: 13.0 }))
      .mockResolvedValueOnce(
        tpl({ id: 'b', shortText: 'Pflasterarbeiten', oz: '2.10', unit: 'm²', defaultMaterialCost: 88 }),
      );
    renderVorlagen();
    await waitFor(() => expect(screen.getByText('Bodenaushub')).toBeTruthy());

    // Edit row A.
    fireEvent.click(screen.getByText('Bodenaushub').closest('tr')!);
    const matA = screen.getByDisplayValue('12.5') as HTMLInputElement;
    fireEvent.change(matA, { target: { value: '13' } });
    fireEvent.click(screen.getByLabelText('Speichern'));
    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1));
    expect(updateMock).toHaveBeenNthCalledWith(1, 'a', { defaultMaterialCost: 13 });

    // Edit row B.
    await waitFor(() => expect(screen.getByText('Pflasterarbeiten')).toBeTruthy());
    fireEvent.click(screen.getByText('Pflasterarbeiten').closest('tr')!);
    const matB = screen.getByDisplayValue('77') as HTMLInputElement;
    fireEvent.change(matB, { target: { value: '88' } });
    fireEvent.click(screen.getByLabelText('Speichern'));
    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(2));
    // The diff for B must only contain its OWN delta — no leftover field from A.
    expect(updateMock).toHaveBeenNthCalledWith(2, 'b', { defaultMaterialCost: 88 });
  });

  test('search clears when query is empty (all rows visible again)', async () => {
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
    // Clear the search.
    fireEvent.change(input, { target: { value: '' } });
    expect(screen.getByText('Bodenaushub')).toBeTruthy();
    expect(screen.getByText('Pflasterarbeiten')).toBeTruthy();
    expect(screen.getByText('Estrich')).toBeTruthy();
  });

  test('search by oz string ("1.20") filters the table', async () => {
    listMock.mockResolvedValue({
      templates: [
        tpl({ id: 'a', oz: '1.10', shortText: 'Bodenaushub' }),
        tpl({ id: 'b', oz: '1.20', shortText: 'Pflasterarbeiten' }),
        tpl({ id: 'c', oz: '2.10', shortText: 'Estrich' }),
      ],
    });
    renderVorlagen();
    await waitFor(() => expect(screen.getByText('Bodenaushub')).toBeTruthy());
    const input = screen.getByPlaceholderText(/Suchen/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '1.20' } });
    expect(screen.queryByText('Bodenaushub')).toBeNull();
    expect(screen.queryByText('Estrich')).toBeNull();
    expect(screen.getByText('Pflasterarbeiten')).toBeTruthy();
  });

  test('search by unit ("m²") filters the table', async () => {
    listMock.mockResolvedValue({
      templates: [
        tpl({ id: 'a', unit: 'm³', shortText: 'Bodenaushub' }),
        tpl({ id: 'b', unit: 'm²', shortText: 'Pflasterarbeiten' }),
        tpl({ id: 'c', unit: 'm³', shortText: 'Estrich' }),
      ],
    });
    renderVorlagen();
    await waitFor(() => expect(screen.getByText('Bodenaushub')).toBeTruthy());
    const input = screen.getByPlaceholderText(/Suchen/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'm²' } });
    expect(screen.queryByText('Bodenaushub')).toBeNull();
    expect(screen.queryByText('Estrich')).toBeNull();
    expect(screen.getByText('Pflasterarbeiten')).toBeTruthy();
  });

  test('toast.success is called after a successful delete', async () => {
    listMock.mockResolvedValue({ templates: [tpl({ id: 'a' })] });
    deleteMock.mockResolvedValue({ ok: true });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderVorlagen();
    await waitFor(() => expect(screen.getByText('Bodenaushub')).toBeTruthy());
    fireEvent.click(screen.getByLabelText(/Vorlage löschen/i));
    await waitFor(() => expect(deleteMock).toHaveBeenCalled());
    await waitFor(() => expect(toastSuccessMock).toHaveBeenCalledWith('Vorlage gelöscht.'));
  });

  test('toast.error is called when api.templates.delete rejects', async () => {
    listMock.mockResolvedValue({ templates: [tpl({ id: 'a' })] });
    deleteMock.mockRejectedValue(new Error('boom'));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderVorlagen();
    await waitFor(() => expect(screen.getByText('Bodenaushub')).toBeTruthy());
    fireEvent.click(screen.getByLabelText(/Vorlage löschen/i));
    await waitFor(() => expect(deleteMock).toHaveBeenCalled());
    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith('Löschen fehlgeschlagen.'));
    // Row must still be present (delete failed, no optimistic removal).
    expect(screen.getByText('Bodenaushub')).toBeTruthy();
  });

  test('after delete, the row is removed from the table without a refetch', async () => {
    listMock.mockResolvedValue({
      templates: [
        tpl({ id: 'a', shortText: 'Bodenaushub' }),
        tpl({ id: 'b', shortText: 'Pflasterarbeiten' }),
      ],
    });
    deleteMock.mockResolvedValue({ ok: true });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderVorlagen();
    await waitFor(() => expect(screen.getByText('Bodenaushub')).toBeTruthy());
    expect(screen.getByText('Pflasterarbeiten')).toBeTruthy();
    // Find the delete button on row A (the first one) and click it.
    const deleteButtons = screen.getAllByLabelText(/Vorlage löschen/i);
    fireEvent.click(deleteButtons[0]);
    await waitFor(() => expect(screen.queryByText('Bodenaushub')).toBeNull());
    // Row B is still there.
    expect(screen.getByText('Pflasterarbeiten')).toBeTruthy();
    // No refetch — list() called exactly once on mount.
    expect(listMock).toHaveBeenCalledTimes(1);
  });

  test('save with NO changes early-returns (no api call, exits edit mode)', async () => {
    listMock.mockResolvedValue({ templates: [tpl({ id: 'a' })] });
    renderVorlagen();
    await waitFor(() => expect(screen.getByText('Bodenaushub')).toBeTruthy());
    fireEvent.click(screen.getByText('Bodenaushub').closest('tr')!);
    expect(screen.getByDisplayValue('Bodenaushub')).toBeTruthy();
    // Click Speichern without touching any field.
    fireEvent.click(screen.getByLabelText('Speichern'));
    // No PATCH call (Object.keys(patch).length === 0 hits the early return).
    expect(updateMock).not.toHaveBeenCalled();
    // Out of edit mode — view row is back.
    expect(screen.queryByDisplayValue('Bodenaushub')).toBeNull();
    expect(screen.getByText('Bodenaushub')).toBeTruthy();
  });

  test('parseGermanNum edge case: "1.234,56" (thousands separator) parses to 1234.56', async () => {
    listMock.mockResolvedValue({
      templates: [tpl({ id: 'a', defaultMaterialCost: 10 })],
    });
    updateMock.mockResolvedValue(tpl({ id: 'a', defaultMaterialCost: 1234.56 }));
    renderVorlagen();
    await waitFor(() => expect(screen.getByText('Bodenaushub')).toBeTruthy());
    fireEvent.click(screen.getByText('Bodenaushub').closest('tr')!);
    const matInput = screen.getByDisplayValue('10') as HTMLInputElement;
    fireEvent.change(matInput, { target: { value: '1.234,56' } });
    fireEvent.click(screen.getByLabelText('Speichern'));
    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1));
    expect(updateMock).toHaveBeenCalledWith('a', { defaultMaterialCost: 1234.56 });
  });
});

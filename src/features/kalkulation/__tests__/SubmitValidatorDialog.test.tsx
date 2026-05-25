/**
 * Tests for the Feature #4 SubmitValidatorDialog.
 *
 * Covers:
 *  - portal lifecycle (open=false → null, open=true → renders)
 *  - ESC + backdrop + body-stopPropagation
 *  - 3-phase state machine: drop → parsing → result
 *  - input + drag-drop file handlers + ACCEPTED_EXTENSIONS bound to accept attr
 *  - validator invocation (parsed gaeb + positions threaded through)
 *  - ResultView banners, four tiles, issue rows for every issue kind
 *  - regression: "Andere Datei" resets phase + clears tender/result
 *  - regression: closing + re-opening does NOT wipe a parsed result
 *  - regression: tender-empty issue renders the special copy
 *  - regression: quantity-mismatch numbers are German-formatted
 *
 * We mock @/lib/gaeb so the dialog never touches the real parser; the
 * stubbed parseGaebFile lets us drive the phase machine deterministically.
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import SubmitValidatorDialog from '../SubmitValidatorDialog';
import type { ParsedGaeb, Position as GaebPosition } from '@/lib/gaeb/types';
import type {
  ProjectPositionLite,
  ValidationResult,
  ValidationIssue,
} from '@/lib/gaeb/validator';

/* ─── module mocks ─────────────────────────────────────────────────── */

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}));

vi.mock('@/lib/gaeb', () => ({
  ACCEPTED_EXTENSIONS: ['.x83', '.x84', '.x81', '.d83', '.d84'],
  parseGaebFile: vi.fn(),
}));

import { parseGaebFile } from '@/lib/gaeb';
const parseMock = parseGaebFile as unknown as ReturnType<typeof vi.fn>;

/* ─── fixtures ─────────────────────────────────────────────────────── */

function gaebPos(over: Partial<GaebPosition> & { oz: string }): GaebPosition {
  return {
    oz: over.oz,
    pos: over.pos ?? over.oz,
    kurztext: over.kurztext ?? `Tender ${over.oz}`,
    langtext: '',
    einheit: over.einheit ?? 'm³',
    menge: over.menge,
    ep: over.ep,
    gp: over.gp,
    level: over.level ?? 1,
    type: over.type ?? 'item',
    qtyTBD: over.qtyTBD,
  };
}

function parsed(over: Partial<ParsedGaeb> = {}): ParsedGaeb {
  return {
    filename: over.filename ?? 'Test-LV.x83',
    size: over.size ?? 4242,
    format: over.format ?? 'gaeb-xml-3.2',
    formatLabel: over.formatLabel ?? 'GAEB DA XML 3.2',
    currency: over.currency ?? 'EUR',
    positionCount: over.positionCount ?? (over.positions?.length ?? 0),
    positions: over.positions ?? [
      gaebPos({ oz: '1.1', menge: 10, einheit: 'm³', kurztext: 'Erdaushub' }),
    ],
    groups: over.groups ?? [],
    hasLongtext: over.hasLongtext ?? false,
  };
}

function bidPos(over: Partial<ProjectPositionLite> & { oz: string }): ProjectPositionLite {
  return {
    oz: over.oz,
    shortText: over.shortText ?? `Bid ${over.oz}`,
    quantity: over.quantity ?? 0,
    unit: over.unit ?? 'm³',
    isHeader: over.isHeader ?? false,
  };
}

function makeFile(name = 'tender.x83', content = '<dummy/>') {
  return new File([content], name, { type: 'application/octet-stream' });
}

beforeEach(() => {
  parseMock.mockReset();
  document.body.style.overflow = '';
});

/* ─── tests ────────────────────────────────────────────────────────── */

describe('SubmitValidatorDialog', () => {
  test('returns null when open=false', () => {
    const { container } = render(
      <SubmitValidatorDialog
        open={false}
        onClose={() => {}}
        positions={[]}
        projectName="X"
      />,
    );
    expect(container.querySelector('[role=dialog]')).toBeNull();
  });

  test('renders dialog when open=true with the project name in the subtitle', () => {
    render(
      <SubmitValidatorDialog
        open
        onClose={() => {}}
        positions={[]}
        projectName="Brücken-Sanierung"
      />,
    );
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText(/Brücken-Sanierung/)).toBeTruthy();
  });

  test('ESC key fires onClose', () => {
    const onClose = vi.fn();
    render(
      <SubmitValidatorDialog open onClose={onClose} positions={[]} projectName="X" />,
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  test('clicking the backdrop calls onClose but clicking the dialog body does NOT', () => {
    const onClose = vi.fn();
    render(
      <SubmitValidatorDialog open onClose={onClose} positions={[]} projectName="X" />,
    );
    const backdrop = screen.getByRole('dialog');
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
    // The inner panel — the role=dialog's first child — must stopPropagation.
    const panel = backdrop.firstElementChild as HTMLElement;
    fireEvent.click(panel);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('initial phase = "drop" — dropzone copy visible', () => {
    render(
      <SubmitValidatorDialog open onClose={() => {}} positions={[]} projectName="X" />,
    );
    expect(screen.getByText(/Original-LV hier ablegen/)).toBeTruthy();
  });

  test('hidden file input has accept attribute bound to ACCEPTED_EXTENSIONS', () => {
    const { container } = render(
      <SubmitValidatorDialog open onClose={() => {}} positions={[]} projectName="X" />,
    );
    const input = container.querySelector('input[type=file]') as HTMLInputElement;
    expect(input).toBeTruthy();
    // From our mock: ['.x83', '.x84', '.x81', '.d83', '.d84']
    expect(input.accept).toContain('.x83');
    expect(input.accept).toContain('.x84');
  });

  test('picking a file calls parseGaebFile and transitions to result phase', async () => {
    parseMock.mockResolvedValueOnce(parsed());
    const positions = [bidPos({ oz: '1.1', quantity: 10 })];
    const { container } = render(
      <SubmitValidatorDialog open onClose={() => {}} positions={positions} projectName="X" />,
    );
    const input = container.querySelector('input[type=file]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile()] } });
    await waitFor(() => expect(parseMock).toHaveBeenCalled());
    // Final phase shows the result-only "Andere Datei" button.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Andere Datei' })).toBeTruthy(),
    );
  });

  test('file pick threads the parsed gaeb + positions through to the validator', async () => {
    parseMock.mockResolvedValueOnce(
      parsed({
        positions: [gaebPos({ oz: '1.1', menge: 10, einheit: 'm³' })],
      }),
    );
    const positions = [bidPos({ oz: '1.1', quantity: 10, unit: 'm³' })];
    const { container } = render(
      <SubmitValidatorDialog open onClose={() => {}} positions={positions} projectName="X" />,
    );
    const input = container.querySelector('input[type=file]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile()] } });
    // The result banner should report the matching count = 1.
    await waitFor(() =>
      expect(screen.getByText(/1 von 1 Tender-Positionen/)).toBeTruthy(),
    );
  });

  test('result.ok=true (no mismatches) → green "Kein Ausschlussrisiko" banner', async () => {
    parseMock.mockResolvedValueOnce(
      parsed({ positions: [gaebPos({ oz: '1.1', menge: 5, einheit: 'm³' })] }),
    );
    const positions = [bidPos({ oz: '1.1', quantity: 5, unit: 'm³' })];
    const { container } = render(
      <SubmitValidatorDialog open onClose={() => {}} positions={positions} projectName="X" />,
    );
    const input = container.querySelector('input[type=file]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile()] } });
    await waitFor(() =>
      expect(screen.getByText('Kein Ausschlussrisiko erkannt.')).toBeTruthy(),
    );
  });

  test('blocking issues → red banner with the blocking count', async () => {
    parseMock.mockResolvedValueOnce(
      parsed({
        positions: [
          gaebPos({ oz: '1.1', menge: 10, einheit: 'm³' }),
          gaebPos({ oz: '1.2', menge: 5, einheit: 'm³' }),
        ],
      }),
    );
    const positions = [bidPos({ oz: '1.1', quantity: 10, unit: 'm³' })];
    const { container } = render(
      <SubmitValidatorDialog open onClose={() => {}} positions={positions} projectName="X" />,
    );
    const input = container.querySelector('input[type=file]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile()] } });
    await waitFor(() =>
      expect(screen.getByText(/1 formal blockierende Abweichung/)).toBeTruthy(),
    );
  });

  test('all four tiles (Fehlend / Menge ≠ / Einheit ≠ / Hinweise) render', async () => {
    parseMock.mockResolvedValueOnce(parsed());
    const positions = [bidPos({ oz: '1.1', quantity: 10, unit: 'm³' })];
    const { container } = render(
      <SubmitValidatorDialog open onClose={() => {}} positions={positions} projectName="X" />,
    );
    const input = container.querySelector('input[type=file]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile()] } });
    await waitFor(() => expect(screen.getByText('Fehlend')).toBeTruthy());
    expect(screen.getByText('Menge ≠')).toBeTruthy();
    expect(screen.getByText('Einheit ≠')).toBeTruthy();
    expect(screen.getByText('Hinweise')).toBeTruthy();
  });

  test('tile counts reflect the issue breakdown', async () => {
    // 1 missing, 1 quantity-mismatch, 1 unit-mismatch, 1 warning (extra-in-bid).
    parseMock.mockResolvedValueOnce(
      parsed({
        positions: [
          gaebPos({ oz: '1.1', menge: 10, einheit: 'm³' }), // missing in bid
          gaebPos({ oz: '1.2', menge: 5, einheit: 'm³' }),  // qty mismatch
          gaebPos({ oz: '1.3', menge: 2, einheit: 'm³' }),  // unit mismatch
        ],
      }),
    );
    const positions = [
      bidPos({ oz: '1.2', quantity: 99, unit: 'm³' }),
      bidPos({ oz: '1.3', quantity: 2, unit: 'St' }),
      bidPos({ oz: '9.9', quantity: 1, unit: 'm' }), // extra-in-bid (warning)
    ];
    const { container } = render(
      <SubmitValidatorDialog open onClose={() => {}} positions={positions} projectName="X" />,
    );
    const input = container.querySelector('input[type=file]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile()] } });
    await waitFor(() => expect(screen.getByText('Fehlend')).toBeTruthy());
    // Each tile is a label + count "1". Find the label, walk to its parent tile.
    const fehlend = screen.getByText('Fehlend').closest('div')!;
    expect(fehlend.textContent).toContain('1');
    const menge = screen.getByText('Menge ≠').closest('div')!;
    expect(menge.textContent).toContain('1');
    const einheit = screen.getByText('Einheit ≠').closest('div')!;
    expect(einheit.textContent).toContain('1');
    const hinweise = screen.getByText('Hinweise').closest('div')!;
    expect(hinweise.textContent).toContain('1');
  });

  test('missing-in-bid issue row renders tender text', async () => {
    parseMock.mockResolvedValueOnce(
      parsed({
        positions: [
          gaebPos({
            oz: '1.1',
            menge: 10,
            einheit: 'm³',
            kurztext: 'Bodenaushub Klasse 3',
          }),
        ],
      }),
    );
    const { container } = render(
      <SubmitValidatorDialog open onClose={() => {}} positions={[]} projectName="X" />,
    );
    const input = container.querySelector('input[type=file]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile()] } });
    await waitFor(() => expect(screen.getByText('Bodenaushub Klasse 3')).toBeTruthy());
    expect(screen.getByText(/Im Angebot nicht enthalten/)).toBeTruthy();
  });

  test('tender-empty issue (regression — new issue kind) shows special copy', async () => {
    // Parsed file with zero items → validator emits one tender-empty issue.
    parseMock.mockResolvedValueOnce(parsed({ positions: [], positionCount: 0 }));
    const positions = [bidPos({ oz: '1.1', quantity: 1, unit: 'm' })];
    const { container } = render(
      <SubmitValidatorDialog open onClose={() => {}} positions={positions} projectName="X" />,
    );
    const input = container.querySelector('input[type=file]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile()] } });
    await waitFor(() =>
      expect(screen.getByText('Datei enthält keine Positionen')).toBeTruthy(),
    );
    expect(
      screen.getByText(/Es wurden keine Item-Positionen erkannt/),
    ).toBeTruthy();
  });

  test('quantity-mismatch numbers are German-formatted (regression for formatGermanQty)', async () => {
    parseMock.mockResolvedValueOnce(
      parsed({
        positions: [gaebPos({ oz: '1.1', menge: 1234.5, einheit: 'm³' })],
      }),
    );
    const positions = [bidPos({ oz: '1.1', quantity: 1000, unit: 'm³' })];
    const { container } = render(
      <SubmitValidatorDialog open onClose={() => {}} positions={positions} projectName="X" />,
    );
    const input = container.querySelector('input[type=file]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile()] } });
    await waitFor(() => {
      const cells = screen.getAllByText((c) => c.includes('1.234,5') && c.includes('1.000'));
      expect(cells.length).toBeGreaterThan(0);
    });
    // And the raw "1234.5" must NOT have been rendered.
    expect(screen.queryByText((c) => c.includes('1234.5'))).toBeNull();
  });

  test('"Andere Datei" resets phase to drop AND clears tender/result (regression)', async () => {
    parseMock.mockResolvedValueOnce(parsed({ filename: 'first.x83' }));
    const { container } = render(
      <SubmitValidatorDialog open onClose={() => {}} positions={[]} projectName="X" />,
    );
    const input = container.querySelector('input[type=file]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile()] } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Andere Datei' })).toBeTruthy());
    // The footer + result banner both reference the just-uploaded filename.
    expect(screen.getAllByText('first.x83').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Andere Datei' }));
    // Back to drop phase: dropzone visible, result banner gone, filename gone.
    expect(screen.getByText(/Original-LV hier ablegen/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Andere Datei' })).toBeNull();
    expect(screen.queryByText('first.x83')).toBeNull();
  });

  test('closing + re-opening does NOT wipe a parsed result (regression)', async () => {
    parseMock.mockResolvedValueOnce(parsed({ filename: 'sticky.x83' }));
    const { container, rerender } = render(
      <SubmitValidatorDialog open onClose={() => {}} positions={[]} projectName="X" />,
    );
    const input = container.querySelector('input[type=file]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile()] } });
    await waitFor(() =>
      expect(screen.getAllByText('sticky.x83').length).toBeGreaterThan(0),
    );
    // Close.
    rerender(
      <SubmitValidatorDialog open={false} onClose={() => {}} positions={[]} projectName="X" />,
    );
    // Re-open with same props.
    rerender(
      <SubmitValidatorDialog open onClose={() => {}} positions={[]} projectName="X" />,
    );
    // Result must still be visible (the useEffect no longer clears tender/result).
    expect(screen.getAllByText('sticky.x83').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Andere Datei' })).toBeTruthy();
  });

  test('REGRESSION 2026-05-23: switching project (projectName change) clears stale result', async () => {
    // SPA navigation can keep this dialog mounted while the parent project
    // swaps. Before the fix, Project A's result would remain visible against
    // Project B's positions — silent data-correctness bug.
    parseMock.mockResolvedValueOnce(parsed({ filename: 'project-a.x83' }));
    const { container, rerender } = render(
      <SubmitValidatorDialog open onClose={() => {}} positions={[]} projectName="Project A" />,
    );
    const input = container.querySelector('input[type=file]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile()] } });
    await waitFor(() =>
      expect(screen.getAllByText('project-a.x83').length).toBeGreaterThan(0),
    );
    // Parent navigates to a different project — same dialog instance kept open.
    rerender(
      <SubmitValidatorDialog open onClose={() => {}} positions={[]} projectName="Project B" />,
    );
    // Stale result must be gone, dropzone visible again.
    expect(screen.queryByText('project-a.x83')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Andere Datei' })).toBeNull();
    expect(screen.getByText(/hier ablegen oder klicken/i)).toBeTruthy();
  });

  test('parser throws → phase returns to "drop" + error banner shown', async () => {
    parseMock.mockRejectedValueOnce(new Error('XML kaputt'));
    const { container } = render(
      <SubmitValidatorDialog open onClose={() => {}} positions={[]} projectName="X" />,
    );
    const input = container.querySelector('input[type=file]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile()] } });
    await waitFor(() => expect(screen.getByText('XML kaputt')).toBeTruthy());
    // Back to drop phase: the dropzone copy is visible again.
    expect(screen.getByText(/Original-LV hier ablegen/)).toBeTruthy();
  });

  test('dragOver toggles the highlight style on the dropzone', () => {
    render(
      <SubmitValidatorDialog open onClose={() => {}} positions={[]} projectName="X" />,
    );
    const dropzone = screen.getByText(/Original-LV hier ablegen/).closest('[role=button]') as HTMLElement;
    expect(dropzone).toBeTruthy();
    expect(dropzone.className).not.toContain('border-primary-400');
    fireEvent.dragOver(dropzone);
    expect(dropzone.className).toContain('border-primary-400');
    fireEvent.dragLeave(dropzone);
    expect(dropzone.className).not.toContain('border-primary-400');
  });

  test('dropping a file fires parseGaebFile', async () => {
    parseMock.mockResolvedValueOnce(parsed());
    render(
      <SubmitValidatorDialog open onClose={() => {}} positions={[]} projectName="X" />,
    );
    const dropzone = screen
      .getByText(/Original-LV hier ablegen/)
      .closest('[role=button]') as HTMLElement;
    fireEvent.drop(dropzone, {
      dataTransfer: { files: [makeFile('drop.x83')] },
    });
    await waitFor(() => expect(parseMock).toHaveBeenCalled());
  });

  test('footer "Schließen" button calls onClose', () => {
    const onClose = vi.fn();
    render(
      <SubmitValidatorDialog open onClose={onClose} positions={[]} projectName="X" />,
    );
    // Two buttons resolve as "Schließen" — the X icon (aria-label) and the
    // footer's primary CTA (visible text). Grab the footer one specifically.
    const buttons = screen.getAllByRole('button', { name: 'Schließen' });
    const footerBtn = buttons.find((b) => b.classList.contains('bg-primary-600'));
    expect(footerBtn).toBeTruthy();
    fireEvent.click(footerBtn!);
    expect(onClose).toHaveBeenCalled();
  });

  test('header "Schließen" (X icon) calls onClose', () => {
    const onClose = vi.fn();
    render(
      <SubmitValidatorDialog open onClose={onClose} positions={[]} projectName="X" />,
    );
    fireEvent.click(screen.getByLabelText('Schließen'));
    expect(onClose).toHaveBeenCalled();
  });

  test('opening the dialog locks document.body scroll; closing restores it', () => {
    document.body.style.overflow = 'auto';
    const { rerender } = render(
      <SubmitValidatorDialog open onClose={() => {}} positions={[]} projectName="X" />,
    );
    expect(document.body.style.overflow).toBe('hidden');
    rerender(
      <SubmitValidatorDialog open={false} onClose={() => {}} positions={[]} projectName="X" />,
    );
    expect(document.body.style.overflow).toBe('auto');
  });

  test('tender-qty-tbd shows as a non-blocking warning (banner stays green)', async () => {
    parseMock.mockResolvedValueOnce(
      parsed({
        positions: [
          gaebPos({ oz: '1.1', menge: 0, einheit: 'm³', qtyTBD: true }),
        ],
      }),
    );
    const positions = [bidPos({ oz: '1.1', quantity: 0, unit: 'm³' })];
    const { container } = render(
      <SubmitValidatorDialog open onClose={() => {}} positions={positions} projectName="X" />,
    );
    const input = container.querySelector('input[type=file]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile()] } });
    await waitFor(() =>
      expect(screen.getByText('Kein Ausschlussrisiko erkannt.')).toBeTruthy(),
    );
  });
});

// Used only to keep TS happy with explicit imports
void ({} as ValidationResult);
void ({} as ValidationIssue);

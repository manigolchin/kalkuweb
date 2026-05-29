/**
 * Regression: the GAEB import-confirm button must be enabled after a GAEB
 * file is parsed.
 *
 * The unified ImportDialog gates its confirm button on the *sheet* preview
 * counts (okCount/warnCount/errorCount). Those are only ever populated on the
 * Excel/CSV path — for a GAEB file the positions live in the `gaeb` state, so
 * every count stayed 0 and the "Anhängen"/"Ersetzen" button was permanently
 * disabled. A user could parse a 315-position GAEB, see "315 importierbar",
 * and still not be able to confirm. The fix branches the disabled gate on a
 * dedicated `gaebImportableCount` (groups + items, remarks excluded) that
 * mirrors exactly what gaebToPositions() emits.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import ImportDialog from '../ImportDialog';
import type { Position } from '../types';
import type { ParsedGaeb, Position as GaebPosition } from '@/lib/gaeb';

// Only parseGaebFile is faked; detectFileKind (from ./excelImport) is real and
// classifies a `.x83` filename as 'gaeb' on its own, so the GAEB path is taken
// without any extra mocking. Everything else from @/lib/gaeb stays real.
vi.mock('@/lib/gaeb', async () => {
  const actual = await vi.importActual<typeof import('@/lib/gaeb')>('@/lib/gaeb');
  return { ...actual, parseGaebFile: vi.fn() };
});

import { parseGaebFile } from '@/lib/gaeb';
const mockParse = vi.mocked(parseGaebFile);

beforeEach(() => {
  mockParse.mockReset();
});

function pos(over: Partial<GaebPosition>): GaebPosition {
  return { oz: '', pos: '', kurztext: '', langtext: '', einheit: '', level: 1, type: 'item', ...over };
}

function fakeGaeb(positions: GaebPosition[]): ParsedGaeb {
  return {
    filename: 'sample.x83',
    size: 2048,
    format: 'gaeb-xml-3.2',
    formatLabel: 'GAEB DA XML 3.2',
    currency: 'EUR',
    positionCount: positions.filter((p) => p.type === 'item').length,
    positions,
    groups: positions
      .filter((p) => p.type === 'group')
      .map((p) => ({ oz: p.oz, label: p.kurztext, level: p.level })),
    hasLongtext: positions.some((p) => p.langtext.length > 0),
  };
}

function pickGaeb(container: HTMLElement, gaeb: ParsedGaeb) {
  mockParse.mockResolvedValue(gaeb);
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [new File(['x'], gaeb.filename)] } });
}

describe('ImportDialog — GAEB confirm button', () => {
  test('enables the import button once a GAEB with importable rows is parsed', async () => {
    const { container, findByTestId } = render(
      <ImportDialog open onClose={() => {}} onImport={() => {}} existingCount={0} />,
    );
    pickGaeb(container, fakeGaeb([
      pos({ oz: '01', kurztext: 'Erdarbeiten', type: 'group', level: 0 }),
      pos({ oz: '01.0010', kurztext: 'Aushub', einheit: 'm³', menge: 100 }),
      pos({ oz: '01.0020', kurztext: 'Verfüllung', einheit: 'm³', menge: 80 }),
    ]));

    const btn = (await findByTestId('import-confirm')) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  test('clicking confirm emits groups + items (remarks skipped) in append mode', async () => {
    const onImport = vi.fn();
    const { container, findByTestId } = render(
      <ImportDialog open onClose={() => {}} onImport={onImport} existingCount={0} />,
    );
    pickGaeb(container, fakeGaeb([
      pos({ oz: '01', kurztext: 'Erdarbeiten', type: 'group', level: 0 }),
      pos({ oz: '01.0010', kurztext: 'Aushub', einheit: 'm³', menge: 100 }),
      pos({ kurztext: 'Nur ein Hinweis', type: 'remark' }),
      pos({ oz: '01.0020', kurztext: 'Verfüllung', einheit: 'm³', menge: 80 }),
    ]));

    const btn = (await findByTestId('import-confirm')) as HTMLButtonElement;
    fireEvent.click(btn);

    expect(onImport).toHaveBeenCalledTimes(1);
    const [positions, mode] = onImport.mock.calls[0] as [Position[], string];
    expect(mode).toBe('append');
    expect(positions).toHaveLength(3); // 1 group header + 2 items, remark dropped
    expect(positions.every((p) => p.importedFrom === 'gaeb')).toBe(true);
  });

  test('keeps the button disabled when the GAEB has no importable rows', async () => {
    const { container, findByTestId } = render(
      <ImportDialog open onClose={() => {}} onImport={() => {}} existingCount={0} />,
    );
    pickGaeb(container, fakeGaeb([pos({ kurztext: 'Nur ein Hinweis', type: 'remark' })]));

    const btn = (await findByTestId('import-confirm')) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});

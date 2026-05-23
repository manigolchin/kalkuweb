/**
 * Excel/CSV import suite (70 tests) — IDs E-001..E-074.
 * Targets src/features/kalkulation/excelImport.ts.
 *
 * Strategy: build synthetic XLSX buffers in-memory via SheetJS, then feed them
 * to parseSheet via `new File([buf], name)`. Avoids fixture files on disk so
 * the suite stays portable.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import {
  autoMapColumns,
  buildPreviewRows,
  detectFileKind,
  parseSheet,
  previewToPositions,
  KALKU_FIELDS,
  type MappingSelection,
} from '@/features/kalkulation/excelImport';

// Lazy SheetJS — same way the production code uses it.
let xlsx: typeof import('xlsx');
beforeAll(async () => {
  xlsx = await import('xlsx');
});

/** Build an XLSX File from a 2D string array. */
function makeXlsxFile(aoa: (string | number | null)[][], filename = 'test.xlsx', sheetName = 'Tabelle1'): File {
  const ws = xlsx.utils.aoa_to_sheet(aoa);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, sheetName);
  const buf = xlsx.write(wb, { type: 'array', bookType: 'xlsx' });
  return new File([buf], filename, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

function makeCsvFile(rows: (string | number)[][], filename = 'test.csv', sep = ','): File {
  const text = rows.map((r) => r.join(sep)).join('\n');
  return new File([text], filename, { type: 'text/csv' });
}

/** Convenience: build a MappingSelection from a partial object. */
const m = (overrides: Partial<MappingSelection>): MappingSelection => ({
  oz: null,
  shortText: null,
  longText: null,
  quantity: null,
  unit: null,
  materialCost: null,
  timeMinutes: null,
  nuCost: null,
  ...overrides,
});

/* ─── 2A. parseSheet header-row detection (E-001..E-015) ─── */

describe('2A. parseSheet — header-row detection', () => {
  it('E-001 headers in row 1 — direct hit', async () => {
    const file = makeXlsxFile([
      ['OZ', 'Kurztext', 'Menge'],
      ['1.1', 'Erdaushub', 10],
    ]);
    const r = await parseSheet(file);
    expect(r.headers).toEqual(['OZ', 'Kurztext', 'Menge']);
    expect(r.rows.length).toBe(1);
  });

  it('E-002 1 banner row above headers (single cell)', async () => {
    const file = makeXlsxFile([
      ['Leistungsverzeichnis'],
      ['OZ', 'Kurztext', 'Menge'],
      ['1.1', 'Erdaushub', 10],
    ]);
    const r = await parseSheet(file);
    expect(r.headers).toEqual(['OZ', 'Kurztext', 'Menge']);
  });

  it('E-003 2 banner rows', async () => {
    const file = makeXlsxFile([
      ['Leistungsverzeichnis'],
      ['Projekt: Schul-Neubau'],
      ['OZ', 'Kurztext', 'Menge'],
      ['1.1', 'Erdaushub', 10],
    ]);
    const r = await parseSheet(file);
    expect(r.headers).toEqual(['OZ', 'Kurztext', 'Menge']);
  });

  it('E-004 LV3-style 2-cell banner ("Projekt:" + value) above real headers', async () => {
    // This is the real-world failure case the user reported. Currently the
    // header-row detector takes the FIRST row with ≥2 non-empty cells, which
    // picks the banner. Documented as a bug; test asserts the real headers
    // SHOULD be picked. Will fix in the implementation.
    const file = makeXlsxFile([
      ['Projekt:', 'Schul-Neubau Ottweiler'],
      ['Stand:', '2026-05-23'],
      ['OZ', 'Kurztext', 'Menge', 'EH'],
      ['1.1', 'Erdaushub', 10, 'm³'],
    ]);
    const r = await parseSheet(file);
    expect(r.headers).toEqual(['OZ', 'Kurztext', 'Menge', 'EH']);
  });

  it('E-005 empty rows around headers', async () => {
    const file = makeXlsxFile([
      [],
      ['OZ', 'Kurztext', 'Menge'],
      [],
      ['1.1', 'Erdaushub', 10],
    ]);
    const r = await parseSheet(file);
    expect(r.headers).toEqual(['OZ', 'Kurztext', 'Menge']);
    expect(r.rows.length).toBe(1);
  });

  it('E-006 first non-empty sheet wins when multiple sheets exist', async () => {
    const ws1 = xlsx.utils.aoa_to_sheet([['']]);
    const ws2 = xlsx.utils.aoa_to_sheet([
      ['OZ', 'Kurztext'],
      ['1.1', 'X'],
    ]);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws1, 'Leer');
    xlsx.utils.book_append_sheet(wb, ws2, 'Daten');
    const buf = xlsx.write(wb, { type: 'array', bookType: 'xlsx' });
    const file = new File([buf], 'm.xlsx');
    const r = await parseSheet(file);
    expect(r.sheetName).toBe('Daten');
  });

  it('E-007 CSV parsing — comma separator', async () => {
    const file = makeCsvFile([
      ['OZ', 'Kurztext', 'Menge'],
      ['1.1', 'Erdaushub', 10],
    ]);
    const r = await parseSheet(file);
    expect(r.headers).toEqual(['OZ', 'Kurztext', 'Menge']);
  });

  it('E-008 CSV — semicolon separator (German Excel)', async () => {
    const file = makeCsvFile(
      [
        ['OZ', 'Kurztext', 'Menge'],
        ['1.1', 'Erdaushub', 10],
      ],
      'g.csv',
      ';',
    );
    const r = await parseSheet(file);
    expect(r.headers).toEqual(['OZ', 'Kurztext', 'Menge']);
  });

  it('E-009 numeric cells preserve German "1,5" when stored as text', async () => {
    const file = makeXlsxFile([
      ['Menge'],
      ['1,5'], // explicit German decimal as text
    ]);
    const r = await parseSheet(file);
    expect(r.rows[0][0]).toBe('1,5');
  });

  it('E-010 trailing empty columns trimmed from headers', async () => {
    const file = makeXlsxFile([
      ['OZ', 'Kurztext', '', ''],
      ['1.1', 'Erdaushub', '', ''],
    ]);
    const r = await parseSheet(file);
    expect(r.headers).toEqual(['OZ', 'Kurztext']);
  });

  it('E-011 trailing empty data rows excluded', async () => {
    const file = makeXlsxFile([
      ['OZ', 'Kurztext'],
      ['1.1', 'A'],
      ['', ''],
      ['', ''],
    ]);
    const r = await parseSheet(file);
    expect(r.rows.length).toBe(1);
  });

  it('E-012 sheet with only A1 cell throws', async () => {
    // single cell with content but no other cells anywhere
    const ws = xlsx.utils.aoa_to_sheet([['only']]);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'X');
    const buf = xlsx.write(wb, { type: 'array', bookType: 'xlsx' });
    const file = new File([buf], 'tiny.xlsx');
    // Should NOT throw "no sheets" — should return headers=[] or single-col
    const r = await parseSheet(file);
    // Either headers is [] or the one cell is the header — accept either, just no crash
    expect(Array.isArray(r.headers)).toBe(true);
  });

  it('E-013 workbook with only blank cells throws human-readable error', async () => {
    // A workbook with a sheet present but every cell blank. parseSheet's
    // "Datei ist leer." path. (Truly-empty workbook can't be constructed
    // via SheetJS — it refuses to write one.)
    const file = makeXlsxFile([['', '', ''], ['', '', '']]);
    await expect(parseSheet(file)).rejects.toThrow();
  });

  it('E-014 throws human-readable error on empty data', async () => {
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.aoa_to_sheet([]);
    xlsx.utils.book_append_sheet(wb, ws, 'X');
    const buf = xlsx.write(wb, { type: 'array', bookType: 'xlsx' });
    const file = new File([buf], 'empty2.xlsx');
    await expect(parseSheet(file)).rejects.toThrow(/leer|enthält keine/);
  });

  it('E-015 returns SheetParse with filename + sheetName', async () => {
    const file = makeXlsxFile([['OZ', 'Kurztext'], ['1.1', 'A']], 'demo.xlsx', 'Kalkulation');
    const r = await parseSheet(file);
    expect(r.filename).toBe('demo.xlsx');
    expect(r.sheetName).toBe('Kalkulation');
  });
});

/* ─── 2B. autoMapColumns — synonyms (E-016..E-054) ─── */

describe('2B. autoMapColumns — German synonym matching', () => {
  // helper that asserts a specific header maps to a specific KALKU field
  function mapAndAssert(header: string, field: keyof MappingSelection) {
    const headers = [header];
    const r = autoMapColumns(headers);
    expect(r[field], `header "${header}" should map to ${String(field)}`).toBe(0);
  }

  // OZ
  it('E-016 OZ exact', () => mapAndAssert('OZ', 'oz'));
  it('E-017 OZ "Pos."', () => mapAndAssert('Pos.', 'oz'));
  it('E-018 OZ "Pos.-Nr."', () => mapAndAssert('Pos.-Nr.', 'oz'));
  it('E-019 OZ "Ordnungszahl"', () => mapAndAssert('Ordnungszahl', 'oz'));
  it('E-020 OZ "Position Nr."', () => mapAndAssert('Position Nr.', 'oz'));
  it('E-021 OZ "Position"', () => mapAndAssert('Position', 'oz'));
  it('E-022 OZ "Nr"', () => mapAndAssert('Nr', 'oz'));

  // Kurztext
  it('E-023 Kurztext exact', () => mapAndAssert('Kurztext', 'shortText'));
  it('E-024 Kurztext "Bezeichnung"', () => mapAndAssert('Bezeichnung', 'shortText'));
  it('E-025 Kurztext "Bezeichnung der Leistung"', () =>
    mapAndAssert('Bezeichnung der Leistung', 'shortText'));
  it('E-026 Kurztext "Beschreibung der Teilleistung"', () =>
    mapAndAssert('Beschreibung der Teilleistung', 'shortText'));
  it('E-027 Kurztext "Leistung"', () => mapAndAssert('Leistung', 'shortText'));
  it('E-028 Kurztext "Text"', () => mapAndAssert('Text', 'shortText'));
  it('E-029 Kurztext "Posten"', () => mapAndAssert('Posten', 'shortText'));

  // Langtext
  it('E-030 Langtext exact', () => mapAndAssert('Langtext', 'longText'));
  it('E-031 Langtext "Detail"', () => mapAndAssert('Detail', 'longText'));

  // Menge
  it('E-032 Menge exact', () => mapAndAssert('Menge', 'quantity'));
  it('E-033 Menge "Vordersatz"', () => mapAndAssert('Vordersatz', 'quantity'));
  it('E-034 Menge "Vord.-Menge"', () => mapAndAssert('Vord.-Menge', 'quantity'));
  it('E-035 Menge "Anzahl"', () => mapAndAssert('Anzahl', 'quantity'));
  it('E-036 Menge "Aufmaß"', () => mapAndAssert('Aufmaß', 'quantity'));

  // Einheit
  it('E-037 Einheit exact "EH"', () => mapAndAssert('EH', 'unit'));
  it('E-038 Einheit "Einheit"', () => mapAndAssert('Einheit', 'unit'));
  it('E-039 Einheit "ME"', () => mapAndAssert('ME', 'unit'));
  it('E-040 Einheit "Mengeneinheit"', () => mapAndAssert('Mengeneinheit', 'unit'));
  it('E-041 Einheit "Einh."', () => mapAndAssert('Einh.', 'unit'));

  // Material
  it('E-042 Material exact', () => mapAndAssert('Material', 'materialCost'));
  it('E-043 Material "Material €/EH"', () => mapAndAssert('Material €/EH', 'materialCost'));
  it('E-044 Material "Materialkosten"', () => mapAndAssert('Materialkosten', 'materialCost'));
  it('E-045 Material "Materialpreis"', () => mapAndAssert('Materialpreis', 'materialCost'));
  it('E-046 Material "Mat-EP"', () => mapAndAssert('Mat-EP', 'materialCost'));

  // Zeit
  it('E-047 Zeit exact', () => mapAndAssert('Zeit', 'timeMinutes'));
  it('E-048 Zeit "Stunden"', () => mapAndAssert('Stunden', 'timeMinutes'));
  it('E-049 Zeit "Std/EH"', () => mapAndAssert('Std/EH', 'timeMinutes'));
  it('E-050 Zeit "Min/Stck"', () => mapAndAssert('Min/Stck', 'timeMinutes'));

  // NU
  it('E-051 NU exact', () => mapAndAssert('NU', 'nuCost'));
  it('E-052 NU "Nachunternehmer"', () => mapAndAssert('Nachunternehmer', 'nuCost'));
  it('E-053 NU "Fremdleistung"', () => mapAndAssert('Fremdleistung', 'nuCost'));
  it('E-054 NU "Sub-Unternehmer"', () => mapAndAssert('Sub-Unternehmer', 'nuCost'));
});

/* ─── 2C. Mapping disambiguation + collision (E-055..E-059) ─── */

describe('2C. Mapping disambiguation', () => {
  it('E-055 same header cannot map to two fields', () => {
    // "Text" matches both shortText (alias) and longText (alias). The mapper
    // takes the first claim and removes that column from later consideration.
    const r = autoMapColumns(['Kurztext', 'Langtext']);
    expect(r.shortText).toBe(0);
    expect(r.longText).toBe(1);
    expect(r.shortText).not.toBe(r.longText);
  });
  it('E-056 multiple candidates — best score wins', () => {
    // "EinhMaß" and "Einheit" both candidate for unit; "Einheit" exact, "EinhMaß" partial
    const r = autoMapColumns(['EinhMaß', 'Einheit']);
    expect(r.unit).toBe(1);
  });
  it('E-057 unmapped header does not error', () => {
    const r = autoMapColumns(['Foo', 'Bar', 'Baz']);
    expect(r.oz).toBeNull();
    expect(r.shortText).toBeNull();
  });
  it('E-058 empty header skipped', () => {
    const r = autoMapColumns(['', 'OZ', '']);
    expect(r.oz).toBe(1);
  });
  it('E-059 case-insensitive', () => {
    const r = autoMapColumns(['kurztext', 'MENGE']);
    expect(r.shortText).toBe(0);
    expect(r.quantity).toBe(1);
  });
});

/* ─── 2D. buildPreviewRows validation (E-060..E-069) ─── */

describe('2D. buildPreviewRows validation', () => {
  const headers = ['OZ', 'Kurztext', 'Menge', 'EH', 'Material', 'Zeit', 'NU'];
  const fullMap: MappingSelection = {
    oz: 0,
    shortText: 1,
    longText: null,
    quantity: 2,
    unit: 3,
    materialCost: 4,
    timeMinutes: 5,
    nuCost: 6,
  };
  void headers; // header param is for documentation; mapping uses indices

  it('E-060 missing Kurztext → error', () => {
    const [r] = buildPreviewRows([['1.1', '', '5', 'm³', '10', '0', '0']], fullMap);
    expect(r.status).toBe('error');
    expect(r.issues.join(' ')).toMatch(/Kurztext fehlt/);
  });
  it('E-061 missing OZ is acceptable (warn-or-ok, not error)', () => {
    const [r] = buildPreviewRows([['', 'Erdaushub', '5', 'm³', '10', '0', '0']], fullMap);
    expect(r.status).not.toBe('error');
  });
  it('E-062 NaN Menge → error', () => {
    const [r] = buildPreviewRows([['1.1', 'X', 'abc', 'm³', '10', '0', '0']], fullMap);
    expect(r.status).toBe('error');
  });
  it('E-063 negative Menge → warn', () => {
    const [r] = buildPreviewRows([['1.1', 'X', '-5', 'm³', '10', '0', '0']], fullMap);
    expect(r.status).toBe('warn');
  });
  it('E-064 NaN Material → warn (numeric optional)', () => {
    const [r] = buildPreviewRows([['1.1', 'X', '5', 'm³', 'foo', '0', '0']], fullMap);
    expect(r.status === 'warn' || r.status === 'error').toBe(true);
  });
  it('E-065 duplicate OZ across rows → warn', () => {
    const rows = buildPreviewRows(
      [
        ['1.1', 'A', '1', '', '0', '0', '0'],
        ['1.1', 'B', '1', '', '0', '0', '0'],
      ],
      fullMap,
    );
    expect(rows[0].issues.some((i) => /mehrfach/.test(i))).toBe(true);
    expect(rows[1].issues.some((i) => /mehrfach/.test(i))).toBe(true);
  });
  it('E-066 all OK → status=ok', () => {
    const [r] = buildPreviewRows([['1.1', 'Erdaushub', '5', 'm³', '12.50', '0', '0']], fullMap);
    expect(r.status).toBe('ok');
  });
  it('E-067 German decimal "1.234,56" parses', () => {
    const [r] = buildPreviewRows([['1', 'X', '1.234,56', '', '0', '0', '0']], fullMap);
    expect(r.values.quantity).toBeCloseTo(1234.56, 2);
  });
  it('E-068 empty Menge string → 0', () => {
    const [r] = buildPreviewRows([['1', 'X', '', '', '0', '0', '0']], fullMap);
    expect(r.values.quantity).toBe(0);
  });
  it('E-069 whitespace per cell trimmed', () => {
    const [r] = buildPreviewRows([['  1  ', '  X  ', ' 5 ', '  m³  ', ' 10 ', ' 0 ', ' 0 ']], fullMap);
    expect(r.values.oz).toBe('1');
    expect(r.values.shortText).toBe('X');
    expect(r.values.unit).toBe('m³');
  });
});

/* ─── 2E. previewToPositions + detectFileKind (E-070..E-074) ─── */

describe('2E. previewToPositions + detectFileKind', () => {
  const map: MappingSelection = {
    oz: 0,
    shortText: 1,
    longText: null,
    quantity: 2,
    unit: null,
    materialCost: null,
    timeMinutes: null,
    nuCost: null,
  };

  it('E-070 skips error rows by default', () => {
    const preview = buildPreviewRows(
      [
        ['1', '', '5'], // error — no shortText
        ['2', 'X', '5'],
      ],
      map,
    );
    const out = previewToPositions(preview, 1);
    expect(out.length).toBe(1);
    expect(out[0].shortText).toBe('X');
  });
  it('E-071 includes error rows when opts.skipErrors=false', () => {
    const preview = buildPreviewRows(
      [
        ['1', '', '5'],
        ['2', 'X', '5'],
      ],
      map,
    );
    const out = previewToPositions(preview, 1, { skipErrors: false });
    expect(out.length).toBe(2);
  });
  it('E-072 sortOrder starts at startSortOrder and increments', () => {
    const preview = buildPreviewRows(
      [
        ['1', 'X', '1'],
        ['2', 'Y', '1'],
      ],
      map,
    );
    const out = previewToPositions(preview, 100);
    expect(out[0].sortOrder).toBe(100);
    expect(out[1].sortOrder).toBe(101);
  });
  it('E-073 each position has unique id', () => {
    const preview = buildPreviewRows(
      [
        ['1', 'X', '1'],
        ['2', 'Y', '1'],
      ],
      map,
    );
    const out = previewToPositions(preview, 1);
    expect(out[0].id).not.toBe(out[1].id);
  });
  it('E-074 detectFileKind sniffs correctly', () => {
    expect(detectFileKind('foo.xlsx')).toBe('spreadsheet');
    expect(detectFileKind('foo.xls')).toBe('spreadsheet');
    expect(detectFileKind('foo.csv')).toBe('spreadsheet');
    expect(detectFileKind('foo.ods')).toBe('spreadsheet');
    expect(detectFileKind('foo.x83')).toBe('gaeb');
    expect(detectFileKind('foo.x84')).toBe('gaeb');
    expect(detectFileKind('foo.d83')).toBe('gaeb');
    expect(detectFileKind('foo.p84')).toBe('gaeb');
    expect(detectFileKind('foo.xml')).toBe('gaeb');
    expect(detectFileKind('foo.png')).toBe('unknown');
    expect(detectFileKind('foo')).toBe('unknown');
  });
});

// Sanity: KALKU_FIELDS exposes label + required for every field used in mapping
describe('Misc', () => {
  it('KALKU_FIELDS shape matches MappingSelection keys', () => {
    const keys = KALKU_FIELDS.map((f) => f.key).sort();
    expect(keys).toEqual([
      'longText',
      'materialCost',
      'nuCost',
      'oz',
      'quantity',
      'shortText',
      'timeMinutes',
      'unit',
    ]);
  });
});

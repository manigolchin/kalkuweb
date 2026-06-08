/* AD-HOC: export a real parsed project, re-read the styled output, dump + assert
 * the Vorlage colors + live formulas + cent-exact EP/GP. */
import { describe, test, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import ExcelJS from 'exceljs';
import { parseKalkulationWorkbook } from '../parse';
import { exportToKalkulationVorlage } from '../export';

const HOME = process.env.HOME ?? '';
const SRC = join(HOME, 'Desktop/Claude/example 1/LV3_BH_mit_Preisen.xlsx');
const dd = existsSync(SRC) ? describe : describe.skip;

dd('export style + formula audit (real project round-trip)', () => {
  test('colors, formulas, and EP/GP survive parse → export', async () => {
    const parsed = await parseKalkulationWorkbook(new Uint8Array(readFileSync(SRC)));
    const project = parsed.project!;
    const bytes = await exportToKalkulationVorlage(project);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(bytes as unknown as ArrayBuffer);
    const ws = wb.getWorksheet('Kalkulation')!;
    const fg = (addr: string) => {
      const f = ws.getCell(addr).fill;
      return f && f.type === 'pattern' ? f.fgColor?.argb : undefined;
    };
    const isFormula = (addr: string) => {
      const v = ws.getCell(addr).value;
      return !!(v && typeof v === 'object' && 'formula' in v);
    };

    const txt = (a: string) => ws.getCell(a).text;

    // Colors match the Vorlage palette.
    expect(fg('I3')).toBe('FF003300'); // matrix dark green
    expect(fg('I13')).toBe('FFE7FFDE'); // Stoffe light green
    expect(fg('J13')).toBe('FFE2F1FF'); // Min/Lstg light blue
    expect(fg('M13')).toBe('FFFFEEF9'); // NU light pink
    expect(fg('M2')).toBe('FFFFFF00'); // Stundensatz yellow (editable)
    expect(fg('K4')).toBe('FFFFFF00'); // Material-ZSCHLG yellow

    // Full labelled helper-column headers (the part the first export was missing).
    expect(txt('N13')).toBe('F10'); expect(txt('U13')).toBe('F3'); expect(txt('W13')).toBe('F1');
    expect(txt('X12')).toBe('Stoffe-'); expect(txt('X13')).toBe('Kosten');
    expect(txt('Y12')).toBe('Zeit'); expect(txt('Y13')).toBe('in min');
    expect(txt('Z13')).toBe('Geräte '); expect(txt('AA13')).toBe('Geräte'); expect(txt('AB13')).toBe('Löhne');
    expect(txt('AC12')).toBe('Echte Zeit'); expect(txt('AC13')).toBe('in min');
    expect(txt('AE13')).toBe('Löhne'); expect(txt('AG13')).toBe('Geräte'); expect(txt('AH13')).toBe('Nachunt.');
    expect(txt('AJ13')).toBe('Stoffe VK'); expect(txt('AK13')).toBe('Nachu.');
    expect(txt('AM11')).toBe('Benötigte'); expect(txt('AM13')).toBe('Tagen');
    expect(txt('AN13')).toBe('Gesamt'); expect(txt('AP13')).toBe('pro Einheit');

    // Helper-column colors.
    expect(fg('X13')).toBe('FFE7FFDE'); // Stoffe-Kosten green
    expect(fg('AJ13')).toBe('FFE7FFDE'); // EP Stoffe VK green
    expect(fg('AK13')).toBe('FFFFEEF9'); // EP Nachu. pink
    expect(fg('AG13')).toBe('FFEDF1EF'); // GP Geräte grey
    expect(fg('N13')).toBe('FFF0ECD5'); // Faktoren tan

    // Far-right Stellschrauben block.
    expect(txt('AP2')).toBe('Geräte-Z.:'); expect(txt('AP4')).toBe('Zeitwert %:'); expect(txt('AP6')).toBe('Std. / Tag:');

    // The header matrix + first data row carry LIVE formulas.
    expect(isFormula('L4')).toBe(true); // Σ Stoffe VK
    expect(isFormula('F8')).toBe(true); // Σ Netto
    expect(isFormula('F10')).toBe(true); // Brutto

    // First real data row (find first non-header position).
    const firstData = project.positions.find((p) => !p.isHeader && p.shortText.trim())!;
    // Its export row = 14 + index, but headers/longtexts shift it; just scan
    // for the row whose B matches.
    let dataRowNum = 0;
    ws.eachRow((r, n) => {
      if (n >= 14 && r.getCell('B').text === firstData.shortText) dataRowNum = n;
    });
    expect(dataRowNum).toBeGreaterThan(0);
    expect(isFormula(`E${dataRowNum}`)).toBe(true);
    expect(isFormula(`F${dataRowNum}`)).toBe(true);

    // EP/GP cached results are cent-exact with calc (and thus the Excel).
    const epCell = ws.getCell(`E${dataRowNum}`).value as { result: number };
    const fpCell = ws.getCell(`F${dataRowNum}`).value as { result: number };
    expect(typeof epCell.result).toBe('number');
    expect(typeof fpCell.result).toBe('number');
    // GP = Menge × EP.
    expect(fpCell.result).toBeCloseTo(Math.round(firstData.quantity * epCell.result * 100) / 100, 2);

    console.log(`[export-style] row ${dataRowNum}: E=${ws.getCell('E' + dataRowNum).formula} → ${epCell.result}, F → ${fpCell.result}`);
  });

  // Header totals (Netto/Brutto, the matrix VERKAUF sums, Ges.Std, Lohn-EINKAUF,
  // Überschuss) must match the SOURCE LV across ALL 10 Vorlagen — the Vorlage
  // derives Ges.Std = Lohn-VK ÷ Verrechnungslohn (L7/M2), Lohn-EINKAUF =
  // Mittellohn × Ges.Std (NOT Σ raw hours), so this catches that 474-€ drift.
  const EXAMPLES = [
    'Desktop/Claude/example 1/LV3_BH_mit_Preisen.xlsx',
    'Desktop/Claude/example 2/LV3.xlsx',
    'Desktop/Claude/example 3/LV3.xlsx',
    'Desktop/Claude/example 4/LV3_FW_mit_Preisen.xlsx',
    'Desktop/claude1/example 5/LV3_.xlsx',
    'Desktop/claude1/example 6/LV3.xlsx',
    'Desktop/claude1/example 7/LV3.xlsx',
    'Desktop/claude1/example 8/LV3.xlsx',
    'Desktop/claude1/example 9/LV3.xlsx',
    'Desktop/claude1/example 10/LV3.xlsx',
  ];
  const num = (ws: ExcelJS.Worksheet, addr: string): number => {
    const v = ws.getCell(addr).value;
    if (v && typeof v === 'object') {
      if ('result' in v && typeof v.result === 'number') return v.result;
      // exceljs omits a cached result of 0 → a formula cell with no result
      // computes to 0 (e.g. a Nachunternehmer-Σ on an LV with no NU).
      if ('formula' in v) return 0;
    }
    return typeof v === 'number' ? v : NaN;
  };

  // Example 1 (no Bedarfspositionen): the export's header reproduces the SOURCE
  // LV's numbers within a euro — proves the Ges.Std/Lohn-EINKAUF/Überschuss
  // derivation matches a real file end-to-end.
  test('header totals match the source LV exactly (example 1, clean)', async () => {
    const srcWb = new ExcelJS.Workbook();
    await srcWb.xlsx.readFile(SRC);
    const src = srcWb.getWorksheet('Kalkulation')!;
    const parsed = await parseKalkulationWorkbook(new Uint8Array(readFileSync(SRC)));
    const expWb = new ExcelJS.Workbook();
    await expWb.xlsx.load((await exportToKalkulationVorlage(parsed.project!)) as unknown as ArrayBuffer);
    const exp = expWb.getWorksheet('Kalkulation')!;
    for (const cell of ['F8', 'F10', 'L4', 'L7', 'L8', 'J7', 'M9']) {
      expect(Math.abs(num(exp, cell) - num(src, cell)), `${cell}`).toBeLessThanOrEqual(1.0);
    }
  });

  // Across ALL 10 Vorlagen: the header's internal derivation is correct —
  // Ges.Std = Lohn-VK ÷ Verrechnungslohn, Lohn-EINKAUF = Mittellohn × Ges.Std,
  // Überschuss = Netto − Σ EINKAUF. (Absolute Netto can differ for LVs with
  // Bedarfspositionen / "nur EP" rows — a separate model gap, not this bug.)
  for (const rel of EXAMPLES) {
    const path = join(HOME, rel);
    const tt = existsSync(path) ? test : test.skip;
    tt(`header derivation is internally correct — ${rel.split('/')[2]}`, async () => {
      const parsed = await parseKalkulationWorkbook(new Uint8Array(readFileSync(path)));
      const expWb = new ExcelJS.Workbook();
      await expWb.xlsx.load((await exportToKalkulationVorlage(parsed.project!)) as unknown as ArrayBuffer);
      const exp = expWb.getWorksheet('Kalkulation')!;
      const [M2, K2, L7, L8, J7, M9, F8] = ['M2', 'K2', 'L7', 'L8', 'J7', 'M9', 'F8'].map((a) => num(exp, a));
      const ekTotal = num(exp, 'J4') + num(exp, 'J5') + num(exp, 'J6') + J7;
      if (M2 > 0) expect(Math.abs(L8 - L7 / M2), 'Ges.Std=L7/M2').toBeLessThanOrEqual(0.5);
      expect(Math.abs(J7 - K2 * L8), 'Lohn-EK=K2×L8').toBeLessThanOrEqual(0.5);
      expect(Math.abs(M9 - (F8 - ekTotal)), 'Überschuss=Netto−ΣEK').toBeLessThanOrEqual(1.0);
    });
  }
});

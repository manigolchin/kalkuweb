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
});

/**
 * Excel exporter that emits the canonical Kalkulation-template layout — the
 * inverse of `src/lib/kalku-xlsx/parse.ts`, styled to match the real LV3-Vorlage
 * (`~/Desktop/Claude/example {1-10}`): the dark-green EINKAUF/ZSCHLG/VERKAUF/
 * DIFFERNZ matrix, the tan header block, the green Stoffe / blue Min·Lstg /
 * pink NU cost columns, Arial-8 fonts, € number formats and medium borders.
 *
 * Uses exceljs (lazy-loaded) because the SheetJS community build cannot write
 * fills/fonts/borders. Every computed cell is written as a LIVE FORMULA with a
 * cached result, so the file opens showing the right numbers, recalculates when
 * the calculator edits an input, AND round-trips through `parseKalkulationWorkbook`
 * (which reads the cached `.v`). The per-component `ROUND(...,2)` mirrors calc.ts
 * so a recalc in Excel stays cent-exact with the panel.
 *
 * Column contract (must match parse.ts): A=Pos · B=Bezeichnung · C=Menge ·
 * D=Einheit · E=EP · F=GP · G=Gruppensumme · I=EP|EK Stoffe · J=Min/Einheit ·
 * K/L=Lstg./Std. · M=EP|EK NU · Y=Roh-Zeit · Z=Geräte-Satz · AA=EP Geräte ·
 * AB=EP Löhne · AC=Echt-Zeit · AE..AH=GP je Kostenart · AJ=Stoffe VK · AK=NU VK ·
 * AM=Stunden. Header Stellschrauben: K2=Mittellohn · M2=Verrechnungslohn ·
 * K4/K5/K6=Zuschläge · D9=MwSt · AP3=Geräte-Satz · AP5=Zeitabzug%.
 */

import type { ProjectData } from '@/features/kalkulation/types';
import { calcTotals, calculatePosition } from '@/features/kalkulation/calc';
import type { Borders, Fill, Worksheet } from 'exceljs';

// ── Vorlage palette (ARGB, read from example 1) ──────────────────────────────
const COL = {
  matrix: 'FF003300', // dark green header band (white text)
  body: 'FFD1CEBA',   // tan header block
  yellow: 'FFFFFF00',  // editable Stellschraube
  grey: 'FFF2F2F2',
  stoffe: 'FFE7FFDE', // light green — Material column
  blau: 'FFE2F1FF',   // light blue — Min/Einheit + Lstg./Std.
  nu: 'FFFFEEF9',     // light pink — NU column
};
const solid = (argb: string): Fill => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });

// ── Number formats (read from the Vorlage) ──────────────────────────────────
const NF = {
  eur: '#,##0.00 [$€-1]',
  ep: '[Red][<=0] #,##0.00 "€";[Black] #,##0.00 "€"',
  num2: '#,##0.00;[Red]#,##0.00',
  menge: '#,##0.000',
  pct: '0.00%',
  minfmt: '#,##0.00_ ;[Red]-#,##0.00 ',
  lstg: '#,##0.000_ ;[Red]-#,##0.000 ',
  int: '#,##0;[Red]#,##0',
};

const FONT = { name: 'Arial', size: 8 } as const;
const FONT_B = { name: 'Arial', size: 8, bold: true } as const;
const WHITE_B = { name: 'Arial', size: 8, bold: true, color: { argb: 'FFFFFFFF' } } as const;

const r2 = (n: number) => Math.round(n * 100) / 100;

export async function exportToKalkulationVorlage(data: ProjectData): Promise<Uint8Array> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Kalkulation');
  const cp = data.calcParams;

  const totals = calcTotals(data.positions, cp);

  type Style = { fill?: string; font?: typeof FONT | typeof FONT_B | typeof WHITE_B; numFmt?: string; align?: 'left' | 'center' | 'right'; border?: Partial<Borders> };
  const set = (ref: string, value: unknown, s: Style = {}) => {
    const cell = ws.getCell(ref);
    cell.value = value as never;
    cell.font = s.font ?? FONT;
    if (s.fill) cell.fill = solid(s.fill);
    if (s.numFmt) cell.numFmt = s.numFmt;
    if (s.align) cell.alignment = { horizontal: s.align, vertical: 'middle', wrapText: false };
    if (s.border) cell.border = s.border;
  };
  const F = (formula: string, result: number | string) => ({ formula, result });

  // ── Header block ───────────────────────────────────────────────────────────
  set('A2', 'AG:', { font: FONT_B });
  set('B2', data.client || '');
  set('D2', 'Abgabedatum:', { font: FONT_B });
  set('F2', data.deadline || '');
  set('I2', 'Lohnkosten, inkl L-NK / Std.:', { fill: COL.body, align: 'right' });
  set('K2', cp.mittellohn, { fill: COL.grey, numFmt: NF.eur, align: 'center' });
  set('L2', 'Stundensatz:', { fill: COL.body, align: 'right' });
  set('M2', cp.verrechnungslohn, { fill: COL.yellow, font: FONT_B, numFmt: NF.eur, align: 'center' });

  // Matrix header band (dark green, white bold).
  for (const [ref, label] of [['I3', 'EINKAUF'], ['K3', 'ZSCHLG'], ['L3', 'VERKAUF'], ['M3', 'DIFFERNZ']] as const) {
    set(ref, label, { fill: COL.matrix, font: WHITE_B, align: 'center' });
  }

  set('A4', 'Leistung:', { font: FONT_B });
  set('B4', data.service || '');
  set('D4', 'Vergabenummer:', { font: FONT_B });
  set('F4', data.tenderNumber || '');

  // Matrix body: Stoffe / Nachunternehmer / Geräte / Lohn. VERKAUF = Σ per-type
  // GP column; EINKAUF = VERKAUF/(1+Zuschlag); DIFFERNZ = VERKAUF − EINKAUF.
  const lastRow = 13 + Math.max(1, data.positions.length) + countLongTexts(data) + 2;
  const matRow = (
    r: number, label: string, vkSumCol: string, vkTotal: number, zschlg: number,
  ) => {
    const ek = zschlg !== -1 ? r2(vkTotal / (1 + zschlg)) : 0;
    set(`I${r}`, label + ':', { fill: COL.body, align: 'right' });
    set(`J${r}`, F(`L${r}/(1+K${r})`, ek), { fill: COL.body, numFmt: NF.eur, align: 'right' });
    if (zschlg !== -1) set(`K${r}`, zschlg, { fill: r <= 5 ? COL.yellow : COL.body, numFmt: NF.pct, align: 'center' });
    set(`L${r}`, F(`SUM(${vkSumCol}14:${vkSumCol}${lastRow})`, vkTotal), { fill: COL.body, numFmt: NF.eur, align: 'right' });
    set(`M${r}`, F(`L${r}-J${r}`, r2(vkTotal - ek)), { fill: COL.body, numFmt: NF.eur, align: 'right' });
  };
  matRow(4, 'Stoffe', 'AF', totals.totalMaterial, cp.materialZuschlag);
  matRow(5, 'Nachuntern.', 'AH', totals.totalNu, cp.nuZuschlag);
  matRow(6, 'Gerätekosten', 'AG', totals.totalGeraet, cp.geraeteZuschlagPct);
  // Lohn row: EINKAUF = Mittellohn × Stunden, ZSCHLG = VL/Mittellohn − 1.
  const lohnEk = r2(cp.mittellohn * totals.totalHours);
  const lohnZ = cp.mittellohn > 0 ? cp.verrechnungslohn / cp.mittellohn - 1 : 0;
  set('A6', 'BV:', { font: FONT_B });
  set('B6', data.name || '');
  set('I7', 'Lohn:', { fill: COL.body, align: 'right' });
  set('J7', F('K2*L8', lohnEk), { fill: COL.body, numFmt: NF.eur, align: 'right' });
  set('K7', F('M2/K2-1', r2(lohnZ)), { fill: COL.body, numFmt: NF.pct, align: 'center' });
  set('L7', F(`SUM(AE14:AE${lastRow})`, totals.totalLohn), { fill: COL.body, numFmt: NF.eur, align: 'right' });
  set('M7', F('L7-J7', r2(totals.totalLohn - lohnEk)), { fill: COL.body, numFmt: NF.eur, align: 'right' });

  // Netto / MwSt / Brutto + project KPIs.
  set('A8', 'Bieter:', { font: FONT_B });
  set('B8', data.bidder || '');
  set('C8', 'Netto Angebotssumme', { align: 'left' });
  set('F8', F(`SUM(F14:F${lastRow})`, totals.totalNetto), { numFmt: NF.eur, align: 'right' });
  set('I8', 'Mitarbeiter:', { fill: COL.body, align: 'right' });
  set('J8', cp.personaleinsatz, { font: FONT_B, numFmt: NF.int, align: 'center' });
  set('K8', 'Ges. Std.:', { fill: COL.body, align: 'right' });
  set('L8', F(`SUM(AM14:AM${lastRow})`, r2(totals.totalHours)), { fill: COL.body, numFmt: NF.minfmt, align: 'left' });
  set('M8', 'Überschuss:', { fill: COL.matrix, font: WHITE_B, align: 'center' });

  set('C9', 'MwSt.:', { align: 'left' });
  set('D9', cp.mwst, { numFmt: NF.pct, align: 'center' });
  set('F9', F('F8*D9', r2(totals.totalMwst)), { numFmt: NF.eur, align: 'right' });
  set('I9', 'Arbeitstage:', { fill: COL.body, align: 'right' });
  const arbeitstage = cp.personaleinsatz > 0 && cp.tagesstunden > 0 ? r2(totals.totalHours / (cp.personaleinsatz * cp.tagesstunden)) : 0;
  set('J9', arbeitstage, { fill: COL.body, numFmt: NF.minfmt, align: 'left' });
  set('K9', 'Monate:', { fill: COL.body, align: 'right' });
  set('L9', r2(arbeitstage / 21.5), { fill: COL.body, numFmt: NF.minfmt, align: 'left' });
  set('M9', F('SUM(M4:M7)', r2(totals.totalNetto - matrixEkTotal(totals, cp))), { fill: COL.matrix, font: WHITE_B, numFmt: NF.eur, align: 'center' });

  set('C10', 'Brutto Angebotssumme', { font: FONT_B, align: 'left' });
  set('F10', F('F8+F9', r2(totals.totalBrutto)), { font: FONT_B, numFmt: NF.eur, align: 'right' });

  set('I11', 'Zeitwert:', { align: 'right' });
  set('J11', F('AP5/100', r2(cp.zeitabzug / 100)), { numFmt: NF.pct, align: 'left' });
  set('L11', 'Kontrollsmm.:', { align: 'center' });
  set('M11', F('SUM(L4:L7)-F8', 0), { numFmt: NF.minfmt, align: 'left' });

  set('I12', 'Stoffe', { fill: COL.stoffe, align: 'center' });
  set('J12', 'Bei Mitarbeiter-Einsatz:', { fill: COL.blau, font: FONT_B, align: 'right' });
  set('L12', cp.personaleinsatz, { font: FONT_B, numFmt: NF.int, align: 'center' });
  set('M12', 'NU', { fill: COL.nu, align: 'center' });

  // Hidden Stellschrauben the importer reads (Geräte-Satz, Zeitabzug%).
  set('AP3', cp.geraeteStundensatz, { numFmt: NF.num2 });
  set('AP5', cp.zeitabzug, { numFmt: NF.num2 });

  // ── Row 13 — column headers ──────────────────────────────────────────────
  const med: Partial<Borders> = { top: { style: 'medium' }, bottom: { style: 'medium' } };
  set('A13', 'Pos.', { font: FONT_B, align: 'center', border: med });
  set('B13', 'Bezeichnung', { font: FONT_B, align: 'center', border: med });
  set('C13', 'Menge', { font: FONT_B, align: 'center', border: med });
  set('E13', 'EP', { font: FONT_B, align: 'center', border: med });
  set('F13', 'GP', { font: FONT_B, align: 'center', border: { ...med, right: { style: 'medium' } } });
  set('I13', 'EP | EK', { fill: COL.stoffe, align: 'center', border: { bottom: { style: 'medium' }, left: { style: 'medium' } } });
  set('J13', 'Min/Einheit', { fill: COL.blau, align: 'center', border: { bottom: { style: 'medium' } } });
  set('K13', 'Lstg./Std.', { fill: COL.blau, font: FONT_B, align: 'center', border: { bottom: { style: 'medium' } } });
  set('L13', 'Lstg./Std.', { fill: COL.blau, font: FONT_B, align: 'center', border: { bottom: { style: 'medium' } } });
  set('M13', 'EP | EK', { fill: COL.nu, align: 'center', border: { bottom: { style: 'medium' }, left: { style: 'medium' }, right: { style: 'medium' } } });

  // ── Positions ─────────────────────────────────────────────────────────────
  let row = 14;
  const groupStarts = new Map<number, number>(); // header row → first data row

  for (let i = 0; i < data.positions.length; i++) {
    const p = data.positions[i];
    if (p.isHeader) {
      if (p.oz) set(`A${row}`, p.oz, { font: FONT_B });
      set(`B${row}`, p.shortText || '', { font: FONT_B });
      // Live group subtotal over this group's data rows (filled after the loop).
      groupStarts.set(row, row + 1);
      row += 1;
      continue;
    }
    const calc = calculatePosition(p, cp);
    const geraeteSatz = p.geraeteSatz ?? cp.geraeteStundensatz;

    if (p.oz) set(`A${row}`, p.oz);
    set(`B${row}`, p.shortText || '');
    set(`C${row}`, p.quantity, { numFmt: NF.menge });
    if (p.unit) set(`D${row}`, p.unit);
    // E = Σ rounded components; F = Menge × EP. Both live + cached.
    set(`E${row}`, F(`AA${row}+AB${row}+AJ${row}+AK${row}`, calc.ep), { numFmt: NF.ep, align: 'right' });
    set(`F${row}`, F(`ROUND(C${row}*E${row},2)`, calc.gp), { numFmt: NF.eur, align: 'right' });

    // Inputs (shown, colored).
    set(`I${row}`, p.materialCost, { fill: COL.stoffe, numFmt: NF.num2, align: 'right' });
    set(`J${row}`, F(`IF(AC${row}=0,"-",AC${row})`, adj(p.timeMinutes, cp.zeitabzug)), { fill: COL.blau, numFmt: NF.minfmt, align: 'right' });
    set(`K${row}`, F(`IFERROR(60/AC${row}*$L$12,"-")`, lstg(p.timeMinutes, cp, 1)), { fill: COL.blau, numFmt: NF.lstg, align: 'right' });
    set(`L${row}`, F(`IFERROR(60/AC${row}*8*$L$12,"-")`, lstg(p.timeMinutes, cp, cp.tagesstunden)), { fill: COL.blau, numFmt: NF.lstg, align: 'right' });
    set(`M${row}`, p.nuCost || null, { fill: COL.nu, numFmt: NF.minfmt, align: 'right' });

    // Hidden helper machinery (matches the Vorlage's columns so re-import works).
    set(`Y${row}`, p.timeMinutes, { numFmt: NF.num2 });
    set(`Z${row}`, geraeteSatz, { numFmt: NF.num2 });
    set(`AC${row}`, F(`ROUND(Y${row}+Y${row}/100*$AP$5,2)`, adjNum(p.timeMinutes, cp.zeitabzug)), { numFmt: NF.num2 });
    // EP Geräte (AA): hard-coded lump sum wins; else rate × time.
    if (p.geraeteEp != null) set(`AA${row}`, r2(p.geraeteEp), { numFmt: NF.num2 });
    else set(`AA${row}`, F(`ROUND(AC${row}/60*Z${row},2)`, calc.epGeraet), { numFmt: NF.num2 });
    // EP Löhne (AB): pinned specialist rate wins; else time × Verrechnungslohn.
    if (p.lohnEp != null) set(`AB${row}`, r2(p.lohnEp), { numFmt: NF.num2 });
    else set(`AB${row}`, F(`ROUND(AC${row}/60*$M$2,2)`, calc.epLohn), { numFmt: NF.num2 });
    set(`AJ${row}`, F(`ROUND(I${row}*(1+$K$4),2)`, calc.epMaterial), { numFmt: NF.num2 });
    set(`AK${row}`, F(`ROUND(M${row}*(1+$K$5),2)`, calc.epNu), { numFmt: NF.num2 });
    // Per-cost-type GP (for the matrix VERKAUF sums) + hours.
    set(`AE${row}`, F(`ROUND(C${row}*AB${row},2)`, calc.gpLohn), { numFmt: NF.num2 });
    set(`AF${row}`, F(`ROUND(C${row}*AJ${row},2)`, calc.gpMaterial), { numFmt: NF.num2 });
    set(`AG${row}`, F(`ROUND(C${row}*AA${row},2)`, calc.gpGeraet), { numFmt: NF.num2 });
    set(`AH${row}`, F(`ROUND(C${row}*AK${row},2)`, calc.gpNu), { numFmt: NF.num2 });
    set(`AM${row}`, F(`ROUND(AC${row}*C${row}/60,2)`, calc.hoursTotal), { numFmt: NF.num2 });

    const dataRow = row;
    row += 1;
    if (p.longText && p.longText.trim()) {
      set(`B${row}`, p.longText.trim());
      row += 1;
    }
    void dataRow;
  }

  // Fill group subtotals as live SUM over each group's data rows.
  const sortedHeaders = [...groupStarts.keys()].sort((a, b) => a - b);
  for (let h = 0; h < sortedHeaders.length; h++) {
    const start = sortedHeaders[h] + 1;
    const end = (sortedHeaders[h + 1] ?? row) - 1;
    if (end >= start) {
      const sub = sumF(ws, start, end);
      set(`G${sortedHeaders[h]}`, F(`SUM(F${start}:F${end})`, sub), { font: FONT_B, numFmt: NF.eur, align: 'right' });
    }
  }

  // ── Column widths (from the Vorlage) ────────────────────────────────────────
  const widths: Record<string, number> = {
    A: 11, B: 38, C: 10, D: 5, E: 11, F: 13, G: 9, H: 0.4,
    I: 10, J: 10, K: 8, L: 10, M: 9,
    Y: 9, Z: 7, AA: 8.5, AB: 8.5, AC: 8.5, AE: 8.5, AF: 8.5, AG: 8.5, AH: 8.5, AJ: 8.5, AK: 8.5, AM: 8.5,
  };
  for (const [col, w] of Object.entries(widths)) ws.getColumn(col).width = w;

  const buf = await wb.xlsx.writeBuffer();
  return new Uint8Array(buf);
}

// ── helpers ──────────────────────────────────────────────────────────────────
function countLongTexts(data: ProjectData): number {
  return data.positions.filter((p) => p.longText && p.longText.trim()).length;
}
function adjNum(timeMinutes: number, zeitabzug: number): number {
  return r2(timeMinutes + (timeMinutes / 100) * zeitabzug);
}
function adj(timeMinutes: number, zeitabzug: number): number | string {
  const a = adjNum(timeMinutes, zeitabzug);
  return a === 0 ? '-' : a;
}
function lstg(timeMinutes: number, cp: ProjectData['calcParams'], factor: number): number | string {
  const a = adjNum(timeMinutes, cp.zeitabzug);
  if (a === 0) return '-';
  return r2((60 / a) * factor * cp.personaleinsatz);
}
function matrixEkTotal(t: ReturnType<typeof calcTotals>, cp: ProjectData['calcParams']): number {
  const stoffeEk = t.totalMaterial / (1 + cp.materialZuschlag);
  const nuEk = t.totalNu / (1 + cp.nuZuschlag);
  const geraeteEk = t.totalGeraet / (1 + cp.geraeteZuschlagPct);
  const lohnEk = cp.mittellohn * t.totalHours;
  return r2(stoffeEk + nuEk + geraeteEk + lohnEk);
}
function sumF(ws: Worksheet, start: number, end: number): number {
  let s = 0;
  for (let r = start; r <= end; r++) {
    const v = ws.getCell(`F${r}`).value;
    if (v && typeof v === 'object' && 'result' in v && typeof v.result === 'number') s += v.result;
    else if (typeof v === 'number') s += v;
  }
  return r2(s);
}

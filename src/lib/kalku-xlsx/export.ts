/**
 * Excel exporter that emits the canonical Kalkulation-template layout — the
 * inverse of `parse.ts`, styled to match the real LV3-Vorlage
 * (`~/Desktop/Claude/example {1-10}`) column-for-column: the dark-green
 * EINKAUF/ZSCHLG/VERKAUF/DIFFERNZ matrix, the tan header block, AND the full
 * set of labelled, colored helper columns to the right —
 *   I=EP|EK Stoffe · J=Min/Einheit · K/L=Lstg./Std. · M=EP|EK NU ·
 *   N..T=F10..F4 · U/V/W=F3/F2/F1 (Vorrechnung) · X=Stoffe-Kosten · Y=Zeit in min ·
 *   Z=Zulage Geräte · AA=EP Geräte · AB=EP Löhne · AC=Echte Zeit ·
 *   AE..AH=GP Löhne/Stoffe/Geräte/Nachunt. · AJ=EP Stoffe VK · AK=EP Nachu. ·
 *   AM=Benötigte Zeit in Tagen · AN=Stunden Gesamt · AP=EP Stunden pro Einheit —
 * plus the far-right Stellschrauben block (Geräte-Z. / Zeitwert % / Std. pro Tag).
 *
 * exceljs (lazy) — SheetJS community cannot write fills. Every computed cell is a
 * LIVE FORMULA with a cached result (opens correct, recalculates, round-trips via
 * the importer's cached `.v`). ROUND(...,2) per component mirrors calc.ts so a
 * recalc in Excel stays cent-exact with the panel.
 */

import type { ProjectData } from '@/features/kalkulation/types';
import { calcTotals, calculatePosition } from '@/features/kalkulation/calc';
import type { Borders, Fill, Worksheet } from 'exceljs';

// ── Vorlage palette (ARGB, read from example 1) ──────────────────────────────
const C = {
  matrix: 'FF003300', // dark green band (white text)
  body: 'FFD1CEBA',   // tan header block
  yellow: 'FFFFFF00',  // editable Stellschraube
  grey: 'FFF2F2F2',
  green: 'FFE7FFDE',  // Stoffe / Material
  blau: 'FFE2F1FF',   // Min/Einheit, Lstg., Zeit, Löhne, Tage, Stunden
  wblau: 'FFE3F1FF',  // W (F1)
  nu: 'FFFFEEF9',     // NU
  white: 'FFFFFFFF',
  light: 'FFEFF4F8',  // Echte Zeit / EP Stunden (light blue-grey)
  near: 'FFF9FFF9',   // GP Löhne/Stoffe/Nachunt.
  greyc: 'FFEDF1EF',  // GP Geräte
  tan2: 'FFF0ECD5',   // Faktoren F10..F4
};
const solid = (argb: string): Fill => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });

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

// Helper-column metadata: [row11, row12, row13, headerFill, dataFill].
const HELP: Record<string, [string, string, string, string, string]> = {
  N: ['', '', 'F10', C.tan2, C.tan2], O: ['', '', 'F9', C.tan2, C.tan2], P: ['', '', 'F8', C.tan2, C.tan2],
  Q: ['', '', 'F7', C.tan2, C.tan2], R: ['', '', 'F6', C.tan2, C.tan2], S: ['', '', 'F5', C.tan2, C.tan2],
  T: ['', '', 'F4', C.tan2, C.tan2], U: ['', '', 'F3', C.white, C.white], V: ['', '', 'F2', C.green, C.green],
  W: ['', '', 'F1', C.blau, C.wblau],
  X: ['', 'Stoffe-', 'Kosten', C.green, C.green], Y: ['', 'Zeit', 'in min', C.blau, C.blau],
  Z: ['', 'Zulage', 'Geräte ', C.white, C.white], AA: ['', 'EP', 'Geräte', C.white, C.white],
  AB: ['', 'EP', 'Löhne', C.blau, C.blau], AC: ['', 'Echte Zeit', 'in min', C.light, C.light],
  AE: ['', 'GP', 'Löhne', C.near, C.near], AF: ['', 'GP', 'Stoffe', C.near, C.near],
  AG: ['', 'GP', 'Geräte', C.greyc, C.greyc], AH: ['', 'GP', 'Nachunt.', C.near, C.near],
  AJ: ['', 'EP', 'Stoffe VK', C.green, C.green], AK: ['', 'EP', 'Nachu.', C.nu, C.nu],
  AM: ['Benötigte', 'Zeit in', 'Tagen', C.blau, C.blau], AN: ['', 'Stunden', 'Gesamt', C.blau, C.blau],
  AP: ['EP', 'Stunden', 'pro Einheit', C.light, C.light],
};

export async function exportToKalkulationVorlage(data: ProjectData): Promise<Uint8Array> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  // Force Excel to recompute every formula on open — guarantees correct numbers
  // even where exceljs omitted a cached `0` result.
  wb.calcProperties.fullCalcOnLoad = true;
  const ws = wb.addWorksheet('Kalkulation');
  const cp = data.calcParams;
  const t = calcTotals(data.positions, cp);

  type Style = { fill?: string; font?: typeof FONT | typeof FONT_B | typeof WHITE_B; numFmt?: string; align?: 'left' | 'center' | 'right'; border?: Partial<Borders> };
  const set = (ref: string, value: unknown, s: Style = {}) => {
    const cell = ws.getCell(ref);
    cell.value = value as never;
    cell.font = s.font ?? FONT;
    if (s.fill) cell.fill = solid(s.fill);
    if (s.numFmt) cell.numFmt = s.numFmt;
    if (s.align) cell.alignment = { horizontal: s.align, vertical: 'middle' };
    if (s.border) cell.border = s.border;
  };
  const F = (formula: string, result: number | string) => ({ formula, result });

  // ── Header block (rows 2–12) ────────────────────────────────────────────────
  set('A2', 'AG:', { font: FONT_B }); set('B2', data.client || '');
  set('D2', 'Abgabedatum:', { font: FONT_B }); set('F2', data.deadline || '');
  set('I2', 'Lohnkosten, inkl L-NK / Std.:', { fill: C.body, align: 'right' });
  set('K2', cp.mittellohn, { fill: C.grey, numFmt: NF.eur, align: 'center' });
  set('L2', 'Stundensatz:', { fill: C.body, align: 'right' });
  set('M2', cp.verrechnungslohn, { fill: C.yellow, font: FONT_B, numFmt: NF.eur, align: 'center' });

  for (const [ref, label] of [['I3', 'EINKAUF'], ['K3', 'ZSCHLG'], ['L3', 'VERKAUF'], ['M3', 'DIFFERNZ']] as const) {
    set(ref, label, { fill: C.matrix, font: WHITE_B, align: 'center' });
  }

  set('A4', 'Leistung:', { font: FONT_B }); set('B4', data.service || '');
  set('D4', 'Vergabenummer:', { font: FONT_B }); set('F4', data.tenderNumber || '');

  const lastRow = 13 + Math.max(1, data.positions.length) + data.positions.filter((p) => p.longText?.trim()).length + 2;
  const matRow = (r: number, label: string, vkCol: string, vkTotal: number, z: number) => {
    const ek = r2(vkTotal / (1 + z));
    set(`I${r}`, label + ':', { fill: C.body, align: 'right' });
    set(`J${r}`, F(`L${r}/(1+K${r})`, ek), { fill: C.body, numFmt: NF.eur, align: 'right' });
    set(`K${r}`, z, { fill: r <= 5 ? C.yellow : C.body, numFmt: NF.pct, align: 'center' });
    set(`L${r}`, F(`SUM(${vkCol}14:${vkCol}${lastRow})`, vkTotal), { fill: C.body, numFmt: NF.eur, align: 'right' });
    set(`M${r}`, F(`L${r}-J${r}`, r2(vkTotal - ek)), { fill: C.body, numFmt: NF.eur, align: 'right' });
  };
  matRow(4, 'Stoffe', 'AF', t.totalMaterial, cp.materialZuschlag);
  matRow(5, 'Nachuntern.', 'AH', t.totalNu, cp.nuZuschlag);
  matRow(6, 'Gerätekosten', 'AG', t.totalGeraet, cp.geraeteZuschlagPct);
  // Ges. Std = Lohn-VERKAUF ÷ Verrechnungslohn (the Vorlage's `L7/M2`), NOT the
  // raw Σ hours — they differ by the per-component rounding. Lohn-EINKAUF then =
  // Mittellohn × Ges.Std, so Lohn-DIFFERNZ + Überschuss match the Vorlage exactly.
  const gesStunden = cp.verrechnungslohn > 0 ? t.totalLohn / cp.verrechnungslohn : 0;
  // Lohn-EINKAUF = K2 × L8, where L8 (Ges.Std) is the rounded cell value — so the
  // cached result equals what `=K2*L8` recomputes (and matches the source file).
  const lohnEk = r2(cp.mittellohn * r2(gesStunden));
  set('A6', 'BV:', { font: FONT_B }); set('B6', data.name || '');
  set('I7', 'Lohn:', { fill: C.body, align: 'right' });
  set('J7', F('K2*L8', lohnEk), { fill: C.body, numFmt: NF.eur, align: 'right' });
  set('K7', F('M2/K2-1', r2(cp.mittellohn > 0 ? cp.verrechnungslohn / cp.mittellohn - 1 : 0)), { fill: C.body, numFmt: NF.pct, align: 'center' });
  set('L7', F(`SUM(AE14:AE${lastRow})`, t.totalLohn), { fill: C.body, numFmt: NF.eur, align: 'right' });
  set('M7', F('L7-J7', r2(t.totalLohn - lohnEk)), { fill: C.body, numFmt: NF.eur, align: 'right' });

  set('A8', 'Bieter:', { font: FONT_B }); set('B8', data.bidder || '');
  set('C8', 'Netto Angebotssumme', { align: 'left' });
  set('F8', F(`SUM(F14:F${lastRow})`, t.totalNetto), { numFmt: NF.eur, align: 'right' });
  set('I8', 'Mitarbeiter:', { fill: C.body, align: 'right' });
  set('J8', cp.personaleinsatz, { font: FONT_B, numFmt: NF.int, align: 'center' });
  set('K8', 'Ges. Std.:', { fill: C.body, align: 'right' });
  set('L8', F('L7/M2', r2(gesStunden)), { fill: C.body, numFmt: NF.minfmt, align: 'left' });
  set('M8', 'Überschuss:', { fill: C.matrix, font: WHITE_B, align: 'center' });

  set('C9', 'MwSt.:', { align: 'left' }); set('D9', cp.mwst, { numFmt: NF.pct, align: 'center' });
  set('F9', F('F8*D9', r2(t.totalMwst)), { numFmt: NF.eur, align: 'right' });
  set('I9', 'Arbeitstage:', { fill: C.body, align: 'right' });
  const tage = cp.personaleinsatz > 0 && cp.tagesstunden > 0 ? r2(t.totalHours / (cp.personaleinsatz * cp.tagesstunden)) : 0;
  set('J9', F(`SUM(AM14:AM${lastRow})`, tage), { fill: C.body, numFmt: NF.minfmt, align: 'left' });
  set('K9', 'Monate:', { fill: C.body, align: 'right' });
  set('L9', F('J9/21.5', r2(tage / 21.5)), { fill: C.body, numFmt: NF.minfmt, align: 'left' });
  set('M9', F('SUM(M4:M7)', r2(t.totalNetto - matrixEk(t, cp))), { fill: C.matrix, font: WHITE_B, numFmt: NF.eur, align: 'center' });

  set('C10', 'Brutto Angebotssumme', { font: FONT_B, align: 'left' });
  set('F10', F('F8+F9', r2(t.totalBrutto)), { font: FONT_B, numFmt: NF.eur, align: 'right' });

  set('I11', 'Zeitwert:', { align: 'right' });
  set('J11', F('AP5/100', r2(cp.zeitabzug / 100)), { numFmt: NF.pct, align: 'left' });
  set('L11', 'Kontrollsmm.:', { align: 'center' });
  set('M11', F('SUM(L4:L7)-F8', 0), { numFmt: NF.minfmt, align: 'left' });

  set('I12', 'Stoffe', { fill: C.green, align: 'center' });
  set('J12', 'Bei Mitarbeiter-Einsatz:', { fill: C.blau, font: FONT_B, align: 'right' });
  set('L12', cp.personaleinsatz, { font: FONT_B, numFmt: NF.int, align: 'center' });
  set('M12', 'NU', { fill: C.nu, align: 'center' });

  // Far-right Stellschrauben block (matches the Vorlage).
  set('AP2', 'Geräte-Z.:', { align: 'right' }); set('AP3', cp.geraeteStundensatz, { font: FONT_B, numFmt: NF.num2, align: 'center' });
  set('AP4', 'Zeitwert %:', { align: 'right' }); set('AP5', cp.zeitabzug, { font: FONT_B, numFmt: NF.num2, align: 'center' });
  set('AP6', 'Std. / Tag:', { align: 'right' }); set('AP7', cp.tagesstunden, { font: FONT_B, numFmt: NF.int, align: 'center' });

  // ── Column headers (rows 11–13) ────────────────────────────────────────────
  const med: Partial<Borders> = { top: { style: 'medium' }, bottom: { style: 'medium' } };
  set('A13', 'Pos.', { font: FONT_B, align: 'center', border: med });
  set('B13', 'Bezeichnung', { font: FONT_B, align: 'center', border: med });
  set('C13', 'Menge', { font: FONT_B, align: 'center', border: med });
  set('E13', 'EP', { font: FONT_B, align: 'center', border: med });
  set('F13', 'GP', { font: FONT_B, align: 'center', border: { ...med, right: { style: 'medium' } } });
  set('I13', 'EP | EK', { fill: C.green, align: 'center', border: { bottom: { style: 'medium' }, left: { style: 'medium' } } });
  set('J13', 'Min/Einheit', { fill: C.blau, align: 'center', border: { bottom: { style: 'medium' } } });
  set('K13', 'Lstg./Std.', { fill: C.blau, font: FONT_B, align: 'center', border: { bottom: { style: 'medium' } } });
  set('L13', 'Lstg./Std.', { fill: C.blau, font: FONT_B, align: 'center', border: { bottom: { style: 'medium' } } });
  set('M13', 'EP | EK', { fill: C.nu, align: 'center', border: { bottom: { style: 'medium' }, left: { style: 'medium' }, right: { style: 'medium' } } });
  // The labelled helper columns (N..AP) — two/three-row headers + tints.
  for (const [col, [h11, h12, h13, hf]] of Object.entries(HELP)) {
    if (h11) set(`${col}11`, h11, { fill: hf, font: FONT_B, align: 'center' });
    if (h12) set(`${col}12`, h12, { fill: hf, font: FONT_B, align: 'center' });
    set(`${col}13`, h13, { fill: hf, font: FONT_B, align: 'center', border: { bottom: { style: 'medium' } } });
  }

  // ── Positions ──────────────────────────────────────────────────────────────
  let row = 14;
  const groups: number[] = [];
  const dh = (col: string, r: number, value: unknown, numFmt = NF.num2) =>
    set(`${col}${r}`, value, { fill: HELP[col]?.[4], numFmt, align: 'right' });

  for (const p of data.positions) {
    if (p.isHeader) {
      if (p.oz) set(`A${row}`, p.oz, { font: FONT_B });
      set(`B${row}`, p.shortText || '', { font: FONT_B });
      groups.push(row);
      row += 1;
      continue;
    }
    const c = calculatePosition(p, cp);
    const gs = p.geraeteSatz ?? cp.geraeteStundensatz;

    if (p.oz) set(`A${row}`, p.oz);
    set(`B${row}`, p.shortText || '');
    set(`C${row}`, p.quantity, { numFmt: NF.menge });
    if (p.unit) set(`D${row}`, p.unit);
    set(`E${row}`, F(`AA${row}+AB${row}+AJ${row}+AK${row}`, c.ep), { numFmt: NF.ep, align: 'right' });
    set(`F${row}`, F(`ROUND(C${row}*E${row},2)`, c.gp), { numFmt: NF.eur, align: 'right' });

    // Shown cost columns.
    dh('I', row, F(`X${row}`, p.materialCost));
    dh('J', row, F(`IF(AC${row}=0,"-",AC${row})`, adj(p.timeMinutes, cp.zeitabzug)), NF.minfmt);
    dh('K', row, F(`IFERROR(60/AC${row}*$L$12,"-")`, lstg(p.timeMinutes, cp, 1)), NF.lstg);
    dh('L', row, F(`IFERROR(60/AC${row}*8*$L$12,"-")`, lstg(p.timeMinutes, cp, cp.tagesstunden)), NF.lstg);
    dh('M', row, p.nuCost || null);

    // Machinery columns (labelled + colored exactly like the Vorlage).
    dh('X', row, p.materialCost);
    dh('Y', row, p.timeMinutes);
    dh('Z', row, gs);
    if (p.geraeteEp != null) dh('AA', row, r2(p.geraeteEp));
    else dh('AA', row, F(`ROUND(AC${row}/60*Z${row},2)`, c.epGeraet));
    if (p.lohnEp != null) dh('AB', row, r2(p.lohnEp));
    else dh('AB', row, F(`ROUND(AC${row}/60*$M$2,2)`, c.epLohn));
    dh('AC', row, F(`ROUND(Y${row}+Y${row}/100*$AP$5,2)`, adjNum(p.timeMinutes, cp.zeitabzug)));
    dh('AE', row, F(`ROUND(C${row}*AB${row},2)`, c.gpLohn));
    dh('AF', row, F(`ROUND(C${row}*AJ${row},2)`, c.gpMaterial));
    dh('AG', row, F(`ROUND(C${row}*AA${row},2)`, c.gpGeraet));
    dh('AH', row, F(`ROUND(C${row}*AK${row},2)`, c.gpNu));
    dh('AJ', row, F(`ROUND(X${row}*(1+$K$4),2)`, c.epMaterial));
    dh('AK', row, F(`ROUND(M${row}*(1+$K$5),2)`, c.epNu));
    dh('AN', row, F(`ROUND(AC${row}*C${row}/60,2)`, c.hoursTotal)); // Stunden Gesamt
    dh('AM', row, F(`ROUND(AN${row}/8/$L$12,4)`, r2hours(c.hoursTotal, cp.personaleinsatz)), NF.lstg); // Tage
    dh('AP', row, F(`ROUND(AC${row}/60,4)`, r2(adjNum(p.timeMinutes, cp.zeitabzug) / 60)), NF.lstg); // EP Std./Einheit

    row += 1;
    if (p.longText?.trim()) { set(`B${row}`, p.longText.trim()); row += 1; }
  }

  // Live group subtotals.
  const sorted = [...groups].sort((a, b) => a - b);
  for (let h = 0; h < sorted.length; h++) {
    const start = sorted[h] + 1;
    const end = (sorted[h + 1] ?? row) - 1;
    if (end >= start) set(`G${sorted[h]}`, F(`SUM(F${start}:F${end})`, sumF(ws, start, end)), { font: FONT_B, numFmt: NF.eur, align: 'right' });
  }

  // ── Column widths (Vorlage) ─────────────────────────────────────────────────
  const W: Record<string, number> = {
    A: 11, B: 38, C: 10, D: 5, E: 11, F: 13, G: 9, H: 0.4, I: 10, J: 10, K: 8, L: 10, M: 9,
    N: 7, O: 7, P: 7, Q: 7, R: 7, S: 7, T: 7, U: 7, V: 7, W: 7,
    X: 8, Y: 9, Z: 7, AA: 8.5, AB: 8.5, AC: 8.5, AD: 1, AE: 8.5, AF: 8.5, AG: 8.5, AH: 8.5, AI: 1,
    AJ: 9, AK: 8.5, AL: 1, AM: 8.5, AN: 8.5, AO: 1, AP: 9,
  };
  for (const [col, w] of Object.entries(W)) ws.getColumn(col).width = w;

  return new Uint8Array(await wb.xlsx.writeBuffer());
}

// ── helpers ──────────────────────────────────────────────────────────────────
function adjNum(min: number, z: number): number { return r2(min + (min / 100) * z); }
function adj(min: number, z: number): number | string { const a = adjNum(min, z); return a === 0 ? '-' : a; }
function lstg(min: number, cp: ProjectData['calcParams'], factor: number): number | string {
  const a = adjNum(min, cp.zeitabzug); if (a === 0) return '-'; return r2((60 / a) * factor * cp.personaleinsatz);
}
function r2hours(hours: number, personal: number): number {
  return personal > 0 ? Math.round((hours / 8 / personal) * 10000) / 10000 : 0;
}
function matrixEk(t: ReturnType<typeof calcTotals>, cp: ProjectData['calcParams']): number {
  // Lohn EINKAUF = Mittellohn × (Lohn-VK / Verrechnungslohn) — matches the Vorlage's
  // Ges.Std derivation, not Σ raw hours.
  const lohnEk = cp.verrechnungslohn > 0 ? r2(cp.mittellohn * r2(t.totalLohn / cp.verrechnungslohn)) : 0;
  return r2(t.totalMaterial / (1 + cp.materialZuschlag) + t.totalNu / (1 + cp.nuZuschlag) + t.totalGeraet / (1 + cp.geraeteZuschlagPct) + lohnEk);
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

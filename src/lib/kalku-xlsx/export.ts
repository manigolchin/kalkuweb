/**
 * Excel exporter that emits the canonical Kalkulation-template layout —
 * the inverse of `src/lib/kalku-xlsx/parse.ts`.
 *
 * Output is a faithful match to the Vorlage observed in
 *   ~/Desktop/Claude/example {1-4}/*.xlsx
 * documented in `docs/v2_redesign/column_classification.md`. A file exported
 * from the panel and re-imported through ImportDialog's Kalkulation-template
 * fast-path round-trips cleanly.
 *
 * Layout reproduced:
 *   row 2:  AG / Abgabedatum / Lohnkosten / Stundensatz
 *   row 3:  EINKAUF · ZSCHLG · VERKAUF · DIFFERNZ matrix header
 *   row 4:  Leistung / Vergabenummer / Stoffe ZSCHLG row
 *   row 5:  Nachunternehmer ZSCHLG row
 *   row 6:  BV / Gerätekosten ZSCHLG row
 *   row 7:  Lohn ZSCHLG row
 *   row 8:  Bieter / Netto / Mitarbeiter / Ges. Std. / Überschuss
 *   row 9:  MwSt rate + sum / Arbeitstage / Monate / Überschuss-value
 *   row 10: Brutto sum
 *   row 11: Zeitwert
 *   row 13: column headers — Pos / Bezeichnung / Menge / EH / EP / GP / G(subtotal) / I (EP|EK Stoffe) / J (Min/Einheit) / K,L (Lstg./Std.) / M (EP|EK NU)
 *   row 14+: data
 */

import type { ProjectData } from '@/features/kalkulation/types';
import { calcTotals, calculatePosition } from '@/features/kalkulation/calc';
import type { WorkSheet } from 'xlsx';

type WorkbookCell = { v: string | number; t?: 's' | 'n' };

/**
 * Build the .xlsx as a Uint8Array (ready for download). Lazy-loads SheetJS
 * so the production bundle doesn't grow when the export is never used.
 */
export async function exportToKalkulationVorlage(data: ProjectData): Promise<Uint8Array> {
  const XLSX = await import('xlsx');
  const { totalNetto, totalMwst, totalBrutto, totalHours, totalLohn, totalMaterial, totalGeraet, totalNu } =
    calcTotals(data.positions, data.calcParams);

  // Build a sparse cell map first (cleaner than pre-allocating a 200×48 grid).
  const cells: Record<string, WorkbookCell> = {};
  const put = (ref: string, v: string | number) => {
    cells[ref] = { v, t: typeof v === 'number' ? 'n' : 's' };
  };

  // ────────────────── Header block ──────────────────
  // Row 2 — AG · Abgabedatum · Lohnkosten · Stundensatz
  put('A2', 'AG:'); put('B2', data.client || '');
  put('D2', 'Abgabedatum:'); put('F2', data.deadline || '');
  put('I2', 'Lohnkosten, inkl L-NK / Std.:');
  put('K2', data.calcParams.mittellohn);
  put('L2', 'Stundensatz:');
  put('M2', data.calcParams.verrechnungslohn);

  // Row 3 — EINKAUF · ZSCHLG · VERKAUF · DIFFERNZ matrix header
  put('I3', 'EINKAUF');
  put('K3', 'ZSCHLG');
  put('L3', 'VERKAUF');
  put('M3', 'DIFFERNZ');

  // Row 4 — Leistung · Vergabenummer · Stoffe (Material) row
  put('A4', 'Leistung:'); put('B4', data.service || '');
  put('D4', 'Vergabenummer:'); put('F4', data.tenderNumber || '');
  put('I4', 'Stoffe:');
  put('J4', round2(totalMaterial / (1 + data.calcParams.materialZuschlag)));
  put('K4', data.calcParams.materialZuschlag);
  put('L4', totalMaterial);
  put('M4', round2(totalMaterial - totalMaterial / (1 + data.calcParams.materialZuschlag)));

  // Row 5 — Nachunternehmer
  put('I5', 'Nachuntern.:');
  put('J5', round2(totalNu / (1 + data.calcParams.nuZuschlag)));
  put('K5', data.calcParams.nuZuschlag);
  put('L5', totalNu);
  put('M5', round2(totalNu - totalNu / (1 + data.calcParams.nuZuschlag)));

  // Row 6 — BV · Gerätekosten
  put('A6', 'BV:'); put('B6', data.name || '');
  put('I6', 'Gerätekosten:');
  put('J6', round2(totalGeraet / (1 + data.calcParams.geraeteZuschlagPct)));
  put('K6', data.calcParams.geraeteZuschlagPct);
  put('L6', totalGeraet);
  put('M6', round2(totalGeraet - totalGeraet / (1 + data.calcParams.geraeteZuschlagPct)));

  // Row 7 — Lohn (special: ZSCHLG_lohn = Stundensatz/Mittellohn, not a config)
  const lohnZschlg = data.calcParams.mittellohn > 0
    ? data.calcParams.verrechnungslohn / data.calcParams.mittellohn
    : 0;
  put('I7', 'Lohn:');
  put('J7', round2(totalHours * data.calcParams.mittellohn));
  put('K7', round4(lohnZschlg));
  put('L7', totalLohn);
  put('M7', round2(totalLohn - totalHours * data.calcParams.mittellohn));

  // Row 8 — Bieter · Netto · Mitarbeiter · Ges. Std. · Überschuss label
  put('A8', 'Bieter:'); put('B8', data.bidder || '');
  put('C8', 'Netto Angebotssumme'); put('F8', totalNetto);
  put('I8', 'Mitarbeiter:'); put('J8', data.calcParams.personaleinsatz);
  put('K8', 'Ges. Std.:'); put('L8', round2(totalHours));
  put('M8', 'Überschuss:');

  // Row 9 — MwSt + sum · Arbeitstage · Monate · Überschuss value
  put('C9', 'MwSt.:'); put('D9', data.calcParams.mwst);
  put('F9', totalMwst);
  put('I9', 'Arbeitstage:');
  put('J9', round2(totalHours / data.calcParams.tagesstunden));
  put('K9', 'Monate:');
  put('L9', round2(totalHours / data.calcParams.tagesstunden / 21.5));
  // Überschuss = Lohn-VK - Lohn-EK (the calculator's profit on labor)
  put('M9', round2(totalLohn - totalHours * data.calcParams.mittellohn));

  // Row 10 — Brutto sum
  put('C10', 'Brutto Angebotssumme'); put('F10', totalBrutto);

  // Row 11 — Zeitwert
  put('I11', 'Zeitwert:');
  put('J11', data.calcParams.zeitabzug / 100);  // we store percent; sheet stores decimal
  put('L11', 'Kontrollsmm.:');
  put('M11', 0);

  // Row 12 — Stoffe (default for blank rows)
  put('I12', 'Stoffe');
  put('J12', 'Bei Mitarbeiter-Einsatz:');
  put('L12', 1);
  put('M12', 'NU');

  // ────────────────── Row 13 — column headers (canonical) ──────────────────
  put('A13', 'Pos.');
  put('B13', 'Bezeichnung');
  put('C13', 'Menge');
  // D13 stays empty (Einheit has no header in the Vorlage)
  put('E13', 'EP');
  put('F13', 'GP');
  // G/H stay empty (G is the level-2 subtotal column, H is the visual gap)
  put('I13', 'EP | EK');
  put('J13', 'Min/Einheit');
  put('K13', 'Lstg./Std.');
  put('L13', 'Lstg./Std.');
  put('M13', 'EP | EK');

  // ────────────────── Row 14+ — positions ──────────────────
  // Walk positions in sortOrder. Group rows get B (name) + C (total for
  // level-2) or G (subtotal for level-3); position rows get the full
  // A:F + I:M layout.
  let rowIdx = 14;

  // Pre-compute subtotals per header (sum of GP of immediately-following
  // non-header rows until the next header).
  const subtotals = new Map<string, number>();
  let currentHeaderId: string | null = null;
  let currentSubtotal = 0;
  for (const p of data.positions) {
    if (p.isHeader) {
      if (currentHeaderId) subtotals.set(currentHeaderId, currentSubtotal);
      currentHeaderId = p.id;
      currentSubtotal = 0;
    } else {
      const calc = calculatePosition(p, data.calcParams);
      currentSubtotal += calc.gp;
    }
  }
  if (currentHeaderId) subtotals.set(currentHeaderId, currentSubtotal);

  for (const p of data.positions) {
    if (p.isHeader) {
      // Group row. C carries the subtotal as a number (per Vorlage convention).
      // The Vorlage uses col C for level-1 totals AND col G for level-2 totals;
      // we don't know the level reliably here, so we put it in C for all
      // headers — the importer (parse.ts classifyRow) treats this correctly
      // (group when D/E/F empty, regardless of which column holds the total).
      if (p.oz) put(`A${rowIdx}`, p.oz);
      put(`B${rowIdx}`, p.shortText || '');
      const sub = subtotals.get(p.id) ?? 0;
      if (sub > 0) put(`C${rowIdx}`, round2(sub));
    } else {
      const calc = calculatePosition(p, data.calcParams);
      if (p.oz) put(`A${rowIdx}`, p.oz);
      put(`B${rowIdx}`, p.shortText || '');
      put(`C${rowIdx}`, p.quantity);
      if (p.unit) put(`D${rowIdx}`, p.unit);
      put(`E${rowIdx}`, round2(calc.ep));
      put(`F${rowIdx}`, round2(calc.gp));
      // Internal zone (col H stays empty as the visual gap).
      if (p.materialCost) put(`I${rowIdx}`, round2(p.materialCost));
      if (p.timeMinutes) put(`J${rowIdx}`, p.timeMinutes);
      // K = Lstg./Std. (units per hour, worker 1) — derived as 60 / Min·Einheit.
      // Faithful to the Vorlage; harmless if Min·Einheit is 0.
      if (p.timeMinutes > 0) {
        put(`K${rowIdx}`, round4(60 / p.timeMinutes));
        put(`L${rowIdx}`, round4((60 / p.timeMinutes) * data.calcParams.personaleinsatz));
      }
      if (p.nuCost) put(`M${rowIdx}`, round2(p.nuCost));
      // Per-position Geräte-Satz override ("Zulage Geräte", col Z) — round-trips
      // so a re-imported export keeps the per-row crane/lift rate.
      if (p.geraeteSatz != null) put(`Z${rowIdx}`, p.geraeteSatz);
      // Per-position Geräte lump sum ("EP Geräte", col AA) — round-trips so a
      // hard-coded equipment cost survives export→re-import.
      if (p.geraeteEp != null) put(`AA${rowIdx}`, round2(p.geraeteEp));
      // Per-position EP Löhne override ("EP Löhne", col AB) — round-trips a
      // hard-coded specialist labor rate through export→re-import.
      if (p.lohnEp != null) put(`AB${rowIdx}`, round2(p.lohnEp));
    }

    if (p.longText && p.longText.trim()) {
      // Vorlage convention: a buffer row immediately after the position
      // carries the long description in col B with no OZ. Matches what the
      // example files do for descriptive text.
      rowIdx += 1;
      put(`B${rowIdx}`, p.longText.trim());
    }

    rowIdx += 1;
  }

  // ────────────────── Build the workbook ──────────────────
  // Compute the sheet range from the populated cells (so xlsx writer knows
  // what to emit).
  let maxR = 13;
  let maxC = 12; // M = 12 (0-indexed)
  for (const ref of Object.keys(cells)) {
    const { r, c } = XLSX.utils.decode_cell(ref);
    if (r > maxR) maxR = r;
    if (c > maxC) maxC = c;
  }
  const ws: WorkSheet = {
    ...cells,
    '!ref': XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: maxC, r: maxR } }),
    // Mild column widths so the file is usable when first opened (the
    // Vorlage has very specific widths; this approximates them).
    '!cols': [
      { wch: 18 }, // A — OZ
      { wch: 36 }, // B — Bezeichnung
      { wch: 12 }, // C — Menge
      { wch: 6 },  // D — EH
      { wch: 12 }, // E — EP
      { wch: 14 }, // F — GP
      { wch: 14 }, // G — Subtotal
      { wch: 2 },  // H — gap
      { wch: 12 }, // I — Material EK
      { wch: 12 }, // J — Min/Einheit
      { wch: 10 }, // K — Lstg./Std.
      { wch: 10 }, // L — Lstg./Std.
      { wch: 12 }, // M — NU EK
    ],
  };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Kalkulation');
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Uint8Array(out);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}

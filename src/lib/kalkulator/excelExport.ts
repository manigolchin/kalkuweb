import type { Row, Aufschlaege } from './types';
import { computeTotals } from './calc';

/**
 * Professioneller Excel-Export. Verwendet die `xlsx`-Lib (SheetJS Community).
 * Layout: Pos | Kurztext | Langtext | Menge | Einheit | EP Material | EP Lohn | EP gesamt | GP | Min/Einheit | Bemerkung.
 * Mit echten Formeln (=F+G, =D*H, =SUMME(...)), Freeze Panes Zeile 5, Druckbereich, Header in primary-500 (#1a5276).
 * Spaltenformat `#.##0,00 €` für €-Spalten, `#.##0,00` für Mengen — locale de_DE via Workbook-Locale.
 *
 * Hinweis: SheetJS Community kann Zellstyles aus dem Code anwenden, allerdings ist die Style-Unterstützung
 * der OSS-Variante eingeschränkt. Wir setzen `s` auf alle Zellen, was beim Lesen in MS Excel, LibreOffice,
 * Google Sheets und Numbers korrekt interpretiert wird. Datumsformatierung, Spaltenbreiten, Merges,
 * Druckbereich und Freeze Panes werden zuverlässig übernommen.
 */
export async function exportToExcel(
  rows: Row[],
  a: Aufschlaege,
  opts: { fileName?: string; sheetName?: string } = {},
): Promise<void> {
  // xlsx-js-style ist ein Drop-in-Fork von xlsx mit zuverlässigem Style-Writing.
  // SheetJS Community schreibt cell.s nicht reliabel — Header-Farbe, Bold, NumFmt würden in MS Excel fehlen.
  const XLSX = await import('xlsx-js-style');
  const totals = computeTotals(rows, a);

  // ---------- Sheet-Aufbau (AOA = array of arrays) ----------
  const date = new Date();
  const dateStr = date.toLocaleDateString('de-DE');
  const fileDate = date.toISOString().slice(0, 10);
  const sheetName = opts.sheetName ?? 'Kalkulation';
  const fileName = opts.fileName ?? `kalku-kalkulation-${fileDate}.xlsx`;

  type CellLike = string | number | { f: string; t?: 'n' | 's' };
  const data: CellLike[][] = [];

  // Titel + Meta (Zeilen 1-3)
  data.push(['KALKU Kalkulation', '', '', '', '', '', '', '', '', '', '']);
  data.push([`Erstellt am ${dateStr}`, '', '', '', '', `${rows.length} Position${rows.length === 1 ? '' : 'en'}`, '', '', '', '', '']);
  data.push([]);

  // Header (Zeile 4)
  const HEADER_ROW = 4;
  data.push([
    'Pos.-Nr.',
    'Kurztext',
    'Langtext',
    'Menge',
    'Einheit',
    'EP Material',
    'EP Lohn',
    'EP gesamt',
    'GP',
    'Min/Einheit',
    'Bemerkung',
  ]);

  // Daten-Zeilen ab Zeile 5
  const FIRST_DATA_ROW = HEADER_ROW + 1; // 5
  rows.forEach((r, i) => {
    const xlRow = FIRST_DATA_ROW + i; // 1-basiert
    const nuFactor = r.nu ? 1 + a.nuZuschlag / 100 : 1;
    const materialEp = r.material * (1 + r.zuschlag / 100) * nuFactor;
    const lohnEp = r.lohn * r.zeit * (1 + r.zuschlag / 100) * nuFactor;
    const minProEinheit = r.zeit * 60;
    const bemerkung = [
      r.nu ? `NU +${a.nuZuschlag}%` : '',
      r.bemerkung,
    ].filter(Boolean).join(' · ');
    data.push([
      r.pos || `${i + 1}`,
      shortText(r.text),
      r.text,
      Number(r.menge.toFixed(4)),
      r.einheit,
      Number(materialEp.toFixed(2)),
      Number(lohnEp.toFixed(2)),
      // Formel EP gesamt = F + G
      { f: `F${xlRow}+G${xlRow}`, t: 'n' },
      // Formel GP = Menge * EP gesamt
      { f: `D${xlRow}*H${xlRow}`, t: 'n' },
      Number(minProEinheit.toFixed(1)),
      bemerkung,
    ]);
  });

  // Leerzeile vor Summen
  data.push([]);

  // Summenblock (echte Formeln)
  const LAST_DATA_ROW = FIRST_DATA_ROW + rows.length - 1;
  const SUM_RANGE = `I${FIRST_DATA_ROW}:I${LAST_DATA_ROW}`;
  const summaryStartRow = data.length + 1; // 1-basiert
  data.push([
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'Netto-Bauleistung',
    '',
    { f: `SUM(${SUM_RANGE})`, t: 'n' },
  ]);
  const nettoRow = summaryStartRow;
  data.push([
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    `BGK (${fmtNum(a.bgk)} %)`,
    '',
    { f: `K${nettoRow}*${a.bgk / 100}`, t: 'n' },
  ]);
  const bgkRow = nettoRow + 1;
  data.push([
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    `AGK (${fmtNum(a.agk)} %)`,
    '',
    { f: `(K${nettoRow}+K${bgkRow})*${a.agk / 100}`, t: 'n' },
  ]);
  const agkRow = bgkRow + 1;
  data.push([
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    `W&G (${fmtNum(a.wug)} %)`,
    '',
    { f: `(K${nettoRow}+K${bgkRow}+K${agkRow})*${a.wug / 100}`, t: 'n' },
  ]);
  const wugRow = agkRow + 1;
  data.push([
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'Netto-Auftragssumme',
    '',
    { f: `K${nettoRow}+K${bgkRow}+K${agkRow}+K${wugRow}`, t: 'n' },
  ]);
  const nettoMitRow = wugRow + 1;
  data.push([
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    `MwSt (${fmtNum(a.mwst)} %)`,
    '',
    { f: `K${nettoMitRow}*${a.mwst / 100}`, t: 'n' },
  ]);
  const mwstRow = nettoMitRow + 1;
  data.push([
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'Brutto-Endsumme',
    '',
    { f: `K${nettoMitRow}+K${mwstRow}`, t: 'n' },
  ]);
  const bruttoRow = mwstRow + 1;

  // Σ Stunden + Σ Lohn (Hinweiszeilen unten)
  data.push([]);
  data.push([
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'Σ Stunden',
    Number(totals.stundenTotal.toFixed(1)),
    '',
  ]);
  data.push([
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'Σ Lohnanteil (€)',
    Number(totals.lohnTotal.toFixed(2)),
    '',
  ]);
  data.push([
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'Σ Materialanteil (€)',
    Number(totals.materialTotal.toFixed(2)),
    '',
  ]);

  // Footer ganz unten
  const FOOTER_ROW = data.length + 2;
  data.push([]);
  data.push(['KALKU Baukalkulationen · kalku.de · Diese Datei wurde mit dem Online-Kalkulator erstellt.']);

  // ---------- Sheet erzeugen ----------
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Spaltenbreiten
  ws['!cols'] = [
    { wch: 10 }, // A Pos.-Nr.
    { wch: 28 }, // B Kurztext
    { wch: 50 }, // C Langtext
    { wch: 10 }, // D Menge
    { wch: 8 },  // E Einheit
    { wch: 14 }, // F EP Material
    { wch: 14 }, // G EP Lohn
    { wch: 14 }, // H EP gesamt
    { wch: 16 }, // I GP
    { wch: 12 }, // J Min/Einheit
    { wch: 26 }, // K Bemerkung / Summen-Wert
  ];

  // Zeilenhöhen
  ws['!rows'] = [];
  ws['!rows'][0] = { hpx: 28 };          // Titel
  ws['!rows'][HEADER_ROW - 1] = { hpx: 24 };

  // Merges: Titel über A1:K1, Untertitel A2:E2 + F2:K2, Footer über alles
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
    { s: { r: 1, c: 5 }, e: { r: 1, c: 10 } },
    { s: { r: FOOTER_ROW - 1, c: 0 }, e: { r: FOOTER_ROW - 1, c: 10 } },
  ];

  // Freeze Panes — alles bis inkl. Header-Zeile fixieren
  ws['!freeze'] = { xSplit: 0, ySplit: HEADER_ROW };
  // Manche XLSX-Reader erwarten zusätzlich pane unter sheetViews
  ws['!views'] = [
    { state: 'frozen', ySplit: HEADER_ROW, xSplit: 0, topLeftCell: `A${HEADER_ROW + 1}` },
  ];

  // Druckbereich + Druck-Setup
  const lastCol = 'K';
  const lastRow = data.length;
  ws['!ref'] = `A1:${lastCol}${lastRow}`;
  ws['!autofilter'] = { ref: `A${HEADER_ROW}:${lastCol}${LAST_DATA_ROW}` };
  ws['!printHeader'] = [HEADER_ROW, HEADER_ROW]; // Wiederholungszeile
  ws['!margins'] = { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 };
  ws['!pageSetup'] = { orientation: 'landscape', paperSize: 9, fitToWidth: 1, fitToHeight: 0 } as never;

  // ---------- Zellstyles ----------
  // Title
  setStyle(ws, 'A1', {
    font: { bold: true, sz: 16, color: { rgb: '1a5276' } },
    alignment: { horizontal: 'left', vertical: 'center' },
  });
  setStyle(ws, 'A2', {
    font: { italic: true, sz: 10, color: { rgb: '6b7280' } },
    alignment: { horizontal: 'left' },
  });
  setStyle(ws, 'F2', {
    font: { italic: true, sz: 10, color: { rgb: '6b7280' } },
    alignment: { horizontal: 'right' },
  });

  // Header-Zeile dunkelblau
  const HEADER_COLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
  HEADER_COLS.forEach((col) => {
    setStyle(ws, `${col}${HEADER_ROW}`, {
      font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
      fill: { patternType: 'solid', fgColor: { rgb: '1A5276' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: {
        top: { style: 'thin', color: { rgb: '103147' } },
        bottom: { style: 'medium', color: { rgb: '103147' } },
        left: { style: 'thin', color: { rgb: '103147' } },
        right: { style: 'thin', color: { rgb: '103147' } },
      },
    });
  });

  // Daten-Zeilen: Zebra + Formate
  const NUM_FORMAT = '#,##0.00';
  const CURR_FORMAT = '#,##0.00 "€"';
  const QTY_FORMAT = '#,##0.0000';
  rows.forEach((_r, i) => {
    const xlRow = FIRST_DATA_ROW + i;
    const isEven = i % 2 === 1;
    const fill = isEven ? { patternType: 'solid', fgColor: { rgb: 'F8FAFC' } } : undefined;
    const border = {
      top: { style: 'hair', color: { rgb: 'E5E7EB' } },
      bottom: { style: 'hair', color: { rgb: 'E5E7EB' } },
    };
    setStyle(ws, `A${xlRow}`, { font: { bold: true, sz: 10 }, alignment: { horizontal: 'left' }, fill, border });
    setStyle(ws, `B${xlRow}`, { alignment: { horizontal: 'left' }, fill, border });
    setStyle(ws, `C${xlRow}`, {
      alignment: { horizontal: 'left', vertical: 'top', wrapText: true },
      fill,
      border,
    });
    setStyle(ws, `D${xlRow}`, { numFmt: QTY_FORMAT, alignment: { horizontal: 'right' }, fill, border });
    setStyle(ws, `E${xlRow}`, { alignment: { horizontal: 'center' }, fill, border });
    setStyle(ws, `F${xlRow}`, { numFmt: CURR_FORMAT, alignment: { horizontal: 'right' }, fill, border });
    setStyle(ws, `G${xlRow}`, { numFmt: CURR_FORMAT, alignment: { horizontal: 'right' }, fill, border });
    setStyle(ws, `H${xlRow}`, {
      numFmt: CURR_FORMAT,
      font: { bold: true, color: { rgb: '1A5276' } },
      alignment: { horizontal: 'right' },
      fill,
      border,
    });
    setStyle(ws, `I${xlRow}`, {
      numFmt: CURR_FORMAT,
      font: { bold: true, color: { rgb: '1A5276' } },
      alignment: { horizontal: 'right' },
      fill,
      border,
    });
    setStyle(ws, `J${xlRow}`, { numFmt: NUM_FORMAT, alignment: { horizontal: 'right' }, fill, border });
    setStyle(ws, `K${xlRow}`, { font: { sz: 9, color: { rgb: '6b7280' } }, alignment: { horizontal: 'left' }, fill, border });
  });

  // Summenblock
  const summaryRows = [
    { row: nettoRow, label: 'Netto-Bauleistung' },
    { row: bgkRow, label: 'BGK' },
    { row: agkRow, label: 'AGK' },
    { row: wugRow, label: 'W&G' },
    { row: nettoMitRow, label: 'Netto-Auftrag', bold: true },
    { row: mwstRow, label: 'MwSt' },
    { row: bruttoRow, label: 'Brutto', big: true },
  ];
  for (const s of summaryRows) {
    setStyle(ws, `I${s.row}`, {
      font: { bold: s.bold || s.big, color: { rgb: s.big ? 'FFFFFF' : '1F2937' } },
      alignment: { horizontal: 'right' },
      fill: s.big ? { patternType: 'solid', fgColor: { rgb: '1A5276' } } : undefined,
    });
    setStyle(ws, `K${s.row}`, {
      numFmt: CURR_FORMAT,
      font: { bold: s.bold || s.big, color: { rgb: s.big ? 'FFFFFF' : '1F2937' }, sz: s.big ? 12 : 11 },
      alignment: { horizontal: 'right' },
      fill: s.big ? { patternType: 'solid', fgColor: { rgb: '1A5276' } } : undefined,
      border: {
        top: { style: 'thin', color: { rgb: 'D1D5DB' } },
        bottom: s.big
          ? { style: 'medium', color: { rgb: '103147' } }
          : { style: 'thin', color: { rgb: 'D1D5DB' } },
      },
    });
  }

  // Statistik-Zeilen (Σ Stunden, Σ Lohn, Σ Material)
  const statRows = [bruttoRow + 2, bruttoRow + 3, bruttoRow + 4];
  for (const r of statRows) {
    setStyle(ws, `I${r}`, {
      font: { italic: true, sz: 10, color: { rgb: '6B7280' } },
      alignment: { horizontal: 'right' },
    });
    setStyle(ws, `J${r}`, {
      numFmt: NUM_FORMAT,
      font: { italic: true, sz: 10, color: { rgb: '6B7280' } },
      alignment: { horizontal: 'right' },
    });
  }

  // Footer
  setStyle(ws, `A${FOOTER_ROW}`, {
    font: { italic: true, sz: 9, color: { rgb: '9CA3AF' } },
    alignment: { horizontal: 'center' },
  });

  // ---------- Workbook ----------
  const wb = XLSX.utils.book_new();
  wb.Workbook = {
    Views: [{ RTL: false }],
  } as never;
  // Locale auf de_DE — sorgt dafür, dass Excel beim Öffnen Komma als Dezimaltrenner zeigt
  (wb as { Workbook?: { Names?: unknown[]; CalcPr?: { iso8601?: number; refMode?: string } } }).Workbook = {
    ...(wb as { Workbook?: unknown }).Workbook as Record<string, unknown>,
    CalcPr: { iso8601: 0, refMode: 'A1' },
  };
  // Workbook-Properties
  wb.Props = {
    Title: 'KALKU Kalkulation',
    Subject: `${rows.length} Positionen`,
    Author: 'KALKU Baukalkulationen',
    Company: 'KALKU Baukalkulationen',
    CreatedDate: date,
  };
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, fileName, { compression: true, cellStyles: true });
}

function shortText(s: string): string {
  if (s.length <= 32) return s;
  const cut = s.slice(0, 32);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 16 ? cut.slice(0, lastSpace) : cut) + '…';
}

function fmtNum(n: number): string {
  return n.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
}

type WorksheetLike = {
  [cellAddr: string]: unknown;
  '!cols'?: unknown;
  '!rows'?: unknown[];
  '!merges'?: unknown[];
  '!ref'?: string;
};

function setStyle(ws: WorksheetLike, addr: string, style: Record<string, unknown>): void {
  const cell = ws[addr] as { s?: Record<string, unknown> } | undefined;
  if (!cell) {
    ws[addr] = { t: 's', v: '', s: style };
    return;
  }
  cell.s = { ...(cell.s ?? {}), ...style };
}

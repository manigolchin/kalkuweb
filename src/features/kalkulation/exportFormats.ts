/**
 * GAEB + PDF exporters for a panel Kalkulation.
 *
 * The panel already exports the canonical Excel Kalkulations-Vorlage
 * (`src/lib/kalku-xlsx/export.ts`). This module adds the two remaining
 * deliverables a Bauunternehmer needs when handing the bid on to the awarding
 * authority:
 *
 *   • GAEB — the priced LV in the standard electronic exchange format. A
 *     Kalkulation carries EP/GP, so it is a *Datenart 84* (Angebot, the
 *     bidder's priced LV): `.x84` (DA XML 3.2) and `.d84` (GAEB 90 ASCII).
 *     We map the internal `ProjectData` onto the `ParsedGaeb` shape the
 *     GAEB-Konverter already serialises (`src/lib/gaeb/`) — same battle-tested
 *     XML/ASCII writers, no second implementation.
 *
 *   • PDF — a print-/send-ready Angebot: petrol title band, project/Bieter
 *     meta block, the positions grouped by Titel with per-Titel Zwischensummen,
 *     and the Netto/MwSt/Brutto summary + signature line.
 *
 * Prices are computed with the same `calculatePosition`/`calcTotals` the table
 * and the customer share use, so every export reconciles with the on-screen
 * Angebotssumme.
 */
import type { ProjectData } from './types';
import { calcTotals, calculatePosition, formatEUR, formatNum } from './calc';
import type { ParsedGaeb, Position as GaebPosition } from '@/lib/gaeb';
import { FORMAT_LABELS, exportGaebXml, exportGaeb90 } from '@/lib/gaeb';
import type { RowInput } from 'jspdf-autotable';

const round2 = (n: number) => Math.round(n * 100) / 100;

/** OZ nesting depth from its dotted notation ("1.2.3" → level 2). */
function ozLevel(oz: string): number {
  // Nesting depth = number of dot-separated segments minus one. Empty segments
  // (leading/trailing/double dots) are ignored so malformed OZ can't over-count.
  const segments = oz.split('.').filter(Boolean);
  return segments.length > 0 ? segments.length - 1 : 0;
}

const finite = (n: number) => (Number.isFinite(n) ? n : 0);

/**
 * Map a panel Kalkulation onto the `ParsedGaeb` structure the GAEB serialisers
 * consume. Headers become `group` rows (no Menge/EP/GP) and also feed the
 * `groups` outline; real positions get their EP/GP from `calculatePosition`
 * so the GAEB carries the same prices the customer/Excel see.
 */
export function projectToParsedGaeb(data: ProjectData): ParsedGaeb {
  const positions: GaebPosition[] = [];
  const groups: { oz: string; label: string; level: number }[] = [];
  let itemCount = 0;
  let hasLongtext = false;
  let gpSum = 0;

  for (const p of data.positions) {
    const level = ozLevel(p.oz);
    const langtext = (p.longText ?? '').trim();
    if (langtext) hasLongtext = true;

    if (p.isHeader) {
      groups.push({ oz: p.oz, label: p.shortText, level });
      positions.push({
        oz: p.oz,
        pos: p.oz,
        kurztext: p.shortText,
        langtext,
        einheit: '',
        level,
        type: 'group',
      });
      continue;
    }

    const calc = calculatePosition(p, data.calcParams);
    const gp = round2(finite(calc.gp));
    itemCount += 1;
    gpSum += gp;
    positions.push({
      oz: p.oz,
      pos: p.oz,
      kurztext: p.shortText,
      langtext,
      einheit: p.unit,
      menge: finite(p.quantity),
      ep: round2(finite(calc.ep)),
      gp,
      level,
      type: 'item',
    });
  }

  return {
    filename: `${data.name || 'kalkulation'}.x84`,
    size: 0,
    format: 'gaeb-xml-3.2',
    formatLabel: FORMAT_LABELS['gaeb-xml-3.2'],
    projectName: data.name || undefined,
    projectDescription: data.service || undefined,
    awardingAuthority: data.client || undefined,
    bidder: data.bidder || undefined,
    currency: 'EUR',
    positionCount: itemCount,
    positions,
    groups,
    // Reconcile with the items actually written (Σ of the per-line GP), so the
    // GAEB total matches its own line items rather than the screen total, which
    // sums per-component-rounded values and can differ by a few cents.
    estimatedValue: round2(gpSum) || undefined,
    date: new Date().toISOString().slice(0, 10),
    version: '3.2',
    hasLongtext,
  };
}

/** Download the Kalkulation as GAEB DA XML 3.2 — a priced Angebot (.x84). */
export function exportProjectGaebXml(data: ProjectData): void {
  exportGaebXml(projectToParsedGaeb(data), '84');
}

/** Download the Kalkulation as GAEB 90 ASCII — a priced Angebot (.d84). */
export function exportProjectGaeb90(data: ProjectData): void {
  exportGaeb90(projectToParsedGaeb(data), '84');
}

const PETROL: [number, number, number] = [26, 82, 118];
const SLATE_900: [number, number, number] = [15, 23, 42];
const SLATE_200: [number, number, number] = [226, 232, 240];
const SLATE_100: [number, number, number] = [241, 245, 249];

function safeFilename(s: string): string {
  return s.replace(/[^\w-]/g, '_').replace(/_+/g, '_').slice(0, 60) || 'kalkulation';
}

/** Up to 3 decimals, German formatting, trailing zeros trimmed (Menge). */
function fmtQty(n: number): string {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 3 }).format(
    Number.isFinite(n) ? n : 0,
  );
}

/** Render an ISO date (YYYY-MM-DD…) as German DD.MM.YYYY; pass anything else
 *  through unchanged (the field can also hold free text). */
function fmtDate(s: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s.trim());
  return m ? `${m[3]}.${m[2]}.${m[1]}` : s;
}

/**
 * Print-/send-ready Angebot PDF. Lazy-loads jsPDF + autotable so the panel
 * bundle only pays for them when an export actually runs.
 */
export async function exportProjectPdf(data: ProjectData): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const totals = calcTotals(data.positions, data.calcParams);
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;

  // ── Title band ──────────────────────────────────────────────────────────
  doc.setFillColor(...PETROL);
  doc.rect(0, 0, pageW, 92, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('Angebot', margin, 46);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text(doc.splitTextToSize(data.name || 'Kalkulation', pageW - 2 * margin), margin, 70);
  doc.setTextColor(0, 0, 0);

  // ── Meta block (two columns) ──────────────────────────────────────────────
  const metaLeft: [string, string][] = [];
  if (data.client) metaLeft.push(['Auftraggeber', data.client]);
  if (data.bidder) metaLeft.push(['Bieter', data.bidder]);
  if (data.service) metaLeft.push(['Leistung', data.service]);
  const metaRight: [string, string][] = [];
  if (data.tenderNumber) metaRight.push(['Vergabenummer', data.tenderNumber]);
  if (data.deadline) metaRight.push(['Abgabedatum', fmtDate(data.deadline)]);
  const today = new Date();
  const todayStr = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
  metaRight.push(['Datum', todayStr]);

  const drawMeta = (x: number, rightEdge: number, rows: [string, string][]): number => {
    const labelX = x;
    const valueX = x + 82;
    let y = 122;
    doc.setFontSize(9);
    for (const [k, v] of rows) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text(k, labelX, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(20, 30, 45);
      const wrapped = doc.splitTextToSize(v, rightEdge - valueX);
      doc.text(wrapped, valueX, y);
      y += 15 * Math.max(1, wrapped.length);
    }
    return y;
  };
  const midX = pageW / 2 + 8;
  const endL = drawMeta(margin, pageW / 2 - 12, metaLeft);
  const endR = drawMeta(midX, pageW - margin, metaRight);
  doc.setTextColor(0, 0, 0);
  const tableTop = Math.max(endL, endR) + 8;

  // ── Positions table (grouped by Titel, per-Titel Zwischensumme) ───────────
  const body: RowInput[] = [];
  let openGroup = false;
  let groupItems = 0;
  let groupSubtotal = 0;

  const flushSubtotal = () => {
    if (openGroup && groupItems > 0) {
      body.push([
        {
          content: 'Zwischensumme',
          colSpan: 5,
          styles: { halign: 'right', fontStyle: 'bold', fillColor: SLATE_100 },
        },
        {
          content: formatNum(groupSubtotal),
          styles: { halign: 'right', fontStyle: 'bold', fillColor: SLATE_100 },
        },
      ]);
    }
  };

  for (const p of data.positions) {
    if (p.isHeader) {
      flushSubtotal();
      openGroup = true;
      groupItems = 0;
      groupSubtotal = 0;
      const label = [p.oz, p.shortText].filter(Boolean).join('  ');
      body.push([
        {
          content: label || '—',
          colSpan: 6,
          styles: { fontStyle: 'bold', fillColor: SLATE_200, textColor: SLATE_900 },
        },
      ]);
      continue;
    }
    const calc = calculatePosition(p, data.calcParams);
    groupItems += 1;
    groupSubtotal += calc.gp;
    const langtext = (p.longText ?? '').trim();
    const desc =
      langtext && langtext !== p.shortText.trim()
        ? `${p.shortText}\n${langtext}`
        : p.shortText;
    body.push([
      p.oz,
      desc,
      fmtQty(p.quantity),
      p.unit,
      formatNum(calc.ep),
      formatNum(calc.gp),
    ]);
  }
  flushSubtotal();

  autoTable(doc, {
    head: [['Pos.', 'Bezeichnung', 'Menge', 'EH', 'EP €', 'GP €']],
    body,
    startY: tableTop,
    margin: { left: margin, right: margin, top: margin },
    styles: { fontSize: 8, cellPadding: 4, valign: 'top', overflow: 'linebreak' },
    headStyles: { fillColor: PETROL, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 56, fontStyle: 'bold' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 52, halign: 'right' },
      3: { cellWidth: 28 },
      4: { cellWidth: 58, halign: 'right' },
      5: { cellWidth: 66, halign: 'right' },
    },
    didDrawPage: () => {
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(
        `${data.name || 'Angebot'} — Seite ${doc.getCurrentPageInfo().pageNumber}`,
        pageW - margin,
        pageH - 20,
        { align: 'right' },
      );
      doc.text('Erstellt mit KALKU — kalku.de', margin, pageH - 20);
      doc.setTextColor(0, 0, 0);
    },
  });

  // ── Totals summary (right-aligned card) ───────────────────────────────────
  const lastTable = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
  const cardW = 270;
  const cardH = 92;
  const boxLeft = pageW - margin - cardW;
  const labelX = boxLeft + 14;
  const valueX = pageW - margin - 14;
  let cardTop = (lastTable?.finalY ?? tableTop) + 24;
  // Keep the whole card on the current page (start a new one if too low).
  if (cardTop + cardH > pageH - 110) {
    doc.addPage();
    cardTop = margin + 20;
  }
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(...SLATE_200);
  doc.setLineWidth(0.5);
  doc.roundedRect(boxLeft, cardTop, cardW, cardH, 6, 6, 'FD');

  const mwstPct = Math.round((data.calcParams.mwst ?? 0) * 100);
  let y = cardTop + 24;
  const sumRow = (label: string, value: string, opts: { bold?: boolean; gap?: number } = {}) => {
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    doc.setFontSize(opts.bold ? 12 : 10);
    doc.setTextColor(...(opts.bold ? SLATE_900 : ([71, 85, 105] as [number, number, number])));
    doc.text(label, labelX, y);
    doc.text(value, valueX, y, { align: 'right' });
    y += opts.gap ?? 16;
  };
  sumRow('Angebotssumme netto', formatEUR(totals.totalNetto));
  sumRow(`zzgl. MwSt. ${mwstPct} %`, formatEUR(totals.totalMwst), { gap: 14 });
  doc.setDrawColor(...PETROL);
  doc.setLineWidth(1);
  doc.line(labelX, y, valueX, y);
  y += 20;
  sumRow('Angebotssumme brutto', formatEUR(totals.totalBrutto), { bold: true });
  doc.setTextColor(0, 0, 0);
  y = cardTop + cardH;

  // ── Signature line ────────────────────────────────────────────────────────
  const sigY = Math.max(y + 48, pageH - 70);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.5);
  doc.line(margin, sigY, margin + 200, sigY);
  doc.text('Ort, Datum', margin, sigY + 14);
  doc.line(pageW - margin - 220, sigY, pageW - margin, sigY);
  doc.text('Stempel & Unterschrift Bieter', pageW - margin - 220, sigY + 14);

  doc.save(`${safeFilename(data.name || 'angebot')}.pdf`);
}

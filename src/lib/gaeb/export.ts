import type { ParsedGaeb, Position } from './types';

export type TextMode = 'kurz' | 'lang' | 'both';
export type Columns = {
  oz: boolean;
  kurztext: boolean;
  langtext: boolean;
  einheit: boolean;
  menge: boolean;
  ep: boolean;
  gp: boolean;
};

export const DEFAULT_COLUMNS: Columns = {
  oz: true,
  kurztext: true,
  langtext: false,
  einheit: true,
  menge: true,
  ep: true,
  gp: true,
};

function fmtNum(n: number): string {
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function safeFilename(s: string): string {
  return s.replace(/[^\w-]/g, '_').replace(/_+/g, '_').slice(0, 60) || 'gaeb';
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function selectText(p: Position, mode: TextMode): string {
  if (mode === 'kurz') return p.kurztext || p.langtext.slice(0, 200);
  if (mode === 'lang') return p.langtext || p.kurztext;
  return [p.kurztext, p.langtext].filter(Boolean).join('\n');
}

// LV-Art is the authoritative source of truth for which text columns appear:
//   kurz → only Kurztext, Langtext suppressed
//   lang → only Langtext, Kurztext suppressed
//   both → both text columns
// It overrides the Spalten-Auswahl text-column checkboxes (which then only
// matter for the non-text columns: OZ, Einheit, Menge, EP, GP).
function effectiveCols(columns: Columns, textMode: TextMode): Columns {
  if (textMode === 'kurz') {
    return { ...columns, kurztext: true, langtext: false };
  }
  if (textMode === 'lang') {
    return { ...columns, kurztext: false, langtext: true };
  }
  return { ...columns, kurztext: true, langtext: true };
}

// ── Excel ────────────────────────────────────────────────────────────────────
export async function exportExcel(
  parsed: ParsedGaeb,
  opts: { textMode: TextMode; columns: Columns },
): Promise<void> {
  const XLSX = await import('xlsx');

  const cols = effectiveCols(opts.columns, opts.textMode);
  const headers: string[] = [];
  if (cols.oz) headers.push('OZ');
  if (cols.kurztext) headers.push('Kurztext');
  if (cols.langtext) headers.push('Langtext');
  if (cols.einheit) headers.push('Einheit');
  if (cols.menge) headers.push('Menge');
  if (cols.ep) headers.push('EP €');
  if (cols.gp) headers.push('GP €');

  const rows: (string | number)[][] = [
    ['Projekt:', parsed.projectName ?? ''],
    ['Format:', parsed.formatLabel],
    ['Positionen:', parsed.positionCount],
    ...(parsed.bidder ? [['Bieter:', parsed.bidder]] : []),
    ...(parsed.awardingAuthority ? [['Auftraggeber:', parsed.awardingAuthority]] : []),
    ...(parsed.date ? [['Datum:', parsed.date]] : []),
    [],
    headers,
  ];

  for (const p of parsed.positions) {
    const row: (string | number)[] = [];
    if (cols.oz) row.push(p.oz);
    if (cols.kurztext) row.push(p.kurztext);
    if (cols.langtext) row.push(p.langtext);
    if (cols.einheit) row.push(p.einheit);
    if (cols.menge) row.push(p.menge != null ? Number(p.menge.toFixed(3)) : '');
    if (cols.ep) row.push(p.ep != null ? Number(p.ep.toFixed(2)) : '');
    if (cols.gp) row.push(p.gp != null ? Number(p.gp.toFixed(2)) : '');
    rows.push(row);
  }

  if (parsed.estimatedValue) {
    rows.push([]);
    const sumRow: (string | number)[] = headers.map((h) => h === 'GP €' ? Number(parsed.estimatedValue!.toFixed(2)) : '');
    const labelCol = Math.max(0, headers.indexOf('GP €') - 1);
    sumRow[labelCol] = 'SUMME netto';
    rows.push(sumRow);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const widthMap: Record<string, number> = {
    'OZ': 14,
    'Kurztext': 50,
    'Langtext': 80,
    'Einheit': 10,
    'Menge': 12,
    'EP €': 12,
    'GP €': 14,
  };
  ws['!cols'] = headers.map((h) => ({ wch: widthMap[h] ?? 18 }));

  // Header row styling: cell-level styles can't be applied with the free xlsx
  // build, so we just bold the row by setting !rows. Keep it minimal.
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'GAEB-LV');
  XLSX.writeFile(wb, `${safeFilename(parsed.projectName ?? 'gaeb')}-LV.xlsx`);
}

// ── CSV ──────────────────────────────────────────────────────────────────────
export function exportCsv(
  parsed: ParsedGaeb,
  opts: { textMode: TextMode; columns: Columns },
): void {
  const cols = effectiveCols(opts.columns, opts.textMode);
  const headers: string[] = [];
  if (cols.oz) headers.push('OZ');
  if (cols.kurztext) headers.push('Kurztext');
  if (cols.langtext) headers.push('Langtext');
  if (cols.einheit) headers.push('Einheit');
  if (cols.menge) headers.push('Menge');
  if (cols.ep) headers.push('EP');
  if (cols.gp) headers.push('GP');

  const esc = (s: string) => `"${s.replace(/"/g, '""').replace(/\n/g, ' ')}"`;
  const out: string[] = [headers.join(';')];

  for (const p of parsed.positions) {
    const row: string[] = [];
    if (cols.oz) row.push(p.oz);
    if (cols.kurztext) row.push(esc(p.kurztext));
    if (cols.langtext) row.push(esc(p.langtext));
    if (cols.einheit) row.push(p.einheit);
    if (cols.menge) row.push(p.menge != null ? fmtNum(p.menge) : '');
    if (cols.ep) row.push(p.ep != null ? fmtNum(p.ep) : '');
    if (cols.gp) row.push(p.gp != null ? fmtNum(p.gp) : '');
    out.push(row.join(';'));
  }

  if (parsed.estimatedValue) {
    out.push('');
    out.push(`SUMME netto;${fmtNum(parsed.estimatedValue)}`);
  }

  // BOM so Excel opens UTF-8 cleanly
  const blob = new Blob(['﻿' + out.join('\n')], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, `${safeFilename(parsed.projectName ?? 'gaeb')}-LV.csv`);
}

// ── JSON ─────────────────────────────────────────────────────────────────────
export function exportJson(parsed: ParsedGaeb): void {
  const payload = {
    format: parsed.format,
    formatLabel: parsed.formatLabel,
    projectName: parsed.projectName,
    awardingAuthority: parsed.awardingAuthority,
    bidder: parsed.bidder,
    date: parsed.date,
    currency: parsed.currency,
    positionCount: parsed.positionCount,
    estimatedValue: parsed.estimatedValue,
    groups: parsed.groups,
    positions: parsed.positions,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `${safeFilename(parsed.projectName ?? 'gaeb')}-LV.json`);
}

// ── PDF ──────────────────────────────────────────────────────────────────────
export type PdfOptions = {
  textMode: TextMode;
  withPrices: boolean;
  withCover: boolean;
  withToc: boolean;
  withSummary: boolean;
  signatureOmit: boolean;
  mengeBelow: boolean;
};

export async function exportPdf(parsed: ParsedGaeb, opts: PdfOptions): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;

  if (opts.withCover) {
    drawCover(doc, parsed, opts);
    doc.addPage();
  }

  if (opts.withToc && parsed.groups.length > 0) {
    drawToc(doc, parsed);
    doc.addPage();
  }

  // Header
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  if (parsed.projectName) {
    doc.text(`Projekt: ${parsed.projectName}`, margin, margin);
  }
  doc.text(`Format: ${parsed.formatLabel}`, margin, margin + 14);
  if (parsed.awardingAuthority) {
    doc.text(`Auftraggeber: ${parsed.awardingAuthority}`, margin, margin + 28);
  }

  // Table head & rows. mengeBelow=true → Menge and Einheit are inlined into the
  // Bezeichnung cell (printed below the description), so we drop those columns.
  const head: string[] = ['OZ', 'Bezeichnung'];
  if (!opts.mengeBelow) head.push('Menge', 'EH');
  if (opts.withPrices) head.push('EP €', 'GP €');

  const body: (string | number)[][] = [];
  for (const p of parsed.positions) {
    const text = selectText(p, opts.textMode);
    const desc = opts.mengeBelow && (p.menge != null || p.einheit)
      ? `${text}\nMenge: ${p.menge != null ? fmtNum(p.menge) : '—'} ${p.einheit}`.trim()
      : text;
    const row: (string | number)[] = [p.oz, desc];
    if (!opts.mengeBelow) {
      row.push(p.menge != null ? fmtNum(p.menge) : '');
      row.push(p.einheit);
    }
    if (opts.withPrices) {
      row.push(p.ep != null ? fmtNum(p.ep) : '');
      row.push(p.gp != null ? fmtNum(p.gp) : '');
    }
    body.push(row);
  }

  // Column widths depend on whether mengeBelow merged Menge/EH into Bezeichnung
  const columnStyles: Record<number, { cellWidth?: number | 'auto'; halign?: 'right'; fontStyle?: 'bold' }> = opts.mengeBelow
    ? {
        0: { cellWidth: 60, fontStyle: 'bold' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 55, halign: 'right' },
        3: { cellWidth: 65, halign: 'right' },
      }
    : {
        0: { cellWidth: 60, fontStyle: 'bold' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 50, halign: 'right' },
        3: { cellWidth: 30 },
        4: { cellWidth: 55, halign: 'right' },
        5: { cellWidth: 65, halign: 'right' },
      };

  autoTable(doc, {
    head: [head],
    body,
    startY: margin + 48,
    margin: { left: margin, right: margin },
    styles: { fontSize: 8, cellPadding: 4, valign: 'top' },
    headStyles: { fillColor: [26, 82, 118], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles,
    didDrawPage: () => {
      const str = `${parsed.projectName ?? 'GAEB-LV'} — Seite ${
        doc.getCurrentPageInfo().pageNumber
      }`;
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(str, pageWidth - margin, doc.internal.pageSize.getHeight() - 20, { align: 'right' });
      doc.setTextColor(0);
    },
  });

  if (opts.withSummary && parsed.estimatedValue) {
    const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } })
      .lastAutoTable?.finalY ?? margin + 100;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(
      `Gesamtsumme netto: ${parsed.estimatedValue.toLocaleString('de-DE', {
        style: 'currency',
        currency: parsed.currency || 'EUR',
      })}`,
      pageWidth - margin,
      finalY + 24,
      { align: 'right' },
    );
  }

  if (!opts.signatureOmit) {
    const lastPage = doc.getNumberOfPages();
    doc.setPage(lastPage);
    const h = doc.internal.pageSize.getHeight();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.line(margin, h - 80, margin + 200, h - 80);
    doc.text('Ort, Datum', margin, h - 65);
    doc.line(pageWidth - margin - 200, h - 80, pageWidth - margin, h - 80);
    doc.text('Stempel & Unterschrift Bieter', pageWidth - margin - 200, h - 65);
  }

  doc.save(`${safeFilename(parsed.projectName ?? 'gaeb')}-LV.pdf`);
}

function drawToc(doc: import('jspdf').jsPDF, parsed: ParsedGaeb) {
  const w = doc.internal.pageSize.getWidth();
  const margin = 40;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Inhaltsverzeichnis', margin, margin + 20);

  doc.setDrawColor(26, 82, 118);
  doc.setLineWidth(2);
  doc.line(margin, margin + 28, margin + 60, margin + 28);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  let y = margin + 60;
  const pageHeight = doc.internal.pageSize.getHeight();

  for (const g of parsed.groups) {
    if (y > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
    const indent = margin + g.level * 14;
    doc.setFont('helvetica', g.level === 0 ? 'bold' : 'normal');
    doc.text(g.oz, indent, y);
    const labelStart = indent + 60;
    const labelMaxWidth = w - labelStart - margin;
    const label = (g.label || '—').slice(0, 200);
    const wrapped = doc.splitTextToSize(label, labelMaxWidth);
    doc.text(wrapped, labelStart, y);
    y += 14 * Math.max(1, wrapped.length);
  }
}

function drawCover(doc: import('jspdf').jsPDF, parsed: ParsedGaeb, opts: PdfOptions) {
  const w = doc.internal.pageSize.getWidth();
  const margin = 60;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.text('Leistungsverzeichnis', margin, 140);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.text(parsed.projectName ?? 'GAEB-LV', margin, 170);

  doc.setFontSize(10);
  let y = 220;
  const row = (k: string, v?: string) => {
    if (!v) return;
    doc.setFont('helvetica', 'bold');
    doc.text(k, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(v, margin + 140, y);
    y += 18;
  };
  row('Format:', parsed.formatLabel);
  row('Auftraggeber:', parsed.awardingAuthority);
  row('Bieter:', parsed.bidder);
  row('Datum:', parsed.date);
  row('Währung:', parsed.currency);
  row('Positionen:', String(parsed.positionCount));
  if (parsed.estimatedValue && opts.withPrices) {
    row('Vorab-Summe:', parsed.estimatedValue.toLocaleString('de-DE', {
      style: 'currency',
      currency: parsed.currency || 'EUR',
    }));
  }

  doc.setDrawColor(26, 82, 118);
  doc.setLineWidth(4);
  doc.line(margin, 100, margin + 80, 100);

  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(
    'Erzeugt mit dem KALKU GAEB-Konverter — kalku.de',
    margin,
    doc.internal.pageSize.getHeight() - 50,
  );
  doc.setTextColor(0);
  void w;
}

// ── Re-export back to GAEB DA XML 3.2 ────────────────────────────────────────
export function exportGaebXml(parsed: ParsedGaeb): void {
  const xml = buildGaebXml(parsed);
  const blob = new Blob([xml], { type: 'application/xml' });
  downloadBlob(blob, `${safeFilename(parsed.projectName ?? 'gaeb')}.x83`);
}

function escXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildGaebXml(parsed: ParsedGaeb): string {
  const today = new Date().toISOString().slice(0, 10);
  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="utf-8"?>');
  lines.push('<GAEB xmlns="http://www.gaeb.de/GAEB_DA_XML/DA83/3.2">');
  lines.push('  <GAEBInfo>');
  lines.push('    <Version>3.2</Version>');
  lines.push(`    <Date>${today}</Date>`);
  lines.push('    <ProgSystem>KALKU GAEB-Konverter</ProgSystem>');
  lines.push('  </GAEBInfo>');
  lines.push('  <PrjInfo>');
  if (parsed.projectName) lines.push(`    <NamePrj>${escXml(parsed.projectName)}</NamePrj>`);
  lines.push(`    <Cur>${escXml(parsed.currency)}</Cur>`);
  lines.push('  </PrjInfo>');
  lines.push('  <Award>');
  lines.push('    <DP>83</DP>');
  if (parsed.awardingAuthority) {
    lines.push('    <OWN>');
    lines.push('      <Address>');
    lines.push(`        <Name1>${escXml(parsed.awardingAuthority)}</Name1>`);
    lines.push('      </Address>');
    lines.push('    </OWN>');
  }
  lines.push('    <BoQ>');
  lines.push('      <BoQInfo>');
  if (parsed.projectName) lines.push(`        <Name>${escXml(parsed.projectName)}</Name>`);
  lines.push(`        <Date>${today}</Date>`);
  lines.push('      </BoQInfo>');
  lines.push('      <BoQBody>');
  lines.push('        <Itemlist>');
  for (const p of parsed.positions) {
    lines.push(`          <Item RNoPart="${escXml(p.pos)}">`);
    if (p.menge != null) lines.push(`            <Qty>${p.menge}</Qty>`);
    if (p.einheit) lines.push(`            <QU>${escXml(p.einheit)}</QU>`);
    if (p.ep != null) lines.push(`            <UP>${p.ep}</UP>`);
    if (p.gp != null) lines.push(`            <IT>${p.gp}</IT>`);
    lines.push('            <Description>');
    lines.push('              <CompleteText>');
    if (p.langtext) {
      lines.push('                <DetailTxt><Text><p><span>');
      lines.push(`                  ${escXml(p.langtext)}`);
      lines.push('                </span></p></Text></DetailTxt>');
    }
    if (p.kurztext) {
      lines.push('                <OutlineText><OutlTxt><TextOutlTxt>');
      lines.push(`                  <span>${escXml(p.kurztext)}</span>`);
      lines.push('                </TextOutlTxt></OutlTxt></OutlineText>');
    }
    lines.push('              </CompleteText>');
    lines.push('            </Description>');
    lines.push('          </Item>');
  }
  lines.push('        </Itemlist>');
  lines.push('      </BoQBody>');
  lines.push('    </BoQ>');
  lines.push('  </Award>');
  lines.push('</GAEB>');
  return lines.join('\n');
}

// ── Re-export back to GAEB 90 ASCII (D83) ────────────────────────────────────
export function exportGaeb90(parsed: ParsedGaeb): void {
  const lines: string[] = [];
  let lineNo = 1;
  const tag = (s: string) =>
    s.padEnd(74, ' ') + String(lineNo++).padStart(6, '0');

  lines.push(tag('00        83L                                                 1122PPP0090'));
  if (parsed.date || parsed.projectName) {
    lines.push(tag('01' + (parsed.projectDescription ?? parsed.projectName ?? '').slice(0, 40).padEnd(40, ' ') + (parsed.date ?? '').slice(0, 8).padEnd(8, ' ')));
  }
  if (parsed.projectName) {
    lines.push(tag('02' + parsed.projectName.slice(0, 70).padEnd(70, ' ')));
  }
  if (parsed.awardingAuthority) {
    lines.push(tag('03' + parsed.awardingAuthority.slice(0, 70).padEnd(70, ' ')));
  }

  for (const p of parsed.positions) {
    const oz = p.pos.replace(/\./g, '').slice(0, 9).padEnd(9, ' ');
    const flags = 'NNN';
    const mengeStr = p.menge != null
      ? Math.round(p.menge * 1000).toString().padStart(14, '0')
      : '              ';
    const einheit = (p.einheit ?? '').slice(0, 4).padEnd(4, ' ');
    const ep = p.ep != null
      ? Math.round(p.ep * 100).toString().padStart(14, '0')
      : '              ';
    const gp = p.gp != null
      ? Math.round(p.gp * 100).toString().padStart(14, '0')
      : '              ';
    lines.push(tag('21' + oz + flags + '         ' + mengeStr + einheit + ep + gp));
    if (p.kurztext) {
      for (const piece of chunk(p.kurztext, 70)) {
        lines.push(tag('25   ' + piece.padEnd(70, ' ')));
      }
    }
    if (p.langtext) {
      for (const piece of chunk(p.langtext, 70)) {
        lines.push(tag('26   ' + piece.padEnd(70, ' ')));
      }
    }
  }
  lines.push(tag('99'));

  const blob = new Blob([lines.join('\r\n')], { type: 'text/plain;charset=windows-1252' });
  downloadBlob(blob, `${safeFilename(parsed.projectName ?? 'gaeb')}.d83`);
}

function chunk(s: string, n: number): string[] {
  const words = s.split(/\s+/);
  const out: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > n) {
      if (cur) out.push(cur);
      cur = w;
    } else {
      cur = cur ? cur + ' ' + w : w;
    }
  }
  if (cur) out.push(cur);
  return out;
}

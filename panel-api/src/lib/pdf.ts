import pdfmake from 'pdfmake';
import { createRequire } from 'node:module';
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces.js';
import type { ShareSettings, ShareSnapshot, User } from '../schema.js';

// pdfmake v0.3 unbundled fonts from the runtime — register the Roboto TTFs
// shipped in node_modules/pdfmake/fonts/Roboto/ on first use. createRequire is
// the only stable way to resolve the .ttf paths from this ESM-emitted module.
const _require = createRequire(import.meta.url);
let fontsRegistered = false;
function ensureFonts() {
  if (fontsRegistered) return;
  const fontDef = _require('pdfmake/fonts/Roboto.js');
  pdfmake.setFonts(fontDef);
  fontsRegistered = true;
}

const EUR = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const NUM = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Margin tuple alias — pdfmake's strict types require [t,r,b,l] not number[].
type M4 = [number, number, number, number];
const m = (t: number, r: number, b: number, l: number): M4 => [t, r, b, l];

function buildQuoteDocDef(input: {
  snapshot: ShareSnapshot;
  settings: ShareSettings;
  owner: Pick<User, 'name' | 'companyName' | 'companyPhone' | 'companyContactEmail'>;
  shareToken: string;
  snapshotHash: string;
  createdAt: Date;
  nachtragNumber: number;
  parentCreatedAt: Date | null;
}): TDocumentDefinitions {
  const { snapshot, settings, owner, shareToken, snapshotHash, createdAt, nachtragNumber, parentCreatedAt } = input;
  const isNachtrag = nachtragNumber > 0;

  const visiblePositions = snapshot.positions;
  // Mirror the web view: when showLongText is false the customer gets the
  // short version (Kurztext only). Absent flag = full detail (legacy shares).
  const showLongText = settings.showLongText !== false;
  const netto = visiblePositions.filter((p) => !p.isHeader).reduce((t, p) => t + p.gp, 0);
  const mwstRate = snapshot.project.mwst;
  const mwst = settings.showMwst ? netto * mwstRate : 0;
  const brutto = netto + mwst;

  const bindefristDays = settings.bindefristDays ?? 30;
  const bindefristUntil = new Date(createdAt.getTime() + bindefristDays * 24 * 60 * 60 * 1000);

  type TableCell = string | number | { text: string; alignment?: 'left' | 'right' | 'center'; bold?: boolean };
  const tableBody: TableCell[][] = [
    [
      { text: 'OZ', bold: true },
      { text: 'Kurztext', bold: true },
      { text: 'Menge', bold: true, alignment: 'right' },
      { text: 'EH', bold: true },
      { text: 'EP €/EH', bold: true, alignment: 'right' },
      { text: 'GP €', bold: true, alignment: 'right' },
    ],
  ];
  for (const p of visiblePositions) {
    if (p.isHeader) {
      tableBody.push([
        '',
        { text: p.shortText, bold: true },
        '',
        '',
        '',
        '',
      ]);
    } else {
      tableBody.push([
        p.oz || '',
        p.shortText + (showLongText && p.longText ? '\n' + p.longText : ''),
        { text: NUM.format(p.quantity), alignment: 'right' },
        p.unit || '',
        { text: NUM.format(p.ep), alignment: 'right' },
        { text: EUR.format(p.gp), alignment: 'right' },
      ]);
    }
  }

  const content: Content[] = [];

  if (snapshot.project.client) {
    content.push({ text: `Auftraggeber: ${snapshot.project.client}`, margin: m(0, 0, 0, 6), fontSize: 9 });
  }
  content.push({ text: snapshot.project.name, fontSize: 16, bold: true, margin: m(0, 0, 0, 4) });
  if (snapshot.project.service) {
    content.push({ text: snapshot.project.service, fontSize: 10, color: '#64748b', margin: m(0, 0, 0, 8) });
  }
  if (isNachtrag && parentCreatedAt) {
    content.push({
      text: `Nachtrag N${nachtragNumber} zum Angebot vom ${parentCreatedAt.toLocaleDateString('de-DE')}.`,
      fontSize: 9,
      color: '#b45309',
      italics: true,
      margin: m(0, 0, 0, 10),
    });
  }
  if (settings.message) {
    content.push({ text: settings.message, fontSize: 9, margin: m(0, 0, 0, 12) });
  }
  content.push({
    text: `Erstellt am ${createdAt.toLocaleDateString('de-DE')} · Gültig bis ${bindefristUntil.toLocaleDateString('de-DE')} (${bindefristDays} Tage Bindefrist gem. § 145 ff. BGB).`,
    fontSize: 8,
    color: '#64748b',
    margin: m(0, 0, 0, 14),
  });
  content.push({
    table: {
      widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto'],
      headerRows: 1,
      dontBreakRows: true,
      body: tableBody,
    },
    layout: {
      hLineColor: () => '#cbd5e1',
      vLineColor: () => '#cbd5e1',
      hLineWidth: (i: number) => (i === 0 || i === 1 ? 0.8 : 0.3),
      vLineWidth: () => 0,
      paddingTop: () => 4,
      paddingBottom: () => 4,
      paddingLeft: () => 6,
      paddingRight: () => 6,
      fillColor: (rowIndex: number) => (rowIndex === 0 ? '#f1f5f9' : null),
    },
  });
  if (settings.showTotals) {
    content.push({
      margin: m(0, 14, 0, 0),
      columns: [
        { text: '' },
        {
          width: 200,
          table: {
            widths: ['*', 'auto'],
            body: [
              [{ text: 'Netto', alignment: 'left' }, { text: EUR.format(netto), alignment: 'right' }],
              ...(settings.showMwst
                ? [[{ text: `MwSt ${Math.round(mwstRate * 100)} %`, alignment: 'left' as const }, { text: EUR.format(mwst), alignment: 'right' as const }]]
                : []),
              [
                { text: settings.showMwst ? 'Brutto-Summe' : 'Gesamt', alignment: 'left', bold: true },
                { text: EUR.format(brutto), alignment: 'right', bold: true },
              ],
            ],
          },
          layout: {
            hLineColor: (i: number) => (i === 2 ? '#0e7490' : '#cbd5e1'),
            vLineColor: () => '#cbd5e1',
            hLineWidth: (i: number) => (i === 2 ? 1.2 : 0.3),
            vLineWidth: () => 0,
            paddingTop: (i: number) => (i === 2 ? 6 : 3),
            paddingBottom: () => 3,
            paddingLeft: () => 6,
            paddingRight: () => 6,
          },
        },
      ],
    });
  }
  content.push({ margin: m(0, 24, 0, 0), text: 'Annahme', bold: true, fontSize: 10, color: '#475569' });
  content.push({
    margin: m(0, 4, 0, 0),
    fontSize: 8,
    color: '#64748b',
    text: 'Sie können dieses Angebot online unter dem nachstehenden Link annehmen (rechtsverbindlich nach § 145 ff. BGB; IP-Adresse und Zeitstempel werden zu Beweiszwecken erfasst) oder unterschreiben Sie unten und senden den Scan zurück.',
  });
  content.push({
    margin: m(0, 6, 0, 0),
    text: `https://kalku.de/share/${shareToken}`,
    link: `https://kalku.de/share/${shareToken}`,
    color: '#0e7490',
    fontSize: 8,
  });
  content.push({
    margin: m(0, 30, 0, 0),
    columns: [
      {
        stack: [
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 180, y2: 0, lineWidth: 0.5, lineColor: '#94a3b8' }] },
          { text: 'Datum', fontSize: 8, color: '#64748b', margin: m(0, 4, 0, 0) },
        ],
      },
      {
        stack: [
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 220, y2: 0, lineWidth: 0.5, lineColor: '#94a3b8' }] },
          { text: 'Unterschrift Auftraggeber', fontSize: 8, color: '#64748b', margin: m(0, 4, 0, 0) },
        ],
      },
    ],
  });

  return {
    pageSize: 'A4',
    pageMargins: m(40, 70, 40, 70),
    info: {
      title: `${isNachtrag ? 'Nachtrag N' + nachtragNumber + ' — ' : 'Angebot — '}${snapshot.project.name}`,
      author: owner.companyName || owner.name,
      subject: snapshot.project.client,
    },
    defaultStyle: { fontSize: 9, lineHeight: 1.15, color: '#1e293b' },
    header: () => ({
      margin: m(40, 25, 40, 0),
      columns: [
        {
          stack: [
            { text: owner.companyName || owner.name, bold: true, fontSize: 11 },
            ...(owner.companyName && owner.name && owner.name !== owner.companyName
              ? [{ text: owner.name, fontSize: 8, color: '#64748b' }]
              : []),
            ...(owner.companyPhone ? [{ text: owner.companyPhone, fontSize: 8, color: '#64748b' }] : []),
            ...(owner.companyContactEmail ? [{ text: owner.companyContactEmail, fontSize: 8, color: '#64748b' }] : []),
          ],
        },
        {
          alignment: 'right',
          stack: [
            { text: isNachtrag ? `Nachtrag N${nachtragNumber}` : 'Angebot', bold: true, fontSize: 11, color: isNachtrag ? '#b45309' : '#0e7490' },
            { text: `Stand: ${createdAt.toLocaleDateString('de-DE')}`, fontSize: 8, color: '#64748b' },
          ],
        },
      ],
    }),
    footer: (currentPage: number, pageCount: number) => ({
      margin: m(40, 0, 40, 25),
      columns: [
        { text: `Dokument-Fingerabdruck: ${snapshotHash.slice(0, 16)}… · SHA-256`, fontSize: 7, color: '#94a3b8' },
        { text: `Seite ${currentPage} / ${pageCount}`, fontSize: 7, color: '#94a3b8', alignment: 'right' },
      ],
    }),
    content,
  };
}

export async function renderQuotePdf(input: Parameters<typeof buildQuoteDocDef>[0]): Promise<Buffer> {
  ensureFonts();
  const docDef = buildQuoteDocDef(input);
  const out = pdfmake.createPdf(docDef);
  return await out.getBuffer();
}

function buildCertificateDocDef(input: {
  snapshot: ShareSnapshot;
  settings: ShareSettings;
  owner: Pick<User, 'name' | 'companyName'>;
  customerName: string;
  customerEmail?: string;
  approvedAt: Date;
  ip: string;
  userAgent: string;
  snapshotHash: string;
  events: Array<{ eventType: string; createdAt: Date; ip: string | null; actorRef: string | null }>;
}): TDocumentDefinitions {
  const { snapshot, owner, customerName, customerEmail, approvedAt, ip, userAgent, snapshotHash, events } = input;

  type Cell = string | { text: string; bold?: boolean };
  const eventRows: Cell[][] = [
    [{ text: 'Ereignis', bold: true }, { text: 'Zeitpunkt (UTC)', bold: true }, { text: 'IP', bold: true }, { text: 'Akteur', bold: true }],
  ];
  for (const e of events) {
    eventRows.push([
      e.eventType,
      e.createdAt.toISOString(),
      e.ip || '—',
      e.actorRef || '—',
    ]);
  }

  return {
    pageSize: 'A4',
    pageMargins: m(40, 50, 40, 50),
    info: {
      title: `Annahmebestätigung — ${snapshot.project.name}`,
      author: owner.companyName || owner.name,
    },
    defaultStyle: { fontSize: 9, color: '#1e293b' },
    content: [
      { text: 'Annahmebestätigung', fontSize: 16, bold: true, margin: m(0, 0, 0, 4) },
      { text: 'Certificate of Completion', fontSize: 9, color: '#64748b', italics: true, margin: m(0, 0, 0, 14) },
      {
        table: {
          widths: ['25%', '*'],
          body: [
            [{ text: 'Angebot', bold: true }, snapshot.project.name],
            [{ text: 'Auftraggeber', bold: true }, snapshot.project.client || '—'],
            [{ text: 'Anbieter', bold: true }, owner.companyName || owner.name],
            [
              { text: 'Annahme durch', bold: true },
              customerEmail ? `${customerName} (${customerEmail})` : customerName,
            ],
            [{ text: 'Zeitpunkt', bold: true }, approvedAt.toLocaleString('de-DE') + ' (' + approvedAt.toISOString() + ')'],
            [{ text: 'IP-Adresse', bold: true }, ip],
            [{ text: 'User-Agent', bold: true }, userAgent.slice(0, 200)],
            [{ text: 'Dokument-Hash', bold: true }, snapshotHash],
          ],
        },
        layout: {
          hLineColor: () => '#cbd5e1',
          vLineColor: () => '#cbd5e1',
          hLineWidth: () => 0.3,
          vLineWidth: () => 0,
          paddingTop: () => 4,
          paddingBottom: () => 4,
          paddingLeft: () => 6,
          paddingRight: () => 6,
        },
      },
      { text: 'Ereignisprotokoll', bold: true, fontSize: 11, margin: m(0, 18, 0, 6) },
      {
        table: { widths: ['auto', 'auto', 'auto', '*'], headerRows: 1, body: eventRows },
        layout: {
          hLineColor: () => '#cbd5e1',
          vLineColor: () => '#cbd5e1',
          hLineWidth: (i: number) => (i === 0 || i === 1 ? 0.6 : 0.2),
          vLineWidth: () => 0,
          paddingTop: () => 3,
          paddingBottom: () => 3,
          paddingLeft: () => 6,
          paddingRight: () => 6,
          fillColor: (rowIndex: number) => (rowIndex === 0 ? '#f1f5f9' : null),
        },
      },
      {
        text: 'Dieses Dokument bestätigt die rechtsverbindliche Annahme des oben genannten Angebots gemäß § 145 ff. BGB. Der SHA-256-Hash bindet die Annahme an genau die Fassung des Angebots, die der Auftraggeber gesehen hat.',
        fontSize: 8,
        color: '#64748b',
        italics: true,
        margin: m(0, 18, 0, 0),
      },
    ],
  };
}

export async function renderCertificatePdf(input: Parameters<typeof buildCertificateDocDef>[0]): Promise<Buffer> {
  ensureFonts();
  const docDef = buildCertificateDocDef(input);
  const out = pdfmake.createPdf(docDef);
  return await out.getBuffer();
}

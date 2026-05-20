// Generates public/whitepaper-7-fehler-vob-kalkulation.pdf
// Run via: node scripts/build-whitepaper-pdf.mjs
//
// Pure-JS via jspdf — no headless browser, no external services.
// The PDF is committed to the repo so it ships with the static site.

import { jsPDF } from 'jspdf';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'public', 'whitepaper-7-fehler-vob-kalkulation.pdf');

const BRAND = {
  primary: [26, 82, 118],     // #1a5276 — KALKU navy
  primaryDark: [15, 58, 90],  // deeper navy for accents
  ink: [17, 24, 39],          // gray-900
  body: [55, 65, 81],         // gray-700
  sub: [107, 114, 128],       // gray-500
  muted: [156, 163, 175],     // gray-400
  rule: [229, 231, 235],      // gray-200
  surface: [248, 250, 252],   // slate-50
  accent: [4, 120, 87],       // emerald-700 (used for "Lösung")
  warn: [180, 83, 9],         // amber-700 (used for "Konsequenz")
};

// A4 in pts
const W = 595.28;
const H = 841.89;
const MARGIN = 56;
const CONTENT_W = W - MARGIN * 2;

const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
doc.setProperties({
  title: '7 Fehler in der VOB-Kalkulation — KALKU Praxisleitfaden',
  subject: 'Whitepaper für mittelständische Bauunternehmen',
  author: 'KALKU Baukalkulationen',
  keywords: 'VOB, Kalkulation, Submission, Ausschreibung, GAEB, EFB, Baukalkulation, Whitepaper',
  creator: 'KALKU',
});

// ---------- low-level helpers ----------

function setFill(rgb) {
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
}
function setStroke(rgb) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
}
function setText(rgb) {
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
}

/** Lay out wrapped text at (x,y), return the y after the last line. */
function paragraph(text, x, y, opts = {}) {
  const {
    width = CONTENT_W,
    size = 10.5,
    lineHeight = 1.55,
    font = 'helvetica',
    style = 'normal',
    color = BRAND.body,
  } = opts;
  doc.setFont(font, style);
  doc.setFontSize(size);
  setText(color);
  const lines = doc.splitTextToSize(text, width);
  const lh = size * lineHeight;
  lines.forEach((ln, i) => doc.text(ln, x, y + i * lh));
  return y + lines.length * lh;
}

function heading(text, x, y, opts = {}) {
  const {
    size = 22,
    style = 'bold',
    color = BRAND.ink,
    width = CONTENT_W,
  } = opts;
  doc.setFont('helvetica', style);
  doc.setFontSize(size);
  setText(color);
  const lines = doc.splitTextToSize(text, width);
  const lh = size * 1.18;
  lines.forEach((ln, i) => doc.text(ln, x, y + i * lh));
  return y + lines.length * lh;
}

function eyebrow(text, x, y, color = BRAND.primary) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  setText(color);
  // letter-spaced effect by inserting thin spaces? jsPDF lacks tracking — emulate via charSpace
  const prev = doc.internal.getCharSpace?.() ?? 0;
  doc.setCharSpace(1.6);
  doc.text(text.toUpperCase(), x, y);
  doc.setCharSpace(prev);
  return y;
}

function rule(x1, y, x2, color = BRAND.rule, width = 0.6) {
  setStroke(color);
  doc.setLineWidth(width);
  doc.line(x1, y, x2, y);
}

function pageHeader(label) {
  // Top brand bar — slim, navy
  setFill(BRAND.primary);
  doc.rect(0, 0, W, 4, 'F');
  // Logo wordmark
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  setText(BRAND.primary);
  doc.setCharSpace(1.4);
  doc.text('KALKU', MARGIN, 30);
  doc.setCharSpace(0);
  // Right-side section label
  if (label) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    setText(BRAND.sub);
    doc.text(label, W - MARGIN, 30, { align: 'right' });
  }
  rule(MARGIN, 42, W - MARGIN, BRAND.rule, 0.5);
}

function pageFooter(pageNum, totalPages) {
  rule(MARGIN, H - 48, W - MARGIN, BRAND.rule, 0.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  setText(BRAND.sub);
  doc.text('KALKU Baukalkulationen · kalku.de · Stand 2026', MARGIN, H - 32);
  doc.text(`Seite ${pageNum} / ${totalPages}`, W - MARGIN, H - 32, { align: 'right' });
}

/** Coloured tag (small rounded pill). */
function tag(text, x, y, color = BRAND.primary, bg = [235, 242, 248]) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setCharSpace(1);
  const w = doc.getTextWidth(text.toUpperCase()) + 14;
  setFill(bg);
  doc.roundedRect(x, y - 10, w, 16, 8, 8, 'F');
  setText(color);
  doc.text(text.toUpperCase(), x + 7, y);
  doc.setCharSpace(0);
  return x + w;
}

// ---------- content blocks ----------

function drawCover() {
  // Solid navy panel covering ~60% of page
  setFill(BRAND.primary);
  doc.rect(0, 0, W, H * 0.62, 'F');

  // Inner darker accent rectangle (decorative band)
  setFill(BRAND.primaryDark);
  doc.rect(0, H * 0.58, W, 4, 'F');

  // Cover header (white wordmark + meta)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  setText([255, 255, 255]);
  doc.setCharSpace(2);
  doc.text('KALKU', MARGIN, 64);
  doc.setCharSpace(0);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  setText([200, 215, 230]);
  doc.text('BAUKALKULATIONEN', MARGIN + 50, 64);

  // Top-right eyebrow
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  setText([200, 215, 230]);
  doc.setCharSpace(1.8);
  doc.text('PRAXISLEITFADEN · 2026', W - MARGIN, 64, { align: 'right' });
  doc.setCharSpace(0);

  // Big title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(40);
  setText([255, 255, 255]);
  const title1 = 'Die 7 häufigsten Fehler';
  const title2 = 'in der VOB-Kalkulation';
  doc.text(title1, MARGIN, 280);
  doc.text(title2, MARGIN, 326);

  // Sub-title
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(16);
  setText([200, 215, 230]);
  const subLines = doc.splitTextToSize(
    'Und wie Sie sie vor dem Submissionstermin abfangen. Ein Praxisleitfaden für mittelständische Bauunternehmen.',
    CONTENT_W - 40,
  );
  subLines.forEach((ln, i) => doc.text(ln, MARGIN, 380 + i * 22));

  // Lower content (on white)
  // "Was Sie erwartet" mini-TOC
  const tocY = H * 0.68;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  setText(BRAND.primary);
  doc.setCharSpace(1.6);
  doc.text('WAS SIE ERWARTET', MARGIN, tocY);
  doc.setCharSpace(0);

  const tocItems = [
    '7 konkrete Fehler · Symptom, Konsequenz und Lösung pro Fehler',
    'Aus 14 Jahren Kalkulationspraxis in 10 Gewerken',
    'Geeignet für VOB/A, VgV und freie Vergaben',
    'Direkt einsetzbare Checkpunkte für Ihre nächste Submission',
  ];
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  setText(BRAND.body);
  tocItems.forEach((it, i) => {
    const y = tocY + 24 + i * 20;
    // square bullet
    setFill(BRAND.primary);
    doc.rect(MARGIN, y - 6, 4, 4, 'F');
    setText(BRAND.body);
    doc.text(it, MARGIN + 14, y - 2);
  });

  // Bottom footer band
  setFill(BRAND.surface);
  doc.rect(0, H - 70, W, 70, 'F');
  rule(0, H - 70, W, BRAND.rule, 0.6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  setText(BRAND.ink);
  doc.text('KALKU Baukalkulationen', MARGIN, H - 42);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  setText(BRAND.sub);
  doc.text('Outsourced Baukalkulation · Saarbrücken · bundesweit', MARGIN, H - 26);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  setText(BRAND.primary);
  doc.text('kalku.de', W - MARGIN, H - 42, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  setText(BRAND.sub);
  doc.text('it@kalku.de', W - MARGIN, H - 26, { align: 'right' });
}

function drawIntro() {
  doc.addPage();
  pageHeader('Vorwort');

  let y = 96;
  eyebrow('Vorwort', MARGIN, y, BRAND.primary);
  y += 22;

  y = heading(
    'Warum die meisten VOB-Kalkulationen Geld liegen lassen.',
    MARGIN,
    y,
    { size: 26 },
  );
  y += 18;

  // Lead paragraph
  y = paragraph(
    'Wer öffentliche Ausschreibungen bepreist, kämpft an drei Fronten gleichzeitig: VOB/A-Formalismus, Markt-Druck und der eigene Zeitplan. In dieser Dreifach-Belastung schleichen sich Fehler ein, die für mittelständische Bauunternehmen jedes Jahr fünf- bis sechsstellige Beträge kosten — entweder als entgangene Zuschläge oder als unprofitable Aufträge.',
    MARGIN, y, { size: 11.5, color: BRAND.body },
  );
  y += 10;

  y = paragraph(
    'Dieses Whitepaper ist die Verdichtung von 14 Jahren KALKU-Praxis: tausende bepreiste LVs in 10 Gewerken — Tiefbau, Rohbau, GaLaBau, Elektro, SHK, Trockenbau, Dachdecker, Estrich, Metallbau und Straßenbau. Wir zeigen die sieben Fehler, die in fast jedem Audit auftauchen, mit dem ich ein neues Mandat beginne.',
    MARGIN, y, { size: 11.5, color: BRAND.body },
  );
  y += 22;

  // Section header for "Für wen"
  rule(MARGIN, y, MARGIN + 40, BRAND.primary, 1.4);
  y += 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  setText(BRAND.ink);
  doc.text('Für wen ist dieser Leitfaden geschrieben?', MARGIN, y);
  y += 18;

  const targetGroups = [
    {
      h: 'Inhaber & Geschäftsführer',
      b: 'die selbst kalkulieren oder die Kalkulation verantworten — und wissen wollen, wo systematisch Geld verloren geht.',
    },
    {
      h: 'Kalkulatoren & Bauleiter',
      b: 'die unter Submissionsdruck arbeiten und nach reproduzierbaren Prüfpunkten für jede Abgabe suchen.',
    },
    {
      h: 'Controlling & kaufm. Leitung',
      b: 'die Margen-Abweichungen zwischen Submission und Schlussrechnung methodisch reduzieren wollen.',
    },
  ];

  targetGroups.forEach((g) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    setText(BRAND.primary);
    doc.text('•', MARGIN, y);
    setText(BRAND.ink);
    doc.text(g.h, MARGIN + 14, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    setText(BRAND.body);
    const lines = doc.splitTextToSize(g.b, CONTENT_W - 14);
    lines.forEach((ln, i) => doc.text(ln, MARGIN + 14, y + 16 + i * 14));
    y += 18 + lines.length * 14;
  });

  y += 20;

  // Closing intro line / callout box
  setFill(BRAND.surface);
  doc.roundedRect(MARGIN, y, CONTENT_W, 70, 6, 6, 'F');
  setStroke(BRAND.rule);
  doc.setLineWidth(0.6);
  doc.roundedRect(MARGIN, y, CONTENT_W, 70, 6, 6, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  setText(BRAND.primary);
  doc.setCharSpace(1.4);
  doc.text('AUFBAU', MARGIN + 20, y + 22);
  doc.setCharSpace(0);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  setText(BRAND.body);
  const tipLines = doc.splitTextToSize(
    'Jeder der sieben folgenden Fehler ist auf einer Seite gegliedert: SYMPTOM (wie er sich in der Praxis zeigt), KONSEQUENZ (was er kostet) und LÖSUNG (was Sie konkret ändern). Am Ende finden Sie eine Kurz-Checkliste.',
    CONTENT_W - 40,
  );
  tipLines.forEach((ln, i) => doc.text(ln, MARGIN + 20, y + 40 + i * 14));
}

const ERRORS = [
  {
    n: 1,
    title: 'EFB-Nachweise zu spät bepreist.',
    intro: 'Mittellohn, AGK, W+G und Sozialkosten-Zuschlag werden in den letzten 24 Stunden vor Abgabe nachgerechnet — meist während Tippfehler in den Einheitspreisen schon mitgeschleppt werden.',
    symptom:
      'Die EFB-Formblätter 221 und 223 werden ausgefüllt, sobald die LV-Positionen bepreist sind. Wer Mittellohn und Zuschlagsfaktoren rückwärts aus der bereits stehenden Endsumme ableitet, manipuliert in Wahrheit Zahlen, die methodisch hätten zuerst stehen müssen.',
    konsequenz:
      'Submission scheitert an formalen Mängeln (EFB-Nachweis nicht konsistent mit kalkulierter Endsumme) — oder der Zuschlag kommt, aber mit einer Marge, die in der Ausführung nicht zu halten ist. Auditierbar wird die Kalkulation in beiden Fällen nicht.',
    loesung:
      'Mittellohn-AP und Stundenverrechnungssatz als Schritt 1 der Kalkulation festlegen, nicht als Endkontrolle. Tools wie der KALKU-Mittellohnrechner liefern den AP-Wert in unter 5 Minuten und sperren die Größe für die Submission.',
  },
  {
    n: 2,
    title: 'Mengen ohne Plausibilitäts-Cross-Check.',
    intro: 'Positionen werden 1:1 aus dem LV übernommen, ohne mindestens stichprobenartig gegen Baupläne, Schnitte oder Aufmaß-Skizzen gegenzurechnen.',
    symptom:
      'Die LV-Mengen erscheinen plausibel, weil sie vom Auftraggeber kommen — niemand prüft sie systematisch. Bei der Ausführung treten Mengenabweichungen von 15–30 % auf, ohne dass die Kalkulation darauf vorbereitet wäre.',
    konsequenz:
      'Bei Mehrmengen drohen Nachträge, die nach § 2 Abs. 3 VOB/B nur unter engen Voraussetzungen durchsetzbar sind. Bei Mindermengen schrumpft der Deckungsbeitrag — die fixen AGK-Anteile sind aber bereits in die Kalkulation eingerechnet.',
    loesung:
      'Pro LV mindestens drei Schlüsselpositionen (höchster Wertanteil) gegen die Bauplan-Geometrie aufmaßen. Abweichungen über 5 % als Nachfrage an den Auftraggeber dokumentieren — schriftlich, vor Submissionstermin.',
  },
  {
    n: 3,
    title: 'Materialpreise als Stichtag, nicht als Eskalation.',
    intro: 'Materialpreise zum Submissionsdatum werden in die Kalkulation eingefroren — die Ausführung beginnt aber oft 6 bis 18 Monate später.',
    symptom:
      'Stahl, Bitumen, Dämmstoffe, Holz: Preisindizes haben sich seit 2022 mehrfach um >20 % bewegt. Kalkulationen ohne Preisgleitklausel oder ohne explizite Materialreserve verwandeln planmäßige Gewinne nachträglich in Verluste.',
    konsequenz:
      'Selbst gewonnene Aufträge werden zu Negativposten. Die Differenz zwischen kalkuliertem und ausgeführtem Materialpreis schlägt direkt aufs Betriebsergebnis durch, weil sie nicht weitergegeben werden kann.',
    loesung:
      'Bei Aufträgen mit längerer Ausführungsphase aktiv Stoffpreisgleitklauseln nach VHB 225 anbieten oder verlangen. Wenn nicht durchsetzbar: differenzierte Materialreserven kalkulieren, getrennt nach Volatilität (Stahl / Bitumen / Holz / Standard).',
  },
  {
    n: 4,
    title: 'AGK-Pauschale über alle Positionen verteilt.',
    intro: 'Allgemeine Geschäftskosten werden mit einem einzigen Prozentwert (typisch 8–12 %) über das gesamte LV gelegt — unabhängig davon, ob die Position 50 € Materialwert oder 250 000 € Sondergewerk ist.',
    symptom:
      'Einheitspreise für einfache Massenpositionen werden durch den AGK-Aufschlag unmarktbar, während komplexe Positionen mit hohem Steuerungsaufwand unter ihrer realen Kostenlast bleiben. Submissionen werden „weggekippt", weil die Massenposition im Vergleich teuer wirkt.',
    konsequenz:
      'Tatsächlich verloren werden Submissionen oft nicht wegen des Gesamtpreises, sondern wegen einzelner sichtbarer Positionen. Der Wettbewerber, der seine AGK richtig gewichtet, gewinnt diese Bietergefechte.',
    loesung:
      'AGK in mindestens zwei Stufen gewichten: Standardpositionen mit reduziertem Satz, komplexe Steuerungspositionen mit erhöhtem Satz. Die Summe bleibt unverändert — die Wettbewerbsfähigkeit auf Positionsebene steigt deutlich.',
  },
  {
    n: 5,
    title: 'Wagnis & Gewinn ohne Risikoprofil.',
    intro: '5 % W+G über das ganze LV — der Reflexwert vieler Kalkulationen — ignoriert, dass Risiko sich pro Gewerk und pro Position dramatisch unterscheidet.',
    symptom:
      'Standard-Positionen (Erdaushub, Schotter, Pflaster) werden mit identischem W+G-Aufschlag versehen wie risikobehaftete Positionen (Spezialtiefbau, Bestandsanschluss, Altbau-Eingriff). Im Wettbewerb sind die Standardpositionen damit zu teuer und die Risikopositionen zu billig.',
    konsequenz:
      'Aufträge werden auf der falschen Seite gewonnen: zu viele risikoreiche Lose, zu wenige planbare. Das Portfolio kippt schleichend in Richtung höherer Schadensanfälligkeit, ohne dass die Kalkulation den Wandel signalisiert.',
    loesung:
      'W+G je Hauptgewerk und je Risikoklasse differenzieren. Mindestklassen: Standard (3–4 %), Mittel (5–6 %), Hochrisiko (8–12 %). Die Klassifizierung gehört zur Vorbereitungsphase jeder Submission, nicht in den letzten Tag.',
  },
  {
    n: 6,
    title: 'Nachunternehmer-LVs ohne Eigenkalkulation.',
    intro: 'Der Nachunternehmer (NU) liefert ein Angebot. Das wird übernommen, mit AGK-Aufschlag versehen und in die Eigenkalkulation gespiegelt — ohne dass parallel eine eigene Soll-Kalkulation existiert.',
    symptom:
      'Bei Verhandlungen, Nachträgen oder NU-Wechsel fehlt eine eigene Preisreferenz. Marktveränderungen schlagen unmittelbar durch: Wenn der NU teurer wird, bleibt nur die Wahl zwischen Verlust und Vertragsbruch.',
    konsequenz:
      'Der GU trägt das gesamte NU-Risiko, ohne es bepreist zu haben. Bei NU-Ausfall oder Insolvenz ist das Loch im Projektbudget nicht abgedeckt, weil keine eigene Kalkulation existiert, gegen die man hätte vorhalten können.',
    loesung:
      'Auch NU-Positionen mit einer eigenen Soll-Kalkulation (mind. Lohn × Zeit + Materialannahme) cross-checken. Abweichungen zwischen NU-Angebot und Soll-Kalkulation >15 % sind ein Signal: nachverhandeln oder zweites Angebot einholen.',
  },
  {
    n: 7,
    title: 'Submissionstermin als Endtermin behandelt.',
    intro: 'Die letzten 48 Stunden vor Submissionsabgabe werden für inhaltliche Änderungen genutzt — Tippfehler in Einheitspreisen, vergessene Positionen oder doppelte Erfassungen rutschen ohne Vier-Augen-Prüfung in die Abgabe.',
    symptom:
      'Die Kalkulationsdatei wird bis kurz vor Abgabe verändert. Es existiert kein definierter „Kalkulations-Freeze", nach dem nur noch geprüft, aber nicht mehr inhaltlich kalkuliert wird.',
    konsequenz:
      'Triviale Fehler (Komma in einer Einheitsmenge, eine vergessene Eventualposition) führen zu Verlusten in fünfstelliger Höhe — oder zum formalen Submissionsausschluss, wenn Positionen offen bleiben.',
    loesung:
      'Mindestens 24 Stunden vor Submission einen Kalkulations-Freeze definieren. Danach nur noch Vier-Augen-Prüfung: jede Position quer-gegen LV, jede Endsumme quer-gegen EFB. Keine inhaltlichen Änderungen mehr, nur noch Stempel oder Stopp.',
  },
];

function drawError(err) {
  doc.addPage();
  pageHeader(`Fehler ${err.n} / 7`);

  let y = 96;

  // Step counter pill + title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  setText(BRAND.primary);
  doc.setCharSpace(1.6);
  doc.text(`FEHLER NR. ${err.n} / 7`, MARGIN, y);
  doc.setCharSpace(0);
  y += 16;

  y = heading(err.title, MARGIN, y, { size: 24 });
  y += 14;

  // Intro / framing line
  y = paragraph(err.intro, MARGIN, y, {
    size: 12,
    color: BRAND.ink,
    lineHeight: 1.5,
  });
  y += 22;

  // Three sub-blocks: Symptom (sub) · Konsequenz (warn) · Lösung (accent)
  const blocks = [
    { label: 'Symptom', body: err.symptom, color: BRAND.sub },
    { label: 'Konsequenz', body: err.konsequenz, color: BRAND.warn },
    { label: 'Lösung', body: err.loesung, color: BRAND.accent },
  ];

  blocks.forEach((b) => {
    // Coloured vertical accent bar
    setFill(b.color);
    doc.rect(MARGIN, y - 4, 3, 16, 'F');
    // Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    setText(b.color);
    doc.setCharSpace(1.4);
    doc.text(b.label.toUpperCase(), MARGIN + 14, y + 7);
    doc.setCharSpace(0);
    // Body
    const after = paragraph(b.body, MARGIN + 14, y + 28, {
      width: CONTENT_W - 14,
      size: 10.5,
      color: BRAND.body,
      lineHeight: 1.55,
    });
    y = after + 16;
  });
}

function drawChecklist() {
  doc.addPage();
  pageHeader('Schnell-Checkliste');

  let y = 96;
  eyebrow('Anhang', MARGIN, y, BRAND.primary);
  y += 22;
  y = heading('Die 7 Fehler — als Schnell-Checkliste für die nächste Submission.', MARGIN, y, { size: 22 });
  y += 18;

  y = paragraph(
    'Vor jeder Submissionsabgabe diese sieben Punkte durchgehen. Jeder Punkt, der nicht mit „Ja" beantwortet werden kann, ist ein dokumentiertes Risiko — entweder beheben oder bewusst akzeptieren.',
    MARGIN, y, { size: 11, color: BRAND.body },
  );
  y += 18;

  ERRORS.forEach((err) => {
    // Box per item
    const boxH = 56;
    setFill([252, 253, 254]);
    doc.roundedRect(MARGIN, y, CONTENT_W, boxH, 5, 5, 'F');
    setStroke(BRAND.rule);
    doc.setLineWidth(0.5);
    doc.roundedRect(MARGIN, y, CONTENT_W, boxH, 5, 5, 'S');

    // Checkbox square
    setStroke(BRAND.primary);
    doc.setLineWidth(1.2);
    doc.rect(MARGIN + 14, y + 18, 14, 14);

    // Numbered tag
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    setText(BRAND.primary);
    doc.text(`${err.n}.`, MARGIN + 44, y + 22);

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    setText(BRAND.ink);
    doc.text(err.title, MARGIN + 64, y + 22);

    // Short summary
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    setText(BRAND.sub);
    const summary = doc.splitTextToSize(err.loesung, CONTENT_W - 80);
    doc.text(summary[0], MARGIN + 64, y + 40);

    y += boxH + 8;
  });
}

function drawOutro() {
  doc.addPage();
  pageHeader('Über KALKU');

  // Big quote/lead
  let y = 110;
  eyebrow('Wie es weitergeht', MARGIN, y, BRAND.primary);
  y += 22;
  y = heading('Sie können diese sieben Fehler selbst beheben. Oder uns die Kalkulation übergeben.', MARGIN, y, { size: 24 });
  y += 18;

  y = paragraph(
    'KALKU ist die ausgelagerte Kalkulationsabteilung für mittelständische Bauunternehmen. Wir bepreisen LVs in 48 Stunden zum Festpreis ab 200 €, übernehmen die EFB-Nachweise und liefern Submissions-fertig zurück.',
    MARGIN, y, { size: 11.5, color: BRAND.body },
  );
  y += 14;
  y = paragraph(
    'Die Verantwortung für die strategische Entscheidung — welche Submission, welcher Preis, welches Risiko — bleibt bei Ihnen. Wir liefern die saubere Zahl, mit der Sie entscheiden können.',
    MARGIN, y, { size: 11.5, color: BRAND.body },
  );
  y += 30;

  // Three-column "Was Sie bekommen"
  const colW = (CONTENT_W - 28) / 3;
  const cols = [
    { h: 'LV in 48 h bepreist', b: 'Festpreis ab 200 € pro LV. Inkl. EFB-Nachweise, Mittellohn-AP, Plausibilitätsprüfung.' },
    { h: '10 Gewerke abgedeckt', b: 'Tiefbau, Rohbau, GaLaBau, Elektro, SHK, Trockenbau, Dachdecker, Estrich, Metallbau, Straßenbau.' },
    { h: 'Vertraulich, ohne Logo-Wall', b: 'Wir nennen keine Kundennamen. Submissionsdaten verlassen unsere Systeme nicht.' },
  ];
  cols.forEach((c, i) => {
    const x = MARGIN + i * (colW + 14);
    setFill(BRAND.surface);
    doc.roundedRect(x, y, colW, 110, 6, 6, 'F');
    setStroke(BRAND.rule);
    doc.setLineWidth(0.5);
    doc.roundedRect(x, y, colW, 110, 6, 6, 'S');

    setFill(BRAND.primary);
    doc.rect(x + 14, y + 14, 18, 3, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    setText(BRAND.ink);
    const hLines = doc.splitTextToSize(c.h, colW - 28);
    hLines.forEach((ln, idx) => doc.text(ln, x + 14, y + 38 + idx * 14));

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    setText(BRAND.body);
    const bLines = doc.splitTextToSize(c.b, colW - 28);
    bLines.forEach((ln, idx) => doc.text(ln, x + 14, y + 38 + hLines.length * 14 + 6 + idx * 13));
  });
  y += 130;

  // CTA strip
  setFill(BRAND.primary);
  doc.roundedRect(MARGIN, y, CONTENT_W, 90, 6, 6, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  setText([255, 255, 255]);
  doc.text('Erstgespräch — kostenlos, 15 Minuten, ohne Verkauf.', MARGIN + 22, y + 32);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  setText([200, 215, 230]);
  doc.text(
    'Sie schicken uns ein laufendes LV (oder ein Beispiel), wir geben Ihnen 3 konkrete',
    MARGIN + 22,
    y + 54,
  );
  doc.text(
    'Hinweise zurück. Keine Powerpoint, keine Folien — nur Praxis.',
    MARGIN + 22,
    y + 70,
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  setText([255, 255, 255]);
  doc.text('kalku.de/kontakt', W - MARGIN - 22, y + 32, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  setText([200, 215, 230]);
  doc.text('it@kalku.de', W - MARGIN - 22, y + 50, { align: 'right' });
  doc.text('Mo – Fr · 8 – 18 Uhr', W - MARGIN - 22, y + 66, { align: 'right' });
}

// ---------- compose ----------

drawCover();
drawIntro();
ERRORS.forEach(drawError);
drawChecklist();
drawOutro();

// Add footers (need totalPages after all addPage calls)
const totalPages = doc.getNumberOfPages();
for (let p = 2; p <= totalPages; p++) {
  doc.setPage(p);
  pageFooter(p, totalPages);
}

// Ensure output dir exists then write
mkdirSync(dirname(OUT), { recursive: true });
const ab = doc.output('arraybuffer');
writeFileSync(OUT, Buffer.from(ab));
console.log(`✓ wrote ${OUT}`);
console.log(`  pages: ${totalPages}`);

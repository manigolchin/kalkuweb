import { useState, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  Mail,
  Shield,
  ArrowRight,
  Download,
  FileSpreadsheet,
  FileCheck2,
  Trash2,
  Search,
} from 'lucide-react';
import { canonical } from '@/lib/seo';
import { softwareApplicationSchema } from '@/lib/toolSchema';
import AndereTools from '@/components/sections/AndereTools';
import SectionHeader from '@/components/ui/SectionHeader';
import FaqItem from '@/components/ui/FaqItem';

type Position = {
  pos: string;
  text: string;
  einheit: string;
  menge?: number;
  ep?: number;
  gp?: number;
};

type ParsedGaeb = {
  filename: string;
  size: number;
  format: string;
  formatLabel: string;
  projectName?: string;
  positionCount: number;
  positions: Position[];
  estimatedValue?: number;
  bidder?: string;
};

const TITLE = 'GAEB-Konverter (kostenlos, im Browser) | KALKU';
const DESC =
  'GAEB-Datei (X81–X89, D81–D84, P83/P84) im Browser öffnen, Positionen anzeigen, als Excel oder CSV exportieren. Datei verlässt Ihren Computer nie. Kostenlos.';

const ACCEPTED_EXTENSIONS = ['.x81', '.x83', '.x84', '.x85', '.x86', '.x89', '.d81', '.d83', '.d84', '.p83', '.p84', '.xml'];

const FORMAT_LABELS: Record<string, string> = {
  x81: 'GAEB DA XML 3.x — LV-Anfrage',
  x83: 'GAEB DA XML 3.x — Angebotsaufforderung',
  x84: 'GAEB DA XML 3.x — Angebot Bieter',
  x85: 'GAEB DA XML 3.x — Nebenangebot',
  x86: 'GAEB DA XML 3.x — Auftrag',
  x89: 'GAEB DA XML 3.x — Spez. Aufmaß',
  d81: 'GAEB ASCII 90/2000 — LV-Anfrage',
  d83: 'GAEB ASCII 90/2000 — Angebotsaufforderung',
  d84: 'GAEB ASCII 90/2000 — Angebot Bieter',
  p83: 'GAEB Datenträger — Pseudo-Format',
  p84: 'GAEB Datenträger — Pseudo-Format Angebot',
  xml: 'XML / ÖNorm A2063',
};

const FAQ = [
  {
    q: 'Was ist GAEB?',
    a: 'Der „Gemeinsame Ausschuss Elektronik im Bauwesen" (GAEB) hat das Standard-Datenformat für die elektronische Übergabe von Leistungsverzeichnissen zwischen Auftraggeber und Bieter definiert. Versionen: GAEB 90, GAEB 2000, GAEB DA XML 3.x.',
  },
  {
    q: 'Welche Versionen werden unterstützt?',
    a: 'GAEB DA XML 3.1, 3.2, 3.3 (X81, X83, X84, X85, X86, X89), GAEB ASCII 90/2000 (D81, D83, D84) sowie ÖNORM A2063. Die Vorschau zeigt Projektdaten, alle Positionen mit Mengen und ggf. Preise. Excel-Export inklusive.',
  },
  {
    q: 'Werden meine Daten auf einen Server hochgeladen?',
    a: 'Nein. Die Vorschau und alle Exports (Excel, CSV) erfolgen vollständig in Ihrem Browser — Ihre Datei verlässt Ihren Computer nicht. Erst wenn Sie aktiv die optionale Premium-Auswertung per E-Mail anfordern, übertragen wir die Datei verschlüsselt an unseren Server.',
  },
  {
    q: 'Was bekomme ich bei der Premium-Auswertung?',
    a: 'Sie erhalten per Mail: (1) eine saubere PDF-Druckansicht des kompletten LVs, (2) eine Excel-Tabelle aller Positionen mit Mengen, (3) eine KI-gestützte Klassifizierung pro Gewerk inkl. Material/Hersteller-Detection. Kostenlos, einmalig — Bearbeitung 1–2 Werktage.',
  },
  {
    q: 'Funktioniert das auch offline?',
    a: 'Sobald die Seite einmal im Browser-Cache liegt, funktioniert die Vorschau offline. Nur die optionale Premium-Auswertung benötigt Internetzugang.',
  },
];

function detectFormat(filename: string): { ext: string; label: string } {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  return { ext, label: FORMAT_LABELS[ext] ?? `Format .${ext}` };
}

function parseXml(text: string): { projectName?: string; positions: Position[]; estimatedValue?: number; bidder?: string } {
  try {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    const projectName =
      doc.querySelector('NamePrjGes, NamePrj, NamePrjBlock')?.textContent?.trim() ||
      doc.querySelector('PrjInfo > NamePrjGes')?.textContent?.trim();

    // Bidder name (X84 / X85)
    const bidder =
      doc.querySelector('LblBdr, BdrPrjInfo > Name')?.textContent?.trim();

    const positions: Position[] = [];
    let totalSum = 0;
    doc.querySelectorAll('Position').forEach((p) => {
      const itemId = p.querySelector('ItemReference, RNoPart, ItemNo')?.textContent?.trim()
                   || p.getAttribute('RNoPart') || '';
      const desc =
        p.querySelector('OutlineSpecText, ShortText, OutlineText')?.textContent?.trim()
        || p.querySelector('Description')?.textContent?.trim()
        || '';
      const einheit = p.querySelector('QU, Qu')?.textContent?.trim() || '';
      const qtyText = p.querySelector('Qty')?.textContent?.trim();
      const upText = p.querySelector('UP')?.textContent?.trim();
      const itText = p.querySelector('IT')?.textContent?.trim();
      const menge = qtyText ? parseFloat(qtyText) : undefined;
      const ep = upText ? parseFloat(upText) : undefined;
      const gp = itText ? parseFloat(itText) : (menge && ep ? menge * ep : undefined);
      if (gp && !isNaN(gp)) totalSum += gp;
      positions.push({
        pos: itemId,
        text: desc.replace(/\s+/g, ' ').slice(0, 240),
        einheit,
        menge: menge && !isNaN(menge) ? menge : undefined,
        ep: ep && !isNaN(ep) ? ep : undefined,
        gp: gp && !isNaN(gp) ? gp : undefined,
      });
    });
    return { projectName, positions, estimatedValue: totalSum > 0 ? totalSum : undefined, bidder };
  } catch {
    return { positions: [] };
  }
}

function parseAscii(text: string, filename: string): { projectName?: string; positions: Position[] } {
  // GAEB ASCII has 21.* lines for positions, 02. for project name
  const lines = text.split(/\r?\n/);
  const positions: Position[] = [];
  let projectName: string | undefined;
  for (const line of lines) {
    if (line.startsWith('02.')) {
      projectName = line.slice(3).trim().slice(0, 200);
    }
    if (/^21\.\d/.test(line)) {
      const pos = line.slice(0, 14).trim();
      const text = line.slice(14, 100).trim();
      const einheit = line.slice(100, 110).trim();
      positions.push({ pos, text, einheit });
    }
  }
  return { projectName: projectName ?? filename.replace(/\.[^.]+$/, ''), positions };
}

function fmt(n: number): string {
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function GaebKonverter() {
  const [parsed, setParsed] = useState<ParsedGaeb | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setParsed(null);
    setError(null);
    setEmail('');
    setSubmitted(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleFile(file: File) {
    setError(null);
    setSubmitted(false);

    const { ext, label } = detectFormat(file.name);
    if (!ACCEPTED_EXTENSIONS.includes('.' + ext)) {
      setError(`Format .${ext} wird nicht unterstützt. Akzeptiert: ${ACCEPTED_EXTENSIONS.join(', ')}.`);
      return;
    }

    const text = await file.text();
    const isXml = ext.startsWith('x') || ext.startsWith('p') || ext === 'xml';
    const result = isXml ? parseXml(text) : parseAscii(text, file.name);

    setParsed({
      filename: file.name,
      size: file.size,
      format: ext.toUpperCase(),
      formatLabel: label,
      projectName: result.projectName ?? file.name.replace(/\.[^.]+$/, ''),
      positionCount: result.positions.length,
      positions: result.positions,
      estimatedValue: 'estimatedValue' in result ? (result as { estimatedValue?: number }).estimatedValue : undefined,
      bidder: 'bidder' in result ? (result as { bidder?: string }).bidder : undefined,
    });
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) void handleFile(f);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) void handleFile(f);
  }

  function exportCsv() {
    if (!parsed) return;
    const header = ['Pos.', 'Beschreibung', 'Einheit', 'Menge', 'EP €', 'GP €'];
    const lines = [header.join(';')];
    parsed.positions.forEach((p) => {
      lines.push([
        p.pos,
        `"${p.text.replace(/"/g, '""')}"`,
        p.einheit,
        p.menge != null ? fmt(p.menge) : '',
        p.ep != null ? fmt(p.ep) : '',
        p.gp != null ? fmt(p.gp) : '',
      ].join(';'));
    });
    if (parsed.estimatedValue) {
      lines.push('');
      lines.push(['', 'SUMME', '', '', '', fmt(parsed.estimatedValue)].join(';'));
    }
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${parsed.projectName?.replace(/[^\w-]/g, '_') ?? 'gaeb'}-positionen.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportExcel() {
    if (!parsed) return;
    setExportingExcel(true);
    try {
      const XLSX = await import('xlsx');
      const data: (string | number)[][] = [
        ['Projekt:', parsed.projectName ?? ''],
        ['Format:', parsed.formatLabel],
        ['Positionen:', parsed.positionCount],
        ...(parsed.bidder ? [['Bieter:', parsed.bidder]] : []),
        [],
        ['Pos.', 'Beschreibung', 'Einheit', 'Menge', 'EP €', 'GP €'],
        ...parsed.positions.map((p) => [
          p.pos,
          p.text,
          p.einheit,
          p.menge != null ? Number(p.menge.toFixed(2)) : '',
          p.ep != null ? Number(p.ep.toFixed(2)) : '',
          p.gp != null ? Number(p.gp.toFixed(2)) : '',
        ]),
        ...(parsed.estimatedValue
          ? [[], ['', 'SUMME netto', '', '', '', Number(parsed.estimatedValue.toFixed(2))]]
          : []),
      ];
      const ws = XLSX.utils.aoa_to_sheet(data);
      ws['!cols'] = [{ wch: 12 }, { wch: 60 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 14 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'GAEB-LV');
      XLSX.writeFile(wb, `${parsed.projectName?.replace(/[^\w-]/g, '_') ?? 'gaeb'}-positionen.xlsx`);
    } finally {
      setExportingExcel(false);
    }
  }

  function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes('@') || !parsed) return;
    setSubmitted(true);
  }

  return (
    <>
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESC} />
        <link rel="canonical" href={canonical('/tools/gaeb-konverter/')} />
        <script type="application/ld+json">
          {JSON.stringify(softwareApplicationSchema({
            name: 'GAEB-Konverter',
            description: DESC,
            path: '/tools/gaeb-konverter/',
            featureList: ['GAEB DA XML 3.x (X81-X89)', 'GAEB ASCII (D81-D84)', 'Excel + CSV Export', 'Position-Suche', 'Format-Auto-Erkennung'],
          }))}
        </script>
      </Helmet>

      {/* HERO */}
      <section className="section-tight bg-gradient-to-br from-gray-50 to-white">
        <div className="container-page">
          <div className="text-center max-w-3xl mx-auto">
            <p className="text-xs uppercase tracking-[0.18em] text-primary-700 font-bold mb-3">
              GAEB-Konverter
            </p>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 mb-5 leading-tight">
              GAEB-Datei in Sekunden öffnen.
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Drag & Drop. Sofortige Vorschau aller Positionen. Excel- und CSV-Export.
              Komplett im Browser — Ihre Datei verlässt Ihren Computer nicht.
            </p>
            <div className="mt-7 inline-flex items-center gap-4 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-primary-600" /> 100 % lokal
              </span>
              <span className="text-gray-300" aria-hidden>·</span>
              <span className="inline-flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5 text-primary-600" /> X81–X89 · D81–D84 · P83/P84 · ÖNorm
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* DROP ZONE / RESULT */}
      <section className="section-tight">
        <div className="container-page">
          {!parsed && (
            <label
              htmlFor="gaeb-file"
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={cn(
                'relative block max-w-3xl mx-auto cursor-pointer rounded-3xl border-2 border-dashed transition-all',
                dragOver
                  ? 'border-primary-500 bg-primary-50/60 scale-[1.005]'
                  : 'border-gray-300 bg-gray-50 hover:border-primary-400 hover:bg-primary-50/30',
              )}
            >
              <input
                ref={fileRef}
                id="gaeb-file"
                type="file"
                accept={ACCEPTED_EXTENSIONS.join(',')}
                onChange={onInputChange}
                className="sr-only"
              />
              <div className="px-8 py-16 text-center">
                <div className={cn(
                  'w-16 h-16 rounded-2xl bg-white shadow-sm border flex items-center justify-center mx-auto mb-5 transition-colors',
                  dragOver ? 'border-primary-300' : 'border-gray-100',
                )}>
                  <Upload className="w-8 h-8 text-primary-500" />
                </div>
                <p className="text-lg font-semibold text-gray-900 mb-2">
                  GAEB-Datei hierhin ziehen — oder klicken
                </p>
                <p className="text-sm text-gray-500">
                  Akzeptiert: {ACCEPTED_EXTENSIONS.join(', ')}
                </p>
                <p className="inline-flex items-center gap-1.5 text-xs text-gray-400 mt-5">
                  <Shield className="w-3.5 h-3.5" /> Datei verlässt Ihren Browser nicht
                </p>
              </div>
            </label>
          )}

          {error && (
            <div className="card max-w-3xl mx-auto border-red-200 bg-red-50">
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-red-900 mb-1">Datei nicht akzeptiert</p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
                <button type="button" onClick={reset} className="btn btn-sm btn-outline">
                  Neu
                </button>
              </div>
            </div>
          )}

          {parsed && (
            <div className="max-w-5xl mx-auto space-y-5">
              {/* File info card */}
              <div className="card">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h2 className="font-bold text-gray-900 truncate">{parsed.filename}</h2>
                      <span className="badge badge-success">Geladen</span>
                    </div>
                    <p className="text-xs text-gray-600">{parsed.formatLabel}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {(parsed.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button type="button" onClick={reset} className="btn btn-sm btn-ghost" aria-label="Andere Datei">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-gray-100">
                  <Metric label="Projekt" value={parsed.projectName ?? '—'} />
                  <Metric label="Positionen" value={parsed.positionCount.toString()} />
                  <Metric
                    label="Vorab-Schätzung"
                    value={parsed.estimatedValue ? parsed.estimatedValue.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }) : '—'}
                  />
                </div>

                {parsed.bidder && (
                  <p className="text-xs text-gray-500 mt-3">
                    Bieter laut Datei: <span className="font-medium text-gray-700">{parsed.bidder}</span>
                  </p>
                )}

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 mt-6 pt-5 border-t border-gray-100">
                  <button type="button" onClick={exportExcel} disabled={exportingExcel || parsed.positionCount === 0} className="btn btn-success btn-sm">
                    <FileSpreadsheet className="w-4 h-4" />
                    {exportingExcel ? 'Excel-Datei wird erstellt …' : 'Excel exportieren (.xlsx)'}
                  </button>
                  <button type="button" onClick={exportCsv} disabled={parsed.positionCount === 0} className="btn btn-outline btn-sm">
                    <Download className="w-4 h-4" /> CSV
                  </button>
                </div>
              </div>

              {/* Position table with search */}
              {parsed.positions.length > 0 ? (() => {
                const q = searchQuery.trim().toLowerCase();
                const filtered = q
                  ? parsed.positions.filter((p) =>
                      p.pos.toLowerCase().includes(q) || p.text.toLowerCase().includes(q),
                    )
                  : parsed.positions;
                const visible = filtered.slice(0, 200);
                return (
                  <div className="card overflow-x-auto">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                      <p className="text-xs uppercase tracking-wider font-bold text-gray-500">
                        Positionen-Vorschau · {q ? `${filtered.length} von ${parsed.positions.length}` : `${parsed.positions.length}`} Einträge
                      </p>
                      <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="search"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Pos. oder Text suchen…"
                          className="input pl-9 text-sm"
                        />
                      </div>
                    </div>
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="border-b-2 border-gray-200">
                          <th className="text-left px-2 py-2 font-bold text-gray-500 uppercase tracking-wider w-24">Pos.</th>
                          <th className="text-left px-2 py-2 font-bold text-gray-500 uppercase tracking-wider min-w-[280px]">Beschreibung</th>
                          <th className="text-center px-2 py-2 font-bold text-gray-500 uppercase tracking-wider w-12">Einh.</th>
                          <th className="text-right px-2 py-2 font-bold text-gray-500 uppercase tracking-wider w-20">Menge</th>
                          <th className="text-right px-2 py-2 font-bold text-gray-500 uppercase tracking-wider w-20">EP €</th>
                          <th className="text-right px-2 py-2 font-bold text-gray-500 uppercase tracking-wider w-24">GP €</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visible.map((p, i) => (
                          <tr key={i} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                            <td className="px-2 py-2 font-mono text-gray-500">{p.pos}</td>
                            <td className="px-2 py-2 text-gray-700">{p.text}</td>
                            <td className="px-2 py-2 text-center text-gray-500">{p.einheit}</td>
                            <td className="px-2 py-2 text-right tabular-nums">{p.menge != null ? fmt(p.menge) : '—'}</td>
                            <td className="px-2 py-2 text-right tabular-nums text-gray-700">{p.ep != null ? fmt(p.ep) : '—'}</td>
                            <td className="px-2 py-2 text-right tabular-nums font-semibold text-primary-700">{p.gp != null ? fmt(p.gp) : '—'}</td>
                          </tr>
                        ))}
                        {filtered.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-2 py-6 text-center text-sm text-gray-500">
                              Keine Positionen mit „{searchQuery}" gefunden.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                    {filtered.length > 200 && (
                      <p className="text-xs text-gray-400 text-center mt-4">
                        Vorschau zeigt erste 200 von {filtered.length} gefilterten Positionen — Excel-Export enthält alle.
                      </p>
                    )}
                  </div>
                );
              })() : (
                <div className="card text-center text-sm text-gray-500">
                  Keine Positionen erkannt. Möglich bei verschlüsselten oder beschädigten Dateien — bei
                  Bedarf nutzen Sie unten die Premium-Auswertung.
                </div>
              )}

              {/* Premium email capture */}
              <div className="card border-2 border-primary-100">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-primary-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      Premium-Auswertung kostenlos per Mail
                    </h3>
                    <p className="text-sm text-gray-600 mb-5">
                      Vollständige PDF-Druckansicht + Excel-Export aller Positionen +
                      KI-Klassifizierung nach Gewerk und Hersteller. Kostenlos, einmalig.
                      Bearbeitung in 1–2 Werktagen.
                    </p>
                    {submitted ? (
                      <div className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 text-emerald-700 text-sm">
                        <CheckCircle2 className="w-5 h-5" />
                        Vielen Dank — wir senden Ihnen die Auswertung an {email} innerhalb von 1–2 Werktagen.
                      </div>
                    ) : (
                      <form onSubmit={submitEmail} className="flex flex-col sm:flex-row gap-3">
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="ihre@firma.de"
                          className="input flex-1"
                        />
                        <button type="submit" className="btn btn-success">
                          <Download className="w-4 h-4" /> Anfordern
                        </button>
                      </form>
                    )}
                    <p className="text-xs text-gray-400 mt-3">
                      DSGVO-konform. Verschlüsselte Übertragung. Datei wird nach 30 Tagen automatisch gelöscht. Kein Newsletter.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section className="section bg-gray-50">
        <div className="container-page">
          <SectionHeader eyebrow="Häufige Fragen" title="Zum GAEB-Konverter." />
          <div className="max-w-3xl mx-auto space-y-3">
            {FAQ.map((q) => (
              <FaqItem key={q.q} question={q.q} answer={q.a} />
            ))}
          </div>
        </div>
      </section>

      <AndereTools exclude="/tools/gaeb-konverter/" />

      {/* CROSS-CTA */}
      <section className="section">
        <div className="container-page">
          <div className="card-flat text-center max-w-2xl mx-auto">
            <p className="text-xs uppercase tracking-[0.18em] font-bold text-primary-700 mb-3">
              Sie brauchen mehr als nur Konvertierung?
            </p>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Wir kalkulieren Ihre komplette Submission.
            </h2>
            <p className="text-gray-600 mb-6">
              Ab 200 € pro LV — Festpreis. EFB-Formblätter inklusive. Auch über Nacht.
            </p>
            <Link to="/konditionen/" className="btn btn-success">
              Konditionen ansehen <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider font-bold text-gray-500 mb-1">{label}</p>
      <p className="font-semibold text-gray-900 text-sm break-words">{value}</p>
    </div>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────────
function cn(...cs: (string | false | null | undefined)[]): string {
  return cs.filter(Boolean).join(' ');
}

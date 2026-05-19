import { useMemo, useRef, useState } from 'react';
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
  FileCheck2,
  Trash2,
  Search,
  Loader2,
  Sparkles,
  Settings2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { canonical } from '@/lib/seo';
import { softwareApplicationSchema } from '@/lib/toolSchema';
import AndereTools from '@/components/sections/AndereTools';
import SectionHeader from '@/components/ui/SectionHeader';
import FaqItem from '@/components/ui/FaqItem';
import {
  ACCEPTED_EXTENSIONS,
  parseGaebFile,
  exportExcel,
  exportCsv,
  exportJson,
  exportPdf,
  exportGaebXml,
  exportGaeb90,
  DEFAULT_COLUMNS,
} from '@/lib/gaeb';
import { submitLead, LEAD_FALLBACK_EMAIL } from '@/lib/lead';
import type {
  ParsedGaeb,
  SourceFormatHint,
  TextMode,
  Columns,
  PdfOptions,
} from '@/lib/gaeb';

const TITLE = 'GAEB-Konverter (kostenlos, im Browser) | KALKU';
const DESC =
  'GAEB-Datei in Excel, PDF oder GAEB XML wandeln. Unterstützt X81–X89, D81–D86, P81–P94 und ÖNorm A2063. Komplett im Browser — Ihre Datei verlässt Ihren Computer nicht. Kostenlos, ohne Anmeldung.';

type TargetFormat =
  | 'xlsx'
  | 'csv'
  | 'json'
  | 'pdf'
  | 'gaeb-xml-3.2'
  | 'gaeb-90';

const SOURCE_OPTIONS: { value: SourceFormatHint; label: string }[] = [
  { value: 'auto', label: 'Automatisch erkennen' },
  { value: 'gaeb-90', label: 'GAEB 90 (D81–D86)' },
  { value: 'gaeb-2000', label: 'GAEB 2000 (P81–P94)' },
  { value: 'gaeb-xml', label: 'GAEB DA XML 3.x (X81–X89)' },
  { value: 'onorm-a2063', label: 'ÖNorm A2063' },
  { value: 'd83', label: 'D83 — Angebotsaufforderung' },
];

const TARGET_OPTIONS: { value: TargetFormat; label: string }[] = [
  { value: 'xlsx', label: 'Excel (XLSX)' },
  { value: 'csv', label: 'CSV (semikolongetrennt)' },
  { value: 'pdf', label: 'PDF-Druckansicht' },
  { value: 'json', label: 'JSON (für Entwickler)' },
  { value: 'gaeb-xml-3.2', label: 'GAEB DA XML 3.2 (.x83)' },
  { value: 'gaeb-90', label: 'GAEB 90 ASCII (.d83)' },
];

const LV_ART: { value: TextMode; label: string }[] = [
  { value: 'lang', label: 'Langtext-LV ohne Kurztexte' },
  { value: 'kurz', label: 'Kurztext-LV ohne Langtexte' },
  { value: 'both', label: 'LV mit Kurz- und Langtexten' },
];

const FAQ = [
  {
    q: 'Was ist GAEB?',
    a: 'Der „Gemeinsame Ausschuss Elektronik im Bauwesen" (GAEB) hat das Standard-Datenformat für die elektronische Übergabe von Leistungsverzeichnissen zwischen Auftraggeber und Bieter definiert. Versionen: GAEB 90 (ASCII), GAEB 2000 (P-Format), GAEB DA XML 3.1–3.3.',
  },
  {
    q: 'Welche Versionen werden unterstützt?',
    a: 'GAEB DA XML 3.1, 3.2, 3.3 (X81, X83, X84, X85, X86, X89, X93, X94), GAEB ASCII 90 (D81, D83, D84, D85, D86), GAEB 2000 Pseudo-Format (P81–P94) sowie ÖNorm A2063. Die Vorschau zeigt Projektdaten, alle Positionen mit Kurz- und Langtext, Mengen, Einheit und ggf. Preise.',
  },
  {
    q: 'Welche Zielformate kann ich exportieren?',
    a: 'Excel (.xlsx, mit Spaltenwahl), CSV (semikolongetrennt für Excel-Import), PDF-Druckansicht (mit Deckblatt, Mengenzeile, Unterschriftenfeld), JSON, GAEB DA XML 3.2 (.x83) und GAEB 90 ASCII (.d83). Damit konvertieren Sie zwischen allen gängigen Submission-Formaten.',
  },
  {
    q: 'Werden meine Daten auf einen Server hochgeladen?',
    a: 'Nein. Die Konvertierung — auch der PDF- und Excel-Export — läuft vollständig in Ihrem Browser. Ihre Datei verlässt Ihren Computer nicht. Auch die optionale Premium-Auswertung per E-Mail erfolgt ohne automatischen Upload: wir bereiten eine vorausgefüllte E-Mail vor, die Sie selbst aus Ihrem E-Mail-Programm absenden — und die GAEB-Datei hängen Sie nur dann an, wenn Sie das aktiv möchten.',
  },
  {
    q: 'Kurztext vs. Langtext — was ist der Unterschied?',
    a: 'Der Kurztext ist die einzeilige Stichwort-Beschreibung (z. B. „Mauerwerk 24 cm KS"), der Langtext die ausformulierte technische Spezifikation mit allen Anforderungen. Beim Excel- und PDF-Export können Sie wählen, welcher Text ausgegeben werden soll — oder beide untereinander.',
  },
  {
    q: 'Funktioniert das auch offline?',
    a: 'Sobald die Seite einmal im Browser-Cache liegt, funktioniert die Konvertierung offline. Nur die optionale Premium-Auswertung per E-Mail benötigt Internetzugang.',
  },
];

export default function GaebKonverter() {
  const [parsed, setParsed] = useState<ParsedGaeb | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [converting, setConverting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Conversion options
  const [sourceHint, setSourceHint] = useState<SourceFormatHint>('auto');
  const [targetFormat, setTargetFormat] = useState<TargetFormat>('xlsx');
  const [textMode, setTextMode] = useState<TextMode>('both');
  const [columns, setColumns] = useState<Columns>(DEFAULT_COLUMNS);
  const [withCover, setWithCover] = useState(true);
  const [withToc, setWithToc] = useState(false);
  const [withSummary, setWithSummary] = useState(true);
  const [withPrices, setWithPrices] = useState(true);
  const [signatureOmit, setSignatureOmit] = useState(false);
  const [mengeBelow, setMengeBelow] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [lastExport, setLastExport] = useState<TargetFormat | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setParsed(null);
    setError(null);
    setEmail('');
    setSubmitted(false);
    setSearchQuery('');
    setLastExport(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleFile(file: File) {
    setError(null);
    setSubmitted(false);
    setLastExport(null);
    setParsing(true);

    const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setError(`Format ${ext} wird nicht direkt unterstützt. Akzeptiert: ${ACCEPTED_EXTENSIONS.join(', ')}. Tipp: Wenn Ihre Datei ein GAEB-Format ist, benennen Sie sie z. B. auf .x83 um.`);
      setParsing(false);
      return;
    }

    try {
      const result = await parseGaebFile(file, sourceHint);
      if (result.positionCount === 0 && result.format === 'unknown') {
        setError('Die Datei konnte nicht als GAEB-Datei interpretiert werden. Falls Sie das Format kennen, wählen Sie es bitte oben manuell aus.');
      }
      setParsed(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler beim Lesen der Datei.');
    } finally {
      setParsing(false);
    }
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

  async function loadDemo() {
    try {
      setParsing(true);
      setError(null);
      const res = await fetch('/demo/sample-x83.xml');
      if (!res.ok) throw new Error('Beispieldatei konnte nicht geladen werden.');
      const text = await res.text();
      const blob = new Blob([text], { type: 'application/xml' });
      const file = new File([blob], 'beispiel-projekt.x83', { type: 'application/xml' });
      await handleFile(file);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Beispieldatei konnte nicht geladen werden.');
      setParsing(false);
    }
  }

  async function convert() {
    if (!parsed) return;
    setConverting(true);
    setLastExport(null);
    try {
      const pdfOpts: PdfOptions = {
        textMode,
        withPrices,
        withCover,
        withToc,
        withSummary,
        signatureOmit,
        mengeBelow,
      };
      switch (targetFormat) {
        case 'xlsx':
          await exportExcel(parsed, { textMode, columns });
          break;
        case 'csv':
          exportCsv(parsed, { textMode, columns });
          break;
        case 'json':
          exportJson(parsed);
          break;
        case 'pdf':
          await exportPdf(parsed, pdfOpts);
          break;
        case 'gaeb-xml-3.2':
          exportGaebXml(parsed);
          break;
        case 'gaeb-90':
          exportGaeb90(parsed);
          break;
      }
      setLastExport(targetFormat);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export fehlgeschlagen.');
    } finally {
      setConverting(false);
    }
  }

  function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes('@') || !parsed) return;
    const sumLabel = parsed.estimatedValue
      ? `~${parsed.estimatedValue.toLocaleString('de-DE', { style: 'currency', currency: parsed.currency || 'EUR' })}`
      : 'n/v';
    submitLead({
      type: 'gaeb-premium',
      email,
      subject: `GAEB Premium-Auswertung — ${parsed.filename}`,
      bodyLines: [
        `Anfrage Premium-Auswertung (kostenlos)`,
        ``,
        `Antwort an: ${email}`,
        `Datei: ${parsed.filename} (${parsed.formatLabel})`,
        `Positionen: ${parsed.positionCount}`,
        `Schätzwert: ${sumLabel}`,
        parsed.projectName ? `Projekt: ${parsed.projectName}` : '',
        parsed.awardingAuthority ? `Vergabestelle: ${parsed.awardingAuthority}` : '',
        ``,
        `Bitte hängen Sie Ihre GAEB-Datei an diese E-Mail an, bevor Sie sie senden.`,
        `Die Datei bleibt lokal in Ihrem Browser — wir erhalten sie nur, wenn Sie sie selbst anhängen.`,
      ].filter(Boolean),
    });
    setSubmitted(true);
  }

  // Filtered preview
  const filtered = useMemo(() => {
    if (!parsed) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return parsed.positions;
    return parsed.positions.filter(
      (p) =>
        p.oz.toLowerCase().includes(q) ||
        p.kurztext.toLowerCase().includes(q) ||
        p.langtext.toLowerCase().includes(q),
    );
  }, [parsed, searchQuery]);

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
            featureList: [
              'GAEB DA XML 3.1/3.2/3.3 (X81-X89, X93, X94)',
              'GAEB 90 ASCII (D81-D86)',
              'GAEB 2000 Pseudo (P81-P94)',
              'ÖNorm A2063',
              'Export: Excel (XLSX), CSV, PDF, JSON, GAEB XML, GAEB 90',
              'Kurztext / Langtext Auswahl',
              'Spaltenwahl beim Excel-Export',
              'PDF mit Deckblatt + Unterschriftenfeld',
              'Volltext-Suche in Positionen',
              '100 % Browser-Verarbeitung, kein Datei-Upload',
            ],
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
              GAEB-Datei konvertieren.
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              GAEB 90, GAEB 2000 und GAEB DA XML in Excel, PDF oder ÖNorm wandeln —
              komplett im Browser. Ihre Datei verlässt Ihren Computer nicht.
            </p>
            <div className="mt-7 inline-flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-primary-600" /> 100 % lokal
              </span>
              <span className="text-gray-300" aria-hidden>·</span>
              <span className="inline-flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5 text-primary-600" />
                X81–X89 · D81–D86 · P81–P94 · ÖNorm
              </span>
              <span className="text-gray-300" aria-hidden>·</span>
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary-600" />
                6 Zielformate
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* DROP ZONE / RESULT */}
      <section className="section-tight">
        <div className="container-page">
          {!parsed && (
            <>
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
                    {parsing ? (
                      <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                    ) : (
                      <Upload className="w-8 h-8 text-primary-500" />
                    )}
                  </div>
                  <p className="text-lg font-semibold text-gray-900 mb-2">
                    {parsing ? 'Datei wird gelesen…' : 'Datei hier ablegen oder klicken zum Auswählen'}
                  </p>
                  <p className="text-sm text-gray-500">
                    Akzeptiert: {ACCEPTED_EXTENSIONS.slice(0, 10).join(', ')} … +{ACCEPTED_EXTENSIONS.length - 10} weitere
                  </p>
                  <p className="inline-flex items-center gap-1.5 text-xs text-gray-400 mt-5">
                    <Shield className="w-3.5 h-3.5" /> 100 % lokale Verarbeitung — Datei verlässt Ihren Browser nicht
                  </p>
                </div>
              </label>

              <p className="text-center text-sm text-gray-500 mt-4">
                Kein GAEB-File zur Hand?{' '}
                <button
                  type="button"
                  onClick={loadDemo}
                  className="font-semibold text-primary-700 hover:text-primary-800 underline underline-offset-2"
                >
                  Beispiel-LV laden (X83)
                </button>
              </p>
            </>
          )}

          {error && (
            <div className="card max-w-3xl mx-auto mt-6 border-red-200 bg-red-50">
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-red-900 mb-1">Datei konnte nicht gelesen werden</p>
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
                      <span className="badge badge-success">{parsed.positionCount} Positionen</span>
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
                    value={parsed.estimatedValue ? parsed.estimatedValue.toLocaleString('de-DE', { style: 'currency', currency: parsed.currency || 'EUR' }) : '—'}
                  />
                </div>

                {(parsed.awardingAuthority || parsed.bidder || parsed.date) && (
                  <div className="grid sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-50">
                    {parsed.awardingAuthority && (
                      <Metric label="Auftraggeber" value={parsed.awardingAuthority} />
                    )}
                    {parsed.bidder && <Metric label="Bieter" value={parsed.bidder} />}
                    {parsed.date && <Metric label="Datum" value={parsed.date} />}
                  </div>
                )}
              </div>

              {/* Conversion controls */}
              <div className="card">
                <div className="flex items-center gap-3 mb-5">
                  <Settings2 className="w-5 h-5 text-primary-600" />
                  <h3 className="font-bold text-gray-900">Konvertierung</h3>
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="label text-xs uppercase tracking-wider font-bold text-gray-500" htmlFor="src-fmt">
                      Quellformat
                    </label>
                    <select
                      id="src-fmt"
                      value={sourceHint}
                      onChange={(e) => setSourceHint(e.target.value as SourceFormatHint)}
                      className="input"
                    >
                      {SOURCE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1.5">
                      Erkannt: <span className="font-medium text-gray-700">{parsed.formatLabel}</span>
                    </p>
                  </div>

                  <div>
                    <label className="label text-xs uppercase tracking-wider font-bold text-gray-500" htmlFor="tgt-fmt">
                      Zielformat
                    </label>
                    <select
                      id="tgt-fmt"
                      value={targetFormat}
                      onChange={(e) => setTargetFormat(e.target.value as TargetFormat)}
                      className="input"
                    >
                      {TARGET_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* LV-Art: textmode */}
                {(targetFormat === 'xlsx' || targetFormat === 'csv' || targetFormat === 'pdf') && (
                  <div className="mt-5 pt-5 border-t border-gray-100">
                    <p className="text-xs uppercase tracking-wider font-bold text-gray-500 mb-3">
                      LV-Art
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {LV_ART.map((o) => (
                        <label
                          key={o.value}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors',
                            textMode === o.value
                              ? 'border-primary-500 bg-primary-50 text-primary-900'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300',
                          )}
                        >
                          <input
                            type="radio"
                            name="lv-art"
                            value={o.value}
                            checked={textMode === o.value}
                            onChange={() => setTextMode(o.value)}
                            className="sr-only"
                          />
                          <span className="w-3 h-3 rounded-full border-2 border-current flex items-center justify-center">
                            {textMode === o.value && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                          </span>
                          {o.label}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* PDF-specific options */}
                {targetFormat === 'pdf' && (
                  <div className="mt-5 pt-5 border-t border-gray-100 space-y-4">
                    <p className="text-xs uppercase tracking-wider font-bold text-gray-500">
                      Druckoptionen
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <PriceModeRadio active={withPrices} setActive={setWithPrices} value={false} label="Druck als Blankett (ohne Preise)" />
                      <PriceModeRadio active={withPrices} setActive={setWithPrices} value={true} label="Druck mit Preisen" />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2">
                      <CheckboxRow checked={withCover} onChange={setWithCover} label="Deckblatt ausgeben" />
                      <CheckboxRow checked={withToc} onChange={setWithToc} label="Inhaltsverzeichnis" />
                      <CheckboxRow checked={withSummary} onChange={setWithSummary} label="Summenzusammenstellung drucken" />
                      <CheckboxRow checked={mengeBelow} onChange={setMengeBelow} label="Mengenzeile unter der Position" />
                      <CheckboxRow checked={signatureOmit} onChange={setSignatureOmit} label="PDF-Unterschriften nicht ausgeben" />
                    </div>
                  </div>
                )}

                {/* Excel column picker (advanced) */}
                {(targetFormat === 'xlsx' || targetFormat === 'csv') && (
                  <div className="mt-5 pt-5 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setShowAdvanced((v) => !v)}
                      className="flex items-center gap-1.5 text-xs uppercase tracking-wider font-bold text-gray-500 hover:text-gray-700"
                    >
                      {showAdvanced ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      Spalten-Auswahl
                    </button>
                    {showAdvanced && (
                      <>
                        <p className="text-xs text-gray-500 mt-2 mb-3">
                          Kurztext/Langtext werden über die LV-Art oben gesteuert.
                        </p>
                      <div className="grid sm:grid-cols-3 gap-2 gap-y-2">
                        {(Object.keys(DEFAULT_COLUMNS) as (keyof Columns)[])
                          .filter((k) => k !== 'kurztext' && k !== 'langtext')
                          .map((key) => (
                          <CheckboxRow
                            key={key}
                            checked={columns[key]}
                            onChange={(v) => setColumns((c) => ({ ...c, [key]: v }))}
                            label={
                              key === 'oz' ? 'OZ (Ordnungszahl)'
                              : key === 'einheit' ? 'Einheit (ME)'
                              : key === 'menge' ? 'Menge'
                              : key === 'ep' ? 'EP (Einheitspreis)'
                              : 'GP (Gesamtpreis)'
                            }
                          />
                        ))}
                      </div>
                      </>
                    )}
                  </div>
                )}

                {/* Convert button */}
                <div className="mt-6 pt-5 border-t border-gray-100 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={convert}
                    disabled={converting || parsed.positionCount === 0}
                    className="btn btn-success"
                  >
                    {converting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Wird erzeugt …
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Konvertieren
                      </>
                    )}
                  </button>
                  {lastExport && !converting && (
                    <span className="inline-flex items-center gap-2 text-sm text-emerald-700">
                      <CheckCircle2 className="w-4 h-4" />
                      Konvertierung erfolgreich! Datei wurde heruntergeladen.
                    </span>
                  )}
                  <span className="text-xs text-gray-400 ml-auto">
                    Tipp: Spalten-Auswahl oben für individuellen Excel-Export
                  </span>
                </div>
              </div>

              {/* Position table with search */}
              {parsed.positions.length > 0 && (
                <div className="card overflow-x-auto">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <p className="text-xs uppercase tracking-wider font-bold text-gray-500">
                      Positionen-Vorschau · {searchQuery ? `${filtered.length} von ${parsed.positions.length}` : `${parsed.positions.length}`} Einträge
                      {parsed.hasLongtext && <span className="ml-2 badge badge-primary">mit Langtext</span>}
                    </p>
                    <div className="relative w-full sm:w-72">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="OZ, Kurz- oder Langtext suchen…"
                        className="input pl-9 text-sm"
                      />
                    </div>
                  </div>
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left px-2 py-2 font-bold text-gray-500 uppercase tracking-wider w-24">OZ</th>
                        <th className="text-left px-2 py-2 font-bold text-gray-500 uppercase tracking-wider min-w-[280px]">Beschreibung</th>
                        <th className="text-center px-2 py-2 font-bold text-gray-500 uppercase tracking-wider w-12">Einh.</th>
                        <th className="text-right px-2 py-2 font-bold text-gray-500 uppercase tracking-wider w-20">Menge</th>
                        <th className="text-right px-2 py-2 font-bold text-gray-500 uppercase tracking-wider w-20">EP €</th>
                        <th className="text-right px-2 py-2 font-bold text-gray-500 uppercase tracking-wider w-24">GP €</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.slice(0, 200).map((p, i) => (
                        <tr key={i} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors align-top">
                          <td className="px-2 py-2 font-mono text-gray-500 whitespace-nowrap">{p.oz}</td>
                          <td className="px-2 py-2 text-gray-700">
                            <div className="font-medium">{p.kurztext || '—'}</div>
                            {p.langtext && p.langtext !== p.kurztext && (
                              <div className="text-[11px] text-gray-500 mt-1 line-clamp-2">{p.langtext}</div>
                            )}
                          </td>
                          <td className="px-2 py-2 text-center text-gray-500 whitespace-nowrap">{p.einheit}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{p.menge != null ? p.menge.toLocaleString('de-DE', { maximumFractionDigits: 2 }) : (p.qtyTBD ? 'X' : '—')}</td>
                          <td className="px-2 py-2 text-right tabular-nums text-gray-700">{p.ep != null ? p.ep.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}</td>
                          <td className="px-2 py-2 text-right tabular-nums font-semibold text-primary-700">{p.gp != null ? p.gp.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}</td>
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
                      Vorschau zeigt erste 200 von {filtered.length} gefilterten Positionen — Export enthält alle.
                    </p>
                  )}
                </div>
              )}

              {parsed.positions.length === 0 && (
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
                      <div className="inline-flex items-start gap-2 px-4 py-3 rounded-xl bg-emerald-50 text-emerald-800 text-sm text-left">
                        <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <span>
                          Ihr E-Mail-Programm sollte sich mit einer vorausgefüllten Nachricht
                          geöffnet haben. <strong>Bitte hängen Sie Ihre GAEB-Datei an</strong> und
                          senden Sie die E-Mail ab — wir antworten innerhalb von 1–2 Werktagen mit
                          der Auswertung.<br />
                          Falls sich nichts geöffnet hat, schreiben Sie bitte an{' '}
                          <a
                            href={`mailto:${LEAD_FALLBACK_EMAIL}`}
                            className="font-semibold underline"
                          >
                            {LEAD_FALLBACK_EMAIL}
                          </a>
                          .
                        </span>
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
                      DSGVO-konform. Sie senden die Datei selbst als E-Mail-Anhang — sie wird nicht
                      automatisch hochgeladen. Wir löschen Anhänge nach Abschluss der Auswertung. Kein Newsletter.
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

function CheckboxRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
      />
      {label}
    </label>
  );
}

function PriceModeRadio({
  active,
  setActive,
  value,
  label,
}: {
  active: boolean;
  setActive: (v: boolean) => void;
  value: boolean;
  label: string;
}) {
  const checked = active === value;
  return (
    <label
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors',
        checked
          ? 'border-primary-500 bg-primary-50 text-primary-900'
          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300',
      )}
    >
      <input
        type="radio"
        name="price-mode"
        checked={checked}
        onChange={() => setActive(value)}
        className="sr-only"
      />
      <span className="w-3 h-3 rounded-full border-2 border-current flex items-center justify-center">
        {checked && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      </span>
      {label}
    </label>
  );
}

function cn(...cs: (string | false | null | undefined)[]): string {
  return cs.filter(Boolean).join(' ');
}

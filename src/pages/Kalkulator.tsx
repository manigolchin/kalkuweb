import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  Plus,
  Download,
  Mail,
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  Printer,
  FileSpreadsheet,
  Sparkles,
  Shield,
  Clipboard,
  Share2,
  Users,
} from 'lucide-react';
import { canonical } from '@/lib/seo';
import { softwareApplicationSchema } from '@/lib/toolSchema';
import AndereTools from '@/components/sections/AndereTools';
import type { Row, Aufschlaege } from '@/lib/kalkulator/types';
import { DEFAULT_AUFSCHLAEGE } from '@/lib/kalkulator/types';
import {
  computeEp,
  computeTotals,
  fmt,
  fmtCurrency,
  parseGermanNumber,
} from '@/lib/kalkulator/calc';
import { PRESETS, type Preset } from '@/lib/kalkulator/presets';
import { exportToExcel } from '@/lib/kalkulator/excelExport';
import { buildShareUrl, readHashSnapshot } from '@/lib/kalkulator/share';
import AufschlagPanel from '@/components/kalkulator/AufschlagPanel';
import ShareDialog from '@/components/kalkulator/ShareDialog';
import PositionRow from '@/components/kalkulator/PositionRow';

const TITLE = 'Position-Kalkulator (EP/GP berechnen) | KALKU';
const DESC =
  'Online-Kalkulator für Bauunternehmer: Lohn × Zeit + Material + Zuschlag = EP. Mit VOB-konformen Aufschlägen (BGK/AGK/W&G/MwSt), Subunternehmer-Modus, Plausibilitäts-Ampel, Excel-Export mit echten Formeln. Kostenlos, im Browser.';

const STORAGE_KEY = 'kalku.kalkulator.rows.v2';
const STORAGE_KEY_A = 'kalku.kalkulator.aufschlaege.v2';

function newRow(seed?: Partial<Row>): Row {
  return {
    id: Math.random().toString(36).slice(2, 9),
    pos: '',
    text: '',
    einheit: 'St',
    lohn: 48,
    zeit: 1,
    material: 0,
    zuschlag: 14,
    menge: 1,
    nu: false,
    bemerkung: '',
    ...seed,
  };
}

function presetToRows(p: Preset): Row[] {
  return p.rows.map((r) => newRow(r as Partial<Row>));
}

export default function Kalkulator() {
  // ----- Initial state: Hash-Snapshot > localStorage > Default-Preset -----
  const initial = useMemo(() => {
    const fromHash = typeof window !== 'undefined' ? readHashSnapshot() : undefined;
    if (fromHash) return { rows: fromHash.rows, a: fromHash.a, fromShare: true };
    if (typeof window === 'undefined') {
      return { rows: presetToRows(PRESETS[0]), a: DEFAULT_AUFSCHLAEGE, fromShare: false };
    }
    try {
      const savedRows = localStorage.getItem(STORAGE_KEY);
      const savedA = localStorage.getItem(STORAGE_KEY_A);
      const rows = savedRows ? (JSON.parse(savedRows) as Row[]) : null;
      const a = savedA ? (JSON.parse(savedA) as Aufschlaege) : null;
      return {
        rows: Array.isArray(rows) && rows.length > 0 ? rows.map((r) => ({ ...newRow(), ...r })) : presetToRows(PRESETS[0]),
        a: a ?? DEFAULT_AUFSCHLAEGE,
        fromShare: false,
      };
    } catch {
      return { rows: presetToRows(PRESETS[0]), a: DEFAULT_AUFSCHLAEGE, fromShare: false };
    }
  }, []);

  const [rows, setRows] = useState<Row[]>(initial.rows);
  const [aufschlaege, setAufschlaege] = useState<Aufschlaege>(initial.a);
  const [showAufschlaege, setShowAufschlaege] = useState(false);
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [excelError, setExcelError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [sharedBanner, setSharedBanner] = useState(initial.fromShare);
  const formId = useId();

  // Wenn vom Share-Link geladen: Hash entfernen, damit beim Edit-/Speichern keine Verwirrung entsteht
  useEffect(() => {
    if (initial.fromShare && typeof window !== 'undefined' && window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, [initial.fromShare]);

  // Auto-save (debounced)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
        localStorage.setItem(STORAGE_KEY_A, JSON.stringify(aufschlaege));
        setSavedAt(new Date());
      } catch {
        /* quota */
      }
    }, 600);
    return () => clearTimeout(t);
  }, [rows, aufschlaege]);

  const totals = useMemo(() => computeTotals(rows, aufschlaege), [rows, aufschlaege]);
  const hasNu = useMemo(() => rows.some((r) => r.nu), [rows]);

  const updateRow = useCallback((id: string, patch: Partial<Row>) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const addRow = useCallback(() => {
    const last = rows[rows.length - 1];
    setRows((rs) => [
      ...rs,
      newRow({
        einheit: last?.einheit ?? 'St',
        lohn: last?.lohn ?? 48,
        zuschlag: last?.zuschlag ?? 14,
      }),
    ]);
  }, [rows]);

  const deleteRow = useCallback((id: string) => {
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.id !== id) : rs));
  }, []);

  function loadPreset(p: Preset) {
    if (rows.length > 0 && rows.some((r) => r.text || r.material > 0)) {
      const ok = window.confirm(`Aktuelle Eingaben gehen verloren — Vorlage „${p.label}" laden?`);
      if (!ok) return;
    }
    setRows(presetToRows(p));
  }

  function reset() {
    if (!window.confirm('Alle Positionen löschen — sicher?')) return;
    setRows([newRow()]);
    setSharedBanner(false);
  }

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        alert('Zwischenablage ist leer.');
        return;
      }
      const sep = text.includes('\t') ? '\t' : ';';
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      const parsed: Row[] = lines.map((line, i) => {
        const cells = line.split(sep).map((c) => c.trim().replace(/^"|"$/g, ''));
        return newRow({
          pos: cells[0] || `${i + 1}`,
          text: cells[1] || '',
          einheit: cells[2] || 'St',
          lohn: parseGermanNumber(cells[3]) || rows[0]?.lohn || 48,
          zeit: parseGermanNumber(cells[4]) || 1,
          material: parseGermanNumber(cells[5]) || 0,
          zuschlag: parseGermanNumber(cells[6]) || rows[0]?.zuschlag || 14,
          menge: parseGermanNumber(cells[7]) || 1,
        });
      });
      const firstLohn = parsed[0]?.lohn;
      const headerLikely = firstLohn === 48 && (parsed[0]?.text.toLowerCase().includes('beschr') || parsed[0]?.text.toLowerCase().includes('lohn'));
      const finalRows = headerLikely ? parsed.slice(1) : parsed;
      if (finalRows.length === 0) {
        alert('Keine Zeilen erkannt. Erwartet Tab- oder Semikolon-getrennte Daten.');
        return;
      }
      const ok = window.confirm(
        `${finalRows.length} Zeile(n) erkannt. Aktuelle Eingaben ersetzen?\n(Tipp: kopiere die Daten direkt aus Excel oder LibreOffice Calc.)`,
      );
      if (ok) setRows(finalRows);
    } catch {
      alert('Zwischenablage nicht zugänglich. Erlaube Clipboard-Zugriff in deinem Browser, oder importiere via CSV.');
    }
  }

  function exportCsv() {
    const header = [
      'Pos.', 'Kurztext', 'Langtext', 'Menge', 'Einheit',
      'EP Material', 'EP Lohn', 'EP gesamt', 'GP', 'Min/Einheit', 'NU', 'Bemerkung',
    ];
    const lines = [header.join(';')];
    rows.forEach((r, i) => {
      const ep = computeEp(r, aufschlaege);
      const gp = ep * r.menge;
      const nuFactor = r.nu ? 1 + aufschlaege.nuZuschlag / 100 : 1;
      const materialEp = r.material * (1 + r.zuschlag / 100) * nuFactor;
      const lohnEp = r.lohn * r.zeit * (1 + r.zuschlag / 100) * nuFactor;
      lines.push(
        [
          r.pos || `${i + 1}`,
          `"${r.text.replace(/"/g, '""').slice(0, 32)}"`,
          `"${r.text.replace(/"/g, '""')}"`,
          fmt(r.menge),
          r.einheit,
          fmt(materialEp),
          fmt(lohnEp),
          fmt(ep),
          fmt(gp),
          fmt(r.zeit * 60),
          r.nu ? 'NU' : 'EL',
          `"${(r.bemerkung || '').replace(/"/g, '""')}"`,
        ].join(';'),
      );
    });
    lines.push('');
    lines.push(['', 'Netto-Bauleistung', '', '', '', '', '', '', fmt(totals.netto), '', '', ''].join(';'));
    lines.push(['', `BGK (${fmt(aufschlaege.bgk)} %)`, '', '', '', '', '', '', fmt(totals.bgk), '', '', ''].join(';'));
    lines.push(['', `AGK (${fmt(aufschlaege.agk)} %)`, '', '', '', '', '', '', fmt(totals.agk), '', '', ''].join(';'));
    lines.push(['', `W&G (${fmt(aufschlaege.wug)} %)`, '', '', '', '', '', '', fmt(totals.wug), '', '', ''].join(';'));
    lines.push(['', 'Netto-Auftrag', '', '', '', '', '', '', fmt(totals.nettoMitZuschlaegen), '', '', ''].join(';'));
    lines.push(['', `MwSt (${fmt(aufschlaege.mwst)} %)`, '', '', '', '', '', '', fmt(totals.mwst), '', '', ''].join(';'));
    lines.push(['', 'Brutto', '', '', '', '', '', '', fmt(totals.brutto), '', '', ''].join(';'));
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kalku-kalkulation-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleExcel() {
    setExportingExcel(true);
    setExcelError(null);
    try {
      await exportToExcel(rows, aufschlaege);
    } catch (err) {
      console.error('Excel export failed', err);
      setExcelError(
        err instanceof Error ? err.message : 'Excel-Export fehlgeschlagen. Bitte CSV als Alternative.',
      );
    } finally {
      setExportingExcel(false);
    }
  }

  function openShare() {
    const url = buildShareUrl(rows, aufschlaege);
    setShareUrl(url);
    setShareOpen(true);
  }

  function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes('@')) return;
    setEmailSent(true);
  }

  return (
    <>
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESC} />
        <link rel="canonical" href={canonical('/tools/kalkulator/')} />
        <script type="application/ld+json">
          {JSON.stringify(softwareApplicationSchema({
            name: 'Position-Kalkulator',
            description: DESC,
            path: '/tools/kalkulator/',
            featureList: [
              'EP/GP-Berechnung',
              'VOB-konforme Aufschläge (BGK, AGK, W&G, MwSt)',
              'Subunternehmer-Modus mit separatem NU-Zuschlag',
              'Plausibilitäts-Ampel je Position (Marktpreis-Abgleich)',
              'Speichern & Teilen via Link',
              'Trade-Vorlagen GaLaBau, Tiefbau, Elektro, Hochbau, Trockenbau, HLS',
              'Excel-Export mit echten Formeln, Header-Branding, Druckbereich',
              'CSV + Druck (PDF) Export',
              'Auto-Save in Browser',
              'Excel-Paste aus Zwischenablage',
            ],
          }))}
        </script>
      </Helmet>

      {/* HERO */}
      <section className="section-tight bg-gradient-to-br from-gray-50 to-white print:hidden">
        <div className="container-page">
          <div className="text-center max-w-3xl mx-auto">
            <p className="text-xs uppercase tracking-[0.18em] text-primary-700 font-bold mb-3">
              Position-Kalkulator
            </p>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 mb-5 leading-tight">
              EP und GP in Sekunden berechnen.
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Lohn × Zeit + Material + Zuschlag = Einheitspreis. Mit VOB-konformen Aufschlägen,
              Subunternehmer-Modus, Plausibilitäts-Ampel und Excel-Export mit echten Formeln.
              Komplett im Browser — Ihre Daten verlassen Ihren PC nicht.
            </p>
            <div className="mt-7 inline-flex flex-wrap items-center justify-center gap-4 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-primary-600" /> Datenschutz: 100 % lokal
              </span>
              <span className="text-gray-300" aria-hidden>·</span>
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary-600" /> Auto-Save aktiv
              </span>
              <span className="text-gray-300" aria-hidden>·</span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-primary-600" /> NU-Modus
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* SHARED-BANNER */}
      {sharedBanner && (
        <section className="-mt-2 print:hidden">
          <div className="container-page">
            <div className="max-w-5xl mx-auto px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Kalkulation aus geteiltem Link geladen. Ihre Änderungen werden lokal gespeichert.</span>
              <button
                type="button"
                onClick={() => setSharedBanner(false)}
                className="ml-auto text-emerald-700 hover:text-emerald-900 text-xs underline"
              >
                Ausblenden
              </button>
            </div>
          </div>
        </section>
      )}

      {/* TRADE PRESETS */}
      <section className="-mt-2 print:hidden">
        <div className="container-page">
          <div className="card-flat max-w-5xl mx-auto py-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider font-bold text-gray-500 mb-1">Schnellstart</p>
                <p className="text-sm text-gray-700">
                  Vorlage laden — typische Positionen + branchenübliche Lohn/Zuschlag-Werte.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.slug}
                    type="button"
                    onClick={() => loadPreset(p)}
                    className="btn btn-sm btn-outline"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CALCULATOR TABLE */}
      <section className="section-tight">
        <div className="container-page">
          <div className="card overflow-x-auto print:shadow-none print:border-0 print:p-0">
            {/* Print header — only visible in print */}
            <div className="hidden print:block print:mb-6">
              <div className="flex items-baseline justify-between border-b-2 border-primary-700 pb-2">
                <div>
                  <p className="text-xs uppercase tracking-wider text-primary-700 font-bold">KALKU Kalkulation</p>
                  <p className="text-xl font-bold text-gray-900">Positions-Übersicht</p>
                </div>
                <p className="text-xs text-gray-500">
                  {new Date().toLocaleDateString('de-DE')} · {rows.length} Position{rows.length === 1 ? '' : 'en'}
                </p>
              </div>
            </div>

            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-white z-10 print:bg-primary-700 print:text-white">
                <tr className="border-b-2 border-gray-200 print:border-primary-700">
                  <Th className="w-16 text-left">Pos.</Th>
                  <Th className="text-left min-w-[220px]">Beschreibung</Th>
                  <Th className="w-16 text-center">Einh.</Th>
                  <Th className="w-20 text-right">Lohn €/h</Th>
                  <Th className="w-16 text-right">Zeit h</Th>
                  <Th className="w-24 text-right">Material €</Th>
                  <Th className="w-16 text-right">Zuschl. %</Th>
                  <Th className="w-16 text-right">Menge</Th>
                  <Th className="w-24 text-right text-primary-700 print:text-white">EP €</Th>
                  <Th className="w-28 text-right text-primary-700 print:text-white">GP €</Th>
                  <Th className="w-10 text-center print:hidden">NU</Th>
                  <Th className="w-8 print:hidden"></Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <PositionRow
                    key={r.id}
                    row={r}
                    index={i}
                    aufschlaege={aufschlaege}
                    canDelete={rows.length > 1}
                    onChange={(patch) => updateRow(r.id, patch)}
                    onDelete={() => deleteRow(r.id)}
                  />
                ))}
              </tbody>
            </table>

            {hasNu && (
              <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 inline-flex items-center gap-2 print:hidden">
                <Users className="w-3.5 h-3.5" />
                NU-Aufschlag {fmt(aufschlaege.nuZuschlag)} % wird auf gelb markierte Positionen angewendet. Anpassbar
                im Aufschlag-Panel.
              </p>
            )}

            {/* Totals breakdown */}
            <div className="mt-6 grid sm:grid-cols-4 gap-3">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-[11px] uppercase tracking-wider font-bold text-gray-500 mb-1">Σ Lohn-Anteil</p>
                <p className="text-lg font-bold text-gray-900 tabular-nums">{fmtCurrency(totals.lohnTotal)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-[11px] uppercase tracking-wider font-bold text-gray-500 mb-1">Σ Material-Anteil</p>
                <p className="text-lg font-bold text-gray-900 tabular-nums">{fmtCurrency(totals.materialTotal)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-[11px] uppercase tracking-wider font-bold text-gray-500 mb-1">Σ Stunden</p>
                <p className="text-lg font-bold text-gray-900 tabular-nums">
                  {fmt(totals.stundenTotal).replace(',00', '')} h
                </p>
              </div>
              <div className="bg-primary-700 text-white rounded-lg p-4">
                <p className="text-[11px] uppercase tracking-wider font-bold text-primary-200 mb-1">SUMME netto</p>
                <p className="text-2xl font-extrabold tabular-nums">{fmtCurrency(totals.netto)}</p>
              </div>
            </div>

            {/* Aufschlag-Panel */}
            <AufschlagPanel
              value={aufschlaege}
              onChange={setAufschlaege}
              totals={totals}
              open={showAufschlaege}
              onToggle={() => setShowAufschlaege((s) => !s)}
            />

            {/* Excel error */}
            {excelError && (
              <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {excelError}
              </p>
            )}

            {/* Action bar */}
            <div className="flex flex-wrap gap-2 mt-6 pt-5 border-t border-gray-100 print:hidden">
              <button type="button" onClick={addRow} className="btn btn-outline btn-sm">
                <Plus className="w-4 h-4" /> Position
              </button>
              <button type="button" onClick={pasteFromClipboard} className="btn btn-outline btn-sm" title="Strg+V aus Excel/Calc">
                <Clipboard className="w-4 h-4" /> Aus Excel einfügen
              </button>
              <button type="button" onClick={handleExcel} disabled={exportingExcel} className="btn btn-success btn-sm">
                <FileSpreadsheet className="w-4 h-4" />
                {exportingExcel ? 'Excel-Datei wird erstellt …' : 'Excel exportieren (.xlsx)'}
              </button>
              <button type="button" onClick={exportCsv} className="btn btn-outline btn-sm">
                <Download className="w-4 h-4" /> CSV
              </button>
              <button type="button" onClick={() => window.print()} className="btn btn-outline btn-sm">
                <Printer className="w-4 h-4" /> Drucken / PDF
              </button>
              <button type="button" onClick={openShare} className="btn btn-outline btn-sm">
                <Share2 className="w-4 h-4" /> Teilen
              </button>
              <button type="button" onClick={reset} className="btn btn-ghost btn-sm ml-auto">
                <RotateCcw className="w-4 h-4" /> Zurücksetzen
              </button>
            </div>

            {/* Print footer */}
            <div className="hidden print:block print:mt-8 print:pt-4 print:border-t print:border-gray-200">
              <div className="flex items-end justify-between text-xs text-gray-500">
                <p>KALKU Baukalkulationen · kalku.de · Online-Kalkulator</p>
                <p>{new Date().toLocaleDateString('de-DE')}</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-400 text-center mt-3 print:hidden">
            {savedAt ? (
              <>
                <CheckCircle2 className="w-3 h-3 inline -mt-0.5 mr-1 text-emerald-500" />
                Auto-Save: zuletzt gespeichert um {savedAt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} — Daten bleiben in Ihrem Browser.
              </>
            ) : (
              'Auto-Save aktiv — Daten bleiben in Ihrem Browser.'
            )}
          </p>
        </div>
      </section>

      {/* PREMIUM EMAIL CAPTURE */}
      <section className="section bg-gray-50 print:hidden">
        <div className="container-page">
          <div className="card max-w-2xl mx-auto text-center">
            <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center mx-auto mb-5">
              <Mail className="w-6 h-6 text-primary-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Premium-Auswertung kostenlos per Mail.
            </h2>
            <p className="text-gray-600 mb-7">
              Schicken Sie uns Ihre Berechnung — wir senden Ihnen eine Einschätzung unserer
              Kalkulatoren zurück. Mit Hinweisen, wo wir typischerweise andere Werte ansetzen
              würden. Kostenlos, einmalig, kein Abo.
            </p>
            {emailSent ? (
              <div className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="w-5 h-5" />
                <span>Vielen Dank! Sie erhalten unsere Einschätzung innerhalb von 1–2 Werktagen.</span>
              </div>
            ) : (
              <form onSubmit={submitEmail} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <label htmlFor={formId} className="sr-only">
                  E-Mail
                </label>
                <input
                  id={formId}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ihre@firma.de"
                  className="input flex-1"
                />
                <button type="submit" className="btn btn-success">
                  Anfordern <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}
            <p className="text-xs text-gray-400 mt-4">
              DSGVO-konform. Daten werden ausschließlich für die Lieferung der Einschätzung verwendet.
              Kein Newsletter, kein Spam.
            </p>
          </div>
        </div>
      </section>

      <AndereTools exclude="/tools/kalkulator/" />

      {/* CROSS-CTA */}
      <section className="section print:hidden">
        <div className="container-page">
          <div className="card-flat text-center max-w-2xl mx-auto">
            <p className="text-xs uppercase tracking-[0.18em] font-bold text-primary-700 mb-3">
              Mehr als nur ein Tool?
            </p>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Wir kalkulieren Ihre komplette Submission.
            </h2>
            <p className="text-gray-600 mb-6">
              Ab 200 € pro LV — Festpreis. Auch über Nacht.
            </p>
            <Link to="/konditionen/" className="btn btn-success">
              Konditionen ansehen <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <ShareDialog open={shareOpen} url={shareUrl} onClose={() => setShareOpen(false)} />
    </>
  );
}

function Th({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <th className={'px-2 py-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-500 ' + (className ?? '')}>
      {children}
    </th>
  );
}

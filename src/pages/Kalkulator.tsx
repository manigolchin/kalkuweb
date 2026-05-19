import { useState, useMemo, useEffect, useId } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  Plus,
  Trash2,
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
} from 'lucide-react';
import { canonical } from '@/lib/seo';
import { cn } from '@/lib/utils';
import { softwareApplicationSchema } from '@/lib/toolSchema';
import AndereTools from '@/components/sections/AndereTools';
import { submitLead, LEAD_FALLBACK_EMAIL } from '@/lib/lead';

type Row = {
  id: string;
  pos: string;
  text: string;
  einheit: string;
  lohn: number;
  zeit: number;
  material: number;
  zuschlag: number;
  menge: number;
};

const TITLE = 'Position-Kalkulator (EP/GP berechnen) | KALKU';
const DESC =
  'Online-Kalkulator für Bauunternehmer: Lohn × Zeit + Material + Zuschlag = EP. Trade-Vorlagen (GaLaBau, Tiefbau, Elektro), Excel + CSV Export, Auto-Save. Kostenlos, im Browser.';

const STORAGE_KEY = 'kalku.kalkulator.rows';

type Preset = {
  slug: string;
  label: string;
  lohn: number;
  zuschlag: number;
  einheit: string;
  rows: Array<Pick<Row, 'pos' | 'text' | 'einheit' | 'lohn' | 'zeit' | 'material' | 'zuschlag' | 'menge'>>;
};

const PRESETS: Preset[] = [
  {
    slug: 'galabau',
    label: 'GaLaBau',
    lohn: 48,
    zuschlag: 14,
    einheit: 'm²',
    rows: [
      { pos: '01.01.10', text: 'Pflasterfläche, Granitpflaster geliefert + verlegt', einheit: 'm²', lohn: 48, zeit: 0.85, material: 62, zuschlag: 14, menge: 240 },
      { pos: '01.02.20', text: 'Mutterboden liefern + andecken, h = 25 cm', einheit: 'm³', lohn: 42, zeit: 0.4, material: 28, zuschlag: 14, menge: 180 },
      { pos: '01.03.05', text: 'Bepflanzung Sträucher, Container 5L', einheit: 'St', lohn: 42, zeit: 0.3, material: 18.5, zuschlag: 14, menge: 60 },
    ],
  },
  {
    slug: 'tiefbau',
    label: 'Tiefbau',
    lohn: 52,
    zuschlag: 12,
    einheit: 'm³',
    rows: [
      { pos: '01.01.10', text: 'Asphaltdecke fräsen, t = 4 cm', einheit: 'm²', lohn: 52, zeit: 0.06, material: 0, zuschlag: 12, menge: 1240 },
      { pos: '01.02.20', text: 'PE-HD-Rohr DN 250 SDR 17, geliefert + verlegt', einheit: 'm', lohn: 52, zeit: 0.45, material: 38.5, zuschlag: 12, menge: 180 },
      { pos: '01.03.40', text: 'Schotter 0/45 mm, geliefert + eingebaut', einheit: 't', lohn: 52, zeit: 0.18, material: 22, zuschlag: 12, menge: 320 },
    ],
  },
  {
    slug: 'elektro',
    label: 'Elektro',
    lohn: 58,
    zuschlag: 18,
    einheit: 'St',
    rows: [
      { pos: '01.01.10', text: 'NYM-J 3×1,5 mm² geliefert + verlegt UP', einheit: 'm', lohn: 58, zeit: 0.08, material: 1.45, zuschlag: 18, menge: 420 },
      { pos: '01.02.20', text: 'Steckdose UP, 1-fach, weiß, mit Rahmen', einheit: 'St', lohn: 58, zeit: 0.25, material: 8.9, zuschlag: 18, menge: 32 },
      { pos: '01.03.05', text: 'BMA-Linienmelder, automatisch, mit Sockel', einheit: 'St', lohn: 58, zeit: 0.65, material: 145, zuschlag: 18, menge: 14 },
    ],
  },
  {
    slug: 'hochbau',
    label: 'Hochbau',
    lohn: 50,
    zuschlag: 15,
    einheit: 'm³',
    rows: [
      { pos: '01.01.10', text: 'Stahlbeton C25/30, Wand, geliefert + eingebaut', einheit: 'm³', lohn: 50, zeit: 1.2, material: 145, zuschlag: 15, menge: 38 },
      { pos: '01.02.20', text: 'Schalung Wand, beidseitig, Sichtbetonklasse SB1', einheit: 'm²', lohn: 50, zeit: 0.45, material: 12, zuschlag: 15, menge: 180 },
      { pos: '01.03.05', text: 'Bewehrungsstahl BSt 500 S, geliefert + verlegt', einheit: 't', lohn: 50, zeit: 6, material: 1280, zuschlag: 15, menge: 4.2 },
    ],
  },
];

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
    ...seed,
  };
}

function computeEp(r: Row): number {
  const base = r.lohn * r.zeit + r.material;
  return base * (1 + r.zuschlag / 100);
}

function fmt(n: number): string {
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtCurrency(n: number): string {
  return n.toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  });
}

export default function Kalkulator() {
  const [rows, setRows] = useState<Row[]>(() => {
    if (typeof window === 'undefined') return PRESETS[0].rows.map((r) => newRow(r));
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: Row[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      /* ignore */
    }
    return PRESETS[0].rows.map((r) => newRow(r));
  });
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const formId = useId();

  // Auto-save to localStorage on every change (debounced via state effect)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
        setSavedAt(new Date());
      } catch {
        /* quota — ignore */
      }
    }, 600);
    return () => clearTimeout(t);
  }, [rows]);

  const totals = useMemo(() => {
    const eps = rows.map(computeEp);
    const gps = rows.map((r, i) => eps[i] * r.menge);
    const total = gps.reduce((s, v) => s + v, 0);
    const lohnTotal = rows.reduce((s, r) => s + r.lohn * r.zeit * r.menge * (1 + r.zuschlag / 100), 0);
    const materialTotal = rows.reduce((s, r) => s + r.material * r.menge * (1 + r.zuschlag / 100), 0);
    const stundenTotal = rows.reduce((s, r) => s + r.zeit * r.menge, 0);
    return { eps, gps, total, lohnTotal, materialTotal, stundenTotal };
  }, [rows]);

  function updateRow(id: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addRow() {
    // copy default lohn/zuschlag from last row
    const last = rows[rows.length - 1];
    setRows((rs) => [
      ...rs,
      newRow({
        einheit: last?.einheit ?? 'St',
        lohn: last?.lohn ?? 48,
        zuschlag: last?.zuschlag ?? 14,
      }),
    ]);
  }

  function deleteRow(id: string) {
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.id !== id) : rs));
  }

  function loadPreset(p: Preset) {
    if (rows.length > 0 && rows.some((r) => r.text || r.material > 0)) {
      const ok = window.confirm(
        `Aktuelle Eingaben gehen verloren — Vorlage „${p.label}" laden?`,
      );
      if (!ok) return;
    }
    setRows(p.rows.map((r) => newRow(r)));
  }

  function reset() {
    if (!window.confirm('Alle Positionen löschen — sicher?')) return;
    setRows([newRow()]);
  }

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        alert('Zwischenablage ist leer.');
        return;
      }
      // Parse tab-separated (Excel) or semicolon-separated (CSV) rows
      const sep = text.includes('\t') ? '\t' : ';';
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      const parsed: Row[] = lines.map((line, i) => {
        const cells = line.split(sep).map((c) => c.trim().replace(/^"|"$/g, ''));
        // Auto-detect: if first cell is a header, skip
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
      // Drop the first row if it looks like a header (text in lohn column)
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
    } catch (err) {
      alert('Zwischenablage nicht zugänglich. Erlaube Clipboard-Zugriff in deinem Browser, oder importiere via CSV.');
    }
  }

  function exportCsv() {
    const header = ['Pos.', 'Beschreibung', 'Einheit', 'Lohn EUR/h', 'Zeit h', 'Material EUR', 'Zuschlag %', 'Menge', 'EP EUR', 'GP EUR'];
    const lines = [header.join(';')];
    rows.forEach((r, i) => {
      const ep = computeEp(r);
      const gp = ep * r.menge;
      lines.push(
        [
          r.pos || `${i + 1}`,
          `"${r.text.replace(/"/g, '""')}"`,
          r.einheit,
          fmt(r.lohn),
          fmt(r.zeit),
          fmt(r.material),
          fmt(r.zuschlag),
          fmt(r.menge),
          fmt(ep),
          fmt(gp),
        ].join(';'),
      );
    });
    lines.push('');
    lines.push(['', 'SUMME', '', '', '', '', '', '', '', fmt(totals.total)].join(';'));
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kalku-positionen-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportExcel() {
    setExportingExcel(true);
    try {
      const XLSX = await import('xlsx');
      const data: (string | number)[][] = [
        ['Pos.', 'Beschreibung', 'Einheit', 'Lohn €/h', 'Zeit h', 'Material €', 'Zuschlag %', 'Menge', 'EP €', 'GP €'],
        ...rows.map((r, i) => {
          const ep = computeEp(r);
          const gp = ep * r.menge;
          return [
            r.pos || `${i + 1}`,
            r.text,
            r.einheit,
            r.lohn,
            r.zeit,
            r.material,
            r.zuschlag,
            r.menge,
            Number(ep.toFixed(2)),
            Number(gp.toFixed(2)),
          ];
        }),
        [],
        ['', 'SUMME netto', '', '', '', '', '', '', '', Number(totals.total.toFixed(2))],
      ];
      const ws = XLSX.utils.aoa_to_sheet(data);
      ws['!cols'] = [
        { wch: 10 }, { wch: 50 }, { wch: 8 }, { wch: 10 }, { wch: 8 },
        { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 14 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Kalkulation');
      XLSX.writeFile(wb, `kalku-positionen-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } finally {
      setExportingExcel(false);
    }
  }

  function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes('@')) return;
    const sample = rows.slice(0, 5).map((r, i) => {
      const ep = computeEp(r);
      return `  ${i + 1}. ${(r.pos || '—').padEnd(10)} ${(r.text || '').slice(0, 60)} | ${r.einheit} | Menge ${fmt(r.menge)} | EP ${fmt(ep)} €`;
    });
    submitLead({
      type: 'kalkulator-review',
      email,
      subject: `Kalku Position-Kalkulator — Einschätzung erbeten (${rows.length} Positionen, ${fmtCurrency(totals.total)})`,
      bodyLines: [
        `Anfrage Premium-Einschätzung (kostenlos)`,
        ``,
        `Antwort an: ${email}`,
        `Positionen: ${rows.length}`,
        `Summe netto: ${fmtCurrency(totals.total)}`,
        `Lohnanteil: ${fmtCurrency(totals.lohnTotal)}`,
        `Materialanteil: ${fmtCurrency(totals.materialTotal)}`,
        `Stunden gesamt: ${fmt(totals.stundenTotal)} h`,
        ``,
        `Auszug erste ${Math.min(5, rows.length)} Positionen:`,
        ...sample,
        rows.length > 5 ? `  … und ${rows.length - 5} weitere` : '',
        ``,
        `Für eine genaue Einschätzung: bitte die CSV- oder Excel-Export-Datei aus dem Kalkulator als Anhang beilegen, bevor Sie diese E-Mail senden.`,
      ].filter(Boolean),
    });
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
            featureList: ['EP/GP-Berechnung', 'Trade-Vorlagen GaLaBau/Tiefbau/Elektro/Hochbau', 'Excel + CSV Export', 'Auto-Save in Browser', 'Excel-Paste aus Zwischenablage'],
          }))}
        </script>
      </Helmet>

      {/* HERO */}
      <section className="section-tight bg-gradient-to-br from-gray-50 to-white">
        <div className="container-page">
          <div className="text-center max-w-3xl mx-auto">
            <p className="text-xs uppercase tracking-[0.18em] text-primary-700 font-bold mb-3">
              Position-Kalkulator
            </p>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 mb-5 leading-tight">
              EP und GP in Sekunden berechnen.
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Lohn × Zeit + Material + Zuschlag = Einheitspreis. Mit Trade-Vorlagen, Auto-Save,
              Excel + CSV Export. Komplett im Browser — Ihre Daten verlassen Ihren PC nicht.
            </p>
            <div className="mt-7 inline-flex items-center gap-4 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-primary-600" /> Datenschutz: 100 % lokal
              </span>
              <span className="text-gray-300" aria-hidden>·</span>
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary-600" /> Auto-Save aktiv
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* TRADE PRESETS */}
      <section className="-mt-2">
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
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b-2 border-gray-200">
                  <Th className="w-16 text-left">Pos.</Th>
                  <Th className="text-left min-w-[220px]">Beschreibung</Th>
                  <Th className="w-16 text-center">Einh.</Th>
                  <Th className="w-20 text-right">Lohn €/h</Th>
                  <Th className="w-16 text-right">Zeit h</Th>
                  <Th className="w-24 text-right">Material €</Th>
                  <Th className="w-16 text-right">Zuschl. %</Th>
                  <Th className="w-16 text-right">Menge</Th>
                  <Th className="w-24 text-right text-primary-700">EP €</Th>
                  <Th className="w-28 text-right text-primary-700">GP €</Th>
                  <Th className="w-8 print:hidden"></Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const ep = computeEp(r);
                  const gp = ep * r.menge;
                  return (
                    <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={r.pos || ''}
                          onChange={(e) => updateRow(r.id, { pos: e.target.value })}
                          placeholder={`${i + 1}`}
                          className="w-full px-2 py-1.5 font-mono text-xs text-gray-500 border border-transparent rounded-md hover:border-gray-200 focus:border-primary-500 focus:ring-0"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={r.text}
                          onChange={(e) => updateRow(r.id, { text: e.target.value })}
                          className="w-full px-2 py-1.5 border border-transparent rounded-md hover:border-gray-200 focus:border-primary-500 focus:ring-0"
                          placeholder="z.B. Asphalt fräsen, t = 4 cm"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={r.einheit}
                          onChange={(e) => updateRow(r.id, { einheit: e.target.value })}
                          className="w-12 px-2 py-1.5 text-center text-xs border border-transparent rounded-md hover:border-gray-200 focus:border-primary-500 focus:ring-0"
                        />
                      </td>
                      <NumCell value={r.lohn} onChange={(v) => updateRow(r.id, { lohn: v })} step={0.5} />
                      <NumCell value={r.zeit} onChange={(v) => updateRow(r.id, { zeit: v })} step={0.05} />
                      <NumCell value={r.material} onChange={(v) => updateRow(r.id, { material: v })} step={0.5} />
                      <NumCell value={r.zuschlag} onChange={(v) => updateRow(r.id, { zuschlag: v })} step={1} width="w-14" />
                      <NumCell value={r.menge} onChange={(v) => updateRow(r.id, { menge: v })} step={1} />
                      <td className="px-2 py-2 text-right tabular-nums text-primary-700 font-medium">{fmt(ep)}</td>
                      <td className="px-2 py-2 text-right tabular-nums font-bold text-primary-700">{fmt(gp)}</td>
                      <td className="px-1 py-2 print:hidden">
                        <button
                          type="button"
                          onClick={() => deleteRow(r.id)}
                          disabled={rows.length === 1}
                          className="p-1.5 text-gray-300 hover:text-red-500 disabled:opacity-30 disabled:hover:text-gray-300 rounded"
                          aria-label={`Position ${i + 1} löschen`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

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
                <p className="text-2xl font-extrabold tabular-nums">{fmtCurrency(totals.total)}</p>
              </div>
            </div>

            {/* Action bar */}
            <div className="flex flex-wrap gap-2 mt-6 pt-5 border-t border-gray-100 print:hidden">
              <button type="button" onClick={addRow} className="btn btn-outline btn-sm">
                <Plus className="w-4 h-4" /> Position
              </button>
              <button type="button" onClick={pasteFromClipboard} className="btn btn-outline btn-sm" title="Strg+V aus Excel/Calc">
                <Clipboard className="w-4 h-4" /> Aus Excel einfügen
              </button>
              <button type="button" onClick={exportExcel} disabled={exportingExcel} className="btn btn-success btn-sm">
                <FileSpreadsheet className="w-4 h-4" />
                {exportingExcel ? 'Excel-Datei wird erstellt …' : 'Excel exportieren (.xlsx)'}
              </button>
              <button type="button" onClick={exportCsv} className="btn btn-outline btn-sm">
                <Download className="w-4 h-4" /> CSV
              </button>
              <button type="button" onClick={() => window.print()} className="btn btn-outline btn-sm">
                <Printer className="w-4 h-4" /> Drucken
              </button>
              <button type="button" onClick={reset} className="btn btn-ghost btn-sm ml-auto">
                <RotateCcw className="w-4 h-4" /> Zurücksetzen
              </button>
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
              <div className="inline-flex items-start gap-2 px-4 py-3 rounded-xl bg-emerald-50 text-emerald-800 text-left max-w-lg mx-auto">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm">
                  Ihr E-Mail-Programm sollte sich mit einer vorausgefüllten Nachricht geöffnet
                  haben. <strong>Hängen Sie idealerweise Ihren CSV- oder Excel-Export an</strong>
                  {' '}— dann können wir konkrete Positionen kommentieren. Wir antworten innerhalb
                  von 1–2 Werktagen.
                  <br />
                  Falls sich nichts geöffnet hat:{' '}
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
              <form onSubmit={submitEmail} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <label htmlFor={formId} className="sr-only">
                  E-Mail
                </label>
                <input
                  id={formId}
                  type="email"
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
    </>
  );
}

/** Parse "12,50" or "12.50" or "1.234,56" -> 12.50 / 1234.56. */
function parseGermanNumber(s: string | undefined): number {
  if (!s) return NaN;
  const cleaned = s.replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return isNaN(n) ? NaN : n;
}

function Th({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <th className={cn('px-2 py-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-500', className)}>
      {children}
    </th>
  );
}

function NumCell({
  value,
  onChange,
  step = 0.01,
  width = 'w-20',
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  width?: string;
}) {
  return (
    <td className="px-2 py-2">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        step={step}
        min="0"
        className={cn(
          width,
          'px-2 py-1.5 text-right tabular-nums border border-transparent rounded-md hover:border-gray-200 focus:border-primary-500 focus:ring-0',
        )}
      />
    </td>
  );
}

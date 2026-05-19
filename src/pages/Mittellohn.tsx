import { useState, useMemo, useEffect, useId } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  Plus,
  Trash2,
  Download,
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  Printer,
  FileSpreadsheet,
  Sparkles,
  Shield,
  Users,
  Info,
} from 'lucide-react';
import { canonical } from '@/lib/seo';
import { cn } from '@/lib/utils';
import { softwareApplicationSchema } from '@/lib/toolSchema';
import AndereTools from '@/components/sections/AndereTools';

type Person = {
  id: string;
  rolle: string;
  stundensatz: number;
  anzahl: number;
};

const STORAGE_KEY = 'kalku.mittellohn.team';

const DEFAULT_TEAM: Omit<Person, 'id'>[] = [
  { rolle: 'Polier', stundensatz: 32.5, anzahl: 1 },
  { rolle: 'Vorarbeiter', stundensatz: 27.4, anzahl: 1 },
  { rolle: 'Geselle / Facharbeiter', stundensatz: 24.8, anzahl: 3 },
  { rolle: 'Helfer / Bauwerker', stundensatz: 20.1, anzahl: 1 },
];

const TITLE = 'Mittellohn-Rechner (AS / ASL) | KALKU';
const DESC =
  'Mittellohn AS und Mittellohn ASL aus Team-Mix berechnen — Stundensatz pro Rolle, Lohnnebenkosten, Excel-Export. Kostenlos, im Browser.';

function newRow(seed?: Partial<Person>): Person {
  return {
    id: Math.random().toString(36).slice(2, 9),
    rolle: '',
    stundensatz: 25,
    anzahl: 1,
    ...seed,
  };
}

function fmt(n: number, digits = 2): string {
  return n.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function eur(n: number): string {
  return n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

export default function Mittellohn() {
  const [team, setTeam] = useState<Person[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_TEAM.map((p) => newRow(p));
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      /* ignore */
    }
    return DEFAULT_TEAM.map((p) => newRow(p));
  });
  const [lohnnebenkosten, setLohnnebenkosten] = useState(78); // % typisch im Baugewerbe
  const [zulagen, setZulagen] = useState(0); // EUR/h zusätzlich
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [tarifgebiet, setTarifgebiet] = useState<'west' | 'ost'>('west');

  // Lohnnebenkosten-Komponenten — Default Branche Bauhauptgewerbe 2026
  const [bnkSv, setBnkSv] = useState(20.85); // Sozialversicherung AG-Anteil (KV+PV+RV+AV)
  const [bnkSoka, setBnkSoka] = useState(18.5); // SOKA-BAU West Default
  const [bnkBg, setBnkBg] = useState(5); // Berufsgenossenschaft Bau (Risikoklasse)
  const [bnkMonats13, setBnkMonats13] = useState(11); // 13.ME, Urlaubsgeld
  const [bnkSonst, setBnkSonst] = useState(8); // Lohnfortzahlung Krank/Feiertag, Sonstiges
  const lnkId = useId();
  const zulagenId = useId();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(team));
        setSavedAt(new Date());
      } catch {
        /* ignore */
      }
    }, 600);
    return () => clearTimeout(t);
  }, [team]);

  const breakdownTotal = bnkSv + bnkSoka + bnkBg + bnkMonats13 + bnkSonst;
  const effectiveLnk = breakdownOpen ? breakdownTotal : lohnnebenkosten;

  const totals = useMemo(() => {
    const totalAnzahl = team.reduce((s, p) => s + p.anzahl, 0) || 1;
    const lohnSumme = team.reduce((s, p) => s + p.stundensatz * p.anzahl, 0);
    const mittellohnAS = lohnSumme / totalAnzahl;
    const mittellohnASL = mittellohnAS * (1 + effectiveLnk / 100) + zulagen;
    return { totalAnzahl, lohnSumme, mittellohnAS, mittellohnASL };
  }, [team, effectiveLnk, zulagen]);

  function applyTarifgebiet(g: 'west' | 'ost') {
    setTarifgebiet(g);
    // SOKA-BAU 2026: West ~18.5 %, Ost ~16.5 %
    setBnkSoka(g === 'west' ? 18.5 : 16.5);
  }

  function update(id: string, patch: Partial<Person>) {
    setTeam((rs) => rs.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function add() {
    setTeam((rs) => [...rs, newRow({ rolle: 'Neue Rolle', stundensatz: 22, anzahl: 1 })]);
  }

  function del(id: string) {
    setTeam((rs) => (rs.length > 1 ? rs.filter((p) => p.id !== id) : rs));
  }

  function reset() {
    if (!window.confirm('Team auf Standard zurücksetzen?')) return;
    setTeam(DEFAULT_TEAM.map((p) => newRow(p)));
    setLohnnebenkosten(78);
    setZulagen(0);
    setBreakdownOpen(false);
    setBnkSv(20.85);
    setBnkSoka(18.5);
    setBnkBg(5);
    setBnkMonats13(11);
    setBnkSonst(8);
    setTarifgebiet('west');
  }

  function exportCsv() {
    const lines = ['Rolle;Stundensatz EUR;Anzahl;Lohnsumme EUR'];
    team.forEach((p) => {
      lines.push([p.rolle, fmt(p.stundensatz), p.anzahl, fmt(p.stundensatz * p.anzahl)].join(';'));
    });
    lines.push('');
    lines.push(`Mittellohn AS;${fmt(totals.mittellohnAS)};EUR/h;`);
    if (breakdownOpen) {
      lines.push(`Tarifgebiet;${tarifgebiet === 'west' ? 'West' : 'Ost'};;`);
      lines.push(`  Sozialvers. AG;${fmt(bnkSv, 2)};%;`);
      lines.push(`  SOKA-BAU;${fmt(bnkSoka, 2)};%;`);
      lines.push(`  Berufsgen. Bau;${fmt(bnkBg, 2)};%;`);
      lines.push(`  13. ME / Urlaub;${fmt(bnkMonats13, 2)};%;`);
      lines.push(`  Sonstiges;${fmt(bnkSonst, 2)};%;`);
    }
    lines.push(`Lohnnebenkosten;${fmt(effectiveLnk, 2)};%;`);
    lines.push(`Zulagen;${fmt(zulagen)};EUR/h;`);
    lines.push(`Mittellohn ASL;${fmt(totals.mittellohnASL)};EUR/h;`);
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kalku-mittellohn-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportExcel() {
    setExportingExcel(true);
    setExportError(null);
    try {
      const XLSX = await import('xlsx');
      const breakdownRows: (string | number)[][] = breakdownOpen
        ? [
            ['Tarifgebiet', tarifgebiet === 'west' ? 'West' : 'Ost', '', ''],
            ['  Sozialvers. AG %', Number(bnkSv.toFixed(2)), '', ''],
            ['  SOKA-BAU %', Number(bnkSoka.toFixed(2)), '', ''],
            ['  Berufsgen. Bau %', Number(bnkBg.toFixed(2)), '', ''],
            ['  13. ME / Urlaub %', Number(bnkMonats13.toFixed(2)), '', ''],
            ['  Sonstiges %', Number(bnkSonst.toFixed(2)), '', ''],
          ]
        : [];
      const data: (string | number)[][] = [
        ['Rolle', 'Stundensatz €/h', 'Anzahl', 'Lohnsumme €/h'],
        ...team.map((p) => [p.rolle, p.stundensatz, p.anzahl, Number((p.stundensatz * p.anzahl).toFixed(2))]),
        [],
        ['Σ Anzahl Personen', '', totals.totalAnzahl, ''],
        ['Σ Lohnsumme €/h', '', '', Number(totals.lohnSumme.toFixed(2))],
        [],
        ['Mittellohn AS €/h', Number(totals.mittellohnAS.toFixed(2)), '', ''],
        ...breakdownRows,
        ['Lohnnebenkosten %', Number(effectiveLnk.toFixed(2)), '', ''],
        ['Zulagen €/h', zulagen, '', ''],
        ['Mittellohn ASL €/h', Number(totals.mittellohnASL.toFixed(2)), '', ''],
      ];
      const ws = XLSX.utils.aoa_to_sheet(data);
      ws['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 10 }, { wch: 18 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Mittellohn');
      XLSX.writeFile(wb, `kalku-mittellohn-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e) {
      setExportError(
        e instanceof Error ? `Excel-Export fehlgeschlagen: ${e.message}` : 'Excel-Export fehlgeschlagen.',
      );
    } finally {
      setExportingExcel(false);
    }
  }

  return (
    <>
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESC} />
        <link rel="canonical" href={canonical('/tools/mittellohn/')} />
        <script type="application/ld+json">
          {JSON.stringify(softwareApplicationSchema({
            name: 'Mittellohn-Rechner',
            description: DESC,
            path: '/tools/mittellohn/',
            featureList: ['Mittellohn AS + ASL', 'Lohnnebenkosten-Breakdown (SOKA/RV/KV/BG)', 'Bundesgebiet West/Ost', 'Auto-Save', 'Excel-Export'],
          }))}
        </script>
      </Helmet>

      <section className="section-tight bg-gradient-to-br from-amber-50/40 to-white">
        <div className="container-page">
          <div className="text-center max-w-3xl mx-auto">
            <p className="text-xs uppercase tracking-[0.18em] text-amber-700 font-bold mb-3">Mittellohn-Rechner</p>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 mb-5 leading-tight">
              Mittellohn AS und ASL in Sekunden.
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Aus Ihrer Team-Zusammensetzung den durchschnittlichen Stundensatz berechnen — ohne und
              mit Lohnnebenkosten. Standard-Aufgabe vor jeder VOB-Kalkulation.
            </p>
            <div className="mt-7 inline-flex items-center gap-4 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-amber-600" /> 100 % lokal
              </span>
              <span className="text-gray-300" aria-hidden>·</span>
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Auto-Save aktiv
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="section-tight">
        <div className="container-page">
          <div className="grid lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {/* Team table */}
            <div className="lg:col-span-2 card">
              <div className="flex items-center gap-2 mb-5">
                <Users className="w-5 h-5 text-amber-600" />
                <h2 className="font-bold text-gray-900">Team-Zusammensetzung</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-200 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      <th className="text-left px-2 py-2 min-w-[200px]">Rolle</th>
                      <th className="text-right px-2 py-2 w-32">Stundensatz €/h</th>
                      <th className="text-right px-2 py-2 w-20">Anzahl</th>
                      <th className="text-right px-2 py-2 w-32">Σ €/h</th>
                      <th className="w-8 print:hidden"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {team.map((p, i) => (
                      <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={p.rolle}
                            onChange={(e) => update(p.id, { rolle: e.target.value })}
                            aria-label={`Zeile ${i + 1}: Rolle`}
                            className="w-full px-2 py-1.5 border border-transparent rounded-md hover:border-gray-200 focus:border-amber-500 focus:ring-0"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={p.stundensatz}
                            onChange={(e) => update(p.id, { stundensatz: parseFloat(e.target.value) || 0 })}
                            step={0.5}
                            min={0}
                            aria-label={`Zeile ${i + 1}: Stundensatz`}
                            className="w-full px-2 py-1.5 text-right tabular-nums border border-transparent rounded-md hover:border-gray-200 focus:border-amber-500 focus:ring-0"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={p.anzahl}
                            onChange={(e) => update(p.id, { anzahl: parseInt(e.target.value) || 0 })}
                            step={1}
                            min={0}
                            aria-label={`Zeile ${i + 1}: Anzahl Personen`}
                            className="w-full px-2 py-1.5 text-right tabular-nums border border-transparent rounded-md hover:border-gray-200 focus:border-amber-500 focus:ring-0"
                          />
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums font-medium text-gray-700">
                          {fmt(p.stundensatz * p.anzahl)}
                        </td>
                        <td className="px-1 py-2 print:hidden">
                          <button
                            type="button"
                            onClick={() => del(p.id)}
                            disabled={team.length === 1}
                            className="p-1.5 text-gray-300 hover:text-red-500 disabled:opacity-30 rounded"
                            aria-label="Zeile löschen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-gray-100 print:hidden">
                <button type="button" onClick={add} className="btn btn-outline btn-sm">
                  <Plus className="w-4 h-4" /> Rolle
                </button>
                <button type="button" onClick={exportExcel} disabled={exportingExcel} className="btn btn-success btn-sm">
                  <FileSpreadsheet className="w-4 h-4" />
                  {exportingExcel ? 'wird erstellt …' : 'Excel (.xlsx)'}
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
              {exportError && (
                <div
                  role="alert"
                  className="mt-3 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800 print:hidden"
                >
                  {exportError}
                </div>
              )}
            </div>

            {/* Result + adjustments */}
            <div className="space-y-4">
              <div className="bg-gray-900 text-white rounded-lg p-6">
                <p className="text-[11px] uppercase tracking-wider font-bold text-gray-400 mb-2">Mittellohn AS</p>
                <p className="text-3xl font-extrabold tabular-nums">{eur(totals.mittellohnAS)}</p>
                <p className="text-xs text-gray-400 mt-1">pro Stunde, ohne Nebenkosten</p>
              </div>

              <div className="bg-amber-600 text-white rounded-lg p-6">
                <p className="text-[11px] uppercase tracking-wider font-bold text-amber-100 mb-2">Mittellohn ASL</p>
                <p className="text-3xl font-extrabold tabular-nums">{eur(totals.mittellohnASL)}</p>
                <p className="text-xs text-amber-100 mt-1">
                  inkl. {fmt(effectiveLnk, 1)} % Nebenkosten {zulagen > 0 ? `+ ${eur(zulagen)} Zulagen` : ''}
                </p>
              </div>

              <div className="card-flat">
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor={lnkId} className="label flex items-center gap-1.5 mb-0">
                    Lohnnebenkosten
                  </label>
                  <button
                    type="button"
                    onClick={() => setBreakdownOpen((o) => !o)}
                    aria-expanded={breakdownOpen}
                    className="text-xs font-semibold text-amber-700 hover:text-amber-900"
                  >
                    {breakdownOpen ? 'Einfach' : 'Detailansicht'}
                  </button>
                </div>

                {!breakdownOpen ? (
                  <>
                    <div className="flex items-center gap-3">
                      <input
                        id={lnkId}
                        type="range"
                        value={lohnnebenkosten}
                        onChange={(e) => setLohnnebenkosten(parseFloat(e.target.value))}
                        min={0}
                        max={120}
                        step={1}
                        aria-valuetext={`${lohnnebenkosten} Prozent`}
                        className="flex-1 accent-amber-600"
                      />
                      <span className="font-bold text-amber-700 tabular-nums w-14 text-right">{lohnnebenkosten} %</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Branchenüblich Bau: 70–90 % (SOKA-BAU + Sozialvers.)</p>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => applyTarifgebiet('west')}
                        className={cn(
                          'btn btn-sm flex-1 justify-center',
                          tarifgebiet === 'west' ? 'bg-amber-600 text-white hover:bg-amber-700' : 'btn-outline',
                        )}
                      >
                        Tarifgebiet West
                      </button>
                      <button
                        type="button"
                        onClick={() => applyTarifgebiet('ost')}
                        className={cn(
                          'btn btn-sm flex-1 justify-center',
                          tarifgebiet === 'ost' ? 'bg-amber-600 text-white hover:bg-amber-700' : 'btn-outline',
                        )}
                      >
                        Tarifgebiet Ost
                      </button>
                    </div>
                    <BreakdownRow label="Sozialvers. AG" value={bnkSv} onChange={setBnkSv} hint="KV+PV+RV+AV (~21 %)" />
                    <BreakdownRow label="SOKA-BAU" value={bnkSoka} onChange={setBnkSoka} hint={`Tarif ${tarifgebiet === 'west' ? 'West 18,5 %' : 'Ost 16,5 %'}`} />
                    <BreakdownRow label="Berufsgen. Bau" value={bnkBg} onChange={setBnkBg} hint="je Risikoklasse 3–7 %" />
                    <BreakdownRow label="13. ME / Urlaub" value={bnkMonats13} onChange={setBnkMonats13} hint="13. Monat + Urlaubsgeld anteilig" />
                    <BreakdownRow label="Sonstiges" value={bnkSonst} onChange={setBnkSonst} hint="Lohnfortz., Feiertage, Verm.bild." />
                    <div className="flex justify-between pt-3 mt-3 border-t border-gray-200 text-sm">
                      <span className="font-bold text-amber-900">Σ Lohnnebenkosten</span>
                      <span className="font-extrabold text-amber-700 tabular-nums">{fmt(breakdownTotal, 1)} %</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="card-flat">
                <label htmlFor={zulagenId} className="label">Zulagen €/h</label>
                <input
                  id={zulagenId}
                  type="number"
                  value={zulagen}
                  onChange={(e) => setZulagen(parseFloat(e.target.value) || 0)}
                  step={0.5}
                  min={0}
                  className="input"
                />
                <p className="text-xs text-gray-500 mt-2">z.B. Erschwerniszulage, Bauzulage, Schmutzzulage</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-400 text-center mt-4 print:hidden">
            {savedAt ? (
              <>
                <CheckCircle2 className="w-3 h-3 inline -mt-0.5 mr-1 text-emerald-500" />
                Auto-Save: zuletzt gespeichert um {savedAt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </>
            ) : (
              'Auto-Save aktiv'
            )}
          </p>

          <div className="max-w-3xl mx-auto mt-10 bg-amber-50 border border-amber-200 rounded-lg p-5">
            <p className="text-xs uppercase tracking-wider font-bold text-amber-800 mb-2 inline-flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" /> Was bedeutet Mittellohn AS und ASL?
            </p>
            <p className="text-sm text-amber-900 leading-relaxed">
              <strong>Mittellohn AS</strong> = durchschnittlicher Tariflohn pro Stunde, gewichtet nach Personalmix.<br />
              <strong>Mittellohn ASL</strong> = AS + Lohnzusatzkosten (Sozialversicherung, SOKA-BAU, Urlaubskasse,
              Berufsausbildung etc.) und ggf. Zulagen. ASL ist die Größe, die in die Kalkulation
              einer Position eingeht.
            </p>
          </div>
        </div>
      </section>

      <AndereTools exclude="/tools/mittellohn/" />
      <CrossCta />
    </>
  );
}

function BreakdownRow({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  const id = useId();
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <label htmlFor={id} className="font-semibold text-gray-700">{label}</label>
        <div className="inline-flex items-center gap-1">
          <input
            id={id}
            type="number"
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            min={0}
            max={50}
            step={0.1}
            aria-label={`${label} in Prozent`}
            className="w-16 px-2 py-1 text-right text-xs tabular-nums border border-gray-200 rounded focus:border-amber-500 focus:ring-0"
          />
          <span aria-hidden="true" className="text-gray-400 w-3">%</span>
        </div>
      </div>
      {hint && <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}

export function CrossCta() {
  return (
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
            Mittellohn ist nur der Anfang. Lassen Sie uns das ganze LV bepreisen — Festpreis ab 200 €.
          </p>
          <Link to="/konditionen/" className={cn('btn btn-success')}>
            Konditionen ansehen <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

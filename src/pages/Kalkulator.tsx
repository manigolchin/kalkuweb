import { useState, useMemo, useId } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Download, Mail, ArrowRight, CheckCircle2 } from 'lucide-react';
import { canonical } from '@/lib/seo';

type Row = {
  id: string;
  text: string;
  lohn: number; // €/h
  zeit: number; // h
  material: number; // €
  zuschlag: number; // %
  menge: number;
};

const TITLE = 'Position-Kalkulator (EP/GP berechnen) | KALKU';
const DESC =
  'Einfacher Online-Rechner: Lohn × Zeit + Material + Zuschlag = EP. Live-Summe, Export als CSV. Kostenlos, im Browser.';

function newRow(): Row {
  return {
    id: Math.random().toString(36).slice(2, 9),
    text: '',
    lohn: 45,
    zeit: 1,
    material: 0,
    zuschlag: 12,
    menge: 1,
  };
}

function computeEp(r: Row): number {
  const base = r.lohn * r.zeit + r.material;
  return base * (1 + r.zuschlag / 100);
}

function fmt(n: number): string {
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Kalkulator() {
  const [rows, setRows] = useState<Row[]>([newRow(), newRow(), newRow()]);
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const formId = useId();

  const totals = useMemo(() => {
    const eps = rows.map(computeEp);
    const gps = rows.map((r, i) => eps[i] * r.menge);
    return {
      eps,
      gps,
      total: gps.reduce((s, v) => s + v, 0),
    };
  }, [rows]);

  function updateRow(id: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((rs) => [...rs, newRow()]);
  }

  function deleteRow(id: string) {
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.id !== id) : rs));
  }

  function exportCsv() {
    const header = ['Pos.', 'Beschreibung', 'Lohn EUR/h', 'Zeit h', 'Material EUR', 'Zuschlag %', 'Menge', 'EP EUR', 'GP EUR'];
    const lines = [header.join(';')];
    rows.forEach((r, i) => {
      const ep = computeEp(r);
      const gp = ep * r.menge;
      lines.push(
        [
          i + 1,
          `"${r.text.replace(/"/g, '""')}"`,
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
    lines.push(['', 'SUMME', '', '', '', '', '', '', fmt(totals.total)].join(';'));
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kalku-positionen-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes('@')) return;
    // TODO Phase 3.4 backend: POST to /api/forms/submit with type=calculator
    setEmailSent(true);
  }

  return (
    <>
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESC} />
        <link rel="canonical" href={canonical('/tools/kalkulator/')} />
      </Helmet>

      {/* HERO */}
      <section className="section-tight bg-gradient-to-br from-gray-50 to-white">
        <div className="container-page">
          <div className="text-center max-w-3xl mx-auto">
            <p className="eyebrow mb-3">Position-Kalkulator</p>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 mb-5 leading-tight">
              EP und GP in Sekunden berechnen.
            </h1>
            <p className="text-lg text-gray-600">
              Lohn × Zeit + Material + Zuschlag = Einheitspreis. Live-Summe, CSV-Export.
              Kostenlos. Daten verlassen Ihren Browser nicht.
            </p>
          </div>
        </div>
      </section>

      {/* CALCULATOR TABLE */}
      <section className="section-tight">
        <div className="container-page">
          <div className="card overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider w-8">#</th>
                  <th className="text-left px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[200px]">Beschreibung</th>
                  <th className="text-right px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Lohn €/h</th>
                  <th className="text-right px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Zeit h</th>
                  <th className="text-right px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Material €</th>
                  <th className="text-right px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Zuschl. %</th>
                  <th className="text-right px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Menge</th>
                  <th className="text-right px-2 py-2 text-xs font-semibold text-primary-600 uppercase tracking-wider">EP €</th>
                  <th className="text-right px-2 py-2 text-xs font-semibold text-primary-600 uppercase tracking-wider">GP €</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const ep = computeEp(r);
                  const gp = ep * r.menge;
                  return (
                    <tr key={r.id} className="border-b border-gray-100">
                      <td className="px-2 py-2 text-gray-400 font-mono text-xs">{i + 1}</td>
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={r.text}
                          onChange={(e) => updateRow(r.id, { text: e.target.value })}
                          className="w-full px-2 py-1.5 border border-transparent rounded-md hover:border-gray-200 focus:border-primary-500 focus:ring-0"
                          placeholder="z.B. Asphalt fräsen, t = 4 cm"
                        />
                      </td>
                      <NumCell value={r.lohn} onChange={(v) => updateRow(r.id, { lohn: v })} />
                      <NumCell value={r.zeit} onChange={(v) => updateRow(r.id, { zeit: v })} />
                      <NumCell value={r.material} onChange={(v) => updateRow(r.id, { material: v })} />
                      <NumCell value={r.zuschlag} onChange={(v) => updateRow(r.id, { zuschlag: v })} />
                      <NumCell value={r.menge} onChange={(v) => updateRow(r.id, { menge: v })} />
                      <td className="px-2 py-2 text-right tabular-nums text-primary-700">{fmt(ep)}</td>
                      <td className="px-2 py-2 text-right tabular-nums font-semibold text-primary-700">{fmt(gp)}</td>
                      <td className="px-1 py-2">
                        <button
                          type="button"
                          onClick={() => deleteRow(r.id)}
                          disabled={rows.length === 1}
                          className="p-1.5 text-gray-300 hover:text-red-500 disabled:opacity-30 disabled:hover:text-gray-300"
                          aria-label={`Position ${i + 1} löschen`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-primary-50/60">
                  <td colSpan={8} className="px-2 py-3 text-right text-sm font-semibold text-primary-700">
                    Summe netto
                  </td>
                  <td className="px-2 py-3 text-right tabular-nums text-xl font-bold text-primary-700">
                    {fmt(totals.total)} €
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>

            <div className="flex flex-wrap gap-3 mt-5 pt-5 border-t border-gray-100">
              <button type="button" onClick={addRow} className="btn btn-outline">
                <Plus className="w-4 h-4" /> Position hinzufügen
              </button>
              <button type="button" onClick={exportCsv} className="btn btn-success">
                <Download className="w-4 h-4" /> CSV exportieren
              </button>
            </div>
          </div>

          <p className="text-xs text-gray-400 text-center mt-3">
            Berechnung erfolgt komplett in Ihrem Browser. Keine Daten werden an uns übertragen.
          </p>
        </div>
      </section>

      {/* PREMIUM EMAIL CAPTURE */}
      <section className="section bg-gray-50">
        <div className="container-page">
          <div className="card max-w-2xl mx-auto text-center">
            <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center mx-auto mb-5">
              <Mail className="w-6 h-6 text-primary-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Premium-Auswertung kostenlos per Mail.
            </h2>
            <p className="text-gray-600 mb-7">
              Schicken Sie uns Ihre Berechnung — wir senden Ihnen einen Marktvergleich basierend
              auf realen Kalkulationen aus 7 Gewerken. Kostenlos, einmalig, kein Abo.
            </p>
            {emailSent ? (
              <div className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="w-5 h-5" />
                <span>Vielen Dank! Sie erhalten den Marktvergleich innerhalb von 24 Stunden.</span>
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
              DSGVO-konform. Daten werden ausschließlich für die Marktvergleich-Lieferung verwendet.
              Kein Newsletter, kein Spam.
            </p>
          </div>
        </div>
      </section>

      {/* CROSS-CTA */}
      <section className="section">
        <div className="container-page">
          <div className="card-flat text-center max-w-2xl mx-auto">
            <p className="eyebrow mb-3">Mehr als nur ein Tool?</p>
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

function NumCell({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <td className="px-2 py-2">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        step="0.01"
        min="0"
        className="w-20 px-2 py-1.5 text-right tabular-nums border border-transparent rounded-md hover:border-gray-200 focus:border-primary-500 focus:ring-0"
      />
    </td>
  );
}

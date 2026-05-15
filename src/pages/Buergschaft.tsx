import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { ShieldCheck, Info, FileText, Shield, Banknote } from 'lucide-react';
import { canonical } from '@/lib/seo';
import { CrossCta } from './Mittellohn';

const TITLE = 'Bürgschafts-Rechner (VOB) | KALKU';
const DESC =
  'Vertragserfüllungs- und Gewährleistungs-Bürgschaft + Avalprovision über Laufzeit berechnen. Nach VOB/B § 17. Kostenlos, im Browser.';

function eur(n: number, digits = 2): string {
  return n.toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function fmt(n: number, digits = 2): string {
  return n.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export default function Buergschaft() {
  const [vertragssumme, setVertragssumme] = useState(450000);
  const [erfuellungsProz, setErfuellungsProz] = useState(5);
  const [gewaehrleistungsProz, setGewaehrleistungsProz] = useState(5);
  const [avalProvProzPa, setAvalProvProzPa] = useState(1.5);
  const [erfuellungsLaufzeitMonate, setErfuellungsLaufzeitMonate] = useState(18);
  const [gewaehrleistungsLaufzeitJahre, setGewaehrleistungsLaufzeitJahre] = useState(5);

  const result = useMemo(() => {
    const erfBetrag = vertragssumme * (erfuellungsProz / 100);
    const gewBetrag = vertragssumme * (gewaehrleistungsProz / 100);
    const erfAvalKosten = (erfBetrag * (avalProvProzPa / 100) * erfuellungsLaufzeitMonate) / 12;
    const gewAvalKosten = gewBetrag * (avalProvProzPa / 100) * gewaehrleistungsLaufzeitJahre;
    const gesamtAvalKosten = erfAvalKosten + gewAvalKosten;
    const gesamtAvalProz = (gesamtAvalKosten / vertragssumme) * 100;
    return { erfBetrag, gewBetrag, erfAvalKosten, gewAvalKosten, gesamtAvalKosten, gesamtAvalProz };
  }, [vertragssumme, erfuellungsProz, gewaehrleistungsProz, avalProvProzPa, erfuellungsLaufzeitMonate, gewaehrleistungsLaufzeitJahre]);

  return (
    <>
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESC} />
        <link rel="canonical" href={canonical('/tools/buergschaft/')} />
      </Helmet>

      <section className="section-tight bg-gradient-to-br from-indigo-50/40 to-white">
        <div className="container-page">
          <div className="text-center max-w-3xl mx-auto">
            <p className="text-xs uppercase tracking-[0.18em] text-indigo-700 font-bold mb-3">
              Bürgschafts-Rechner
            </p>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 mb-5 leading-tight">
              Was kosten Sie Ihre Bürgschaften wirklich?
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Vertragserfüllungs- und Gewährleistungs-Bürgschaft nach VOB/B § 17, plus
              Avalprovision über die volle Laufzeit. Kalkulationsrelevant — Sie zahlen nicht nur die
              Sicherheit, sondern jedes Jahr ihre Provision.
            </p>
            <div className="mt-7 inline-flex items-center gap-4 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-indigo-600" /> 100 % lokal
              </span>
              <span className="text-gray-300" aria-hidden>·</span>
              <span className="inline-flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-600" /> nach VOB/B § 17
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="section-tight">
        <div className="container-page">
          <div className="grid lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {/* Inputs */}
            <div className="card">
              <h2 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
                <Banknote className="w-5 h-5 text-indigo-600" />
                Eingabeparameter
              </h2>

              <div className="space-y-5">
                <div>
                  <label className="label">Vertragssumme netto</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={vertragssumme}
                      onChange={(e) => setVertragssumme(parseFloat(e.target.value) || 0)}
                      step={1000}
                      min={0}
                      className="input pr-12 text-right tabular-nums"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                  </div>
                </div>

                <Slider
                  label="Vertragserfüllungs-Bürgschaft"
                  value={erfuellungsProz}
                  onChange={setErfuellungsProz}
                  min={0}
                  max={10}
                  step={0.5}
                  suffix="%"
                  hint="VOB üblich 5 % der Vertragssumme"
                />

                <Slider
                  label="Gewährleistungs-Bürgschaft"
                  value={gewaehrleistungsProz}
                  onChange={setGewaehrleistungsProz}
                  min={0}
                  max={10}
                  step={0.5}
                  suffix="%"
                  hint="VOB max. 5 % der Abrechnungssumme"
                />

                <Slider
                  label="Avalprovision p.a."
                  value={avalProvProzPa}
                  onChange={setAvalProvProzPa}
                  min={0.5}
                  max={3.5}
                  step={0.1}
                  suffix="%"
                  hint="Banken/Versicherer üblich 1,0–2,5 % p.a."
                />

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                  <div>
                    <label className="label text-xs">Erfüllung Laufzeit</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={erfuellungsLaufzeitMonate}
                        onChange={(e) => setErfuellungsLaufzeitMonate(parseInt(e.target.value) || 0)}
                        min={0}
                        max={36}
                        className="input pr-14 text-right tabular-nums"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">Mon</span>
                    </div>
                  </div>
                  <div>
                    <label className="label text-xs">Gewährleist. Laufzeit</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={gewaehrleistungsLaufzeitJahre}
                        onChange={(e) => setGewaehrleistungsLaufzeitJahre(parseInt(e.target.value) || 0)}
                        min={0}
                        max={10}
                        className="input pr-14 text-right tabular-nums"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">Jahre</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="space-y-4">
              <ResultCard
                eyebrow="Vertragserfüllungs-Bürgschaft"
                value={result.erfBetrag}
                hint={`${erfuellungsProz} % von ${eur(vertragssumme, 0)}`}
              />
              <ResultCard
                eyebrow="Gewährleistungs-Bürgschaft"
                value={result.gewBetrag}
                hint={`${gewaehrleistungsProz} % von ${eur(vertragssumme, 0)}`}
              />

              <div className="card border-2 border-indigo-200">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-gray-900">Avalprovision-Kosten gesamt</h3>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Erfüllung ({erfuellungsLaufzeitMonate} Monate):</span>
                    <span className="tabular-nums font-medium text-gray-900">{eur(result.erfAvalKosten)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Gewährleistung ({gewaehrleistungsLaufzeitJahre} Jahre):</span>
                    <span className="tabular-nums font-medium text-gray-900">{eur(result.gewAvalKosten)}</span>
                  </div>
                  <div className="flex justify-between pt-3 mt-3 border-t border-gray-200">
                    <span className="font-bold text-indigo-900">Σ Avalprovision-Kosten</span>
                    <span className="tabular-nums font-extrabold text-indigo-700 text-lg">
                      {eur(result.gesamtAvalKosten)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 pt-1">
                    <span>als % der Vertragssumme</span>
                    <span className="tabular-nums">{fmt(result.gesamtAvalProz)} %</span>
                  </div>
                </div>
              </div>

              <div className="card-flat bg-amber-50 border-amber-200">
                <p className="text-xs uppercase tracking-wider font-bold text-amber-800 mb-1">
                  Kalkulations-Tipp
                </p>
                <p className="text-sm text-amber-900 leading-relaxed">
                  Die {fmt(result.gesamtAvalProz)} % Avalprovision sind <strong>echte Bürokosten</strong> — sie gehören in
                  Ihre Gemeinkosten oder direkt als Zuschlag in die Kalkulation. Wer sie vergisst,
                  unterbietet sich.
                </p>
              </div>
            </div>
          </div>

          <div className="max-w-3xl mx-auto mt-10 bg-indigo-50 border border-indigo-200 rounded-lg p-5">
            <p className="text-xs uppercase tracking-wider font-bold text-indigo-800 mb-2 inline-flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" /> Hinweis
            </p>
            <p className="text-sm text-indigo-900 leading-relaxed">
              Berechnung nach VOB/B § 17 (Sicherheitsleistung). Die genauen Prozentsätze und
              Laufzeiten ergeben sich aus dem konkreten Werkvertrag bzw. der Vergabebekanntmachung.
              Avalprovision-Sätze schwanken je nach Bonität, Bank/Versicherer und Marktlage —
              fragen Sie bei Ihrer Hausbank oder einem Aval-Spezialisten konkrete Konditionen ab.
              Diese Berechnung ersetzt keine Rechts- oder Steuerberatung.
            </p>
          </div>
        </div>
      </section>

      <CrossCta />
    </>
  );
}

function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  suffix: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex items-center gap-3">
        <input
          type="range"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          min={min}
          max={max}
          step={step}
          className="flex-1 accent-indigo-600"
        />
        <span className="font-bold text-indigo-700 tabular-nums w-16 text-right">
          {value} {suffix}
        </span>
      </div>
      {hint && <p className="text-xs text-gray-500 mt-1.5">{hint}</p>}
    </div>
  );
}

function ResultCard({ eyebrow, value, hint }: { eyebrow: string; value: number; hint: string }) {
  return (
    <div className="card-flat">
      <p className="text-[11px] uppercase tracking-wider font-bold text-gray-500 mb-2">{eyebrow}</p>
      <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 tabular-nums">{eur(value, 0)}</p>
      <p className="text-xs text-gray-500 mt-1">{hint}</p>
    </div>
  );
}

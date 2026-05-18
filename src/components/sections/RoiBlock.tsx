import { useMemo, useState } from 'react';
import { TrendingDown, TrendingUp, Calculator, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import SectionHeader from '@/components/ui/SectionHeader';

/**
 * ROI block — anchored pricing comparison.
 *
 * Pattern: Stanford anchor effect. Lead with the high cost of an in-house
 * calculator (~€75k/yr fully loaded), then show KALKU underneath.
 *
 * Interactive: user moves a slider of "Submissionen pro Monat" — the panel
 * recomputes savings. For a 55-year-old Geschäftsführer with a calculator
 * in mind, this is the math their Sekretärin will run anyway. We just
 * give them the numbers up-front so the answer is visible at first browse.
 */
const HOURS_PER_SUB_INHOUSE = 40;
const HOURS_PER_SUB_KALKU = 4;
const STUNDENSATZ = 70;
const INHOUSE_BRUTTO_YEAR = 92_000; // fully loaded incl. Sozialabgaben

export default function RoiBlock() {
  const [subs, setSubs] = useState(6);

  const calc = useMemo(() => {
    const hoursSavedPerMonth = (HOURS_PER_SUB_INHOUSE - HOURS_PER_SUB_KALKU) * subs;
    const valueSavedPerMonth = hoursSavedPerMonth * STUNDENSATZ;
    const valueSavedPerYear = valueSavedPerMonth * 12;
    const kalkuMonthCost = subs <= 1 ? subs * 400 : subs <= 5 ? 3_000 : 5_000;
    const kalkuPackage = subs <= 1 ? 'Einzelbeauftragung' : subs <= 5 ? 'PAKET M' : 'PAKET L';
    const kalkuYearCost = kalkuMonthCost * 12;
    const netSaving = valueSavedPerYear - kalkuYearCost;
    return { hoursSavedPerMonth, valueSavedPerMonth, valueSavedPerYear, kalkuMonthCost, kalkuPackage, kalkuYearCost, netSaving };
  }, [subs]);

  return (
    <section className="section bg-paper">
      <div className="container-page">
        <SectionHeader
          eyebrow="Rechnen wir kurz"
          title="Inhouse-Kalkulator oder KALKU — was rechnet sich?"
          subtitle="Eigene Kalkulations-Stelle vollkostenrechnerisch ca. 92.000 € / Jahr. KALKU monatlich ab 3.000 €. Bewegen Sie den Schieber — die Zahlen rechnen sich live."
        />

        <div className="max-w-5xl mx-auto bg-white rounded-2xl ring-1 ring-gray-200 shadow-sm p-6 sm:p-10">
          {/* Slider */}
          <label className="block mb-9">
            <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
              <span className="text-sm font-bold text-gray-900">
                Submissionen pro Monat
              </span>
              <span className="editorial-number text-3xl text-primary-700">{subs}</span>
            </div>
            <input
              type="range"
              min={1}
              max={12}
              step={1}
              value={subs}
              onChange={(e) => setSubs(Number(e.target.value))}
              className="w-full accent-primary-600"
              aria-label="Submissionen pro Monat"
            />
            <div className="flex justify-between text-[11px] text-gray-400 mt-2 tabular-nums">
              <span>1</span><span>6</span><span>12</span>
            </div>
          </label>

          <div className="grid lg:grid-cols-2 gap-5 mb-7">
            {/* Inhouse column */}
            <div className="rounded-xl ring-1 ring-gray-200 bg-gray-50/60 p-6 sm:p-7">
              <div className="flex items-center gap-2 text-gray-600 mb-4">
                <TrendingDown className="w-4 h-4" />
                <span className="text-[11px] uppercase tracking-[0.16em] font-bold">Inhouse-Kalkulator</span>
              </div>
              <p className="editorial-number text-4xl text-gray-900 mb-2">
                {INHOUSE_BRUTTO_YEAR.toLocaleString('de-DE')}&nbsp;€
                <span className="text-base font-medium text-gray-500"> / Jahr</span>
              </p>
              <p className="text-xs text-gray-500 leading-relaxed">
                Bruttogehalt 65 k € + 25 % Lohnnebenkosten + Software, Schulungen, Urlaubsvertretung. Fixe Kosten,
                unabhängig vom Auftragsvolumen.
              </p>
              <ul className="mt-5 space-y-2 text-sm text-gray-700">
                <li className="flex justify-between gap-3 pb-2 border-b border-gray-200">
                  <span>Eigenaufwand / Submission</span>
                  <span className="font-semibold tabular-nums">{HOURS_PER_SUB_INHOUSE} Std.</span>
                </li>
                <li className="flex justify-between gap-3 pb-2 border-b border-gray-200">
                  <span>Std.-Aufwand / Monat</span>
                  <span className="font-semibold tabular-nums">{HOURS_PER_SUB_INHOUSE * subs} Std.</span>
                </li>
                <li className="flex justify-between gap-3">
                  <span>Risiko: Krankheit, Rente, Urlaub</span>
                  <span className="font-semibold text-red-600">hoch</span>
                </li>
              </ul>
            </div>

            {/* KALKU column */}
            <div className="rounded-xl ring-2 ring-primary-500 bg-primary-50/40 p-6 sm:p-7 relative shadow-sm">
              <span className="absolute -top-3 left-6 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary-700 text-white text-[11px] font-bold uppercase tracking-wider">
                Empfehlung
              </span>
              <div className="flex items-center gap-2 text-primary-700 mb-4">
                <TrendingUp className="w-4 h-4" />
                <span className="text-[11px] uppercase tracking-[0.16em] font-bold">KALKU — {calc.kalkuPackage}</span>
              </div>
              <p className="editorial-number text-4xl text-primary-700 mb-2">
                {calc.kalkuYearCost.toLocaleString('de-DE')}&nbsp;€
                <span className="text-base font-medium text-primary-700/70"> / Jahr</span>
              </p>
              <p className="text-xs text-primary-900/70 leading-relaxed">
                Monatlich {calc.kalkuMonthCost.toLocaleString('de-DE')} € — monatlich kündbar, keine Mindestlaufzeit.
                Plus reduzierte Erfolgsprovision bei Zuschlag.
              </p>
              <ul className="mt-5 space-y-2 text-sm text-primary-900">
                <li className="flex justify-between gap-3 pb-2 border-b border-primary-200/60">
                  <span>Ihr Restaufwand / Submission</span>
                  <span className="font-semibold tabular-nums">{HOURS_PER_SUB_KALKU} Std. (Review)</span>
                </li>
                <li className="flex justify-between gap-3 pb-2 border-b border-primary-200/60">
                  <span>Eigenstunden / Monat</span>
                  <span className="font-semibold tabular-nums">{HOURS_PER_SUB_KALKU * subs} Std.</span>
                </li>
                <li className="flex justify-between gap-3">
                  <span>Risiko Ausfall</span>
                  <span className="font-semibold text-emerald-700">4 Teams — abgesichert</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom math row */}
          <div className="rounded-xl bg-emerald-50 ring-1 ring-emerald-200 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 mb-2 text-emerald-700">
                <Calculator className="w-4 h-4" />
                <span className="text-[11px] uppercase tracking-[0.16em] font-bold">
                  Bei {subs} Submission{subs === 1 ? '' : 'en'} / Monat
                </span>
              </div>
              <p className="text-lg sm:text-xl font-bold text-emerald-900 leading-tight">
                {calc.hoursSavedPerMonth.toLocaleString('de-DE')} Stunden gespart pro Monat ·
                <span className="text-emerald-700">
                  &nbsp;~ {calc.valueSavedPerYear.toLocaleString('de-DE')} € / Jahr Personalwert
                </span>
              </p>
              <p className="text-sm text-emerald-900/80 mt-1">
                Netto-Vorteil ggü. Inhouse: <strong>{Math.max(0, calc.netSaving).toLocaleString('de-DE')} €</strong>
                {calc.netSaving > 0 && ' — und Ihr Inhaber zurück auf der Baustelle.'}
              </p>
            </div>
            <Link to="/kontakt/" className="btn btn-success btn-lg cta-magnetic flex-shrink-0">
              Erstgespräch vereinbaren <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <p className="text-[11px] text-gray-400 mt-5 leading-relaxed">
            Berechnung beispielhaft. Stundenwerte basieren auf typischem LV-Umfang (80–150 Positionen), Stundensatz
            Mittelwert Kalkulationsstelle 70 €. Inhouse-Kosten = Vollkostenrechnung 65 k € Brutto + Sozialabgaben +
            Software/Hardware/Schulung.
          </p>
        </div>
      </div>
    </section>
  );
}

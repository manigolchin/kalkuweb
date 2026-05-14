import { CheckCircle2, FileText } from 'lucide-react';

/**
 * Visual mockup shown in hero right column on desktop.
 * Mimics a "KALKU calculation result" UI to reinforce what we deliver.
 * Pure SVG/HTML — no external assets.
 */
export default function HeroMockup() {
  return (
    <div className="hidden lg:block relative">
      {/* Background glow */}
      <div
        aria-hidden
        className="absolute -inset-8 bg-gradient-to-br from-primary-100/60 via-emerald-50/60 to-amber-50/40 rounded-[2.5rem] blur-2xl"
      />

      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Mac-style chrome */}
        <div className="flex items-center gap-1.5 px-4 py-3 border-b border-gray-100 bg-gray-50">
          <span className="w-3 h-3 rounded-full bg-red-400" />
          <span className="w-3 h-3 rounded-full bg-yellow-400" />
          <span className="w-3 h-3 rounded-full bg-green-400" />
          <div className="ml-3 px-3 py-1 rounded-md bg-white text-xs text-gray-500 border border-gray-100">
            kalku.de/kalkulation/2026-447-tiefbau
          </div>
        </div>

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">
                Ausschreibung 2026-447
              </p>
              <p className="font-bold text-gray-900 text-lg mt-0.5">
                Kanalsanierung Bahnhofsvorplatz
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
              <CheckCircle2 className="w-3 h-3" /> Bepreist
            </span>
          </div>
          <p className="text-xs text-gray-500">
            <FileText className="w-3 h-3 inline -mt-0.5 mr-1" />
            83 Positionen · GAEB X83 · Submission 14.05.2026
          </p>
        </div>

        {/* Position rows */}
        <div className="divide-y divide-gray-100">
          {[
            { pos: '01.01.10', text: 'Asphalt fräsen, t = 4 cm', qty: '1.240 m²', ep: '4,80 €', gp: '5.952,00 €' },
            { pos: '01.02.20', text: 'Schachtdeckel BGW Klasse D 400', qty: '6 St', ep: '385,00 €', gp: '2.310,00 €' },
            { pos: '01.03.05', text: 'PE-HD Rohr DN 250 SDR 17, geliefert + verlegt', qty: '180 m', ep: '92,40 €', gp: '16.632,00 €' },
            { pos: '01.04.40', text: 'Schotter 0/45 mm, geliefert + eingebaut', qty: '320 t', ep: '38,90 €', gp: '12.448,00 €' },
          ].map((r) => (
            <div key={r.pos} className="grid grid-cols-12 px-6 py-3 text-xs hover:bg-gray-50 transition-colors">
              <span className="col-span-2 text-gray-400 font-mono">{r.pos}</span>
              <span className="col-span-5 text-gray-700 truncate">{r.text}</span>
              <span className="col-span-2 text-right text-gray-500">{r.qty}</span>
              <span className="col-span-1 text-right text-gray-700 font-medium">{r.ep}</span>
              <span className="col-span-2 text-right text-gray-900 font-semibold">{r.gp}</span>
            </div>
          ))}
        </div>

        {/* Footer summary */}
        <div className="px-6 py-4 bg-primary-50/60 border-t border-primary-100 flex items-center justify-between">
          <div className="text-xs">
            <p className="text-primary-700 font-medium">Summe netto</p>
            <p className="text-[11px] text-primary-600/80">+ 7,5 % Wagnis & Gewinn berücksichtigt</p>
          </div>
          <p className="text-2xl font-bold text-primary-700 tabular-nums">428.190,40 €</p>
        </div>
      </div>

      {/* Floating trust badge */}
      <div className="absolute -bottom-5 -left-5 bg-white rounded-xl shadow-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-900">EFB 221, 222, 223</p>
          <p className="text-[11px] text-gray-500">automatisch ausgefüllt</p>
        </div>
      </div>
    </div>
  );
}

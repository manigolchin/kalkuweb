import { CheckCircle2, FileText, Clock3 } from 'lucide-react';

/**
 * Refined hero LV mockup — replaces the MacOS-chrome version.
 *
 * Visual goal: looks like a document cover, not a browser screenshot.
 * The Bauunternehmer should see a real piece of work, not a marketing illustration.
 */
export default function HeroLvCard() {
  return (
    <div className="relative max-w-md mx-auto lg:max-w-none">
      {/* Soft halo */}
      <div className="halo" aria-hidden />

      {/* Card stack — back card peeks behind */}
      <div
        aria-hidden
        className="absolute inset-0 bg-white border border-gray-200 rounded-2xl translate-x-3 translate-y-3 rotate-1"
      />

      <article className="relative bg-white rounded-2xl shadow-xl ring-1 ring-gray-200/80 overflow-hidden">
        {/* Document-cover header — no MacOS chrome */}
        <header className="px-6 py-5 border-b border-gray-100 bg-gradient-to-b from-primary-50/40 to-white">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-primary-700 font-bold">
                Vorabkalkulation · KALKU
              </p>
              <p className="font-bold text-gray-900 text-lg leading-tight mt-1">
                Kanalsanierung Musterstraße 42
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold whitespace-nowrap">
              <CheckCircle2 className="w-3 h-3" strokeWidth={3} /> Bepreist
            </span>
          </div>
          <p className="text-xs text-gray-500 inline-flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <FileText className="w-3 h-3" />
              GAEB X83 · 83 Positionen
            </span>
            <span className="w-px h-3 bg-gray-300" aria-hidden />
            <span className="inline-flex items-center gap-1">
              <Clock3 className="w-3 h-3" />
              Bearbeitung 46 h
            </span>
          </p>
        </header>

        {/* Position rows — tabular, real LV feel */}
        <div className="divide-y divide-gray-100">
          {[
            { pos: '01.01.10', text: 'Asphalt fräsen, t = 4 cm', qty: '1.240 m²', gp: '5.952,00' },
            { pos: '01.02.20', text: 'Schachtdeckel BGW Klasse D 400', qty: '6 St', gp: '2.310,00' },
            { pos: '01.03.05', text: 'PE-HD Rohr DN 250 SDR 17', qty: '180 m', gp: '16.632,00' },
            { pos: '01.04.40', text: 'Schotter 0/45 mm, eingebaut', qty: '320 t', gp: '12.448,00' },
          ].map((r) => (
            <div key={r.pos} className="lv-grid px-6 py-3 text-xs hover:bg-gray-50/60 transition-colors">
              <span className="text-gray-400 font-mono">{r.pos}</span>
              <span className="text-gray-700 truncate pr-3">{r.text}</span>
              <span className="text-right text-gray-500 tabular-nums">{r.qty}</span>
              <span className="text-right text-gray-900 font-semibold tabular-nums">{r.gp} €</span>
            </div>
          ))}
          <div className="px-6 py-2 text-[11px] text-gray-400 italic text-center">
            … 79 weitere Positionen
          </div>
        </div>

        {/* Summary footer */}
        <footer className="px-6 py-5 bg-gradient-to-b from-primary-50/60 to-primary-50 border-t border-primary-100 flex items-end justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-primary-700 font-bold mb-0.5">
              Summe netto
            </p>
            <p className="text-[11px] text-primary-600/80">+ Wagnis &amp; Gewinn nach Ihrer Vorgabe</p>
          </div>
          <p className="editorial-number text-3xl text-primary-700">
            428.190,40&nbsp;€
          </p>
        </footer>
      </article>

      {/* Floating EFB badge — bottom-left */}
      <div className="absolute -bottom-4 -left-3 sm:-left-5 bg-white rounded-2xl shadow-xl ring-1 ring-gray-200/80 px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-xs font-bold text-gray-900">EFB 221 · 222 · 223</p>
          <p className="text-[11px] text-gray-500">automatisch befüllt</p>
        </div>
      </div>

      {/* Floating "Live" badge — top-right */}
      <div className="absolute -top-4 -right-3 sm:-right-5 bg-gray-900 text-white rounded-full shadow-lg px-3.5 py-1.5 flex items-center gap-2 text-[11px] font-bold">
        <span className="status-dot" aria-hidden />
        <span>Submission heute</span>
      </div>
    </div>
  );
}

import { useState } from 'react';
import type { PlausibilityResult } from '@/lib/kalkulator/marketPrices';

const STYLES: Record<PlausibilityResult['ampel'], { dot: string; bg: string; text: string; label: string }> = {
  green: {
    dot: 'bg-emerald-500',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    label: 'Marktrahmen',
  },
  yellow: {
    dot: 'bg-amber-500',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    label: 'prüfen',
  },
  red: {
    dot: 'bg-red-500',
    bg: 'bg-red-50',
    text: 'text-red-700',
    label: 'auffällig',
  },
  unknown: {
    dot: 'bg-gray-300',
    bg: 'bg-gray-50',
    text: 'text-gray-400',
    label: '—',
  },
};

export default function PlausibilityBadge({ result }: { result: PlausibilityResult }) {
  const [open, setOpen] = useState(false);
  const s = STYLES[result.ampel];
  if (result.ampel === 'unknown') {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] text-gray-300"
        aria-hidden
        title="Keine Marktbandbreite hinterlegt für diese Position"
      >
        <span className={`w-2 h-2 rounded-full ${s.dot}`} />
      </span>
    );
  }
  return (
    <span className="relative inline-block print:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 100)}
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${s.bg} ${s.text} hover:opacity-80`}
        aria-label={`Plausibilität: ${s.label}`}
      >
        <span className={`w-2 h-2 rounded-full ${s.dot}`} />
        {s.label}
      </button>
      {open && result.hint && (
        <span className="absolute z-20 right-0 top-full mt-1 w-64 p-2.5 rounded-lg bg-gray-900 text-white text-xs leading-snug shadow-xl">
          {result.hint}
          {typeof result.deviation === 'number' && (
            <span className="block mt-1 text-gray-300">
              Abweichung vom Median: {result.deviation > 0 ? '+' : ''}
              {result.deviation.toFixed(0)} %
            </span>
          )}
        </span>
      )}
    </span>
  );
}

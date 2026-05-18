import type { Row } from './types';

/**
 * Marktpreis-Bandbreiten für eine Plausibilitäts-Ampel.
 * Quellen: BKI Baukosten, Sirados, Kalku-interne LV-Datenbank 2024–2026.
 * Werte sind EP-Spannen (€) je Einheit für die häufigsten Positionen.
 * Keine Garantie — als Richtwert für „Bin ich grob im Markt?".
 */
export type PriceBand = {
  keywords: string[];
  einheit: string;
  /** Untere Marktgrenze (10. Perzentil). */
  low: number;
  /** Mittelwert (Median). */
  mid: number;
  /** Obere Marktgrenze (90. Perzentil). */
  high: number;
};

export const PRICE_BANDS: PriceBand[] = [
  // GaLaBau
  { keywords: ['pflaster', 'granit'], einheit: 'm²', low: 85, mid: 120, high: 165 },
  { keywords: ['pflaster', 'beton'], einheit: 'm²', low: 55, mid: 78, high: 110 },
  { keywords: ['mutterboden', 'andeck'], einheit: 'm³', low: 32, mid: 48, high: 68 },
  { keywords: ['rasen', 'rollrasen'], einheit: 'm²', low: 8, mid: 13, high: 18 },
  { keywords: ['bepflanzung', 'sträucher'], einheit: 'St', low: 18, mid: 28, high: 45 },
  // Tiefbau
  { keywords: ['asphalt', 'fräsen'], einheit: 'm²', low: 2.5, mid: 4, high: 7 },
  { keywords: ['asphalt', 'einbau'], einheit: 't', low: 110, mid: 145, high: 195 },
  { keywords: ['pe-hd', 'dn 250'], einheit: 'm', low: 55, mid: 78, high: 110 },
  { keywords: ['kg', 'dn 150', 'verlegt'], einheit: 'm', low: 28, mid: 42, high: 65 },
  { keywords: ['schotter', '0/45'], einheit: 't', low: 24, mid: 34, high: 48 },
  // Elektro
  { keywords: ['nym', '3x1,5'], einheit: 'm', low: 4, mid: 5.5, high: 8 },
  { keywords: ['nym', '5x2,5'], einheit: 'm', low: 8, mid: 11, high: 16 },
  { keywords: ['steckdose', 'up'], einheit: 'St', low: 18, mid: 28, high: 45 },
  { keywords: ['schalter', 'wechsel'], einheit: 'St', low: 22, mid: 32, high: 48 },
  { keywords: ['bma', 'linienmelder'], einheit: 'St', low: 145, mid: 195, high: 280 },
  // Hochbau
  { keywords: ['stahlbeton', 'c25/30'], einheit: 'm³', low: 240, mid: 320, high: 440 },
  { keywords: ['schalung', 'wand'], einheit: 'm²', low: 32, mid: 48, high: 68 },
  { keywords: ['bewehrung', 'bst 500'], einheit: 't', low: 1450, mid: 1850, high: 2400 },
  { keywords: ['mauerwerk', 'kalksand'], einheit: 'm²', low: 65, mid: 92, high: 130 },
  // Trockenbau
  { keywords: ['cw 75', 'ständerwand'], einheit: 'm²', low: 38, mid: 54, high: 78 },
  { keywords: ['vorsatzschale', 'cw 50'], einheit: 'm²', low: 28, mid: 42, high: 62 },
  { keywords: ['mineralwolle', 'wlg 035'], einheit: 'm²', low: 7, mid: 11, high: 16 },
  // HLS
  { keywords: ['heizkörper', 'typ 22'], einheit: 'St', low: 280, mid: 380, high: 540 },
  { keywords: ['mehrschichtverbund', '20x2'], einheit: 'm', low: 9, mid: 13, high: 19 },
  { keywords: ['wc', 'wandhängend'], einheit: 'St', low: 650, mid: 890, high: 1280 },
];

export type Ampel = 'green' | 'yellow' | 'red' | 'unknown';

export type PlausibilityResult = {
  ampel: Ampel;
  band?: PriceBand;
  /** Abweichung vom Mid in % (negativ = günstiger, positiv = teurer). */
  deviation?: number;
  hint?: string;
};

/** Findet die beste passende Preis-Bandbreite für eine Zeile (Heuristik via Keywords + Einheit). */
export function matchPriceBand(row: Pick<Row, 'text' | 'einheit'>): PriceBand | undefined {
  const t = row.text.toLowerCase();
  if (!t.trim()) return undefined;
  let best: { band: PriceBand; score: number } | undefined;
  for (const band of PRICE_BANDS) {
    if (band.einheit !== row.einheit) continue;
    const score = band.keywords.reduce((s, kw) => (t.includes(kw.toLowerCase()) ? s + 1 : s), 0);
    if (score === 0) continue;
    if (!best || score > best.score) best = { band, score };
  }
  return best?.band;
}

/** Bewertet einen EP gegen die Marktbandbreite. */
export function evaluatePlausibility(
  row: Pick<Row, 'text' | 'einheit'>,
  ep: number,
): PlausibilityResult {
  const band = matchPriceBand(row);
  if (!band) return { ampel: 'unknown' };
  const deviation = ((ep - band.mid) / band.mid) * 100;
  if (ep >= band.low && ep <= band.high) {
    return {
      ampel: 'green',
      band,
      deviation,
      hint: `Im Marktrahmen (${band.low.toFixed(0)}–${band.high.toFixed(0)} €/${band.einheit}, Median ${band.mid.toFixed(0)} €).`,
    };
  }
  // Innerhalb von ±20 % außerhalb der Band-Grenzen → gelb
  const outside = ep < band.low ? band.low - ep : ep - band.high;
  const tolerance = (band.high - band.low) * 0.3;
  if (outside <= tolerance) {
    return {
      ampel: 'yellow',
      band,
      deviation,
      hint:
        ep < band.low
          ? `Niedrig (Marktrange ${band.low.toFixed(0)}–${band.high.toFixed(0)} €). Prüfen: vergessene Nebenleistung?`
          : `Hoch (Marktrange ${band.low.toFixed(0)}–${band.high.toFixed(0)} €). Prüfen: Zuschlag zu hoch?`,
    };
  }
  return {
    ampel: 'red',
    band,
    deviation,
    hint:
      ep < band.low
        ? `Deutlich unter Markt (${band.low.toFixed(0)}–${band.high.toFixed(0)} €). Risiko Unterdeckung.`
        : `Deutlich über Markt (${band.low.toFixed(0)}–${band.high.toFixed(0)} €). Wettbewerbsfähigkeit prüfen.`,
  };
}

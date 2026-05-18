import type { Row } from './types';

export type Preset = {
  slug: string;
  label: string;
  lohn: number;
  zuschlag: number;
  einheit: string;
  rows: Array<Omit<Row, 'id' | 'nu' | 'bemerkung'> & { nu?: boolean; bemerkung?: string }>;
};

export const PRESETS: Preset[] = [
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
  {
    slug: 'trockenbau',
    label: 'Trockenbau',
    lohn: 46,
    zuschlag: 14,
    einheit: 'm²',
    rows: [
      { pos: '01.01.10', text: 'GK-Ständerwand CW 75, beidseitig 12,5 mm GKB', einheit: 'm²', lohn: 46, zeit: 0.55, material: 18.5, zuschlag: 14, menge: 320 },
      { pos: '01.02.20', text: 'Vorsatzschale CW 50, einlagig 12,5 mm GKB', einheit: 'm²', lohn: 46, zeit: 0.35, material: 11, zuschlag: 14, menge: 180 },
      { pos: '01.03.05', text: 'Mineralwolle WLG 035, d = 60 mm, einlegen', einheit: 'm²', lohn: 46, zeit: 0.1, material: 6.5, zuschlag: 14, menge: 320 },
    ],
  },
  {
    slug: 'hls',
    label: 'HLS',
    lohn: 56,
    zuschlag: 16,
    einheit: 'St',
    rows: [
      { pos: '01.01.10', text: 'Heizkörper Typ 22, 600×1000, geliefert + montiert', einheit: 'St', lohn: 56, zeit: 1.2, material: 145, zuschlag: 16, menge: 24 },
      { pos: '01.02.20', text: 'Mehrschichtverbundrohr 20×2, gepresst, UP', einheit: 'm', lohn: 56, zeit: 0.12, material: 4.8, zuschlag: 16, menge: 320 },
      { pos: '01.03.05', text: 'WC-Anlage, wandhängend, mit Vorwandelement', einheit: 'St', lohn: 56, zeit: 4.5, material: 380, zuschlag: 16, menge: 6 },
    ],
  },
];

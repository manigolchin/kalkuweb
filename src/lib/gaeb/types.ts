// GAEB position — one Item or Position in a Leistungsverzeichnis
export type Position = {
  oz: string;
  pos: string;
  kurztext: string;
  langtext: string;
  einheit: string;
  menge?: number;
  ep?: number;
  gp?: number;
  level: number;
  type: 'item' | 'remark' | 'group';
  qtyTBD?: boolean;
  bedarfsposition?: boolean;
  wahlposition?: boolean;
  eventualposition?: boolean;
  zuschlagsposition?: boolean;
};

export type ParsedGaeb = {
  filename: string;
  size: number;
  format: GaebFormat;
  formatLabel: string;
  projectName?: string;
  projectDescription?: string;
  awardingAuthority?: string;
  bidder?: string;
  currency: string;
  positionCount: number;
  positions: Position[];
  groups: { oz: string; label: string; level: number }[];
  estimatedValue?: number;
  date?: string;
  version?: string;
  hasLongtext: boolean;
};

export type GaebFormat =
  | 'gaeb-xml-3.1' | 'gaeb-xml-3.2' | 'gaeb-xml-3.3'
  | 'gaeb-90' | 'gaeb-2000'
  | 'onorm-a2063'
  | 'unknown';

export const FORMAT_LABELS: Record<GaebFormat, string> = {
  'gaeb-xml-3.1': 'GAEB DA XML 3.1',
  'gaeb-xml-3.2': 'GAEB DA XML 3.2',
  'gaeb-xml-3.3': 'GAEB DA XML 3.3',
  'gaeb-90': 'GAEB 90 (ASCII)',
  'gaeb-2000': 'GAEB 2000',
  'onorm-a2063': 'ÖNorm A2063',
  unknown: 'Unbekannt',
};

// DA codes (Datenart)
export const DA_LABELS: Record<string, string> = {
  '81': 'Leistungsverzeichnis (Anforderung)',
  '82': 'Kostenanschlag',
  '83': 'Angebotsaufforderung',
  '84': 'Angebot (Bieter)',
  '85': 'Nebenangebot',
  '86': 'Auftragserteilung',
  '87': 'Auftragsbestätigung',
  '89': 'Aufmaß',
};

export function daFromFormat(_format: GaebFormat, filename: string): string | undefined {
  const ext = (filename.split('.').pop() ?? '').toLowerCase();
  const m = ext.match(/[xdp](\d{2})/);
  return m ? m[1] : undefined;
}

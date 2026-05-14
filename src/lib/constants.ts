// NAP (Name / Address / Phone) — used for Schema.org, footer, contact page, sitemap
export const NAP = {
  legalName: 'KALKU Baukalkulationen',
  brandName: 'KALKU',
  street: 'Berliner Promenade 15',
  postalCode: '66111',
  city: 'Saarbrücken',
  country: 'DE',
  phone: '+49 681 41096430',
  whatsapp: '+49 1516 7671877',
  email: 'info@kalku.de',
  vatId: 'DE334890692',
  geo: { lat: 49.2362, lng: 6.9913 },
  url: 'https://kalku.de',
} as const;

// Pricing — wörtlich aus Konditionen-Audit übernommen
export const PRICING = {
  einzel: {
    name: 'Einzelbeauftragung',
    price: '200–600 €',
    priceMin: 200,
    priceMax: 600,
    successFee: '5 %',
    bullets: [
      'Pauschale abhängig von der Anzahl der LV-Positionen',
      'Erfolgsprovision wird erst bei Auftragserteilung fällig',
      'Keine monatlichen Grundgebühren',
      'Flexible Beauftragung bei Bedarf',
    ],
  },
  paketM: {
    name: 'PAKET M',
    price: '3.000 € / Monat',
    successFee: '3,9 %',
    bullets: [
      'Unbegrenzt viele Baukalkulationen pro Monat',
      'Wöchentliche Ausschreibungsrecherche inklusive',
      'Niedrigere Erfolgsprovision als bei Einzelbeauftragung',
      'Monatlich kündbar — keine Mindestlaufzeit',
    ],
  },
  paketL: {
    name: 'PAKET L',
    price: '5.000 € / Monat',
    successFee: '2,9 %',
    bullets: [
      'Unbegrenzt viele Baukalkulationen pro Monat',
      'Wöchentliche Ausschreibungsrecherche inklusive',
      'Niedrigste Erfolgsprovision',
      'Priorisierte Bearbeitung kurzfristiger Submissionen',
      'Monatlich kündbar — keine Mindestlaufzeit',
    ],
  },
} as const;

// Mindestvoraussetzungen — Self-Check + Hero-Trust
export const MINDESTVORAUSSETZUNGEN = [
  { label: '3 Mitarbeiter', short: '3 MA' },
  { label: '6 Monate am Markt', short: '6 Monate' },
  { label: '3 vergleichbare Referenzen', short: '3 Referenzen' },
] as const;

// Trade configuration — slug, label, color (Tailwind palette name), icon (lucide name)
// Color quintet pattern: bg-{color}-50, bg-{color}-100, text-{color}-600, text-{color}-700, border-{color}-200
export type Trade = {
  slug: string;
  name: string;
  short: string;
  color: 'emerald' | 'sky' | 'stone' | 'yellow' | 'orange' | 'blue' | 'red';
  icon: string;
  tagline: string;
};

export const TRADES: readonly Trade[] = [
  {
    slug: 'galabau',
    name: 'GaLaBau',
    short: 'GaLaBau',
    color: 'emerald',
    icon: 'Trees',
    tagline: 'Garten- und Landschaftsbau — von der Pflasterfläche bis zur Außenanlage Schule.',
  },
  {
    slug: 'tiefbau',
    name: 'Tiefbau',
    short: 'Tiefbau',
    color: 'sky',
    icon: 'Pickaxe',
    tagline: 'Erdbewegung, Pfahlgründung, Kanal — komplette Tiefbau-LVs in 48 h bepreist.',
  },
  {
    slug: 'hochbau',
    name: 'Hochbau',
    short: 'Hochbau',
    color: 'stone',
    icon: 'Building2',
    tagline: 'Stahlbeton, Mauerwerk, Schalung — Rohbau- und Fertigbau-Kalkulation nach VOB.',
  },
  {
    slug: 'elektro',
    name: 'Elektro',
    short: 'Elektro',
    color: 'yellow',
    icon: 'Zap',
    tagline: 'Installation, BMA, EMA, KNX/DALI — komplexe Gewerke korrekt bepreist.',
  },
  {
    slug: 'haustechnik',
    name: 'Haustechnik',
    short: 'TGA / HLS',
    color: 'orange',
    icon: 'Wrench',
    tagline: 'Sanitär, Heizung, Lüftung, Klima, Kälte — TGA-Pakete sauber zugeordnet.',
  },
  {
    slug: 'fenster',
    name: 'Fenster',
    short: 'Fenster',
    color: 'blue',
    icon: 'PanelTop',
    tagline: 'Fensterbau, Türen, Fassaden — Hersteller-Detection inklusive.',
  },
  {
    slug: 'schadstoff',
    name: 'Schadstoff',
    short: 'Schadstoff',
    color: 'red',
    icon: 'AlertTriangle',
    tagline: 'Asbest, KMF, HBCD — TRGS-konforme Sanierungs-Kalkulation.',
  },
] as const;

// Trade-color helper — returns the Tailwind class quintet
export function tradeClasses(color: Trade['color']) {
  return {
    bg: `bg-${color}-50`,
    bgStrong: `bg-${color}-100`,
    text: `text-${color}-600`,
    textStrong: `text-${color}-700`,
    border: `border-${color}-200`,
  };
}

// External services
export const SERVICES = {
  calBookingUrl: 'https://cal.com/kalku/erstgespraech', // self-hosted endpoint set in Phase 3.4
  plausibleDomain: 'kalku.de',
  pipedriveWebhookPath: '/api/forms/submit', // backend endpoint, async push
} as const;

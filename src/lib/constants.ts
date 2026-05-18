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
  color:
    | 'emerald'
    | 'sky'
    | 'stone'
    | 'yellow'
    | 'orange'
    | 'blue'
    | 'red'
    | 'slate'
    | 'amber'
    | 'rose';
  icon: string;
  tagline: string;
};

export const TRADES: readonly Trade[] = [
  {
    slug: 'hochbau',
    name: 'Hochbau',
    short: 'Hochbau',
    color: 'stone',
    icon: 'Building2',
    tagline: 'Stahlbeton, Mauerwerk, Schalung — Rohbau- und Fertigbau-Kalkulation nach VOB.',
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
    slug: 'strassenbau',
    name: 'Straßenbau',
    short: 'Straßenbau',
    color: 'slate',
    icon: 'Route',
    tagline: 'Asphalt, Pflaster, Markierung — Straßen-, Wege- und Platzbau nach ZTV Asphalt.',
  },
  {
    slug: 'galabau',
    name: 'GaLaBau',
    short: 'GaLaBau',
    color: 'emerald',
    icon: 'Trees',
    tagline: 'Garten- und Landschaftsbau — von der Pflasterfläche bis zur Außenanlage Schule.',
  },
  {
    slug: 'haustechnik',
    name: 'HLS / Haustechnik',
    short: 'HLS',
    color: 'orange',
    icon: 'Wrench',
    tagline: 'Sanitär, Heizung, Lüftung, Klima, Kälte — TGA-Pakete sauber zugeordnet.',
  },
  {
    slug: 'innenausbau',
    name: 'Innenausbau',
    short: 'Innenausbau',
    color: 'amber',
    icon: 'Hammer',
    tagline: 'Trockenbau, Bodenbelag, Maler, Fliesen — Innenausbau-LVs schlüsselfertig bepreist.',
  },
  {
    slug: 'erdbau-abbruch',
    name: 'Erd- / Abbrucharbeiten',
    short: 'Erd- / Abbruch',
    color: 'rose',
    icon: 'Construction',
    tagline: 'Erdaushub, Rückbau, Entsorgung — Abbruch und Erdbau inkl. AVV-konformer Entsorgung.',
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
  calendlyUrl: 'https://calendly.com/kalku/sm-ma',
  // Live production tools (separate apps under kalku.de):
  gaebKonverterUrl: 'https://gaeb.kalku.de',
  kalkulatorUrl: 'https://kalkulat.kalku.de',
  // Social media (verified Mai 2026)
  facebookUrl: 'https://www.facebook.com/kalku.de/?locale=de_DE',
  instagramUrl: 'https://www.instagram.com/kalku_de/',
  tiktokUrl: 'https://www.tiktok.com/@kalku.de',
  linkedinCompanyUrl: 'https://de.linkedin.com/company/kalku',
  linkedinAlaatdinUrl: 'https://de.linkedin.com/in/alaatdin-coksari-3881b8275',
  linkedinBuelentUrl: 'https://de.linkedin.com/in/coksari',
  // Analytics
  plausibleDomain: 'kalku.de',
  pipedriveWebhookPath: '/api/forms/submit',
} as const;

// Co-Owners / Team-Leads
export const TEAM = {
  inhaber: {
    initials: 'AC',
    name: 'Alaatdin Coksari',
    role: 'Inhaber & Geschäftsführer',
    bio: 'Gründet 2019 KALKU als spezialisiertes Kalkulationsbüro für öffentliche Vergaben. 14+ Jahre Erfahrung in Submission, Vergaberecht und VOB/A. Persönlicher Ansprechpartner für jeden Stammkunden.',
    linkedin: 'https://de.linkedin.com/in/alaatdin-coksari-3881b8275',
  },
  kalkulator: {
    initials: 'BC',
    name: 'Bülent Coksari',
    role: 'Leitender Kalkulator',
    bio: 'Bruder des Inhabers. GaLaBau-Hintergrund (eigene GaLaBau-Praxis), Studium Bauingenieurwesen, parallel Geschäftsführer der ui medien UG (Filmproduktion) — bringt Praxis-Wissen und Tech-Affinität in die Kalkulation.',
    linkedin: 'https://de.linkedin.com/in/coksari',
  },
} as const;

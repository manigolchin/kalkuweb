export type Row = {
  id: string;
  pos: string;
  text: string;
  einheit: string;
  lohn: number;
  zeit: number;
  material: number;
  zuschlag: number;
  menge: number;
  /** NU = Subunternehmer-Position, wahr → eigener NU-Zuschlag wird angewendet. */
  nu: boolean;
  /** Optionale freie Bemerkung — wird in Excel-Export übernommen. */
  bemerkung: string;
};

/** Globale Aufschlagsfaktoren, VOB-konform parametrisierbar. */
export type Aufschlaege = {
  /** Baustellengemeinkosten in % — i. d. R. 3–8 %. */
  bgk: number;
  /** Allgemeine Geschäftskosten in % — i. d. R. 6–12 %. */
  agk: number;
  /** Wagnis & Gewinn in % — i. d. R. 5–10 %. */
  wug: number;
  /** Subunternehmer-Zuschlag in % (nur auf NU-Positionen) — i. d. R. 5–10 %. */
  nuZuschlag: number;
  /** Mehrwertsteuersatz in % — Standard 19. */
  mwst: number;
};

export const DEFAULT_AUFSCHLAEGE: Aufschlaege = {
  bgk: 0,
  agk: 0,
  wug: 0,
  nuZuschlag: 5,
  mwst: 19,
};

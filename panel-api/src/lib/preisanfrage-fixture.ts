/**
 * Mock fixture for the preisanfrage client. Activated by setting
 *   PREISANFRAGE_MOCK=fixture
 * in the panel-api environment. Lets developers see the Firmen panel
 * working without provisioning a real preisanfrage service-account JWT
 * or having preisanfrage reachable.
 *
 * Data shapes match the live API exactly (see preisanfrage.ts).
 * Names + counts are based on the real OneDrive layout observed on
 * 2026-05-22 (verified by direct ls — see formula_audit_vs_real_excel.md).
 *
 * DO NOT use this fixture in production: it returns fake Ausschreibungen
 * data and would mask a real misconfiguration of the upstream JWT.
 * The mock-mode is loud: every response is annotated `[MOCK]` in stderr.
 */

import type {
  PreisanfrageCompany,
  PreisanfrageOverview,
  PreisanfrageProject,
  PreisanfrageExternalProject,
  PreisanfragePosition,
  PreisanfrageInboxEmail,
  PreisanfrageInboxStats,
  PreisanfrageInboxPage,
} from './preisanfrage.js';

let warned = false;
function warnOnce() {
  if (warned) return;
  warned = true;
  console.warn(
    '[preisanfrage] running in MOCK mode — set PREISANFRAGE_MOCK=0 + PREISANFRAGE_SERVICE_JWT in production',
  );
}

/** Subset of the real 98 firms — picked to span trade types, won/lost mix,
 *  recent vs old activity. Folder names match the real OneDrive layout. */
const MOCK_OVERVIEW: PreisanfrageOverview = {
  rows: [
    {
      kind: 'managed',
      id: 5,
      folderName: '1695_Gesellchen_GmbH',
      displayName: 'Gesellchen GmbH',
      tradeType: 'galabau',
      projectCount: 36,
      wonCount: 4,
      wonSumBrutto: 1_245_320.5,
      lastSubmissionDate: '2026-05-12',
      adoptedCompanyId: null,
      adoptedAt: null,
      parsedCount: null,
    },
    {
      kind: 'managed',
      id: 6,
      folderName: '1697_MPB_Bau',
      displayName: 'MPB Bau',
      tradeType: 'leitungsbau',
      projectCount: 7,
      wonCount: 2,
      wonSumBrutto: 412_870.0,
      lastSubmissionDate: '2026-05-21',
      adoptedCompanyId: null,
      adoptedAt: null,
      parsedCount: null,
    },
    {
      kind: 'managed',
      id: 7,
      folderName: '1898_Elektro_Schwarzkopf',
      displayName: 'Elektro Schwarzkopf',
      tradeType: 'elektro',
      projectCount: 12,
      wonCount: 3,
      wonSumBrutto: 287_440.9,
      lastSubmissionDate: '2026-05-18',
      adoptedCompanyId: null,
      adoptedAt: null,
      parsedCount: null,
    },
    {
      kind: 'external',
      id: 101,
      folderName: '1808_GTM_Bauservice_GmbH',
      displayName: 'GTM Bauservice GmbH',
      tradeType: null,
      projectCount: 4,
      wonCount: 1,
      wonSumBrutto: 67_400.0,
      lastSubmissionDate: '2026-05-08',
      adoptedCompanyId: null,
      adoptedAt: null,
      parsedCount: 3,
    },
    {
      kind: 'external',
      id: 102,
      folderName: '1235_Doga Garten- und Landschaftsbau GmbH',
      displayName: 'Doga Garten- und Landschaftsbau GmbH',
      tradeType: null,
      projectCount: 6,
      wonCount: 0,
      wonSumBrutto: 0,
      lastSubmissionDate: '2026-05-15',
      adoptedCompanyId: null,
      adoptedAt: null,
      parsedCount: 5,
    },
    {
      kind: 'external',
      id: 103,
      folderName: '1463_Justus_Tiefbau',
      displayName: 'Justus Tiefbau',
      tradeType: null,
      projectCount: 9,
      wonCount: 2,
      wonSumBrutto: 198_650.5,
      lastSubmissionDate: '2026-05-19',
      adoptedCompanyId: null,
      adoptedAt: null,
      parsedCount: 8,
    },
    {
      kind: 'external',
      id: 104,
      folderName: '1199_Wärme_Wimmer_GmbH',
      displayName: 'Wärme Wimmer GmbH',
      tradeType: null,
      projectCount: 3,
      wonCount: 1,
      wonSumBrutto: 89_400.0,
      lastSubmissionDate: '2026-04-30',
      adoptedCompanyId: null,
      adoptedAt: null,
      parsedCount: 2,
    },
    {
      kind: 'external',
      id: 105,
      folderName: '1485_PK Brandschutz GmbH',
      displayName: 'PK Brandschutz GmbH',
      tradeType: null,
      projectCount: 2,
      wonCount: 0,
      wonSumBrutto: 0,
      lastSubmissionDate: '2026-05-05',
      adoptedCompanyId: null,
      adoptedAt: null,
      parsedCount: 2,
    },
    {
      kind: 'external',
      id: 106,
      folderName: '1727_Schmoll_+_Sohn_GmbH',
      displayName: 'Schmoll + Sohn GmbH',
      tradeType: null,
      projectCount: 5,
      wonCount: 1,
      wonSumBrutto: 134_900.0,
      lastSubmissionDate: '2026-05-17',
      adoptedCompanyId: null,
      adoptedAt: null,
      parsedCount: 4,
    },
    {
      kind: 'external',
      id: 107,
      folderName: '1900_Allround_Sonnenschutz',
      displayName: 'Allround Sonnenschutz',
      tradeType: null,
      projectCount: 1,
      wonCount: 0,
      wonSumBrutto: 0,
      lastSubmissionDate: '2026-04-12',
      adoptedCompanyId: null,
      adoptedAt: null,
      parsedCount: 1,
    },
  ],
  managedCount: 3,
  externalCount: 7,
  totalProjects: 85,
  lastScanAt: '2026-05-22T19:00:00Z',
};

/** Projects per managed firma — mirror the real OneDrive layout for Gesellchen. */
const MOCK_MANAGED_PROJECTS: Record<number, PreisanfrageProject[]> = {
  5: [
    // Gesellchen GmbH
    {
      id: 1001,
      companyId: 5,
      projectNumber: '260512',
      name: 'Sanierung Sandsteinmauer Ludwigschule',
      baumassnahme: 'Sanierung Sandsteinmauer Ludwigschule',
      auftraggeberName: 'Stadtverwaltung Sankt Ingbert',
      auftraggeberPlzOrt: '66386 Sankt Ingbert',
      anschriftPlzOrt: '66386 Sankt Ingbert',
      submissionDate: '2026-05-12',
      submissionTime: '14:00',
      status: 'analyzed',
      totalPositions: 76,
      oneDriveShareUrl:
        'https://kalku.sharepoint.com/sites/kt01/Dokumente/1695_Gesellchen_GmbH/260512_Ludwigschule_St_Ingbert',
      createdAt: '2026-04-18T08:00:00Z',
      updatedAt: '2026-05-12T15:30:00Z',
    },
    {
      id: 1002,
      companyId: 5,
      projectNumber: '260506',
      name: 'Grünpflege Saarbrücken',
      baumassnahme: 'Grünpflege Auftrag 2026',
      auftraggeberName: 'Stadt Saarbrücken',
      auftraggeberPlzOrt: '66111 Saarbrücken',
      anschriftPlzOrt: '66111 Saarbrücken',
      submissionDate: '2026-05-06',
      submissionTime: '10:00',
      status: 'completed',
      totalPositions: 42,
      oneDriveShareUrl: null,
      createdAt: '2026-04-10T09:00:00Z',
      updatedAt: '2026-05-06T11:00:00Z',
    },
    {
      id: 1003,
      companyId: 5,
      projectNumber: '260504',
      name: 'Krankenhaus Ludwigshafen Außenanlagen',
      baumassnahme: 'Außenanlagen Sanierung',
      auftraggeberName: 'Klinikum Ludwigshafen gGmbH',
      auftraggeberPlzOrt: '67063 Ludwigshafen',
      anschriftPlzOrt: '67063 Ludwigshafen',
      submissionDate: '2026-05-04',
      submissionTime: '13:00',
      status: 'sent',
      totalPositions: 128,
      oneDriveShareUrl: null,
      createdAt: '2026-04-08T08:30:00Z',
      updatedAt: '2026-05-04T13:30:00Z',
    },
    {
      id: 1004,
      companyId: 5,
      projectNumber: '260428',
      name: 'IGS Worms — Schulhof',
      baumassnahme: 'Neugestaltung Schulhof',
      auftraggeberName: 'Stadtverwaltung Worms',
      auftraggeberPlzOrt: '67547 Worms',
      anschriftPlzOrt: '67547 Worms',
      submissionDate: '2026-04-28',
      submissionTime: '11:00',
      status: 'completed',
      totalPositions: 89,
      oneDriveShareUrl: null,
      createdAt: '2026-04-02T10:00:00Z',
      updatedAt: '2026-04-28T11:30:00Z',
    },
  ],
  6: [
    // MPB Bau
    {
      id: 2001,
      companyId: 6,
      projectNumber: '260520',
      name: 'GS Dieblich — Leitungsverlegung',
      baumassnahme: 'Strom- und Datenleitungen Grundschule',
      auftraggeberName: 'Verbandsgemeinde Dieblich',
      auftraggeberPlzOrt: '56332 Dieblich',
      anschriftPlzOrt: '56332 Dieblich',
      submissionDate: '2026-05-20',
      submissionTime: '12:00',
      status: 'analyzed',
      totalPositions: 34,
      oneDriveShareUrl: null,
      createdAt: '2026-05-01T09:00:00Z',
      updatedAt: '2026-05-20T12:30:00Z',
    },
    {
      id: 2002,
      companyId: 6,
      projectNumber: '260527',
      name: 'Schlossstr Hemmersdorf',
      baumassnahme: 'Glasfaser-Erschließung',
      auftraggeberName: 'Gemeinde Rehlingen-Siersburg',
      auftraggeberPlzOrt: '66780 Rehlingen-Siersburg',
      anschriftPlzOrt: '66780 Rehlingen-Siersburg',
      submissionDate: '2026-05-21',
      submissionTime: '14:00',
      status: 'sent',
      totalPositions: 28,
      oneDriveShareUrl: null,
      createdAt: '2026-05-02T08:00:00Z',
      updatedAt: '2026-05-21T14:30:00Z',
    },
  ],
  7: [
    // Elektro Schwarzkopf
    {
      id: 3001,
      companyId: 7,
      projectNumber: '260518',
      name: 'PV-Anlage Kommune Bitburg',
      baumassnahme: 'PV-Aufdach 240 kWp',
      auftraggeberName: 'Stadt Bitburg',
      auftraggeberPlzOrt: '54634 Bitburg',
      anschriftPlzOrt: '54634 Bitburg',
      submissionDate: '2026-05-18',
      submissionTime: '15:00',
      status: 'analyzed',
      totalPositions: 56,
      oneDriveShareUrl: null,
      createdAt: '2026-05-03T10:00:00Z',
      updatedAt: '2026-05-18T15:30:00Z',
    },
  ],
};

/** Positions per project — mirrors what preisanfrage's GAEB parser would
 *  return. Realistic Sanierung-Sandsteinmauer rows for Gesellchen project
 *  1001 (Ludwigschule). Headers (oz=" 1", " 2", …) have no quantity. */
const MOCK_PROJECT_POSITIONS: Record<number, PreisanfragePosition[]> = {
  1001: [
    // Gesellchen — Sanierung Sandsteinmauer Ludwigschule
    { oz: '01', shortText: 'Baustelleneinrichtung', longText: '', quantity: 0, unit: '', isHeader: true },
    { oz: '01.01.001', shortText: 'Bauschuttcontainer', longText: 'Mulde 7 m³, inkl. Aufstellen, Vorhalten, Abfuhr.', quantity: 3, unit: 'Stck', isHeader: false },
    { oz: '01.01.002', shortText: 'Strahlgutcontainer', longText: 'Container Strahlgut beladbar, inkl. Entsorgungsnachweis.', quantity: 1, unit: 'Stck', isHeader: false },
    { oz: '01.01.003', shortText: 'Sondermüll Entsorgung', longText: 'Sondermüll-Behälter inkl. Entsorgungsnachweis.', quantity: 1, unit: 'psch', isHeader: false },
    { oz: '01.01.004', shortText: 'Mobilbauzaun, Höhe 2,00 m', longText: 'Liefern, montieren, vorhalten, demontieren, abfahren.', quantity: 100, unit: 'm', isHeader: false },
    { oz: '01.01.005', shortText: 'Baustelleneinrichtung, Vorhaltung, Räumung', longText: '', quantity: 1, unit: 'psch', isHeader: false },
    { oz: '02', shortText: 'Gerüstbau und Schutzmaßnahmen', longText: '', quantity: 0, unit: '', isHeader: true },
    { oz: '02.01.001', shortText: 'Fahrbares Gerüst', longText: 'Fahrbares Arbeitsgerüst, Bühnenhöhe bis 4,0 m.', quantity: 1, unit: 'Stck', isHeader: false },
    { oz: '02.01.002', shortText: 'Fassadengerüst', longText: 'Arbeitsgerüst nach DIN 4420, vorhalten 6 Wochen.', quantity: 80, unit: 'm²', isHeader: false },
    { oz: '02.01.003', shortText: 'Netzplanen', longText: 'Staubschutznetze um Gerüst.', quantity: 80, unit: 'm²', isHeader: false },
    { oz: '02.01.004', shortText: 'Bodenschutz', longText: 'Schutzfolie + Schutzmatten auf Bestandsbelag.', quantity: 260, unit: 'm²', isHeader: false },
    { oz: '02.01.005', shortText: 'Garagentor- und Fassadenschutz', longText: 'Folierung Bestandsfassade gegen Staubeintritt.', quantity: 20, unit: 'm²', isHeader: false },
    { oz: '03', shortText: 'Abbrucharbeiten', longText: '', quantity: 0, unit: '', isHeader: true },
    { oz: '03.01.001', shortText: 'Stahlgitterzaun entfernen', longText: 'Bestand demontieren, fachgerecht entsorgen.', quantity: 108, unit: 'm', isHeader: false },
    { oz: '03.01.002', shortText: 'Verankerungen entfernen', longText: 'Bestehende Einzelverankerungen ausbrechen.', quantity: 92, unit: 'Stck', isHeader: false },
    { oz: '03.01.003', shortText: 'Stahlpfosten demontieren', longText: 'Bestand demontieren, fachgerecht entsorgen.', quantity: 36, unit: 'Stck', isHeader: false },
    { oz: '03.01.004', shortText: 'Betonabdeckplatten Pfeiler entfernen', longText: '', quantity: 22, unit: 'Stck', isHeader: false },
    { oz: '03.01.005', shortText: 'Betonabdeckplatten Mauer entfernen', longText: '', quantity: 108, unit: 'm', isHeader: false },
    { oz: '03.01.006', shortText: 'Mauerwerksbewuchs entfernen', longText: 'Bewuchs mechanisch und chemisch entfernen.', quantity: 40, unit: 'm²', isHeader: false },
    { oz: '04', shortText: 'Sandsteinmauer-Sanierung', longText: '', quantity: 0, unit: '', isHeader: true },
    { oz: '04.01.001', shortText: 'Reinigung Strahlverfahren', longText: 'Partikelstrahlen mit ≤ 0,5 bar, Strahlgut nach AGB.', quantity: 195, unit: 'm²', isHeader: false },
    { oz: '04.01.002', shortText: 'Steinaustausch Sandsteinquader', longText: 'Beschädigte Quader durch passende Vierungen ersetzen.', quantity: 14, unit: 'Stck', isHeader: false },
    { oz: '04.01.003', shortText: 'Vierungen Mörtelersatz', longText: 'Reprofilierung mit Sandstein-Ergänzungsmörtel.', quantity: 38, unit: 'dm²', isHeader: false },
    { oz: '04.01.004', shortText: 'Fugensanierung Trasskalkmörtel', longText: 'Fugen ausräumen, neu verfugen mit M5 Trasskalk.', quantity: 410, unit: 'm', isHeader: false },
    { oz: '04.01.005', shortText: 'Hydrophobierung Wasserabweisend', longText: 'Schlussbehandlung Silikonharzlösung.', quantity: 195, unit: 'm²', isHeader: false },
  ],
  1002: [
    // Gesellchen — Grünpflege Saarbrücken (compact LV)
    { oz: '01', shortText: 'Vorbereitung', longText: '', quantity: 0, unit: '', isHeader: true },
    { oz: '01.01.001', shortText: 'Geländeaufnahme + Kartierung', longText: '', quantity: 1, unit: 'psch', isHeader: false },
    { oz: '02', shortText: 'Gehölzpflege', longText: '', quantity: 0, unit: '', isHeader: true },
    { oz: '02.01.001', shortText: 'Baumkronenschnitt 8-15 m', longText: 'Inkl. Abfuhr Grünschnitt.', quantity: 38, unit: 'Stck', isHeader: false },
    { oz: '02.01.002', shortText: 'Strauchschnitt', longText: '', quantity: 420, unit: 'm²', isHeader: false },
    { oz: '03', shortText: 'Rasenpflege', longText: '', quantity: 0, unit: '', isHeader: true },
    { oz: '03.01.001', shortText: 'Rasenmahd inkl. Abfuhr', longText: 'Frequenz: alle 3 Wochen, Saison.', quantity: 12_400, unit: 'm²', isHeader: false },
  ],
  2001: [
    // MPB Bau — GS Dieblich Leitungsverlegung
    { oz: '01', shortText: 'Tiefbau', longText: '', quantity: 0, unit: '', isHeader: true },
    { oz: '01.01.001', shortText: 'Asphaltschnitt', longText: 'Maschineller Trennschnitt im Bestandsbelag.', quantity: 124, unit: 'm', isHeader: false },
    { oz: '01.01.002', shortText: 'Asphaltabbruch', longText: '', quantity: 86, unit: 'm²', isHeader: false },
    { oz: '01.01.003', shortText: 'Aushub Leitungsgraben', longText: 'Tiefe bis 1,5 m, Breite 0,4 m.', quantity: 124, unit: 'm', isHeader: false },
    { oz: '02', shortText: 'Leitung', longText: '', quantity: 0, unit: '', isHeader: true },
    { oz: '02.01.001', shortText: 'Erdkabel NAYY 4×16', longText: 'Liefern + verlegen.', quantity: 124, unit: 'm', isHeader: false },
    { oz: '02.01.002', shortText: 'Warnband', longText: 'Liefern + auslegen.', quantity: 124, unit: 'm', isHeader: false },
  ],
  3001: [
    // Schwarzkopf — PV-Anlage Bitburg
    { oz: '01', shortText: 'Module und Unterkonstruktion', longText: '', quantity: 0, unit: '', isHeader: true },
    { oz: '01.01.001', shortText: 'PV-Modul 425 Wp monokristallin', longText: 'Liefern, montieren, anschließen.', quantity: 564, unit: 'Stck', isHeader: false },
    { oz: '01.01.002', shortText: 'UK Aufdach Trapezblech', longText: '', quantity: 1, unit: 'psch', isHeader: false },
    { oz: '02', shortText: 'Wechselrichter und Verkabelung', longText: '', quantity: 0, unit: '', isHeader: true },
    { oz: '02.01.001', shortText: 'String-Wechselrichter 100 kW', longText: '', quantity: 3, unit: 'Stck', isHeader: false },
    { oz: '02.01.002', shortText: 'DC-Verkabelung', longText: '', quantity: 1, unit: 'psch', isHeader: false },
  ],
};

const MOCK_EXTERNAL_PROJECTS: Record<number, PreisanfrageExternalProject[]> = {
  101: [
    {
      id: 4001,
      folderName: '260515_Brücke_K17',
      projectNumber: '260515',
      projectName: 'Brücke K17 Abdichtung',
      submissionDate: '2026-05-15',
      auftraggeberName: 'Landesbetrieb Mobilität',
      anschriftPlzOrt: '54290 Trier',
      teilnehmerCount: 5,
      ourRank: 2,
      winnerName: 'Bauunternehmen Schäfer',
      winnerNetto: 142_300.0,
      winnerBrutto: 169_337.0,
      ourNetto: 148_900.0,
      ourBrutto: 177_191.0,
      parsedAt: '2026-05-18T09:00:00Z',
    },
    {
      id: 4002,
      folderName: '260508_GTM_Schule',
      projectNumber: '260508',
      projectName: 'Schulgebäude Sanierung',
      submissionDate: '2026-05-08',
      auftraggeberName: 'Kreisverwaltung Bernkastel-Wittlich',
      anschriftPlzOrt: '54516 Wittlich',
      teilnehmerCount: 4,
      ourRank: 1,
      winnerName: 'GTM Bauservice GmbH',
      winnerNetto: 67_400.0,
      winnerBrutto: 80_206.0,
      ourNetto: 67_400.0,
      ourBrutto: 80_206.0,
      parsedAt: '2026-05-10T11:00:00Z',
    },
  ],
};

export function getMockOverview(): PreisanfrageOverview {
  warnOnce();
  return structuredClone(MOCK_OVERVIEW);
}

export function getMockManagedProjects(companyId: number): PreisanfrageProject[] {
  warnOnce();
  return structuredClone(MOCK_MANAGED_PROJECTS[companyId] ?? []);
}

export function getMockExternalProjects(externalFirmaId: number): PreisanfrageExternalProject[] {
  warnOnce();
  return structuredClone(MOCK_EXTERNAL_PROJECTS[externalFirmaId] ?? []);
}

export function getMockProjectPositions(projectId: number): PreisanfragePosition[] {
  warnOnce();
  return structuredClone(MOCK_PROJECT_POSITIONS[projectId] ?? []);
}

/** Stand-in for the „anyone-with-link" 04_Angebote share URL that real
 *  preisanfrage mints lazily on the detail fetch. In mock mode we derive it
 *  from the project's OneDrive base so the share-time auto-find flow is
 *  exercisable in dev/preview + tests. Null when the mock project has no
 *  OneDrive base (mirrors the real "folder not resolvable → manual paste"
 *  case). */
export function getMockProjectAngeboteUrl(projectId: number): string | null {
  warnOnce();
  for (const list of Object.values(MOCK_MANAGED_PROJECTS)) {
    const p = list.find((x) => x.id === projectId);
    if (!p) continue;
    const base = p.oneDriveShareUrl?.trim().replace(/\/+$/, '');
    return base && /^https?:\/\//i.test(base) ? `${base}/04_Angebote` : null;
  }
  return null;
}

export function getMockCompanies(): PreisanfrageCompany[] {
  warnOnce();
  return MOCK_OVERVIEW.rows
    .filter((r) => r.kind === 'managed')
    .map((r) => ({
      id: r.id,
      name: r.displayName,
      tradeType: r.tradeType ?? 'galabau',
    }));
}

/** Mock activates when:
 *   - PREISANFRAGE_MOCK is explicitly truthy (fixture / 1 / true / yes), OR
 *   - we're NOT in production AND no real service JWT is set
 *     (= dev defaults to mock so `npm run dev` just works).
 *
 * Explicit falsy values (0 / false / no / off) always win — useful for
 * testing the real upstream from a dev box. Whitespace + case are
 * tolerated for forgiveness. */
export function isMockMode(): boolean {
  const explicit = (process.env.PREISANFRAGE_MOCK ?? '').trim().toLowerCase();
  const truthy = new Set(['fixture', '1', 'true', 'yes', 'on']);
  const falsy = new Set(['0', 'false', 'no', 'off']);
  if (truthy.has(explicit)) return true;
  if (falsy.has(explicit)) return false;
  // Auto: dev + no real token → mock; everything else → not mock.
  const inProd = process.env.NODE_ENV === 'production';
  const hasToken =
    typeof process.env.PREISANFRAGE_SERVICE_JWT === 'string' &&
    process.env.PREISANFRAGE_SERVICE_JWT.trim().length >= 10;
  return !inProd && !hasToken;
}

/* ─── Posteingang mock ─────────────────────────────────────────────────────
 * A handful of realistic supplier replies for two managed mock firms so the
 * panel's Posteingang hub renders end-to-end without a real preisanfrage JWT.
 * Companies not listed here return an empty inbox (total 0) and therefore drop
 * out of the left rail — exactly the live behaviour. */

function mockEmail(e: Partial<PreisanfrageInboxEmail> & {
  id: number;
  companyId: number;
  classification: string;
  status: string;
}): PreisanfrageInboxEmail {
  return {
    messageId: `<mock-${e.id}@kalku.de>`,
    inReplyTo: null,
    fromEmail: null,
    fromName: null,
    subject: null,
    receivedAt: null,
    bodyText: null,
    classificationConfidence: null,
    classificationReason: null,
    matchMethod: null,
    projectId: null,
    projectName: null,
    supplierId: null,
    supplierName: null,
    sharepointSaved: false,
    sharepointFolder: null,
    hasAttachments: false,
    attachmentCount: 0,
    attachments: [],
    ...e,
  };
}

const MOCK_INBOX: Record<number, PreisanfrageInboxEmail[]> = {
  // Gesellchen GmbH (galabau)
  5: [
    mockEmail({
      id: 5001, companyId: 5, classification: 'angebot', status: 'new',
      fromEmail: 'angebote@galabau-mueller.de', fromName: 'GaLaBau Müller GmbH',
      subject: 'AW: Anfrage 26-014 Außenanlagen Grundschule Dudweiler',
      receivedAt: '2026-06-17T08:42:00+02:00',
      bodyText:
        'Sehr geehrte Damen und Herren,\n\nvielen Dank für Ihre Anfrage. Anbei erhalten Sie unser Angebot für die '
        + 'Außenanlagen der Grundschule Dudweiler. Alle Preise verstehen sich netto zzgl. der gesetzlichen MwSt.; '
        + 'Bindefrist 30 Tage.\n\nBei Rückfragen stehen wir gerne zur Verfügung.\n\nMit freundlichen Grüßen\nThomas Müller\nGaLaBau Müller GmbH',
      classificationConfidence: 0.94, classificationReason: 'Angebots-PDF im Anhang, Preise genannt, Antwort auf unsere Anfrage.',
      matchMethod: 'in_reply_to', projectId: 9014, projectName: '26-014 Außenanlagen Grundschule Dudweiler',
      supplierName: 'GaLaBau Müller GmbH', hasAttachments: true, attachmentCount: 1,
      attachments: [{ id: 71, filename: '26-014_Angebot_Mueller.pdf', contentType: 'application/pdf', sizeBytes: 284_512, sharepointUrl: null }],
    }),
    mockEmail({
      id: 5002, companyId: 5, classification: 'angebot', status: 'saved',
      fromEmail: 'vertrieb@pflanzenhof-saar.de', fromName: 'Pflanzenhof Saar',
      subject: 'Angebot Pflanzlieferung 26-014',
      receivedAt: '2026-06-16T15:08:00+02:00',
      bodyText:
        'Guten Tag,\n\nwie besprochen senden wir Ihnen unser Angebot für die Pflanzlieferung. Lieferzeit nach Absprache '
        + 'ca. 3 Wochen.\n\nFreundliche Grüße\nPflanzenhof Saar',
      classificationConfidence: 0.88, matchMethod: 'subject_and_sender',
      projectId: 9014, projectName: '26-014 Außenanlagen Grundschule Dudweiler', supplierName: 'Pflanzenhof Saar',
      sharepointSaved: true, sharepointFolder: '26-014_Grundschule_Dudweiler/04_Angebote/Pflanzenhof_Saar',
      hasAttachments: true, attachmentCount: 1,
      attachments: [{ id: 72, filename: 'Pflanzenhof_Saar_Angebot.pdf', contentType: 'application/pdf', sizeBytes: 156_900, sharepointUrl: 'https://kalku.sharepoint.com/sites/KT01/example/Pflanzenhof_Saar_Angebot.pdf' }],
    }),
    mockEmail({
      id: 5003, companyId: 5, classification: 'rueckfrage', status: 'new',
      fromEmail: 'info@erdbau-becker.de', fromName: 'Erdbau Becker',
      subject: 'Rückfrage zu Position 03.04.120 — Anfrage 26-014',
      receivedAt: '2026-06-17T07:15:00+02:00',
      bodyText:
        'Hallo,\n\nzu Position 03.04.120 (Oberboden andecken) ist die geforderte Schichtdicke nicht eindeutig. '
        + 'Sollen wir 10 cm oder 15 cm kalkulieren? Ohne diese Angabe können wir keinen verbindlichen Preis nennen.\n\nDanke vorab\nM. Becker',
      classificationConfidence: 0.91, classificationReason: 'Reine Rückfrage zu LV-Position, kein Preis, kein Anhang.',
      matchMethod: 'subject_pattern', projectId: 9014, projectName: '26-014 Außenanlagen Grundschule Dudweiler',
      supplierName: 'Erdbau Becker',
    }),
    mockEmail({
      id: 5004, companyId: 5, classification: 'absage', status: 'new',
      fromEmail: 'kontakt@natursteine-west.de', fromName: 'Natursteine West',
      subject: 'AW: Anfrage 26-014 — leider keine Kapazität',
      receivedAt: '2026-06-15T11:33:00+02:00',
      bodyText: 'Sehr geehrte Damen und Herren,\n\nvielen Dank für die Anfrage. Aus Kapazitätsgründen müssen wir diesmal leider absagen.\n\nMit besten Grüßen\nNatursteine West',
      classificationConfidence: 0.96, matchMethod: 'sender_email', supplierName: 'Natursteine West',
    }),
    mockEmail({
      id: 5005, companyId: 5, classification: 'unklar', status: 'new',
      fromEmail: 'no-reply@mailer.example', fromName: 'Mail Delivery',
      subject: 'Automatische Antwort: Abwesenheit bis 23.06.',
      receivedAt: '2026-06-15T09:01:00+02:00',
      bodyText: 'Ich bin bis zum 23.06.2026 nicht im Hause und habe nur eingeschränkt Zugriff auf meine E-Mails. In dringenden Fällen wenden Sie sich bitte an das Sekretariat.',
      classificationConfidence: 0.74, classificationReason: 'Automatische Abwesenheitsnotiz — keine Aktion erforderlich.',
      matchMethod: 'unmatched',
    }),
  ],
  // MPB Bau (leitungsbau)
  6: [
    mockEmail({
      id: 6001, companyId: 6, classification: 'angebot', status: 'new',
      fromEmail: 'angebot@rohrleitung-pfalz.de', fromName: 'Rohrleitungsbau Pfalz',
      subject: 'Angebot 26-021 Kanalsanierung Bliesgau',
      receivedAt: '2026-06-17T06:58:00+02:00',
      bodyText: 'Guten Morgen,\n\nanbei unser Angebot zur Kanalsanierung. Die Hauptpositionen haben wir vollständig bepreist, zur Pos. 5.12 fehlt uns noch eine Angabe (siehe Anschreiben).\n\nMfG\nRohrleitungsbau Pfalz',
      classificationConfidence: 0.90, matchMethod: 'in_reply_to',
      projectId: 9021, projectName: '26-021 Kanalsanierung Bliesgau', supplierName: 'Rohrleitungsbau Pfalz',
      hasAttachments: true, attachmentCount: 2,
      attachments: [
        { id: 81, filename: '26-021_Angebot_RB-Pfalz.pdf', contentType: 'application/pdf', sizeBytes: 412_300, sharepointUrl: null },
        { id: 82, filename: 'Anschreiben.pdf', contentType: 'application/pdf', sizeBytes: 48_120, sharepointUrl: null },
      ],
    }),
    mockEmail({
      id: 6002, companyId: 6, classification: 'rueckfrage', status: 'new',
      fromEmail: 'buero@tiefbau-merzig.de', fromName: 'Tiefbau Merzig',
      subject: 'Nachfrage Submissionstermin 26-021',
      receivedAt: '2026-06-16T13:20:00+02:00',
      bodyText: 'Hallo,\n\nbis wann benötigen Sie unser Angebot? Im LV finden wir keinen eindeutigen Submissionstermin.\n\nGruß\nTiefbau Merzig',
      classificationConfidence: 0.83, matchMethod: 'sender_email', supplierName: 'Tiefbau Merzig',
    }),
  ],
};

function computeMockStats(emails: PreisanfrageInboxEmail[]): PreisanfrageInboxStats {
  const isNew = (e: PreisanfrageInboxEmail) => e.status === 'new';
  return {
    angebot: emails.filter((e) => e.classification === 'angebot').length,
    rueckfrage: emails.filter((e) => e.classification === 'rueckfrage' && isNew(e)).length,
    absage: emails.filter((e) => e.classification === 'absage' && isNew(e)).length,
    unklar: emails.filter((e) => e.classification === 'unklar' && isNew(e)).length,
    nichtGespeichert: emails.filter((e) => e.classification === 'angebot' && e.status === 'new' && !e.sharepointSaved).length,
  };
}

export function getMockInbox(
  companyId: number,
  opts?: { classification?: string; status?: string; projectId?: number; limit?: number },
): PreisanfrageInboxPage {
  warnOnce();
  const all = MOCK_INBOX[companyId] ?? [];
  // Stats are company-wide (independent of the active filter), like upstream.
  const stats = computeMockStats(all);
  let emails = all;
  if (opts?.classification) emails = emails.filter((e) => e.classification === opts.classification);
  if (opts?.status) emails = emails.filter((e) => e.status === opts.status);
  if (opts?.projectId) emails = emails.filter((e) => e.projectId === opts.projectId);
  const limit = Math.min(Math.max(opts?.limit ?? 100, 1), 500);
  return { total: all.length, emails: emails.slice(0, limit), stats };
}

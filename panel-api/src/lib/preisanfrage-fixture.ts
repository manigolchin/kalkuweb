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
  PreisanfrageSubmissionsergebnis,
  PreisanfrageSubmissionskarte,
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

/** Parsed bid-opening results per managed project. Keyed by project id
 *  (1001-1004 Gesellchen, 2001-2002 MPB, 3001 Schwarzkopf). Projects 1003
 *  + 2002 deliberately have NO entry → getter returns the "noch nicht
 *  eingelesen" empty shape, so the panel exercises both states. Sums use
 *  brutto = netto × 1.19 (German USt). */
const MOCK_SUBMISSIONSERGEBNIS: Record<number, PreisanfrageSubmissionsergebnis> = {
  1001: {
    // Gesellchen — Sanierung Sandsteinmauer Ludwigschule: knapp Zweiter.
    projectId: 1001,
    parsedAt: '2026-05-12T16:10:00Z',
    teilnehmerCount: 5,
    ourRank: 2,
    winnerName: 'Bauunternehmen Klein GmbH',
    winnerSum: 217_056.0,
    winnerNettoSum: 182_400.0,
    winnerBruttoSum: 217_056.0,
    parseConfidence: 0.97,
    submittedVariantLabel: 'günstigste',
    bidders: [
      { rank: 1, bidderName: 'Bauunternehmen Klein GmbH', totalSum: 217_056.0, nettoSum: 182_400.0, bruttoSum: 217_056.0, lots: [], isOwnBid: false, isWinner: true },
      { rank: 2, bidderName: 'Gesellchen GmbH', totalSum: 224_791.0, nettoSum: 188_900.0, bruttoSum: 224_791.0, lots: [], isOwnBid: true, isWinner: false },
      { rank: 3, bidderName: 'Naturstein Wagner GmbH', totalSum: 232_407.0, nettoSum: 195_300.0, bruttoSum: 232_407.0, lots: [], isOwnBid: false, isWinner: false },
      { rank: 4, bidderName: 'GaLaBau Thiel', totalSum: 242_462.5, nettoSum: 203_750.0, bruttoSum: 242_462.5, lots: [], isOwnBid: false, isWinner: false },
      { rank: 5, bidderName: 'Steinmetzbetrieb Ferber', totalSum: 254_898.0, nettoSum: 214_200.0, bruttoSum: 254_898.0, lots: [], isOwnBid: false, isWinner: false },
    ],
  },
  1002: {
    // Gesellchen — Grünpflege Saarbrücken: gewonnen.
    projectId: 1002,
    parsedAt: '2026-05-06T12:30:00Z',
    teilnehmerCount: 3,
    ourRank: 1,
    winnerName: 'Gesellchen GmbH',
    winnerSum: 100_555.0,
    winnerNettoSum: 84_500.0,
    winnerBruttoSum: 100_555.0,
    parseConfidence: 0.99,
    submittedVariantLabel: 'mittlere',
    bidders: [
      { rank: 1, bidderName: 'Gesellchen GmbH', totalSum: 100_555.0, nettoSum: 84_500.0, bruttoSum: 100_555.0, lots: [], isOwnBid: true, isWinner: true },
      { rank: 2, bidderName: 'Grünwerk Saar GmbH', totalSum: 105_791.0, nettoSum: 88_900.0, bruttoSum: 105_791.0, lots: [], isOwnBid: false, isWinner: false },
      { rank: 3, bidderName: 'Stadtgrün Pfalz', totalSum: 110_908.0, nettoSum: 93_200.0, bruttoSum: 110_908.0, lots: [], isOwnBid: false, isWinner: false },
    ],
  },
  1004: {
    // Gesellchen — IGS Worms Schulhof: Vierter, deutlich über Zuschlag.
    projectId: 1004,
    parsedAt: '2026-04-28T12:45:00Z',
    teilnehmerCount: 6,
    ourRank: 4,
    winnerName: 'Bauteam Rheinhessen GmbH',
    winnerSum: 319_991.0,
    winnerNettoSum: 268_900.0,
    winnerBruttoSum: 319_991.0,
    parseConfidence: 0.95,
    submittedVariantLabel: 'teuerste',
    bidders: [
      { rank: 1, bidderName: 'Bauteam Rheinhessen GmbH', totalSum: 319_991.0, nettoSum: 268_900.0, bruttoSum: 319_991.0, lots: [], isOwnBid: false, isWinner: true },
      { rank: 2, bidderName: 'Pflaster & Wege GmbH', totalSum: 334_866.0, nettoSum: 281_400.0, bruttoSum: 334_866.0, lots: [], isOwnBid: false, isWinner: false },
      { rank: 3, bidderName: 'GaLaBau Thiel', totalSum: 344_802.5, nettoSum: 289_750.0, bruttoSum: 344_802.5, lots: [], isOwnBid: false, isWinner: false },
      { rank: 4, bidderName: 'Gesellchen GmbH', totalSum: 354_144.0, nettoSum: 297_600.0, bruttoSum: 354_144.0, lots: [], isOwnBid: true, isWinner: false },
      { rank: 5, bidderName: 'Außenanlagen Becker', totalSum: 371_280.0, nettoSum: 312_000.0, bruttoSum: 371_280.0, lots: [], isOwnBid: false, isWinner: false },
      { rank: 6, bidderName: 'Garten Vogt GmbH', totalSum: 387_821.0, nettoSum: 325_900.0, bruttoSum: 387_821.0, lots: [], isOwnBid: false, isWinner: false },
    ],
  },
  2001: {
    // MPB Bau — GS Dieblich Leitungsverlegung: gewonnen.
    projectId: 2001,
    parsedAt: '2026-05-20T13:10:00Z',
    teilnehmerCount: 4,
    ourRank: 1,
    winnerName: 'MPB Bau',
    winnerSum: 114_716.0,
    winnerNettoSum: 96_400.0,
    winnerBruttoSum: 114_716.0,
    parseConfidence: 0.98,
    submittedVariantLabel: 'günstigste',
    bidders: [
      { rank: 1, bidderName: 'MPB Bau', totalSum: 114_716.0, nettoSum: 96_400.0, bruttoSum: 114_716.0, lots: [], isOwnBid: true, isWinner: true },
      { rank: 2, bidderName: 'Leitungsbau Mosel GmbH', totalSum: 120_428.0, nettoSum: 101_200.0, bruttoSum: 120_428.0, lots: [], isOwnBid: false, isWinner: false },
      { rank: 3, bidderName: 'Tiefbau Koblenz GmbH', totalSum: 129_591.0, nettoSum: 108_900.0, bruttoSum: 129_591.0, lots: [], isOwnBid: false, isWinner: false },
      { rank: 4, bidderName: 'Erdbau Wenz', totalSum: 137_207.0, nettoSum: 115_300.0, bruttoSum: 137_207.0, lots: [], isOwnBid: false, isWinner: false },
    ],
  },
  3001: {
    // Elektro Schwarzkopf — PV-Anlage Bitburg: Dritter.
    projectId: 3001,
    parsedAt: '2026-05-18T16:20:00Z',
    teilnehmerCount: 4,
    ourRank: 3,
    winnerName: 'Elektro Sonnen GmbH',
    winnerSum: 236_096.0,
    winnerNettoSum: 198_400.0,
    winnerBruttoSum: 236_096.0,
    parseConfidence: 0.93,
    submittedVariantLabel: 'mittlere',
    bidders: [
      { rank: 1, bidderName: 'Elektro Sonnen GmbH', totalSum: 236_096.0, nettoSum: 198_400.0, bruttoSum: 236_096.0, lots: [], isOwnBid: false, isWinner: true },
      { rank: 2, bidderName: 'PV Profis Eifel', totalSum: 245_021.0, nettoSum: 205_900.0, bruttoSum: 245_021.0, lots: [], isOwnBid: false, isWinner: false },
      { rank: 3, bidderName: 'Elektro Schwarzkopf', totalSum: 252_637.0, nettoSum: 212_300.0, bruttoSum: 252_637.0, lots: [], isOwnBid: true, isWinner: false },
      { rank: 4, bidderName: 'Solartechnik West', totalSum: 267_512.0, nettoSum: 224_800.0, bruttoSum: 267_512.0, lots: [], isOwnBid: false, isWinner: false },
    ],
  },
};

/** Combined cross-company Submissionskarte. Coordinates are real
 *  Saarland / Rheinland-Pfalz town centres so the dev map renders pins
 *  in plausible places. Spans all three managed firmas (3 Gewerke) — the
 *  same portfolio view the live `/combined` endpoint produces. Projects
 *  1003 + 2002 appear as pins WITHOUT a parsed result (vergabe nicht_geparst). */
const MOCK_SUBMISSIONSKARTE: PreisanfrageSubmissionskarte = {
  pins: [
    {
      projectId: 1001, projectNumber: '260512', projectName: 'Sanierung Sandsteinmauer Ludwigschule',
      submissionDate: '2026-05-12', latitude: 49.2769, longitude: 7.117, anschriftPlzOrt: '66386 Sankt Ingbert',
      gewerk: 'GaLaBau', teilnehmerCount: 5, ourRank: 2,
      winnerName: 'Bauunternehmen Klein GmbH', winnerSum: 217_056.0, winnerNettoSum: 182_400.0, winnerBruttoSum: 217_056.0,
      ourSum: 224_791.0, ourNettoSum: 188_900.0, ourBruttoSum: 224_791.0,
      preislage: 'mittel', vergabeStatus: 'absage', pdfAvailable: true,
      companyId: 5, companyName: 'Gesellchen GmbH', tradeType: 'galabau',
    },
    {
      projectId: 1002, projectNumber: '260506', projectName: 'Grünpflege Saarbrücken',
      submissionDate: '2026-05-06', latitude: 49.2402, longitude: 6.9969, anschriftPlzOrt: '66111 Saarbrücken',
      gewerk: 'GaLaBau', teilnehmerCount: 3, ourRank: 1,
      winnerName: 'Gesellchen GmbH', winnerSum: 100_555.0, winnerNettoSum: 84_500.0, winnerBruttoSum: 100_555.0,
      ourSum: 100_555.0, ourNettoSum: 84_500.0, ourBruttoSum: 100_555.0,
      preislage: 'niedrig', vergabeStatus: 'zuschlag', pdfAvailable: true,
      companyId: 5, companyName: 'Gesellchen GmbH', tradeType: 'galabau',
    },
    {
      projectId: 1003, projectNumber: '260504', projectName: 'Krankenhaus Ludwigshafen Außenanlagen',
      submissionDate: '2026-05-04', latitude: 49.4774, longitude: 8.4452, anschriftPlzOrt: '67063 Ludwigshafen',
      gewerk: 'GaLaBau', teilnehmerCount: null, ourRank: null,
      winnerName: null, winnerSum: null, winnerNettoSum: null, winnerBruttoSum: null,
      ourSum: null, ourNettoSum: null, ourBruttoSum: null,
      preislage: null, vergabeStatus: 'nicht_geparst', pdfAvailable: false,
      companyId: 5, companyName: 'Gesellchen GmbH', tradeType: 'galabau',
    },
    {
      projectId: 1004, projectNumber: '260428', projectName: 'IGS Worms — Schulhof',
      submissionDate: '2026-04-28', latitude: 49.634, longitude: 8.3598, anschriftPlzOrt: '67547 Worms',
      gewerk: 'GaLaBau', teilnehmerCount: 6, ourRank: 4,
      winnerName: 'Bauteam Rheinhessen GmbH', winnerSum: 319_991.0, winnerNettoSum: 268_900.0, winnerBruttoSum: 319_991.0,
      ourSum: 354_144.0, ourNettoSum: 297_600.0, ourBruttoSum: 354_144.0,
      preislage: 'hoch', vergabeStatus: 'verloren', pdfAvailable: true,
      companyId: 5, companyName: 'Gesellchen GmbH', tradeType: 'galabau',
    },
    {
      projectId: 2001, projectNumber: '260520', projectName: 'GS Dieblich — Leitungsverlegung',
      submissionDate: '2026-05-20', latitude: 50.296, longitude: 7.505, anschriftPlzOrt: '56332 Dieblich',
      gewerk: 'Leitungsbau', teilnehmerCount: 4, ourRank: 1,
      winnerName: 'MPB Bau', winnerSum: 114_716.0, winnerNettoSum: 96_400.0, winnerBruttoSum: 114_716.0,
      ourSum: 114_716.0, ourNettoSum: 96_400.0, ourBruttoSum: 114_716.0,
      preislage: 'niedrig', vergabeStatus: 'zuschlag', pdfAvailable: true,
      companyId: 6, companyName: 'MPB Bau', tradeType: 'leitungsbau',
    },
    {
      projectId: 2002, projectNumber: '260527', projectName: 'Schlossstr Hemmersdorf',
      submissionDate: '2026-05-21', latitude: 49.349, longitude: 6.697, anschriftPlzOrt: '66780 Rehlingen-Siersburg',
      gewerk: 'Leitungsbau', teilnehmerCount: null, ourRank: null,
      winnerName: null, winnerSum: null, winnerNettoSum: null, winnerBruttoSum: null,
      ourSum: null, ourNettoSum: null, ourBruttoSum: null,
      preislage: null, vergabeStatus: 'nicht_geparst', pdfAvailable: false,
      companyId: 6, companyName: 'MPB Bau', tradeType: 'leitungsbau',
    },
    {
      projectId: 3001, projectNumber: '260518', projectName: 'PV-Anlage Kommune Bitburg',
      submissionDate: '2026-05-18', latitude: 49.972, longitude: 6.525, anschriftPlzOrt: '54634 Bitburg',
      gewerk: 'Elektro', teilnehmerCount: 4, ourRank: 3,
      winnerName: 'Elektro Sonnen GmbH', winnerSum: 236_096.0, winnerNettoSum: 198_400.0, winnerBruttoSum: 236_096.0,
      ourSum: 252_637.0, ourNettoSum: 212_300.0, ourBruttoSum: 252_637.0,
      preislage: 'mittel', vergabeStatus: 'offen', pdfAvailable: true,
      companyId: 7, companyName: 'Elektro Schwarzkopf', tradeType: 'elektro',
    },
  ],
  gewerke: ['Elektro', 'GaLaBau', 'Leitungsbau'],
  projectsWithoutLocation: 6,
  projectsWithoutParse: 2,
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

/** companyId is accepted to mirror the live signature but the mock keys on
 *  the globally-unique project id alone. Unknown project → empty "noch nicht
 *  eingelesen" shape (matches the live API's empty-bidders response). */
export function getMockSubmissionsergebnis(
  _companyId: number,
  projectId: number,
): PreisanfrageSubmissionsergebnis {
  warnOnce();
  const hit = MOCK_SUBMISSIONSERGEBNIS[projectId];
  if (hit) return structuredClone(hit);
  return {
    projectId,
    parsedAt: null,
    teilnehmerCount: 0,
    ourRank: null,
    winnerName: null,
    winnerSum: null,
    winnerNettoSum: null,
    winnerBruttoSum: null,
    parseConfidence: null,
    bidders: [],
    submittedVariantLabel: null,
  };
}

export function getMockSubmissionskarte(): PreisanfrageSubmissionskarte {
  warnOnce();
  return structuredClone(MOCK_SUBMISSIONSKARTE);
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

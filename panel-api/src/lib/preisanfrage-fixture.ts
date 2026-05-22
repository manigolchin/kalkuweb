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
 *   - PREISANFRAGE_MOCK is explicitly 'fixture' or '1', OR
 *   - we're NOT in production AND no real service JWT is set
 *     (= dev defaults to mock so `npm run dev` just works).
 *
 * Explicit `PREISANFRAGE_MOCK=0` always wins — useful for testing the
 * real upstream from a dev box. */
export function isMockMode(): boolean {
  const explicit = (process.env.PREISANFRAGE_MOCK ?? '').toLowerCase();
  if (explicit === 'fixture' || explicit === '1' || explicit === 'true') return true;
  if (explicit === '0' || explicit === 'false') return false;
  // Auto: dev + no real token → mock; everything else → not mock.
  const inProd = process.env.NODE_ENV === 'production';
  const hasToken =
    typeof process.env.PREISANFRAGE_SERVICE_JWT === 'string' &&
    process.env.PREISANFRAGE_SERVICE_JWT.trim().length >= 10;
  return !inProd && !hasToken;
}

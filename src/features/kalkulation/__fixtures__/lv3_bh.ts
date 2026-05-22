/**
 * Fixture: real positions from example 1 — LV3_BH_mit_Preisen.xlsx (KG 442+443).
 *
 * Source: `~/Desktop/Claude/example 1/LV3_BH_mit_Preisen.xlsx`, sheet
 * `Kalkulation`, rows 15–32. Extracted on 2026-05-22 by
 * `scripts/dump-positions-fixture.mjs`.
 *
 * Augmented with SENTINEL ROWS that carry distinctive numeric markers
 * (99999.99, 88888, 77777, 66666). The KUNDEN-view leak test
 * (`PositionTableV2.test.ts`) renders the table to HTML and asserts NONE of
 * those values appear anywhere in the rendered output. If they leak, the
 * test fails loudly with the field name.
 *
 * This file is also used by the dev-only route `/dev/kalku-v2` so the v2
 * UI can be exercised without a real backend or login.
 */

import type { Position, ProjectData } from '../types';
import { DEFAULT_CALC_PARAMS } from '../calc';

/** Sentinel values used by the leak test. Easy to grep, no false positives. */
export const SENTINELS = {
  materialCost: 99999.99,
  timeMinutes: 88888,
  nuCost: 77777,
  internalNote: '__LEAK_INTERNAL_NOTE__',
  aufmassFormula: '__LEAK_AUFMASS__',
} as const;

function pos(overrides: Partial<Position>): Position {
  return {
    id: overrides.id ?? 'unset',
    oz: '',
    shortText: '',
    longText: '',
    hinweisText: '',
    quantity: 0,
    unit: '',
    materialCost: 0,
    timeMinutes: 0,
    nuCost: 0,
    isHeader: false,
    sortOrder: 0,
    sectionPath: '',
    epLohn: 0,
    epMaterial: 0,
    epGeraet: 0,
    epNu: 0,
    ep: 0,
    gp: 0,
    visibleToCustomer: true,
    positionType: 'standard',
    ...overrides,
  };
}

export const LV3_BH_FIXTURE: ProjectData = {
  name: 'Blücherhof Kiel — Neubau',
  client: 'Heinrich Karstens Bauunternehmung GmbH & Co. KG',
  clientEmail: '',
  clientAddress: '',
  service: 'Elektroinstallation',
  tenderNumber: '25-3-019',
  deadline: '2026-05-29',
  bidder: 'Otto Speetzen Elektrotechnik GmbH',
  calcParams: { ...DEFAULT_CALC_PARAMS, mittellohn: 30, verrechnungslohn: 67.9, materialZuschlag: 0.23 },
  positions: [
    // ---- KG 440 group header (level-1 hierarchy) -----------------------------
    pos({ id: 'p001', sortOrder: 1, oz: ' 1. 4', shortText: 'KG 440 Starkstromanlagen', isHeader: true, sectionPath: '1.4' }),
    // ---- KG 442 sub-header --------------------------------------------------
    pos({ id: 'p002', sortOrder: 2, oz: ' 1. 4. 1', shortText: 'KG 442 Sicherheitsbeleuchtung', isHeader: true, sectionPath: '1.4.1' }),
    // ---- 6 real positions copied from Excel rows 18–23 -----------------------
    pos({
      id: 'p003', sortOrder: 3,
      oz: ' 1. 4. 1.  .   1',   // canonical real-file whitespace
      shortText: 'Überwachungszentrale Einzelbatterieleuchten',
      longText: 'Zentrale Notstrom-Versorgung der Einzelbatterie-Leuchten. Inkl. Steuerung, Anzeige, Tagesbestätigung.',
      quantity: 1, unit: 'St',
      materialCost: 1071.54, timeMinutes: 306, nuCost: 0,
      sectionPath: '1.4.1',
    }),
    pos({
      id: 'p004', sortOrder: 4, oz: ' 1. 4. 1.  .   2', shortText: 'RZA01 Rettungszeichenleuchte Einzelbatterie IP40',
      quantity: 4, unit: 'St', materialCost: 148.08, timeMinutes: 35.7, sectionPath: '1.4.1',
    }),
    pos({
      id: 'p005', sortOrder: 5, oz: ' 1. 4. 1.  .   3', shortText: 'RZA02 Rettungszeichenleuchte Einzelbatterie IP66',
      quantity: 9, unit: 'St', materialCost: 153.47, timeMinutes: 35.7, sectionPath: '1.4.1',
    }),
    pos({
      id: 'p006', sortOrder: 6, oz: ' 1. 4. 1.  .   4', shortText: 'SIA01 Sicherheitsleuchte Einzelbatterie IP54',
      quantity: 5, unit: 'St', materialCost: 178.77, timeMinutes: 35.7, sectionPath: '1.4.1',
    }),
    pos({
      id: 'p007', sortOrder: 7, oz: ' 1. 4. 1.  .   5', shortText: 'SIA02 Sicherheitsleuchte Einzelbatterie IP40',
      quantity: 4, unit: 'St', materialCost: 152.93, timeMinutes: 35.7, sectionPath: '1.4.1',
    }),
    pos({
      id: 'p008', sortOrder: 8, oz: ' 1. 4. 1.  .   6', shortText: 'Stromkreiszuleitung NYM-J 5x1,5mm² aus UV-Allgemein',
      quantity: 22, unit: 'St', materialCost: 5.15, timeMinutes: 10.63, sectionPath: '1.4.1',
    }),

    // ---- KG 443 sub-header --------------------------------------------------
    pos({ id: 'p009', sortOrder: 9, oz: ' 1. 4. 2', shortText: 'KG 443 Zählerhauptverteilung', isHeader: true, sectionPath: '1.4.2' }),
    pos({
      id: 'p010', sortOrder: 10, oz: ' 1. 4. 2.  .   1', shortText: 'Hausanschlusskasten 200A',
      quantity: 1, unit: 'St', materialCost: 850, timeMinutes: 180, sectionPath: '1.4.2',
    }),

    // ---- LEAK-TEST SENTINELS -------------------------------------------------
    // These rows MUST be filtered out of KUNDEN view AND their internal field
    // values must never appear in rendered KUNDEN HTML. The leak test in
    // PositionTableV2.test.ts asserts both.

    // (a) Standard row that is HIDDEN from customer — its internal fields
    //     must not appear in KUNDEN preview.
    pos({
      id: 'sentinel-hidden', sortOrder: 100,
      oz: ' 9. 9. 9.  .   1',
      shortText: 'SENTINEL — hidden standard row',
      quantity: 1, unit: 'St',
      materialCost: SENTINELS.materialCost,
      timeMinutes: SENTINELS.timeMinutes,
      nuCost: SENTINELS.nuCost,
      visibleToCustomer: false,
      sectionPath: '9.9.9',
    }),

    // (b) Internal-type row (wagnis) — server enforces visibleToCustomer=false
    //     automatically. The KUNDEN view must respect the positionType filter
    //     even if a buggy edit sets visibleToCustomer=true.
    pos({
      id: 'sentinel-wagnis', sortOrder: 101,
      oz: ' 9. 9. 9.  .   2',
      shortText: 'SENTINEL — wagnis internal row',
      quantity: 1, unit: 'pschl.',
      materialCost: SENTINELS.materialCost,
      timeMinutes: SENTINELS.timeMinutes,
      nuCost: SENTINELS.nuCost,
      positionType: 'wagnis',
      // Note: visibleToCustomer left true on purpose — tests that the type
      // filter wins over a (defensive) misset visibility flag.
      visibleToCustomer: true,
      sectionPath: '9.9.9',
    }),

    // (c) Visible standard row with sentinel internal fields — its INTERNAL
    //     values must not appear in KUNDEN HTML, but its EP/GP (derived) will.
    pos({
      id: 'sentinel-visible', sortOrder: 102,
      oz: ' 9. 9. 9.  .   3',
      shortText: 'SENTINEL — visible row with sentinel internals',
      quantity: 1, unit: 'St',
      materialCost: SENTINELS.materialCost,   // must not appear in KUNDEN
      timeMinutes: SENTINELS.timeMinutes,     // must not appear in KUNDEN
      nuCost: SENTINELS.nuCost,               // must not appear in KUNDEN
      visibleToCustomer: true,
      sectionPath: '9.9.9',
    }),
  ],
  notes: '',
};

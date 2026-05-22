/**
 * Round 5 PART T — auto-generated fixture for ex7 (example 7/LV3.xlsx).
 *
 * Source: `~/Desktop/claude1/example 7/LV3.xlsx`, sheet `Kalkulation`.
 * Built by `scripts/build-fixtures-10examples.mjs` on import-time cells.
 *
 * Real positions extracted from rows 14+ (first ~14).
 * THREE sentinel rows appended (hidden-standard / wagnis-internal /
 * visible-with-sentinel-internals) — the leak test asserts NONE of
 * SENTINELS' values appear in rendered KUNDEN-view HTML.
 *
 * DO NOT HAND-EDIT — regenerate with the script above.
 */

import type { Position, ProjectData } from '../types';
import { DEFAULT_CALC_PARAMS } from '../calc';
import { SENTINELS } from './lv3_bh';

export { SENTINELS };

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

export const LV_EX7_FIXTURE: ProjectData = {
  name: 'Seniorenzentrum Grullbad',
  client: 'Stadt Recklinghausen',
  clientEmail: '',
  clientAddress: '',
  service: 'Unterhaltsreinigung',
  tenderNumber: 'V025 26',
  deadline: '',
  bidder: 'E-Vitale Gebäudereinigung GmbH',
  calcParams: {
    ...DEFAULT_CALC_PARAMS,
    mittellohn: 30,
    verrechnungslohn: 34.9,
    materialZuschlag: 0.25,
  },
  positions: [
    pos({
      id: 'p001', sortOrder: 1,
      oz: '1',
      shortText: 'Pflegebereich',
      quantity: 13239.34, 
      isHeader: true,
      sectionPath: '1',
    }),
    pos({
      id: 'p002', sortOrder: 2,
      oz: '1.1',
      shortText: 'Raumgruppe 1 Pflegebereich Bewohnerzimmer Unterhaltsreinigung\n5x wöchentlich, 2.366,86 m2',
      isHeader: true,
      sectionPath: '1.1',
    }),
    pos({
      id: 'p003', sortOrder: 3,
      oz: '1.1.1',
      shortText: 'Abfallbehälter',
      quantity: 1, unit: 'psch',
      timeMinutes: 29.03,
      sectionPath: '1.1',
    }),
    pos({
      id: 'p004', sortOrder: 4,
      oz: '1.1.2',
      shortText: 'Papierkörbe ',
      quantity: 1, unit: 'psch',
      timeMinutes: 29.03,
      sectionPath: '1.1',
    }),
    pos({
      id: 'p005', sortOrder: 5,
      oz: '1.1.3',
      shortText: 'Aschenbecher',
      quantity: 1, unit: 'psch',
      timeMinutes: 7.26,
      sectionPath: '1.1',
    }),
    pos({
      id: 'p006', sortOrder: 6,
      oz: '1.1.4',
      shortText: 'Hartfußböden',
      quantity: 1, unit: 'psch',
      timeMinutes: 9159.75,
      sectionPath: '1.1',
    }),
    pos({
      id: 'p007', sortOrder: 7,
      oz: '1.1.5',
      shortText: 'Freie Ablageflächen\n1x wöchentlich während der 5x wöchentliche UR',
      quantity: 1, unit: 'psch',
      timeMinutes: 193.5,
      sectionPath: '1.1',
    }),
    pos({
      id: 'p008', sortOrder: 8,
      oz: '1.1.6',
      shortText: 'Tische',
      quantity: 1, unit: 'psch',
      timeMinutes: 72.56,
      sectionPath: '1.1',
    }),
    pos({
      id: 'p009', sortOrder: 9,
      oz: '1.1.7',
      shortText: 'Stühle',
      quantity: 1, unit: 'psch',
      timeMinutes: 154.8,
      sectionPath: '1.1',
    }),
    pos({
      id: 'p010', sortOrder: 10,
      oz: '1.1.8',
      shortText: 'Lichtschalter',
      quantity: 1, unit: 'psch',
      timeMinutes: 24.19,
      sectionPath: '1.1',
    }),
    pos({
      id: 'p011', sortOrder: 11,
      oz: '1.1.9',
      shortText: 'Türgriffe',
      quantity: 1, unit: 'psch',
      timeMinutes: 48.38,
      sectionPath: '1.1',
    }),
    pos({
      id: 'p012', sortOrder: 12,
      oz: '1.1.10',
      shortText: 'Fensterbänke',
      quantity: 1, unit: 'psch',
      timeMinutes: 48.38,
      sectionPath: '1.1',
    }),
    pos({
      id: 'p013', sortOrder: 13,
      oz: '1.1.11',
      shortText: 'Telefone',
      quantity: 1, unit: 'psch',
      timeMinutes: 24.19,
      sectionPath: '1.1',
    }),
    pos({
      id: 'p014', sortOrder: 14,
      oz: '1.1.12',
      shortText: 'Bewegliche Einrichtung\n1x wöchentlich während der 5x wöchentliche UR',
      quantity: 1, unit: 'psch',
      timeMinutes: 193.5,
      sectionPath: '1.1',
    }),

    // ---- LEAK-TEST SENTINELS ----
    // (a) hidden-standard — visibleToCustomer=false, sentinel internals
    pos({
      id: 'sentinel-ex7-hidden', sortOrder: 114,
      oz: ' 9. 9. 9.  .   1',
      shortText: 'SENTINEL — hidden standard row',
      quantity: 1, unit: 'St',
      materialCost: SENTINELS.materialCost,
      timeMinutes: SENTINELS.timeMinutes,
      nuCost: SENTINELS.nuCost,
      visibleToCustomer: false,
      sectionPath: '9.9.9',
    }),
    // (b) wagnis-internal — positionType filter must win regardless of vTC
    pos({
      id: 'sentinel-ex7-wagnis', sortOrder: 115,
      oz: ' 9. 9. 9.  .   2',
      shortText: 'SENTINEL — wagnis internal row',
      quantity: 1, unit: 'pschl.',
      materialCost: SENTINELS.materialCost,
      timeMinutes: SENTINELS.timeMinutes,
      nuCost: SENTINELS.nuCost,
      positionType: 'wagnis',
      visibleToCustomer: true,
      sectionPath: '9.9.9',
    }),
    // (c) visible row with sentinel internals — derived EP/GP may render,
    //     but raw materialCost / timeMinutes / nuCost must NOT.
    pos({
      id: 'sentinel-ex7-visible', sortOrder: 116,
      oz: ' 9. 9. 9.  .   3',
      shortText: 'SENTINEL — visible row with sentinel internals',
      quantity: 1, unit: 'St',
      materialCost: SENTINELS.materialCost,
      timeMinutes: SENTINELS.timeMinutes,
      nuCost: SENTINELS.nuCost,
      visibleToCustomer: true,
      sectionPath: '9.9.9',
    }),
  ],
  notes: '',
};

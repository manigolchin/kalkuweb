/**
 * Round 5 PART T — auto-generated fixture for ex5 (example 5/LV3_.xlsx).
 *
 * Source: `~/Desktop/claude1/example 5/LV3_.xlsx`, sheet `Kalkulation`.
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

export const LV_EX5_FIXTURE: ProjectData = {
  name: 'A.0454.131722, SWB, KnKa, Neubau zentr. Waffenkammer',
  client: 'Landesbetrieb Bau und Immobilien Hessen',
  clientEmail: '',
  clientAddress: '',
  service: 'Blitzschutzanlagen',
  tenderNumber: 'VG-B-0454-2026-0431',
  deadline: '',
  bidder: 'Hans Elektrotechnik GmbH',
  calcParams: {
    ...DEFAULT_CALC_PARAMS,
    mittellohn: 30,
    verrechnungslohn: 64.9,
    materialZuschlag: 0.2,
  },
  positions: [
    pos({
      id: 'p001', sortOrder: 1,
      oz: ' 1',
      shortText: 'KGR 440',
      quantity: 92185.26, 
      isHeader: true,
      sectionPath: '1',
    }),
    pos({
      id: 'p002', sortOrder: 2,
      oz: ' 1. 1',
      shortText: 'KGR 446 Blitzschutz- und Erdungsanlagen',
      isHeader: true,
      sectionPath: '1.1',
    }),
    pos({
      id: 'p003', sortOrder: 3,
      oz: ' 1. 1.  10',
      shortText: 'Metalldachhalter NIRO für HVI Fangeinrichtungen',
      quantity: 12, unit: 'St',
      materialCost: 17.2,
      timeMinutes: 10,
      sectionPath: '1.1',
    }),
    pos({
      id: 'p004', sortOrder: 4,
      oz: ' 1. 1.  20',
      shortText: 'Halter für Metalldach mit Klemmfalz',
      quantity: 48, unit: 'St',
      materialCost: 5.4,
      timeMinutes: 5,
      sectionPath: '1.1',
    }),
    pos({
      id: 'p005', sortOrder: 5,
      oz: ' 1. 1.  30',
      shortText: 'Stützrohre für HVI-Leitung zur Konfektionierung vor Ort, Fangspitze aus NIRO, Ø10 mm.',
      quantity: 8, unit: 'St',
      materialCost: 362.35,
      timeMinutes: 180,
      sectionPath: '1.1',
    }),
    pos({
      id: 'p006', sortOrder: 6,
      oz: ' 1. 1.  40',
      shortText: 'Stützrohre für HVI-Leitung zur Konfektionierung vor Ort, Fangspitze aus NIRO, Ø10 mm.',
      quantity: 4, unit: 'St',
      materialCost: 362.35,
      timeMinutes: 180,
      sectionPath: '1.1',
    }),
    pos({
      id: 'p007', sortOrder: 7,
      oz: ' 1. 1.  50',
      shortText: 'Befestigungsset zur Montage der HVI  Leitung an HVI  Stützrohren',
      quantity: 48, unit: 'St',
      materialCost: 21.08,
      timeMinutes: 15,
      sectionPath: '1.1',
    }),
    pos({
      id: 'p008', sortOrder: 8,
      oz: ' 1. 1.  60',
      shortText: 'HVI-Leitung S<=45 cm',
      quantity: 80, unit: 'm',
      materialCost: 30.84,
      timeMinutes: 30,
      sectionPath: '1.1',
    }),
    pos({
      id: 'p009', sortOrder: 9,
      oz: ' 1. 1.  70',
      shortText: 'HVI-Leitung S<=75 cm',
      quantity: 170, unit: 'm',
      materialCost: 37.75,
      timeMinutes: 35,
      sectionPath: '1.1',
    }),
    pos({
      id: 'p010', sortOrder: 10,
      oz: ' 1. 1.  80',
      shortText: 'HVI-Leitung S<=90 cm',
      quantity: 350, unit: 'm',
      materialCost: 43.33,
      timeMinutes: 40,
      sectionPath: '1.1',
    }),
    pos({
      id: 'p011', sortOrder: 11,
      oz: ' 1. 1.  90',
      shortText: 'Dachleitungshalter für HVI-Leitung, für Klemmfalz-Dächer',
      quantity: 300, unit: 'St',
      materialCost: 3.74,
      timeMinutes: 5,
      sectionPath: '1.1',
    }),
    pos({
      id: 'p012', sortOrder: 12,
      oz: ' 1. 1. 100',
      shortText: 'Leitungshalter für HVI-Leitung, für Wandmontage',
      quantity: 100, unit: 'St',
      materialCost: 3.74,
      timeMinutes: 5,
      sectionPath: '1.1',
    }),
    pos({
      id: 'p013', sortOrder: 13,
      oz: ' 1. 1. 110',
      shortText: 'PA-Anschlusselement für HVI-Leitung',
      quantity: 48, unit: 'St',
      materialCost: 7.08,
      timeMinutes: 6,
      sectionPath: '1.1',
    }),
    pos({
      id: 'p014', sortOrder: 14,
      oz: ' 1. 1. 120',
      shortText: 'Kabel NYY-J 1x16RE Befestigung',
      quantity: 550, unit: 'm',
      materialCost: 2.37,
      timeMinutes: 2.67,
      sectionPath: '1.1',
    }),

    // ---- LEAK-TEST SENTINELS ----
    // (a) hidden-standard — visibleToCustomer=false, sentinel internals
    pos({
      id: 'sentinel-ex5-hidden', sortOrder: 114,
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
      id: 'sentinel-ex5-wagnis', sortOrder: 115,
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
      id: 'sentinel-ex5-visible', sortOrder: 116,
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

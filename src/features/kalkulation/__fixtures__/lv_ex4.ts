/**
 * Round 5 PART T — auto-generated fixture for ex4 (example 4/LV3_FW_mit_Preisen.xlsx).
 *
 * Source: `~/Desktop/Claude/example 4/LV3_FW_mit_Preisen.xlsx`, sheet `Kalkulation`.
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

export const LV_EX4_FIXTURE: ProjectData = {
  name: 'Neubau Feuerwehrhaus Süd',
  client: 'Gemeinde Henstedt-Ulzburg',
  clientEmail: '',
  clientAddress: '',
  service: 'Installationsanlagen, Beleuchtungsanlagen und Schwachstromanlagen',
  tenderNumber: '32600126OV',
  deadline: '',
  bidder: 'Otto Speetzen Elektrotechnik GmbH',
  calcParams: {
    ...DEFAULT_CALC_PARAMS,
    mittellohn: 30,
    verrechnungslohn: 67.9,
    materialZuschlag: 0.23,
  },
  positions: [
    pos({
      id: 'p001', sortOrder: 1,
      oz: ' 1',
      shortText: 'KG 443 Nsp.-Schaltanlagen',
      quantity: 62157.2, 
      isHeader: true,
      sectionPath: '1',
    }),
    pos({
      id: 'p002', sortOrder: 2,
      oz: ' 1. 1',
      shortText: 'Hauptverteilung und Zähleranlagen',
      isHeader: true,
      sectionPath: '1.1',
    }),
    pos({
      id: 'p003', sortOrder: 3,
      oz: ' 1. 1.   1',
      shortText: 'Niederspannungshauptverteilung AV / SV',
      quantity: 1, unit: 'Stk',
      materialCost: 13027.77,
      timeMinutes: 3264,
      sectionPath: '1.1',
    }),
    pos({
      id: 'p004', sortOrder: 4,
      oz: ' 1. 1.   2',
      shortText: 'Technische Abstimmung und Inbetriebnahme der NSHV',
      quantity: 1, unit: 'psch',
      timeMinutes: 2448,
      sectionPath: '1.1',
    }),
    pos({
      id: 'p005', sortOrder: 5,
      oz: ' 1. 1.   3',
      shortText: 'Wandlermessschrank bis 200 A für 1 Wandlerzähler',
      quantity: 1, unit: 'Stck',
      materialCost: 2787.5,
      timeMinutes: 765,
      sectionPath: '1.1',
    }),
    pos({
      id: 'p006', sortOrder: 6,
      oz: ' 1. 1.   4',
      shortText: 'Beantragung und Montage EVU Wandlermesszähler',
      quantity: 1, unit: 'Stck',
      timeMinutes: 510,
      sectionPath: '1.1',
    }),
    pos({
      id: 'p007', sortOrder: 7,
      oz: ' 1. 2',
      shortText: 'Versorgungsleitungen',
      isHeader: true,
      sectionPath: '1.2',
    }),
    pos({
      id: 'p008', sortOrder: 8,
      oz: ' 1. 2.   1',
      shortText: 'Nsp-Kabelanschluß NYCWY 4x70/35 mm²',
      quantity: 2, unit: 'Stck',
      timeMinutes: 26.14,
      sectionPath: '1.2',
    }),
    pos({
      id: 'p009', sortOrder: 9,
      oz: ' 1. 2.   2',
      shortText: 'Nsp-Kabelanschluß NYCWY 4x50/25mm²',
      quantity: 2, unit: 'Stck',
      timeMinutes: 24.01,
      sectionPath: '1.2',
    }),
    pos({
      id: 'p010', sortOrder: 10,
      oz: ' 1. 2.   3',
      shortText: 'Nsp-Kabelanschluß NYCWY 4x35/16 mm²',
      quantity: 4, unit: 'Stck',
      timeMinutes: 22.42,
      sectionPath: '1.2',
    }),
    pos({
      id: 'p011', sortOrder: 11,
      oz: ' 1. 2.   4',
      shortText: 'Nsp-Kabelanschluß NYM 5 x 10 mm²',
      quantity: 2, unit: 'Stck',
      timeMinutes: 24.23,
      sectionPath: '1.2',
    }),
    pos({
      id: 'p012', sortOrder: 12,
      oz: ' 1. 2.   5',
      shortText: 'NYCWY 4 x 70/35 mm², Kanal-Deckenverlegung',
      quantity: 8, unit: 'm',
      materialCost: 39.65,
      timeMinutes: 14.16,
      sectionPath: '1.2',
    }),
    pos({
      id: 'p013', sortOrder: 13,
      oz: ' 1. 2.   6',
      shortText: 'NYCWY 4 x 50/25 mm², Kanal-Deckenverlegung',
      quantity: 78, unit: 'm',
      materialCost: 28.63,
      timeMinutes: 10.76,
      sectionPath: '1.2',
    }),
    pos({
      id: 'p014', sortOrder: 14,
      oz: ' 1. 2.   7',
      shortText: 'NYCWY 4 x 35/16 mm², Kanal-Deckenverlegung',
      quantity: 24, unit: 'm',
      materialCost: 20.3,
      timeMinutes: 8.21,
      sectionPath: '1.2',
    }),

    // ---- LEAK-TEST SENTINELS ----
    // (a) hidden-standard — visibleToCustomer=false, sentinel internals
    pos({
      id: 'sentinel-ex4-hidden', sortOrder: 114,
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
      id: 'sentinel-ex4-wagnis', sortOrder: 115,
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
      id: 'sentinel-ex4-visible', sortOrder: 116,
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

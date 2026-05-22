/**
 * Round 5 PART T — auto-generated fixture for ex6 (example 6/LV3.xlsx).
 *
 * Source: `~/Desktop/claude1/example 6/LV3.xlsx`, sheet `Kalkulation`.
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

export const LV_EX6_FIXTURE: ProjectData = {
  name: 'Anbau Mensa - Marienschule Barßel',
  client: 'Gemeinde Barßel',
  clientEmail: '',
  clientAddress: '',
  service: 'Trockenbauarbeiten',
  tenderNumber: 'S-BARSSEL-2026-0027',
  deadline: '',
  bidder: 'GO Bau - Grzegorz Orlowski',
  calcParams: {
    ...DEFAULT_CALC_PARAMS,
    mittellohn: 30,
    verrechnungslohn: 89.9,
    materialZuschlag: 0.4,
  },
  positions: [
    pos({
      id: 'p001', sortOrder: 1,
      oz: ' 1',
      shortText: 'Trockenbauarbeiten',
      quantity: 10330.88, 
      isHeader: true,
      sectionPath: '1',
    }),
    pos({
      id: 'p002', sortOrder: 2,
      oz: ' 1.1',
      shortText: 'Wände',
      isHeader: true,
      sectionPath: '1.1',
    }),
    pos({
      id: 'p003', sortOrder: 3,
      oz: ' 1.1. 1',
      shortText: 'Vorsatzschale d=200mm',
      quantity: 13, unit: 'm2',
      materialCost: 23.5,
      timeMinutes: 37.5,
      sectionPath: '1.1',
    }),
    pos({
      id: 'p004', sortOrder: 4,
      oz: ' 1.1. 2',
      shortText: 'GK-Wände 12,5 cm',
      quantity: 10, unit: 'm2',
      materialCost: 24,
      timeMinutes: 56,
      sectionPath: '1.1',
    }),
    pos({
      id: 'p005', sortOrder: 5,
      oz: ' 1.1. 3',
      shortText: 'Zulage für gleitenden Anschluss',
      quantity: 10, unit: 'm',
      materialCost: 4.8,
      timeMinutes: 11.2,
      sectionPath: '1.1',
    }),
    pos({
      id: 'p006', sortOrder: 6,
      oz: ' 1.1. 4',
      shortText: 'Zulage OSB',
      quantity: 6, unit: 'm2',
      materialCost: 8,
      timeMinutes: 5,
      sectionPath: '1.1',
    }),
    pos({
      id: 'p007', sortOrder: 7,
      oz: ' 1.1. 5',
      shortText: 'Öffnungen in Vorsatzschale bis 0,30 x 0,30 cm',
      quantity: 3, unit: 'St',
      materialCost: 12,
      timeMinutes: 12,
      sectionPath: '1.1',
    }),
    pos({
      id: 'p008', sortOrder: 8,
      oz: ' 1.1. 6',
      shortText: 'Ausschnitte für Sanitärobjektmontagen',
      quantity: 15, unit: 'St',
      timeMinutes: 28.75,
      sectionPath: '1.1',
    }),
    pos({
      id: 'p009', sortOrder: 9,
      oz: ' 1.1. 7',
      shortText: 'UA-Profile 100 mm',
      quantity: 20, unit: 'm',
      materialCost: 4.5,
      timeMinutes: 12.5,
      sectionPath: '1.1',
    }),
    pos({
      id: 'p010', sortOrder: 10,
      oz: ' 1.1. 8',
      shortText: 'Rohrverkleidung 15 - 25 cm',
      quantity: 10, unit: 'm',
      materialCost: 8.78,
      timeMinutes: 22.43,
      sectionPath: '1.1',
    }),
    pos({
      id: 'p011', sortOrder: 11,
      oz: ' 1.1. 9',
      shortText: 'Innentür mit Zarge ',
      quantity: 1, unit: 'St',
      materialCost: 1800,
      timeMinutes: 180,
      sectionPath: '1.1',
    }),
    pos({
      id: 'p012', sortOrder: 12,
      oz: ' 1.1.10',
      shortText: 'Innentür mit Zarge 1,01 x 2,135',
      quantity: 1, unit: 'St',
      materialCost: 2000,
      timeMinutes: 220,
      sectionPath: '1.1',
    }),
    pos({
      id: 'p013', sortOrder: 13,
      oz: ' 2',
      shortText: 'WC-Trennwandsystem',
      quantity: 2310, 
      isHeader: true,
      sectionPath: '2',
    }),
    pos({
      id: 'p014', sortOrder: 14,
      oz: ' 2.1',
      shortText: 'WC -Trennwandanlage ',
      isHeader: true,
      sectionPath: '2.1',
    }),

    // ---- LEAK-TEST SENTINELS ----
    // (a) hidden-standard — visibleToCustomer=false, sentinel internals
    pos({
      id: 'sentinel-ex6-hidden', sortOrder: 114,
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
      id: 'sentinel-ex6-wagnis', sortOrder: 115,
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
      id: 'sentinel-ex6-visible', sortOrder: 116,
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

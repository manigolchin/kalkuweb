/**
 * Round 5 PART T — auto-generated fixture for ex3 (example 3/LV3.xlsx).
 *
 * Source: `~/Desktop/Claude/example 3/LV3.xlsx`, sheet `Kalkulation`.
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

export const LV_EX3_FIXTURE: ProjectData = {
  name: 'Universitätsklinikum Bonn - Bettenhaus',
  client: 'Universitätsklinikum Bonn',
  clientEmail: '',
  clientAddress: '',
  service: 'Beleuchtungsanlage',
  tenderNumber: 'y-928.0024.024',
  deadline: '',
  bidder: 'Elektro Schwarzkopf Service und Anlagenbau GmbH',
  calcParams: {
    ...DEFAULT_CALC_PARAMS,
    mittellohn: 30,
    verrechnungslohn: 64.9,
    materialZuschlag: 0.2,
  },
  positions: [
    pos({
      id: 'p001', sortOrder: 1,
      oz: ' .  .  10',
      shortText: 'Demontage Downlights',
      quantity: 25, unit: 'st',
      materialCost: 2.5,
      timeMinutes: 10,
      sectionPath: '',
    }),
    pos({
      id: 'p002', sortOrder: 2,
      oz: ' .  .  20',
      shortText: 'Demontage Lichtbänder',
      quantity: 30, unit: 'st',
      materialCost: 2.5,
      timeMinutes: 10,
      sectionPath: '',
    }),
    pos({
      id: 'p003', sortOrder: 3,
      oz: ' .  .  30',
      shortText: 'Demontage Downlights',
      quantity: 30, unit: 'st',
      materialCost: 2.5,
      timeMinutes: 10,
      sectionPath: '',
    }),
    pos({
      id: 'p004', sortOrder: 4,
      oz: ' .  .  40',
      shortText: 'Demontage Wandleuchten',
      quantity: 40, unit: 'st',
      materialCost: 2.5,
      timeMinutes: 10,
      sectionPath: '',
    }),
    pos({
      id: 'p005', sortOrder: 5,
      oz: ' .  .  50',
      shortText: 'Demontage Leitungen',
      quantity: 3000, unit: 'm',
      timeMinutes: 0.75,
      sectionPath: '',
    }),
    pos({
      id: 'p006', sortOrder: 6,
      oz: ' .  .  60',
      shortText: 'Austausch KNX-Taster gegen Leerdose',
      quantity: 15, unit: 'st',
      materialCost: 10,
      timeMinutes: 15,
      sectionPath: '',
    }),
    pos({
      id: 'p007', sortOrder: 7,
      oz: ' .  .  70',
      shortText: 'Präsenzmelder',
      quantity: 20, unit: 'st',
      materialCost: 96.3,
      timeMinutes: 20,
      sectionPath: '',
    }),
    pos({
      id: 'p008', sortOrder: 8,
      oz: ' .  .  80',
      shortText: 'Deckenleuchten Trilux 3331 G2 D2 TS LED2400-840 ETDD 01',
      quantity: 27, unit: 'st',
      materialCost: 247.34,
      timeMinutes: 42.4,
      sectionPath: '',
    }),
    pos({
      id: 'p009', sortOrder: 9,
      oz: ' .  .  90',
      shortText: 'Deckenleuchten Trilux 3331 G2 D2 LED3700-840 ETDD 01 als Notbeleucht.',
      quantity: 27, unit: 'st',
      materialCost: 258.03,
      timeMinutes: 43.7,
      sectionPath: '',
    }),
    pos({
      id: 'p010', sortOrder: 10,
      oz: ' .  . 100',
      shortText: 'Deckenleuchte Trilux ArimoFit G2',
      quantity: 4, unit: 'st',
      materialCost: 234,
      timeMinutes: 42,
      sectionPath: '',
    }),
    pos({
      id: 'p011', sortOrder: 11,
      oz: ' .  . 110',
      shortText: 'Deckenleuchte Trilux ArimoFit G2 als Notbeleuchtung',
      quantity: 4, unit: 'st',
      materialCost: 218.97,
      timeMinutes: 42,
      sectionPath: '',
    }),
    pos({
      id: 'p012', sortOrder: 12,
      oz: ' .  . 120',
      shortText: 'Aussteifungsblech für durlum-Decke',
      quantity: 68, unit: 'st',
      materialCost: 32,
      timeMinutes: 20,
      sectionPath: '',
    }),
    pos({
      id: 'p013', sortOrder: 13,
      oz: ' .  . 130',
      shortText: 'Isolationsmessung an bestehenden Zuleitungen',
      quantity: 40, unit: 'st',
      timeMinutes: 30,
      sectionPath: '',
    }),
    pos({
      id: 'p014', sortOrder: 14,
      oz: ' .  . 140',
      shortText: 'NYM-J 3x1,5 mm²',
      quantity: 700, unit: 'm',
      materialCost: 0.64,
      timeMinutes: 4.08,
      sectionPath: '',
    }),

    // ---- LEAK-TEST SENTINELS ----
    // (a) hidden-standard — visibleToCustomer=false, sentinel internals
    pos({
      id: 'sentinel-ex3-hidden', sortOrder: 114,
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
      id: 'sentinel-ex3-wagnis', sortOrder: 115,
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
      id: 'sentinel-ex3-visible', sortOrder: 116,
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

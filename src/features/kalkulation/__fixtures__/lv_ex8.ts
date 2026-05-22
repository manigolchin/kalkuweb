/**
 * Round 5 PART T — auto-generated fixture for ex8 (example 8/LV3.xlsx).
 *
 * Source: `~/Desktop/claude1/example 8/LV3.xlsx`, sheet `Kalkulation`.
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

export const LV_EX8_FIXTURE: ProjectData = {
  name: 'Sanierung Rathaus, 78112 St. Georgen i. Schw',
  client: 'Stadt St. Georgen',
  clientEmail: '',
  clientAddress: '',
  service: 'Trockenbauarbeiten',
  tenderNumber: '5-eu-26',
  deadline: '',
  bidder: 'H&W - Jens Klingbeil',
  calcParams: {
    ...DEFAULT_CALC_PARAMS,
    mittellohn: 30,
    verrechnungslohn: 49.9,
    materialZuschlag: 0.12,
  },
  positions: [
    pos({
      id: 'p001', sortOrder: 1,
      oz: ' 01',
      shortText: 'Vorbereitende Arbeiten                  ',
      isHeader: true,
      sectionPath: '01',
    }),
    pos({
      id: 'p002', sortOrder: 2,
      oz: ' 01.  .001',
      shortText: 'Baustelle einrichten, vorhalten, räumen',
      quantity: 1, unit: 'psch',
      timeMinutes: 1800,
      sectionPath: '01',
    }),
    pos({
      id: 'p003', sortOrder: 3,
      oz: ' 01.  .002',
      shortText: 'Raumgerüst Sitzungssaal 1.OG',
      quantity: 1, unit: 'St',
      timeMinutes: 1800,
      sectionPath: '01',
    }),
    pos({
      id: 'p004', sortOrder: 4,
      oz: ' 02',
      shortText: 'Trockenbau Wände                        ',
      quantity: 171358.33, 
      isHeader: true,
      sectionPath: '02',
    }),
    pos({
      id: 'p005', sortOrder: 5,
      oz: ' 02.01',
      shortText: 'GK-Wände                                ',
      isHeader: true,
      sectionPath: '02.01',
    }),
    pos({
      id: 'p006', sortOrder: 6,
      oz: ' 02.01.001',
      shortText: 'Typ Wi_01 GK-Metallständerwand, 100 mm, CW 50, Rw 43 dB',
      quantity: 1035, unit: 'm²',
      materialCost: 20.5,
      timeMinutes: 46.5,
      sectionPath: '02.01',
    }),
    pos({
      id: 'p007', sortOrder: 7,
      oz: ' 02.01.002',
      shortText: 'Typ Wi_02 GK-Metallständerwand, 100 mm, CW 50, Rw 60 dB',
      quantity: 270, unit: 'm²',
      materialCost: 50.5,
      timeMinutes: 51.5,
      sectionPath: '02.01',
    }),
    pos({
      id: 'p008', sortOrder: 8,
      oz: ' 02.01.003',
      shortText: 'Typ Wi_07 Wandverjüngung an Typ Wi_01; Rw = 47,8 dB',
      quantity: 50, unit: 'm²',
      materialCost: 28.5,
      timeMinutes: 49.5,
      sectionPath: '02.01',
    }),
    pos({
      id: 'p009', sortOrder: 9,
      oz: ' 02.01.004',
      shortText: 'Typ Wi_08 Wandverjüngung an Typ Wi_02; Rw = 54,9 dB',
      quantity: 12, unit: 'm²',
      materialCost: 38.5,
      timeMinutes: 59.5,
      sectionPath: '02.01',
    }),
    pos({
      id: 'p010', sortOrder: 10,
      oz: ' 02.01.005',
      shortText: 'Typ Wi_03 GK-Schachtwand, 2-lagig 12,5 mm, MW 40 mm, d=75 mm',
      quantity: 582, unit: 'm²',
      materialCost: 13.75,
      timeMinutes: 31.75,
      sectionPath: '02.01',
    }),
    pos({
      id: 'p011', sortOrder: 11,
      oz: ' 02.01.006',
      shortText: 'Typ Wi_04 GK-Schachtwand, 2-lagig 12,5 mm, MW 40 mm, EI 90',
      quantity: 56, unit: 'm²',
      materialCost: 15.75,
      timeMinutes: 31.75,
      sectionPath: '02.01',
    }),
    pos({
      id: 'p012', sortOrder: 12,
      oz: ' 02.01.007',
      shortText: 'Typ Wi_05 GK-Metalldoppelständerwand, 205 mm, CW 50, MW 40',
      quantity: 15, unit: 'm²',
      materialCost: 25.5,
      timeMinutes: 51.5,
      sectionPath: '02.01',
    }),
    pos({
      id: 'p013', sortOrder: 13,
      oz: ' 02.01.008',
      shortText: 'Trennwand als Schachtwand, 2-lagig,12,5mm, direkt Wandanschluss',
      quantity: 48, unit: 'm²',
      materialCost: 192.75,
      timeMinutes: 35.75,
      sectionPath: '02.01',
    }),
    pos({
      id: 'p014', sortOrder: 14,
      oz: ' 02.01.009',
      shortText: 'Zulage Herstellen Außenecken',
      quantity: 16, unit: 'm',
      materialCost: 3.08,
      timeMinutes: 6.98,
      sectionPath: '02.01',
    }),

    // ---- LEAK-TEST SENTINELS ----
    // (a) hidden-standard — visibleToCustomer=false, sentinel internals
    pos({
      id: 'sentinel-ex8-hidden', sortOrder: 114,
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
      id: 'sentinel-ex8-wagnis', sortOrder: 115,
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
      id: 'sentinel-ex8-visible', sortOrder: 116,
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

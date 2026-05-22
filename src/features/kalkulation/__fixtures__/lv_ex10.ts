/**
 * Round 5 PART T — auto-generated fixture for ex10 (example 10/LV3.xlsx).
 *
 * Source: `~/Desktop/claude1/example 10/LV3.xlsx`, sheet `Kalkulation`.
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

export const LV_EX10_FIXTURE: ProjectData = {
  name: 'Sanierung Lüftung Produktion Daimlerstraße 25',
  client: 'Ulmer Fleisch GmbH',
  clientEmail: '',
  clientAddress: '',
  service: 'Anlagenverkabelung Lüftungs- und Entrauchungsanlagen',
  tenderNumber: 'E-0925-1',
  deadline: '',
  bidder: 'Schwäbischer Industrie- und Elektroservice - Akengin Sezgin',
  calcParams: {
    ...DEFAULT_CALC_PARAMS,
    mittellohn: 30,
    verrechnungslohn: 64.9,
    materialZuschlag: 0.5,
  },
  positions: [
    pos({
      id: 'p001', sortOrder: 1,
      oz: ' 1',
      shortText: 'Maschinelle Entrauchung Rinderzerlegung',
      quantity: 32994.37, 
      isHeader: true,
      sectionPath: '1',
    }),
    pos({
      id: 'p002', sortOrder: 2,
      oz: ' 1. 1',
      shortText: 'MRA-Schaltschrank',
      isHeader: true,
      sectionPath: '1.1',
    }),
    pos({
      id: 'p003', sortOrder: 3,
      oz: ' 1. 1. 10',
      shortText: 'AX Kompakt-Schaltschrank\nMaße (B x H x T): 1.000 x 1.200 x 300 mm',
      quantity: 1, unit: 'psch',
      materialCost: 3534,
      timeMinutes: 3541.09,
      sectionPath: '1.1',
    }),
    pos({
      id: 'p004', sortOrder: 4,
      oz: ' 1. 1. 20',
      shortText: 'NH-Sicherungseinsatz 500VAC Betriebskl.gG Gr.00 100A',
      quantity: 3, unit: 'St',
      materialCost: 5.12,
      timeMinutes: 5.14,
      sectionPath: '1.1',
    }),
    pos({
      id: 'p005', sortOrder: 5,
      oz: ' 1. 2',
      shortText: 'Leitungsträgersysteme',
      isHeader: true,
      sectionPath: '1.2',
    }),
    pos({
      id: 'p006', sortOrder: 6,
      oz: ' 1. 2. 10',
      shortText: 'Gitterrinne  Stahl niro V2A Mini 25/25 mit S40 Verb.',
      quantity: 20, unit: 'm',
      materialCost: 22.53,
      timeMinutes: 22.58,
      sectionPath: '1.2',
    }),
    pos({
      id: 'p007', sortOrder: 7,
      oz: ' 1. 2. 20',
      shortText: 'Gitterrinne  Stahl niro V2A Mini 50/50 mit S40 Verb+S46 Halter',
      quantity: 6, unit: 'm',
      materialCost: 26.39,
      timeMinutes: 26.45,
      sectionPath: '1.2',
    }),
    pos({
      id: 'p008', sortOrder: 8,
      oz: ' 1. 2. 30',
      shortText: 'Gitterrinne  Stahl niro V2A Mini, vertikale Verlegung 25/25 mit S40 Verb.',
      quantity: 6, unit: 'm',
      materialCost: 23.76,
      timeMinutes: 23.81,
      sectionPath: '1.2',
    }),
    pos({
      id: 'p009', sortOrder: 9,
      oz: ' 1. 2. 40',
      shortText: 'Wandanschluss S46,S47 horizontal für S20/S25/S26 Gitterrinne',
      quantity: 12, unit: 'St',
      materialCost: 5.41,
      timeMinutes: 5.41,
      sectionPath: '1.2',
    }),
    pos({
      id: 'p010', sortOrder: 10,
      oz: ' 1. 2. 50',
      shortText: 'Wandanschluss vertikal für S20/S25/S26 Gitterrinne',
      quantity: 10, unit: 'St',
      materialCost: 5.62,
      timeMinutes: 5.63,
      sectionPath: '1.2',
    }),
    pos({
      id: 'p011', sortOrder: 11,
      oz: ' 1. 2. 60',
      shortText: 'Klemmkopfplatte S87 für Siltec Gitterrinnen zur Wandbefestigung',
      quantity: 10, unit: 'St',
      materialCost: 3.78,
      timeMinutes: 3.79,
      sectionPath: '1.2',
    }),
    pos({
      id: 'p012', sortOrder: 12,
      oz: ' 1. 2. 70',
      shortText: 'Klemmkopfplatte S40B für Siltec Gitterrinnen zur Wandbefestigung',
      quantity: 5, unit: 'St',
      materialCost: 4.5,
      timeMinutes: 4.51,
      sectionPath: '1.2',
    }),
    pos({
      id: 'p013', sortOrder: 13,
      oz: ' 1. 2. 80',
      shortText: 'Erdungsklemme für Siltec Gitterinnen',
      quantity: 10, unit: 'St',
      materialCost: 6.4,
      timeMinutes: 6.41,
      sectionPath: '1.2',
    }),
    pos({
      id: 'p014', sortOrder: 14,
      oz: ' 1. 2. 90',
      shortText: 'Gitterrinne Stahl niro CF54/50',
      quantity: 8, unit: 'm',
      materialCost: 26.07,
      timeMinutes: 26.13,
      sectionPath: '1.2',
    }),

    // ---- LEAK-TEST SENTINELS ----
    // (a) hidden-standard — visibleToCustomer=false, sentinel internals
    pos({
      id: 'sentinel-ex10-hidden', sortOrder: 114,
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
      id: 'sentinel-ex10-wagnis', sortOrder: 115,
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
      id: 'sentinel-ex10-visible', sortOrder: 116,
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

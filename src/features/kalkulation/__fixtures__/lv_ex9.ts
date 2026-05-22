/**
 * Round 5 PART T — auto-generated fixture for ex9 (example 9/LV3.xlsx).
 *
 * Source: `~/Desktop/claude1/example 9/LV3.xlsx`, sheet `Kalkulation`.
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

export const LV_EX9_FIXTURE: ProjectData = {
  name: 'Restrukturierung Neuroradiologie',
  client: 'Universitätsklinikum Bonn',
  clientEmail: '',
  clientAddress: '',
  service: 'Elektroinstallationsarbeiten',
  tenderNumber: '2022-005-480.2',
  deadline: '',
  bidder: 'Elektro Schwarzkopf Service und Anlagenbau GmbH',
  calcParams: {
    ...DEFAULT_CALC_PARAMS,
    mittellohn: 30,
    verrechnungslohn: 89.9,
    materialZuschlag: 0.2,
  },
  positions: [
    pos({
      id: 'p001', sortOrder: 1,
      oz: ' 1',
      shortText: 'Teilmaßnahme MRT 1-4, Gebäudeautomation',
      quantity: 189280.33, 
      isHeader: true,
      sectionPath: '1',
    }),
    pos({
      id: 'p002', sortOrder: 2,
      oz: ' 1. 1',
      shortText: 'Schaltschrank',
      isHeader: true,
      sectionPath: '1.1',
    }),
    pos({
      id: 'p003', sortOrder: 3,
      oz: ' 1. 1.  10',
      shortText: 'Baugruppe Gehäuse Anreihschrank, 800x1800x400 mm',
      quantity: 2, unit: 'St',
      sectionPath: '1.1',
    }),
    pos({
      id: 'p004', sortOrder: 4,
      oz: ' 1. 1.  20',
      shortText: 'Baugruppe Seitenteile Anreihschrank, 1800 x 400mm',
      quantity: 2, unit: 'St',
      sectionPath: '1.1',
    }),
    pos({
      id: 'p005', sortOrder: 5,
      oz: ' 1. 1.  30',
      shortText: 'Baugruppe Schaltschranksockel aus Stahlblech',
      quantity: 2, unit: 'St',
      sectionPath: '1.1',
    }),
    pos({
      id: 'p006', sortOrder: 6,
      oz: ' 1. 1.  40',
      shortText: 'Baugruppe Komfort- Griff für Schaltschranktür',
      quantity: 2, unit: 'St',
      sectionPath: '1.1',
    }),
    pos({
      id: 'p007', sortOrder: 7,
      oz: ' 1. 1.  50',
      shortText: 'Baugruppe Ablagepult',
      quantity: 1, unit: 'St',
      sectionPath: '1.1',
    }),
    pos({
      id: 'p008', sortOrder: 8,
      oz: ' 1. 1.  60',
      shortText: 'Baugruppe Schaltschranklüftung mit Thermostat',
      quantity: 2, unit: 'St',
      sectionPath: '1.1',
    }),
    pos({
      id: 'p009', sortOrder: 9,
      oz: ' 1. 1.  70',
      shortText: 'Baugruppe Elastisches Klemmprofil zur Abdichtung der Kabeleinführung',
      quantity: 2, unit: 'St',
      sectionPath: '1.1',
    }),
    pos({
      id: 'p010', sortOrder: 10,
      oz: ' 1. 1.  80',
      shortText: 'Baugruppe Schaltschrankbeleuchtung + Steckdose LED',
      quantity: 2, unit: 'St',
      sectionPath: '1.1',
    }),
    pos({
      id: 'p011', sortOrder: 11,
      oz: ' 1. 1.  90',
      shortText: 'Baugruppe Schaltschrank-Steckdose incl.Sicherung+FI/LS-Kombischalter',
      quantity: 1, unit: 'St',
      sectionPath: '1.1',
    }),
    pos({
      id: 'p012', sortOrder: 12,
      oz: ' 1. 1. 100',
      shortText: 'Baugruppe Einspeisung 50A 400V/50 Hz',
      quantity: 1, unit: 'St',
      sectionPath: '1.1',
    }),
    pos({
      id: 'p013', sortOrder: 13,
      oz: ' 1. 1. 110',
      shortText: 'Baugruppe Überspannungsschutz 400V, 4pol., mit FM-Kontakt',
      quantity: 1, unit: 'St',
      sectionPath: '1.1',
    }),
    pos({
      id: 'p014', sortOrder: 14,
      oz: ' 1. 1. 120',
      shortText: 'Baugruppe Überspannungsschutz 2-pol. als Netzfeinschutz für DDC Controler und',
      quantity: 1, unit: 'St',
      sectionPath: '1.1',
    }),

    // ---- LEAK-TEST SENTINELS ----
    // (a) hidden-standard — visibleToCustomer=false, sentinel internals
    pos({
      id: 'sentinel-ex9-hidden', sortOrder: 114,
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
      id: 'sentinel-ex9-wagnis', sortOrder: 115,
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
      id: 'sentinel-ex9-visible', sortOrder: 116,
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

/**
 * Round 5 PART T — auto-generated fixture for ex2 (example 2/LV3.xlsx).
 *
 * Source: `~/Desktop/Claude/example 2/LV3.xlsx`, sheet `Kalkulation`.
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

export const LV_EX2_FIXTURE: ProjectData = {
  name: 'Neuvermietung der Mietfläche Stuttgart',
  client: 'F&M Retail GmbH',
  clientEmail: '',
  clientAddress: '',
  service: 'Nicht konstruktiver Abbruch',
  tenderNumber: '125_109/003',
  deadline: '',
  bidder: 'COS Clearing Out Service GmbH',
  calcParams: {
    ...DEFAULT_CALC_PARAMS,
    mittellohn: 30,
    verrechnungslohn: 64.9,
    materialZuschlag: 0.25,
  },
  positions: [
    pos({
      id: 'p001', sortOrder: 1,
      oz: 'Pos. 1',
      shortText: 'Baustelleneinrichtung allgemein ',
      quantity: 1, unit: 'pschl.',
      timeMinutes: 2400,
      sectionPath: 'Pos',
    }),
    pos({
      id: 'p002', sortOrder: 2,
      oz: 'Pos. 2',
      shortText: 'Sicherheitsausstattung - Verbandskästen \nLieferung und Vorhaltung von: Großer Verbandskasten der Art "Erste Hilfe Koffe',
      quantity: 1, unit: 'pschl.',
      materialCost: 50,
      timeMinutes: 90,
      sectionPath: 'Pos',
    }),
    pos({
      id: 'p003', sortOrder: 3,
      oz: 'Pos. 3',
      shortText: 'Beantragung der Sondernutzung öffentlicher Straßenraum der Stadt Stuttgart BE-Fläche + Bauzaun + Verkehrssicherung + Kon',
      quantity: 1, unit: 'pschl.',
      materialCost: 500,
      timeMinutes: 900,
      sectionPath: 'Pos',
    }),
    pos({
      id: 'p004', sortOrder: 4,
      oz: 'Pos. 4',
      shortText: 'Zulage Verlängerung Sondernutzung BE-Fläche + Bauzaun + Verkehrssicherung + Kontrollfahrten pro  Monat',
      quantity: 1, unit: 'pschl.',
      timeMinutes: 360,
      sectionPath: 'Pos',
    }),
    pos({
      id: 'p005', sortOrder: 5,
      oz: 'Pos. 5',
      shortText: 'Bauschließung ',
      quantity: 1, unit: 'pschl.',
      timeMinutes: 360,
      sectionPath: 'Pos',
    }),
    pos({
      id: 'p006', sortOrder: 6,
      oz: 'Pos. 6',
      shortText: 'Feststehendes Gerüst Treppenhaus Innenraum',
      quantity: 1, unit: 'pschl.',
      timeMinutes: 540,
      sectionPath: 'Pos',
    }),
    pos({
      id: 'p007', sortOrder: 7,
      oz: 'Pos. 7',
      shortText: 'Rollgerüst Abbrucharbeiten Decke',
      quantity: 1, unit: 'pschl.',
      timeMinutes: 360,
      sectionPath: 'Pos',
    }),
    pos({
      id: 'p008', sortOrder: 8,
      oz: 'Pos. 8',
      shortText: 'Schutzabdeckung Fenster (Fassade)\nSchutzmaßnahmen der Fassade auf allen Innen-Seiten mit OSB 22 mm Platten zum flächend',
      quantity: 163, unit: 'm²',
      materialCost: 8,
      timeMinutes: 6.75,
      sectionPath: 'Pos',
    }),
    pos({
      id: 'p009', sortOrder: 9,
      oz: 'Pos. 9',
      shortText: 'Schutzabdeckung Glasgeländer  \nSchutzmaßnahmen Glasgeländer auf allen Seiten mit Hartfaserplatten 3mm verkleiden. Stöße',
      quantity: 1, unit: 'pschl.',
      materialCost: 600,
      timeMinutes: 562.5,
      sectionPath: 'Pos',
    }),
    pos({
      id: 'p010', sortOrder: 10,
      oz: 'Pos. 10',
      shortText: 'Absturzsicherung 1.OG vor Einscheibenbestandsverglasung\n',
      quantity: 1, unit: 'pschl.',
      timeMinutes: 375,
      sectionPath: 'Pos',
    }),
    pos({
      id: 'p011', sortOrder: 11,
      oz: 'Pos. 11',
      shortText: 'Entrümpelung Altmaterial 2.UG-1.OG \nAbtransport und Entsorgung aller übrig gebliebenen leichten Restmaterialien: hier A',
      quantity: 1, unit: 'pschl.',
      materialCost: 885,
      timeMinutes: 540,
      sectionPath: 'Pos',
    }),
    pos({
      id: 'p012', sortOrder: 12,
      oz: 'Pos. 12',
      shortText: 'Vorhandene Küche - Rückbau und Entsorgung 1.OG\nRückbau und fachgerechte Entsorgung der kleinen Küche im Personalraum de',
      quantity: 1, unit: 'St.',
      materialCost: 90,
      timeMinutes: 540,
      sectionPath: 'Pos',
    }),
    pos({
      id: 'p013', sortOrder: 13,
      oz: 'Pos. 13',
      shortText: 'Lose Einrichtung Verkaufsfläche -  Rückbau und Entsorgung 2.UG-1.OG \nRückbau und fachgerechte Entsorgung sämtlich loser',
      quantity: 594, unit: 'm²',
      materialCost: 5.9,
      timeMinutes: 22.5,
      sectionPath: 'Pos',
    }),
    pos({
      id: 'p014', sortOrder: 14,
      oz: 'Pos. 14',
      shortText: 'Alt-Tresor - Rückbau und Entsorgung 1.UG\nRückbau und fachgerechte Entsorgung eines Tresors aus dem Bestand eines Vormie',
      quantity: 1, unit: 'St.',
      timeMinutes: 180,
      sectionPath: 'Pos',
    }),

    // ---- LEAK-TEST SENTINELS ----
    // (a) hidden-standard — visibleToCustomer=false, sentinel internals
    pos({
      id: 'sentinel-ex2-hidden', sortOrder: 114,
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
      id: 'sentinel-ex2-wagnis', sortOrder: 115,
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
      id: 'sentinel-ex2-visible', sortOrder: 116,
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

/**
 * PART N — round-trip test for the Vorlage exporter.
 *
 * Property: a `ProjectData` exported via `exportToKalkulationVorlage` and
 * re-imported via `parseKalkulationWorkbook` yields back the same
 * positions, calcParams, and project meta (modulo numeric rounding to
 * 2 decimals where the Vorlage format truncates).
 *
 * Also verifies the canonical header anchors land at the exact cells the
 * importer's detector looks for (so the exported file activates the
 * Kalkulation-template fast-path on re-import — not the generic mapping
 * wizard).
 */

import { describe, test, expect } from 'vitest';
import XLSX from 'xlsx';
import { exportToKalkulationVorlage } from '../export';
import { parseKalkulationWorkbook } from '../parse';
import { DEFAULT_CALC_PARAMS } from '@/features/kalkulation/calc';
import type { ProjectData } from '@/features/kalkulation/types';

const FIXTURE: ProjectData = {
  name: 'Blücherhof Kiel — Test',
  client: 'Heinrich Karstens Bauunternehmung',
  clientEmail: '',
  clientAddress: '',
  service: 'Elektroinstallation',
  tenderNumber: '25-3-019',
  deadline: '2026-05-29',
  bidder: 'Otto Speetzen Elektrotechnik',
  calcParams: { ...DEFAULT_CALC_PARAMS, mittellohn: 30, verrechnungslohn: 67.9, materialZuschlag: 0.23 },
  positions: [
    {
      id: 'h1', oz: '1.4.1', shortText: 'KG 442 Sicherheitsbeleuchtung',
      longText: '', hinweisText: '',
      quantity: 0, unit: '', materialCost: 0, timeMinutes: 0, nuCost: 0,
      isHeader: true, sortOrder: 1, sectionPath: '1.4.1',
      epLohn: 0, epMaterial: 0, epGeraet: 0, epNu: 0, ep: 0, gp: 0,
      visibleToCustomer: true,
    },
    {
      id: 'p1', oz: '1.4.1.1', shortText: 'Überwachungszentrale Einzelbatterieleuchten',
      longText: '', hinweisText: '',
      quantity: 1, unit: 'St', materialCost: 1071.54, timeMinutes: 306, nuCost: 0,
      isHeader: false, sortOrder: 2, sectionPath: '1.4.1',
      epLohn: 0, epMaterial: 0, epGeraet: 0, epNu: 0, ep: 0, gp: 0,
      visibleToCustomer: true,
    },
    {
      id: 'p2', oz: '1.4.1.2', shortText: 'RZA01 Rettungszeichenleuchte',
      longText: '', hinweisText: '',
      quantity: 4, unit: 'St', materialCost: 148.08, timeMinutes: 35.7, nuCost: 0,
      isHeader: false, sortOrder: 3, sectionPath: '1.4.1',
      epLohn: 0, epMaterial: 0, epGeraet: 0, epNu: 0, ep: 0, gp: 0,
      visibleToCustomer: true,
    },
  ],
  notes: '',
};

describe('PART N — Kalkulation-Vorlage exporter', () => {
  test('emits a single sheet named "Kalkulation"', async () => {
    const bytes = await exportToKalkulationVorlage(FIXTURE);
    const wb = XLSX.read(bytes, { type: 'array' });
    expect(wb.SheetNames).toContain('Kalkulation');
  });

  test('places canonical header anchors at exact cells (re-import activates fast-path)', async () => {
    const bytes = await exportToKalkulationVorlage(FIXTURE);
    const wb = XLSX.read(bytes, { type: 'array' });
    const ws = wb.Sheets['Kalkulation'];

    expect(ws['A2']?.v).toBe('AG:');
    expect(ws['A4']?.v).toBe('Leistung:');
    expect(ws['A6']?.v).toBe('BV:');
    expect(ws['A8']?.v).toBe('Bieter:');
    expect(ws['C8']?.v).toBe('Netto Angebotssumme');
    expect(ws['C9']?.v).toBe('MwSt.:');
    expect(ws['C10']?.v).toBe('Brutto Angebotssumme');
  });

  test('places canonical row-13 column headers', async () => {
    const bytes = await exportToKalkulationVorlage(FIXTURE);
    const wb = XLSX.read(bytes, { type: 'array' });
    const ws = wb.Sheets['Kalkulation'];

    expect(ws['A13']?.v).toBe('Pos.');
    expect(ws['B13']?.v).toBe('Bezeichnung');
    expect(ws['C13']?.v).toBe('Menge');
    expect(ws['E13']?.v).toBe('EP');
    expect(ws['F13']?.v).toBe('GP');
    expect(ws['J13']?.v).toBe('Min/Einheit');
    expect(ws['K13']?.v).toBe('Lstg./Std.');
  });

  test('round-trips through the importer with no header-anchor warnings', async () => {
    const bytes = await exportToKalkulationVorlage(FIXTURE);
    const result = await parseKalkulationWorkbook(bytes);

    // No 'header_anchor_missing' issues → the importer's fast-path detector
    // accepted this file as a Kalkulation template.
    const anchorMisses = result.issues.filter((i) => i.code === 'header_anchor_missing');
    expect(anchorMisses.length).toBe(0);

    // Meta round-trips
    expect(result.meta.client).toBe(FIXTURE.client);
    expect(result.meta.service).toBe(FIXTURE.service);
    expect(result.meta.bv).toBe(FIXTURE.name);
    expect(result.meta.bidder).toBe(FIXTURE.bidder);
    expect(result.meta.tenderNumber).toBe(FIXTURE.tenderNumber);

    // CalcParams round-trip
    expect(result.derivedCalcParams.mittellohn).toBe(FIXTURE.calcParams.mittellohn);
    expect(result.derivedCalcParams.verrechnungslohn).toBe(FIXTURE.calcParams.verrechnungslohn);
    expect(result.derivedCalcParams.materialZuschlag).toBeCloseTo(FIXTURE.calcParams.materialZuschlag, 4);
    expect(result.derivedCalcParams.mwst).toBeCloseTo(FIXTURE.calcParams.mwst, 4);
  });

  test('round-trips positions (1 header + 2 data rows from fixture)', async () => {
    const bytes = await exportToKalkulationVorlage(FIXTURE);
    const result = await parseKalkulationWorkbook(bytes);
    const project = result.project!;

    // Should have at least the header + 2 positions (the importer may add
    // a hint row from longText, but ours are empty).
    const headers = project.positions.filter((p) => p.isHeader && p.shortText.trim());
    const datas = project.positions.filter((p) => !p.isHeader && p.shortText.trim());
    expect(headers.length).toBeGreaterThanOrEqual(1);
    expect(datas.length).toBe(2);

    // First data row matches fixture
    const p1 = datas.find((p) => p.shortText.includes('Überwachungszentrale'))!;
    expect(p1.quantity).toBe(1);
    expect(p1.unit).toBe('St');
    expect(p1.materialCost).toBeCloseTo(1071.54, 2);
    expect(p1.timeMinutes).toBe(306);

    // Second data row
    const p2 = datas.find((p) => p.shortText.includes('RZA01'))!;
    expect(p2.quantity).toBe(4);
    expect(p2.unit).toBe('St');
    expect(p2.materialCost).toBeCloseTo(148.08, 2);
    expect(p2.timeMinutes).toBeCloseTo(35.7, 2);
  });

  test('exported file passes the formula-error gate (no errors → ok=true)', async () => {
    const bytes = await exportToKalkulationVorlage(FIXTURE);
    const result = await parseKalkulationWorkbook(bytes);
    // No formula errors expected — exporter writes plain numeric values,
    // not formulas. So the import gate should allow it.
    const formulaErrors = result.issues.filter((i) => i.code === 'formula_error');
    expect(formulaErrors.length).toBe(0);
    expect(result.ok).toBe(true);
  });
});

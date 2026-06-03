import { describe, test, expect } from 'vitest';
import { projectToParsedGaeb } from '../exportFormats';
import { calculatePosition, calcTotals, makeBlankPosition, DEFAULT_CALC_PARAMS } from '../calc';
import { buildGaebXml, buildGaeb90 } from '@/lib/gaeb';
import type { ProjectData, Position } from '../types';

function pos(over: Partial<Position> & { id: string; sortOrder: number }): Position {
  return { ...makeBlankPosition(over.id, over.sortOrder), ...over };
}

function sampleProject(): ProjectData {
  return {
    name: 'BV Musterstraße 12',
    client: 'Stadt Saarbrücken',
    service: 'Rohbauarbeiten',
    tenderNumber: 'VG-2026-0815',
    deadline: '2026-07-01',
    bidder: 'Muster Bau GmbH',
    calcParams: { ...DEFAULT_CALC_PARAMS },
    positions: [
      pos({ id: 'h1', sortOrder: 0, oz: '1', shortText: 'Erdarbeiten', isHeader: true }),
      pos({
        id: 'p1',
        sortOrder: 1,
        oz: '1.1',
        shortText: 'Boden ausheben',
        longText: 'Oberboden abtragen und seitlich lagern.',
        unit: 'm³',
        quantity: 10,
        materialCost: 5,
        timeMinutes: 6,
      }),
      pos({
        id: 'p2',
        sortOrder: 2,
        oz: '1.2',
        shortText: 'Verfüllen',
        unit: 'm³',
        quantity: 4,
        materialCost: 2,
        timeMinutes: 3,
        nuCost: 1,
      }),
    ],
  };
}

describe('projectToParsedGaeb', () => {
  test('keeps headers as group rows and counts only real positions', () => {
    const parsed = projectToParsedGaeb(sampleProject());
    expect(parsed.positions).toHaveLength(3);
    expect(parsed.positionCount).toBe(2); // items only
    expect(parsed.groups).toHaveLength(1);
    expect(parsed.groups[0]).toMatchObject({ oz: '1', label: 'Erdarbeiten', level: 0 });

    const group = parsed.positions[0];
    expect(group.type).toBe('group');
    expect(group.menge).toBeUndefined();
    expect(group.ep).toBeUndefined();
    expect(group.gp).toBeUndefined();
  });

  test('computes per-position EP/GP with the same calc as the table', () => {
    const project = sampleProject();
    const parsed = projectToParsedGaeb(project);
    const item = parsed.positions.find((p) => p.oz === '1.1')!;
    const calc = calculatePosition(project.positions[1], project.calcParams);
    expect(item.type).toBe('item');
    expect(item.menge).toBe(10);
    expect(item.einheit).toBe('m³');
    expect(item.ep).toBeCloseTo(calc.ep, 2);
    expect(item.gp).toBeCloseTo(calc.gp, 2);
  });

  test('OZ nesting depth maps to the GAEB level', () => {
    const parsed = projectToParsedGaeb(sampleProject());
    expect(parsed.positions.find((p) => p.oz === '1.1')!.level).toBe(1);
  });

  test('estimatedValue reconciles with the net Angebotssumme', () => {
    const project = sampleProject();
    const parsed = projectToParsedGaeb(project);
    const totals = calcTotals(project.positions, project.calcParams);
    expect(parsed.estimatedValue).toBeCloseTo(totals.totalNetto, 2);
  });

  test('carries the project meta and marks the format as priced GAEB XML', () => {
    const parsed = projectToParsedGaeb(sampleProject());
    expect(parsed.projectName).toBe('BV Musterstraße 12');
    expect(parsed.awardingAuthority).toBe('Stadt Saarbrücken');
    expect(parsed.bidder).toBe('Muster Bau GmbH');
    expect(parsed.format).toBe('gaeb-xml-3.2');
    expect(parsed.hasLongtext).toBe(true);
    expect(parsed.currency).toBe('EUR');
  });
});

describe('GAEB serialisers honour the Datenart', () => {
  test('GAEB XML defaults to DA83 but emits DA84 for a priced Angebot', () => {
    const parsed = projectToParsedGaeb(sampleProject());
    expect(buildGaebXml(parsed)).toContain('DA83/3.2');

    const xml84 = buildGaebXml(parsed, '84');
    expect(xml84).toContain('GAEB_DA_XML/DA84/3.2');
    expect(xml84).toContain('<DP>84</DP>');
    expect(xml84).toContain('RNoPart="1.1"');
    expect(xml84).toContain('<UP>'); // unit price present
    expect(xml84).toContain('<IT>'); // line total present
  });

  test('GAEB 90 record 00 carries the Datenart token and items use record 21', () => {
    const parsed = projectToParsedGaeb(sampleProject());
    const d84 = buildGaeb90(parsed, '84');
    const firstLine = d84.split('\r\n')[0];
    expect(firstLine).toContain('84L');

    const lines = d84.split('\r\n');
    expect(lines.some((l) => l.startsWith('21'))).toBe(true);

    expect(buildGaeb90(parsed).split('\r\n')[0]).toContain('83L'); // default
  });
});

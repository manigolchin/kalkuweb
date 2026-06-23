import { describe, test, expect } from 'vitest';
import { mergePositions, mergeProjectData } from '../mergeProject';
import type { Position, ProjectData } from '../types';

/** Minimal Position for merge tests — only the fields the merge looks at. */
function pos(id: string, over: Partial<Position> = {}): Position {
  return {
    id,
    oz: id,
    shortText: '',
    longText: '',
    hinweisText: '',
    quantity: 1,
    unit: 'St',
    materialCost: 0,
    timeMinutes: 0,
    nuCost: 0,
    isHeader: false,
    sortOrder: 0,
    ep: 0,
    gp: 0,
    visibleToCustomer: true,
    ...over,
  } as Position;
}

function projectData(positions: Position[], over: Partial<ProjectData> = {}): ProjectData {
  return {
    name: 'Test',
    client: '',
    service: '',
    tenderNumber: '',
    deadline: '',
    bidder: '',
    calcParams: { verrechnungslohn: 49.9 } as ProjectData['calcParams'],
    positions,
    ...over,
  };
}

describe('mergePositions — row-level three-way merge', () => {
  test('two people edit different rows → both edits survive', () => {
    const base = [pos('a', { materialCost: 10 }), pos('b', { materialCost: 20 })];
    const mine = [pos('a', { materialCost: 99 }), pos('b', { materialCost: 20 })]; // I changed a
    const theirs = [pos('a', { materialCost: 10 }), pos('b', { materialCost: 77 })]; // they changed b
    const merged = mergePositions(base, mine, theirs);
    expect(merged.find((p) => p.id === 'a')?.materialCost).toBe(99);
    expect(merged.find((p) => p.id === 'b')?.materialCost).toBe(77);
  });

  test('same row edited by both → my edit wins (last-write-wins), never lost', () => {
    const base = [pos('a', { materialCost: 10 })];
    const mine = [pos('a', { materialCost: 99 })];
    const theirs = [pos('a', { materialCost: 50 })];
    const merged = mergePositions(base, mine, theirs);
    expect(merged.find((p) => p.id === 'a')?.materialCost).toBe(99);
  });

  test('row untouched by me, edited by coworker → I get their edit', () => {
    const base = [pos('a', { materialCost: 10 })];
    const mine = [pos('a', { materialCost: 10 })];
    const theirs = [pos('a', { materialCost: 50 })];
    const merged = mergePositions(base, mine, theirs);
    expect(merged.find((p) => p.id === 'a')?.materialCost).toBe(50);
  });

  test('coworker added a row → it appears in my merge', () => {
    const base = [pos('a')];
    const mine = [pos('a')];
    const theirs = [pos('a'), pos('new-theirs')];
    const merged = mergePositions(base, mine, theirs);
    expect(merged.map((p) => p.id)).toContain('new-theirs');
  });

  test('I added a row → it is preserved (appended)', () => {
    const base = [pos('a')];
    const mine = [pos('a'), pos('new-mine')];
    const theirs = [pos('a')];
    const merged = mergePositions(base, mine, theirs);
    expect(merged.map((p) => p.id)).toContain('new-mine');
  });

  test('I deleted a row the coworker did not touch → stays deleted', () => {
    const base = [pos('a'), pos('b')];
    const mine = [pos('a')]; // deleted b
    const theirs = [pos('a'), pos('b')];
    const merged = mergePositions(base, mine, theirs);
    expect(merged.map((p) => p.id)).not.toContain('b');
  });

  test('I deleted a row but coworker edited it → their edit is kept (no data loss)', () => {
    const base = [pos('a'), pos('b', { materialCost: 5 })];
    const mine = [pos('a')]; // deleted b
    const theirs = [pos('a'), pos('b', { materialCost: 88 })]; // they edited b
    const merged = mergePositions(base, mine, theirs);
    expect(merged.find((p) => p.id === 'b')?.materialCost).toBe(88);
  });
});

describe('mergeProjectData — top-level fields', () => {
  test('I changed calcParams, coworker changed a position → both kept', () => {
    const base = projectData([pos('a', { materialCost: 1 })]);
    const mine = projectData([pos('a', { materialCost: 1 })], {
      calcParams: { verrechnungslohn: 60 } as ProjectData['calcParams'],
    });
    const theirs = projectData([pos('a', { materialCost: 42 })]);
    const merged = mergeProjectData(base, mine, theirs);
    expect(merged.calcParams.verrechnungslohn).toBe(60);
    expect(merged.positions.find((p) => p.id === 'a')?.materialCost).toBe(42);
  });

  test('field I did not touch takes the coworker value', () => {
    const base = projectData([pos('a')], { notes: 'old' });
    const mine = projectData([pos('a')], { notes: 'old' });
    const theirs = projectData([pos('a')], { notes: 'coworker note' });
    const merged = mergeProjectData(base, mine, theirs);
    expect(merged.notes).toBe('coworker note');
  });
});

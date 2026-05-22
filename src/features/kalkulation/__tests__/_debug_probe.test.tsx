/**
 * Throwaway debugging test — DELETE BEFORE COMMIT. Renders ex3 INTERN view
 * and reports what data-readonly markers actually appear.
 */
import { test, expect } from 'vitest';
import { render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import PositionTableV2 from '../PositionTableV2';
import { parseKalkulationWorkbook } from '@/lib/kalku-xlsx/parse';

const HOME = process.env.HOME ?? '';

test('debug: inspect ex3 INTERN rendering', async () => {
  const u8 = new Uint8Array(readFileSync(join(HOME, 'Desktop/Claude/example 3/LV3.xlsx')));
  const parsed = await parseKalkulationWorkbook(u8);
  expect(parsed.project).not.toBeNull();
  const project = parsed.project!;
  console.log('positions:', project.positions.length, 'first 3:', project.positions.slice(0, 3).map(p => ({ oz: p.oz, sh: p.shortText.slice(0, 30), isHeader: p.isHeader })));
  const { container } = render(
    <PositionTableV2
      positions={project.positions}
      params={project.calcParams}
      onChange={() => {}}
      view="intern"
    />,
  );
  console.log('v2-row-* nodes:', container.querySelectorAll('[data-testid^="v2-row-"]').length);
  console.log('data-readonly="materialCost":', container.querySelectorAll('[data-readonly="materialCost"]').length);
  console.log('data-readonly="oz":', container.querySelectorAll('[data-readonly="oz"]').length);
  console.log('data-readonly="bezeichnung":', container.querySelectorAll('[data-readonly="bezeichnung"]').length);
  console.log('data-readonly="menge":', container.querySelectorAll('[data-readonly="menge"]').length);
  console.log('data-readonly="einheit":', container.querySelectorAll('[data-readonly="einheit"]').length);
  console.log('data-readonly="timeMinutes":', container.querySelectorAll('[data-readonly="timeMinutes"]').length);
  console.log('data-readonly="nuCost":', container.querySelectorAll('[data-readonly="nuCost"]').length);
});

test('debug: ex1 INTERN — same checks with zuschlag', async () => {
  const u8 = new Uint8Array(readFileSync(join(HOME, 'Desktop/Claude/example 1/LV3_BH_mit_Preisen.xlsx')));
  const parsed = await parseKalkulationWorkbook(u8);
  const project = parsed.project!;
  const { container } = render(
    <PositionTableV2
      positions={project.positions}
      params={project.calcParams}
      onChange={() => {}}
      view="intern"
      zuschlagOriginal={project.zuschlagOriginal}
      headerExtras={project.headerExtras}
    />,
  );
  console.log('EX1 v2-row-* nodes:', container.querySelectorAll('[data-testid^="v2-row-"]').length);
  console.log('EX1 data-readonly="materialCost":', container.querySelectorAll('[data-readonly="materialCost"]').length);
});

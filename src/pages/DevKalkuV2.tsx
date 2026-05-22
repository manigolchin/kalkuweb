/**
 * Dev-only sandbox for PositionTableV2.
 *
 * Mounted at /dev/kalku-v2 ONLY when import.meta.env.DEV is true.
 * Lets us exercise the v2 UI against the real LV3_BH fixture without
 * needing a backend / auth / a real project. Used by the screenshot
 * pass and by manual QA.
 *
 * Not lazy-loaded — fine, it doesn't ship in production bundles.
 */

import { useState } from 'react';
import PositionTableV2 from '@/features/kalkulation/PositionTableV2';
import { LV3_BH_FIXTURE, SENTINELS } from '@/features/kalkulation/__fixtures__/lv3_bh';
import type { Position } from '@/features/kalkulation/types';

export default function DevKalkuV2() {
  const [positions, setPositions] = useState<Position[]>(LV3_BH_FIXTURE.positions);

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-4">
      <header className="max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Dev sandbox · PositionTableV2 · LV3_BH fixture
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {positions.filter((p) => !p.isHeader).length} positions, including 3 sentinel rows.
              Sentinel material EK = {SENTINELS.materialCost} · timeMin = {SENTINELS.timeMinutes} · NU = {SENTINELS.nuCost}.
              These must NOT appear in KUNDEN view.
            </p>
          </div>
          <button
            onClick={() => setPositions(LV3_BH_FIXTURE.positions)}
            className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm hover:bg-slate-100"
          >
            Reset fixture
          </button>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto">
        <PositionTableV2
          positions={positions}
          params={LV3_BH_FIXTURE.calcParams}
          onChange={setPositions}
          projectMeta={{
            name: LV3_BH_FIXTURE.name,
            client: LV3_BH_FIXTURE.client,
            service: LV3_BH_FIXTURE.service,
            tenderNumber: LV3_BH_FIXTURE.tenderNumber,
            deadline: LV3_BH_FIXTURE.deadline,
            bidder: LV3_BH_FIXTURE.bidder,
          }}
        />
      </div>
    </div>
  );
}

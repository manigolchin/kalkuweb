import { Trash2, Users, User } from 'lucide-react';
import type { Row, Aufschlaege } from '@/lib/kalkulator/types';
import { computeEp, fmt } from '@/lib/kalkulator/calc';
import { evaluatePlausibility } from '@/lib/kalkulator/marketPrices';
import PlausibilityBadge from './PlausibilityBadge';
import { cn } from '@/lib/utils';

type Props = {
  row: Row;
  index: number;
  aufschlaege: Aufschlaege;
  canDelete: boolean;
  onChange: (patch: Partial<Row>) => void;
  onDelete: () => void;
};

export default function PositionRow({ row, index, aufschlaege, canDelete, onChange, onDelete }: Props) {
  const ep = computeEp(row, aufschlaege);
  const gp = ep * row.menge;
  const plaus = evaluatePlausibility(row, ep);
  return (
    <tr className={cn(
      'border-b border-gray-100 hover:bg-gray-50/50 transition-colors',
      row.nu && 'bg-amber-50/30',
    )}>
      <td className="px-2 py-2">
        <input
          type="text"
          value={row.pos || ''}
          onChange={(e) => onChange({ pos: e.target.value })}
          placeholder={`${index + 1}`}
          className="w-full px-2 py-1.5 font-mono text-xs text-gray-500 border border-transparent rounded-md hover:border-gray-200 focus:border-primary-500 focus:ring-0"
          aria-label={`Pos.-Nr. Position ${index + 1}`}
        />
      </td>
      <td className="px-2 py-2">
        <div className="flex items-start gap-1.5">
          <input
            type="text"
            value={row.text}
            onChange={(e) => onChange({ text: e.target.value })}
            className="flex-1 px-2 py-1.5 border border-transparent rounded-md hover:border-gray-200 focus:border-primary-500 focus:ring-0"
            placeholder="z.B. Asphalt fräsen, t = 4 cm"
            aria-label={`Beschreibung Position ${index + 1}`}
          />
          <div className="mt-1.5">
            <PlausibilityBadge result={plaus} />
          </div>
        </div>
      </td>
      <td className="px-2 py-2">
        <input
          type="text"
          value={row.einheit}
          onChange={(e) => onChange({ einheit: e.target.value })}
          className="w-12 px-2 py-1.5 text-center text-xs border border-transparent rounded-md hover:border-gray-200 focus:border-primary-500 focus:ring-0"
          aria-label={`Einheit Position ${index + 1}`}
        />
      </td>
      <NumCell value={row.lohn} onChange={(v) => onChange({ lohn: v })} step={0.5} ariaLabel={`Lohn Position ${index + 1}`} />
      <NumCell value={row.zeit} onChange={(v) => onChange({ zeit: v })} step={0.05} ariaLabel={`Zeit Position ${index + 1}`} />
      <NumCell value={row.material} onChange={(v) => onChange({ material: v })} step={0.5} ariaLabel={`Material Position ${index + 1}`} />
      <NumCell value={row.zuschlag} onChange={(v) => onChange({ zuschlag: v })} step={1} width="w-14" ariaLabel={`Zuschlag Position ${index + 1}`} />
      <NumCell value={row.menge} onChange={(v) => onChange({ menge: v })} step={1} ariaLabel={`Menge Position ${index + 1}`} />
      <td className="px-2 py-2 text-right tabular-nums text-primary-700 font-medium">{fmt(ep)}</td>
      <td className="px-2 py-2 text-right tabular-nums font-bold text-primary-700">{fmt(gp)}</td>
      <td className="px-1 py-2 text-center print:hidden">
        <button
          type="button"
          onClick={() => onChange({ nu: !row.nu })}
          className={cn(
            'inline-flex items-center justify-center w-7 h-7 rounded-md transition-colors',
            row.nu
              ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
              : 'text-gray-300 hover:bg-gray-100 hover:text-gray-500',
          )}
          aria-label={row.nu ? 'NU-Position — klicken zum Wechseln auf Eigenleistung' : 'Eigenleistung — klicken zum Wechseln auf Subunternehmer'}
          title={row.nu ? `NU-Position (+${aufschlaege.nuZuschlag} % Aufschlag)` : 'Eigenleistung — klicken für NU'}
        >
          {row.nu ? <Users className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
        </button>
      </td>
      <td className="px-1 py-2 print:hidden">
        <button
          type="button"
          onClick={onDelete}
          disabled={!canDelete}
          className="p-1.5 text-gray-300 hover:text-red-500 disabled:opacity-30 disabled:hover:text-gray-300 rounded"
          aria-label={`Position ${index + 1} löschen`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}

function NumCell({
  value,
  onChange,
  step = 0.01,
  width = 'w-20',
  ariaLabel,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  width?: string;
  ariaLabel: string;
}) {
  return (
    <td className="px-2 py-2">
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        step={step}
        min="0"
        aria-label={ariaLabel}
        className={cn(
          width,
          'px-2 py-1.5 text-right tabular-nums border border-transparent rounded-md hover:border-gray-200 focus:border-primary-500 focus:ring-0',
        )}
      />
    </td>
  );
}

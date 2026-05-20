import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  Share2,
  Download,
  Eye,
  Settings2,
  History,
  Check,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { Helmet } from 'react-helmet-async';
import { api, ApiError } from '@/lib/api';
import type {
  CalcParams,
  Position,
  ProjectData,
  ProjectDetail as ProjectDetailType,
  ShareSummary,
} from './types';
import { calcTotals, formatEUR, formatNum, DEFAULT_CALC_PARAMS, recalcAll } from './calc';
import PositionTable from './PositionTable';
import ShareDialog from './ShareDialog';

const SAVE_DEBOUNCE_MS = 800;

export default function ProjectDetail() {
  const { id = '' } = useParams<{ id: string }>();
  const [project, setProject] = useState<ProjectDetailType | null>(null);
  const [data, setData] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingState, setSavingState] = useState<'idle' | 'pending' | 'saving' | 'saved' | 'error'>(
    'idle',
  );
  const [showShare, setShowShare] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>('');

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const detail = await api.projects.get(id);
        if (!alive) return;
        setProject(detail);
        setData(normalizeProject(detail.data));
        lastSavedRef.current = JSON.stringify(detail.data);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setError('Projekt nicht gefunden.');
        } else {
          setError('Projekt konnte nicht geladen werden.');
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  // auto-save: recompute derived EP/GP on every position from cost inputs before persisting,
  // so the customer-view (which reads stored values) always matches the owner's table.
  useEffect(() => {
    if (!data) return;
    const toSave: ProjectData = {
      ...data,
      positions: recalcAll(data.positions, data.calcParams),
    };
    const payload = JSON.stringify(toSave);
    if (payload === lastSavedRef.current) {
      setSavingState('idle');
      return;
    }
    setSavingState('pending');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSavingState('saving');
      try {
        const updated = await api.projects.update(id, toSave);
        lastSavedRef.current = JSON.stringify(updated.data);
        setProject((p) => (p ? { ...p, ...updated } : p));
        setSavingState('saved');
        setTimeout(() => setSavingState((s) => (s === 'saved' ? 'idle' : s)), 1200);
      } catch {
        setSavingState('error');
        toast.error('Speichern fehlgeschlagen.');
      }
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [data, id]);

  const totals = useMemo(
    () => (data ? calcTotals(data.positions, data.calcParams) : null),
    [data],
  );

  const updateMeta = useCallback((patch: Partial<ProjectData>) => {
    setData((d) => (d ? { ...d, ...patch } : d));
  }, []);

  const updatePositions = useCallback((positions: Position[]) => {
    setData((d) => (d ? { ...d, positions } : d));
  }, []);

  const updateCalcParams = useCallback((patch: Partial<CalcParams>) => {
    setData((d) => (d ? { ...d, calcParams: { ...d.calcParams, ...patch } } : d));
  }, []);

  async function snapshotVersion() {
    if (!data) return;
    try {
      const toSave: ProjectData = {
        ...data,
        positions: recalcAll(data.positions, data.calcParams),
      };
      const updated = await api.projects.update(id, toSave, { bumpVersion: true });
      lastSavedRef.current = JSON.stringify(updated.data);
      setProject((p) => (p ? { ...p, ...updated } : p));
      toast.success(`Version ${updated.versionNumber} gespeichert.`);
    } catch {
      toast.error('Version konnte nicht erstellt werden.');
    }
  }

  async function exportToExcel() {
    if (!data) return;
    const xlsx = await import('xlsx');
    const rows = data.positions.map((p) => ({
      OZ: p.oz,
      Kurztext: p.shortText,
      Menge: p.quantity,
      EH: p.unit,
      'Material €/EH': p.materialCost,
      'Zeit min/EH': p.timeMinutes,
      'NU €/EH': p.nuCost,
      'EP €/EH': p.ep,
      'GP €': p.gp,
      'Sichtbar Kunde': p.visibleToCustomer ? 'Ja' : 'Nein',
      Typ: p.isHeader ? 'Titel' : 'Position',
    }));
    const ws = xlsx.utils.json_to_sheet(rows);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Kalkulation');
    const blob = xlsx.write(wb, { type: 'array', bookType: 'xlsx' });
    const url = URL.createObjectURL(new Blob([blob], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(data.name || 'kalkulation').replace(/[^a-zA-Z0-9_-]+/g, '_')}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function onShareCreated(share: ShareSummary) {
    setProject((p) => {
      if (!p) return p;
      const others = p.shares.filter((s) => s.id !== share.id);
      return { ...p, shares: [share, ...others] };
    });
  }

  if (loading) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (error || !data || !project) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-8 text-center max-w-md mx-auto">
        <div className="inline-flex p-3 rounded-full bg-red-50 mb-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
        </div>
        <h2 className="font-semibold text-slate-900">{error || 'Projekt nicht gefunden.'}</h2>
        <Link to="/panel/kalkulation" className="inline-flex items-center gap-1 text-primary-600 hover:underline mt-3 text-sm">
          <ArrowLeft className="w-4 h-4" />
          Zurück zur Übersicht
        </Link>
      </div>
    );
  }

  const visibleCount = data.positions.filter((p) => p.visibleToCustomer && !p.isHeader).length;
  const activeShares = project.shares.filter((s) => !s.revokedAt);

  return (
    <div className="space-y-5">
      <Helmet>
        <title>{data.name || 'Kalkulation'} – KALKU Panel</title>
      </Helmet>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Link
            to="/panel/kalkulation"
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Zurück"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <input
              value={data.name}
              onChange={(e) => updateMeta({ name: e.target.value })}
              placeholder="Projektname"
              className="text-xl font-bold text-slate-900 bg-transparent w-full px-1 -mx-1 rounded outline-none focus:bg-white focus:ring-1 focus:ring-primary-300"
            />
            <input
              value={data.client}
              onChange={(e) => updateMeta({ client: e.target.value })}
              placeholder="Auftraggeber / Kunde"
              className="text-sm text-slate-500 bg-transparent w-full px-1 -mx-1 mt-0.5 rounded outline-none focus:bg-white focus:ring-1 focus:ring-primary-300"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <SaveIndicator state={savingState} />
          <button
            onClick={() => setShowSettings((s) => !s)}
            className={clsx(
              'btn btn-secondary flex items-center gap-2',
              showSettings && 'bg-primary-50 text-primary-700 border-primary-200',
            )}
            title="Kalkulationseinstellungen"
          >
            <Settings2 className="w-4 h-4" />
            Stellschrauben
          </button>
          <button onClick={snapshotVersion} className="btn btn-secondary flex items-center gap-2">
            <History className="w-4 h-4" />
            v{project.versionNumber}
          </button>
          <button onClick={exportToExcel} className="btn btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" />
            Excel
          </button>
          <button
            onClick={() => setShowShare(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            Mit Kunde teilen
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        <div className="space-y-4 min-w-0">
          {showSettings && (
            <SettingsPanel
              meta={data}
              onMeta={updateMeta}
              params={data.calcParams}
              onParams={updateCalcParams}
            />
          )}
          <PositionTable
            positions={data.positions}
            params={data.calcParams}
            onChange={updatePositions}
          />
        </div>

        <aside className="space-y-4">
          <TotalsCard totals={totals!} positionCount={data.positions.length} visibleCount={visibleCount} />
          <SharesCard
            shares={activeShares}
            allShares={project.shares}
            onOpenShare={() => setShowShare(true)}
          />
        </aside>
      </div>

      {showShare && (
        <ShareDialog
          projectId={project.id}
          projectName={data.name}
          positions={data.positions}
          calcParams={data.calcParams}
          existingShares={project.shares}
          onClose={() => setShowShare(false)}
          onCreated={onShareCreated}
        />
      )}
    </div>
  );
}

function SaveIndicator({
  state,
}: {
  state: 'idle' | 'pending' | 'saving' | 'saved' | 'error';
}) {
  if (state === 'idle') return null;
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-md',
        state === 'error'
          ? 'bg-red-50 text-red-700'
          : state === 'saved'
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-slate-100 text-slate-500',
      )}
    >
      {state === 'saving' || state === 'pending' ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : state === 'saved' ? (
        <Check className="w-3 h-3" />
      ) : (
        <AlertCircle className="w-3 h-3" />
      )}
      {state === 'pending' && 'Änderungen erkannt'}
      {state === 'saving' && 'Speichere…'}
      {state === 'saved' && 'Gespeichert'}
      {state === 'error' && 'Speicherfehler'}
    </span>
  );
}

function TotalsCard({
  totals,
  positionCount,
  visibleCount,
}: {
  totals: ReturnType<typeof calcTotals>;
  positionCount: number;
  visibleCount: number;
}) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Summen</h3>

      <div className="mt-3 space-y-1.5 text-sm">
        <Row label="Lohnanteil" value={totals.totalLohn} muted />
        <Row label="Material" value={totals.totalMaterial} muted />
        <Row label="Geräte" value={totals.totalGeraet} muted />
        <Row label="Nachunternehmer" value={totals.totalNu} muted />
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
        <Row label="Netto (gesamt)" value={totals.totalNetto} strong />
        <Row label="MwSt 19 %" value={totals.totalMwst} muted />
        <Row label="Brutto" value={totals.totalBrutto} strong />
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100">
        <p className="text-xs text-slate-500 leading-relaxed">
          {positionCount} {positionCount === 1 ? 'Zeile' : 'Zeilen'} insgesamt,{' '}
          <strong className="text-emerald-700">{visibleCount} für Kunde sichtbar</strong>.
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Aufwand: {formatNum(totals.totalHours, 1)} h
        </p>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  strong,
}: {
  label: string;
  value: number;
  muted?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={clsx('text-slate-500', strong && 'text-slate-900 font-semibold')}>{label}</span>
      <span
        className={clsx(
          'tabular-nums',
          muted ? 'text-slate-500' : 'text-slate-900',
          strong && 'font-semibold',
        )}
      >
        {formatEUR(value)}
      </span>
    </div>
  );
}

function SharesCard({
  shares,
  allShares,
  onOpenShare,
}: {
  shares: ShareSummary[];
  allShares: ShareSummary[];
  onOpenShare: () => void;
}) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Geteilte Links</h3>
        <button
          onClick={onOpenShare}
          className="text-xs text-primary-600 hover:underline font-medium"
        >
          + Neuer Link
        </button>
      </div>
      {shares.length === 0 ? (
        <p className="text-sm text-slate-500 mt-3">
          Noch nicht geteilt. Erstellen Sie einen Link, um das Angebot dem Kunden zugänglich zu
          machen.
        </p>
      ) : (
        <ul className="mt-2 space-y-2 text-sm">
          {shares.map((s) => (
            <li key={s.id} className="flex items-center gap-2">
              <Eye className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
              <span className="flex-1 truncate font-mono text-xs text-slate-500">
                /{s.token.slice(0, 10)}…
              </span>
              <span className="text-xs text-slate-400">
                {s.viewCount}× gesehen
              </span>
            </li>
          ))}
        </ul>
      )}
      {allShares.some((s) => s.revokedAt) && (
        <p className="text-xs text-slate-400 mt-3 pt-2 border-t border-slate-100">
          {allShares.filter((s) => s.revokedAt).length} widerrufen
        </p>
      )}
    </div>
  );
}

function SettingsPanel({
  meta,
  onMeta,
  params,
  onParams,
}: {
  meta: ProjectData;
  onMeta: (patch: Partial<ProjectData>) => void;
  params: CalcParams;
  onParams: (patch: Partial<CalcParams>) => void;
}) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
        Projekt & Stellschrauben
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Leistung" value={meta.service} onChange={(v) => onMeta({ service: v })} placeholder="z. B. Sanierung Bad" />
        <Field label="Vergabe-Nr." value={meta.tenderNumber} onChange={(v) => onMeta({ tenderNumber: v })} />
        <Field
          label="Abgabe"
          value={meta.deadline}
          onChange={(v) => onMeta({ deadline: v })}
          type="date"
        />
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-5 gap-3">
        <NumField
          label="Mittellohn €/h"
          value={params.mittellohn}
          onChange={(v) => onParams({ mittellohn: v })}
        />
        <NumField
          label="Verrechnungslohn €/h"
          value={params.verrechnungslohn}
          onChange={(v) => onParams({ verrechnungslohn: v })}
        />
        <NumField
          label="Material Zuschlag %"
          value={params.materialZuschlag * 100}
          onChange={(v) => onParams({ materialZuschlag: v / 100 })}
        />
        <NumField
          label="NU Zuschlag %"
          value={params.nuZuschlag * 100}
          onChange={(v) => onParams({ nuZuschlag: v / 100 })}
        />
        <NumField
          label="MwSt %"
          value={params.mwst * 100}
          onChange={(v) => onParams({ mwst: v / 100 })}
        />
      </div>

      <p className="text-xs text-slate-400 mt-3">
        Änderungen wirken sofort auf alle EP/GP-Berechnungen.
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 input text-sm"
      />
    </label>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <input
        type="number"
        step="any"
        value={value}
        onChange={(e) => {
          const n = parseFloat(e.target.value);
          onChange(Number.isFinite(n) ? n : 0);
        }}
        className="mt-1 input text-sm tabular-nums"
      />
    </label>
  );
}

function normalizeProject(data: ProjectData): ProjectData {
  return {
    ...data,
    calcParams: { ...DEFAULT_CALC_PARAMS, ...(data.calcParams || {}) },
    positions: (data.positions || []).map((p, i) => ({
      ...p,
      sortOrder: p.sortOrder ?? i + 1,
      isHeader: !!p.isHeader,
      visibleToCustomer: p.visibleToCustomer ?? true,
      epLohn: p.epLohn ?? 0,
      epMaterial: p.epMaterial ?? 0,
      epGeraet: p.epGeraet ?? 0,
      epNu: p.epNu ?? 0,
      ep: p.ep ?? 0,
      gp: p.gp ?? 0,
      materialCost: p.materialCost ?? 0,
      timeMinutes: p.timeMinutes ?? 0,
      nuCost: p.nuCost ?? 0,
      quantity: p.quantity ?? 0,
      shortText: p.shortText ?? '',
      longText: p.longText ?? '',
      hinweisText: p.hinweisText ?? '',
      oz: p.oz ?? '',
      unit: p.unit ?? '',
      sectionPath: p.sectionPath ?? '',
    })),
  };
}

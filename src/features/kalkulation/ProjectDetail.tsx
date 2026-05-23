import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  Share2,
  Download,
  Upload,
  Eye,
  Settings2,
  History,
  Check,
  AlertCircle,
  Sparkles,
  RotateCcw,
  GitCompareArrows,
  ShieldCheck,
  FileText,
  TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { Helmet } from 'react-helmet-async';
import { api, ApiError, VersionConflictError } from '@/lib/api';
import type {
  CalcParams,
  Position,
  ProjectData,
  ProjectDetail as ProjectDetailType,
  ShareSummary,
} from './types';
import { calcTotals, formatEUR, formatNum, DEFAULT_CALC_PARAMS, recalcAll } from './calc';
import { Breadcrumb } from '@/pages/panel/ui';
import PositionTable from './PositionTable';
import PositionTableV2 from './PositionTableV2';
import ShareDialog from './ShareDialog';
import ImportDialog from './ImportDialog';
import SnapshotDiffDialog from './SnapshotDiffDialog';
import SubmitValidatorDialog from './SubmitValidatorDialog';

const SAVE_DEBOUNCE_MS = 800;

type TableVersion = 'v1' | 'v2';
const TABLE_VERSION_KEY = 'kalku.tableVersion';

function readSavedTableVersion(): TableVersion {
  if (typeof window === 'undefined') return 'v1';
  try {
    const v = window.localStorage.getItem(TABLE_VERSION_KEY);
    return v === 'v2' ? 'v2' : 'v1';
  } catch {
    return 'v1';
  }
}

export default function ProjectDetail() {
  const { id = '' } = useParams<{ id: string }>();
  const [project, setProject] = useState<ProjectDetailType | null>(null);
  const [data, setData] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingState, setSavingState] = useState<'idle' | 'pending' | 'saving' | 'saved' | 'error'>(
    'idle',
  );
  const [showShare, setShowShare] = useState<{ parentShareId?: string } | false>(false);
  const [showImport, setShowImport] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [tableVersion, setTableVersion] = useState<TableVersion>(() => readSavedTableVersion());
  // PART K: per-OZ customer-comment counts. Refreshed on project load and
  // whenever an auto-save lands (in case the customer commented in the
  // meantime). Empty {} = no badges render.
  const [commentCounts, setCommentCounts] = useState<Record<string, { total: number; unresolved: number }>>({});

  const switchTableVersion = useCallback((v: TableVersion) => {
    setTableVersion(v);
    try {
      window.localStorage.setItem(TABLE_VERSION_KEY, v);
    } catch {
      // ignore (private-mode browsers etc.)
    }
  }, []);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>('');
  // Tracks the latest server `updatedAt` known to this tab. Used for optimistic
  // locking — read inside the debounced save so rapid edits don't carry a stale
  // value from when the effect was queued.
  const updatedAtRef = useRef<number>(0);

  // PART K: fetch comment counts (cheap aggregate, safe to call on every
  // project mount + after each save). Silent on failure — badges just stay
  // hidden if the endpoint isn't reachable. Wraps in a named function so
  // the auto-save effect below can call it after a successful PUT too.
  const refreshCommentCounts = useCallback(async () => {
    if (!id) return;
    try {
      const { counts } = await api.shares.commentCounts(id);
      setCommentCounts(counts);
    } catch {
      // Endpoint may not exist on older servers — silent.
    }
  }, [id]);

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
        updatedAtRef.current = new Date(detail.updatedAt).getTime();
        // Fire-and-forget — runs in parallel with the initial render.
        refreshCommentCounts();
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
  }, [id, refreshCommentCounts]);

  // auto-save: server is now the source of truth for derived EP/GP (P1-2) — it
  // recomputes on PUT. We still recalc client-side for instant feedback.
  // P1-4: send expectedUpdatedAt from updatedAtRef (refreshed on every save)
  // so a concurrent tab can't silently overwrite this tab's work.
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
        const updated = await api.projects.update(id, toSave, {
          expectedUpdatedAt: updatedAtRef.current || undefined,
        });
        lastSavedRef.current = JSON.stringify(updated.data);
        updatedAtRef.current = new Date(updated.updatedAt).getTime();
        setProject((p) => (p ? { ...p, ...updated } : p));
        setSavingState('saved');
        setTimeout(() => setSavingState((s) => (s === 'saved' ? 'idle' : s)), 1200);
      } catch (err) {
        setSavingState('error');
        if (err instanceof VersionConflictError) {
          updatedAtRef.current = err.currentUpdatedAt;
          toast.error(
            'Das Projekt wurde in einem anderen Fenster verändert. Bitte die Seite neu laden, um die aktuellen Daten zu sehen.',
            { duration: 6000 },
          );
        } else {
          toast.error('Speichern fehlgeschlagen.');
        }
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
      const updated = await api.projects.update(id, toSave, {
        bumpVersion: true,
        expectedUpdatedAt: updatedAtRef.current || undefined,
      });
      lastSavedRef.current = JSON.stringify(updated.data);
      updatedAtRef.current = new Date(updated.updatedAt).getTime();
      setProject((p) => (p ? { ...p, ...updated } : p));
      toast.success(`Version ${updated.versionNumber} gespeichert.`);
    } catch (err) {
      if (err instanceof VersionConflictError) {
        updatedAtRef.current = err.currentUpdatedAt;
        toast.error('Das Projekt wurde inzwischen geändert. Bitte neu laden.', { duration: 6000 });
      } else {
        toast.error('Version konnte nicht erstellt werden.');
      }
    }
  }

  async function exportToExcel() {
    if (!data) return;
    // PART N: emit the canonical Kalkulation-Vorlage layout (header block +
    // ZSCHLG matrix + row-13 column headers + position rows) so the exported
    // .xlsx matches the example files in ~/Desktop/Claude/example {1-4}/
    // AND round-trips back through the kalku-xlsx importer cleanly.
    const { exportToKalkulationVorlage } = await import('@/lib/kalku-xlsx/export');
    const bytes = await exportToKalkulationVorlage(data);
    const url = URL.createObjectURL(
      new Blob([bytes as BlobPart], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
    );
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
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center max-w-md mx-auto">
        <div className="inline-flex p-3 rounded-full bg-red-50 dark:bg-rose-950/40 mb-3">
          <AlertCircle className="w-5 h-5 text-red-500 dark:text-rose-400" />
        </div>
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">{error || 'Projekt nicht gefunden.'}</h2>
        <Link
          to="/panel/kalkulation"
          className="inline-flex items-center gap-1 text-primary-600 dark:text-primary-300 hover:underline mt-3 text-sm"
        >
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

      <Breadcrumb
        items={[
          { label: 'Panel', to: '/panel' },
          { label: 'Kalkulation', to: '/panel/kalkulation' },
          { label: data.name || 'Projekt' },
        ]}
      />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Link
            to="/panel/kalkulation"
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            aria-label="Zurück"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <input
              value={data.name}
              onChange={(e) => updateMeta({ name: e.target.value })}
              placeholder="Projektname"
              className="text-xl font-bold text-slate-900 dark:text-slate-100 bg-transparent w-full px-1 -mx-1 rounded outline-none focus:bg-white dark:focus:bg-slate-800 focus:ring-1 focus:ring-primary-300"
            />
            <input
              value={data.client}
              onChange={(e) => updateMeta({ client: e.target.value })}
              placeholder="Auftraggeber / Kunde"
              className="text-sm text-slate-500 dark:text-slate-400 bg-transparent w-full px-1 -mx-1 mt-0.5 rounded outline-none focus:bg-white dark:focus:bg-slate-800 focus:ring-1 focus:ring-primary-300"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <SaveIndicator state={savingState} />
          <TableVersionToggle version={tableVersion} onChange={switchTableVersion} />
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
          {project.shares.filter((s) => !s.revokedAt).length >= 2 && (
            <button
              onClick={() => setShowDiff(true)}
              className="btn btn-secondary flex items-center gap-2"
              title="Snapshot-Versionen vergleichen"
            >
              <GitCompareArrows className="w-4 h-4" />
              Vergleichen
            </button>
          )}
          <button
            onClick={() => setShowSubmit(true)}
            className="btn btn-secondary flex items-center gap-2"
            title="Original-LV gegen Kalkulation prüfen (Ausschlussrisiko abklären)"
          >
            <ShieldCheck className="w-4 h-4" />
            Validieren
          </button>
          <Link
            to={`/panel/kalkulation/${project.id}/efb`}
            className="btn btn-secondary flex items-center gap-2"
            title="EFB-Preisblätter 221/222/223 anzeigen"
          >
            <FileText className="w-4 h-4" />
            EFB
          </Link>
          <Link
            to={`/panel/kalkulation/${project.id}/actuals`}
            className="btn btn-secondary flex items-center gap-2"
            title="Nachkalkulation — Soll vs. Ist erfassen"
          >
            <TrendingUp className="w-4 h-4" />
            Nachkalk
          </Link>
          <button
            onClick={() => setShowImport(true)}
            className="btn btn-secondary flex items-center gap-2"
            title="GAEB · Excel · CSV importieren"
          >
            <Upload className="w-4 h-4" />
            Importieren
          </button>
          <button onClick={exportToExcel} className="btn btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" />
            Excel
          </button>
          <button
            onClick={() => setShowShare({})}
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
          {tableVersion === 'v2' ? (
            <PositionTableV2
              positions={data.positions}
              params={data.calcParams}
              onChange={updatePositions}
              projectMeta={{
                name: data.name,
                client: data.client,
                service: data.service,
                tenderNumber: data.tenderNumber,
                deadline: data.deadline,
                bidder: data.bidder,
              }}
              commentCounts={commentCounts}
              onOpenComments={(oz) => {
                window.open(`/panel/feedback?oz=${encodeURIComponent(oz)}`, '_self');
              }}
              // Round 4 PART P + Q — captured Vorlage extras for the sticky matrix.
              zuschlagOriginal={data.zuschlagOriginal}
              zuschlagAktuell={data.zuschlagAktuell}
              headerExtras={data.headerExtras}
              // Faktoren-Bibliothek for the per-cell CalcPopover.
              faktoren={data.faktoren}
              onZschlgChange={(cost, decimal) => {
                // PART O: persist the override AND sync the corresponding
                // CalcParams field so live EP/GP recompute cascades through
                // calculatePosition() automatically.
                const calcKey: Record<typeof cost, keyof CalcParams> = {
                  stoffe: 'materialZuschlag',
                  nu: 'nuZuschlag',
                  geraete: 'geraeteZuschlagPct',
                  lohn: 'verrechnungslohn', // 'lohn' override = adjust Stundensatz
                };
                if (cost === 'lohn') {
                  // Lohn ZSCHLG in the matrix is Stundensatz / Mittellohn; an
                  // override means: set Stundensatz = Mittellohn × (1 + decimal).
                  const newStundensatz =
                    data.calcParams.mittellohn * (1 + decimal);
                  setData((d) => d ? {
                    ...d,
                    calcParams: { ...d.calcParams, verrechnungslohn: newStundensatz },
                    zuschlagAktuell: { ...(d.zuschlagAktuell ?? {}), lohn: decimal },
                  } : d);
                } else {
                  const key = calcKey[cost] as 'materialZuschlag' | 'nuZuschlag' | 'geraeteZuschlagPct';
                  setData((d) => d ? {
                    ...d,
                    calcParams: { ...d.calcParams, [key]: decimal },
                    zuschlagAktuell: { ...(d.zuschlagAktuell ?? {}), [cost]: decimal },
                  } : d);
                }
              }}
              onZschlgReset={(cost) => {
                const orig = data.zuschlagOriginal?.[cost];
                if (!orig) return;
                if (cost === 'lohn') {
                  // Revert Stundensatz to Mittellohn × (1 + original).
                  setData((d) => d ? {
                    ...d,
                    calcParams: {
                      ...d.calcParams,
                      verrechnungslohn: d.calcParams.mittellohn * (1 + orig.zschlgPct),
                    },
                    zuschlagAktuell: removeKey(d.zuschlagAktuell, 'lohn'),
                  } : d);
                } else {
                  const calcKey: Record<'stoffe' | 'nu' | 'geraete', 'materialZuschlag' | 'nuZuschlag' | 'geraeteZuschlagPct'> = {
                    stoffe: 'materialZuschlag',
                    nu: 'nuZuschlag',
                    geraete: 'geraeteZuschlagPct',
                  };
                  setData((d) => d ? {
                    ...d,
                    calcParams: { ...d.calcParams, [calcKey[cost]]: orig.zschlgPct },
                    zuschlagAktuell: removeKey(d.zuschlagAktuell, cost),
                  } : d);
                }
              }}
            />
          ) : (
            <PositionTable
              positions={data.positions}
              params={data.calcParams}
              onChange={updatePositions}
            />
          )}
        </div>

        <aside className="space-y-4">
          <TotalsCard totals={totals!} positionCount={data.positions.length} visibleCount={visibleCount} />
          <SharesCard
            shares={activeShares}
            allShares={project.shares}
            projectUpdatedAt={project.updatedAt}
            onOpenShare={() => setShowShare({})}
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
          parentShareId={showShare.parentShareId}
          onClose={() => setShowShare(false)}
          onCreated={onShareCreated}
          onRequestNachtrag={(parentShareId) => setShowShare({ parentShareId })}
        />
      )}

      <SnapshotDiffDialog
        open={showDiff}
        onClose={() => setShowDiff(false)}
        projectId={project.id}
        projectName={data.name || 'Projekt'}
        shares={project.shares}
      />

      <SubmitValidatorDialog
        open={showSubmit}
        onClose={() => setShowSubmit(false)}
        positions={data.positions.map((p) => ({
          oz: p.oz,
          shortText: p.shortText,
          quantity: p.quantity,
          unit: p.unit,
          isHeader: p.isHeader,
        }))}
        projectName={data.name || 'Projekt'}
      />

      <ImportDialog
        open={showImport}
        onClose={() => setShowImport(false)}
        existingCount={data.positions.length}
        onImport={(rows, mode) => {
          const merged = mode === 'append' ? [...data.positions, ...rows] : rows;
          updatePositions(merged);
          toast.success(
            mode === 'append'
              ? `${rows.length} Position${rows.length === 1 ? '' : 'en'} hinzugefügt.`
              : `${rows.length} Position${rows.length === 1 ? '' : 'en'} importiert (Projekt ersetzt).`,
          );
        }}
        onImportKalku={(parsed, mode) => {
          if (!parsed.project) return;
          const rows = parsed.project.positions;
          const merged = mode === 'append' ? [...data.positions, ...rows] : rows;
          // Kalkulation-template import also lifts meta + CalcParams from
          // the file. We replace those on 'replace' mode; on 'append' we
          // keep the existing project's meta but adopt the new CalcParams
          // if they differ (most useful when the user re-imports a freshly
          // edited template).
          if (mode === 'replace') {
            setData({
              ...parsed.project,
              positions: rows,
              notes: data.notes,
            });
          } else {
            setData({
              ...data,
              positions: merged,
              calcParams: parsed.derivedCalcParams,
            });
          }
          // Auto-flip to v2 — the user just imported a Kalkulation-template,
          // they get the new layout to enjoy it (per Round 2 spec PART F.3).
          switchTableVersion('v2');
          toast.success(
            mode === 'append'
              ? `${rows.length} Position${rows.length === 1 ? '' : 'en'} aus Vorlage angehängt — neue Ansicht aktiviert.`
              : `${rows.length} Position${rows.length === 1 ? '' : 'en'} aus Vorlage importiert (ersetzt) — neue Ansicht aktiviert.`,
          );
        }}
      />
    </div>
  );
}

function TableVersionToggle({
  version,
  onChange,
}: {
  version: TableVersion;
  onChange: (v: TableVersion) => void;
}) {
  if (version === 'v2') {
    return (
      <button
        onClick={() => onChange('v1')}
        title="Zurück zur bisherigen Ansicht"
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-xs font-medium hover:bg-amber-100"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        Alte Ansicht
      </button>
    );
  }
  return (
    <button
      onClick={() => onChange('v2')}
      title="Neue zweispaltige INTERN/KUNDEN-Ansicht testen"
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-primary-200 bg-primary-50 text-primary-700 text-xs font-medium hover:bg-primary-100"
    >
      <Sparkles className="w-3.5 h-3.5" />
      Neue Ansicht
      <span className="ml-0.5 px-1 rounded bg-primary-200/60 text-[9px] uppercase tracking-wider">
        Beta
      </span>
    </button>
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
          ? 'bg-red-50 text-red-700 dark:bg-rose-950/40 dark:text-rose-300'
          : state === 'saved'
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
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
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
      <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Summen</h3>

      <div className="mt-3 space-y-1.5 text-sm">
        <Row label="Lohnanteil" value={totals.totalLohn} muted />
        <Row label="Material" value={totals.totalMaterial} muted />
        <Row label="Geräte" value={totals.totalGeraet} muted />
        <Row label="Nachunternehmer" value={totals.totalNu} muted />
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
        <Row label="Netto (gesamt)" value={totals.totalNetto} strong />
        <Row label="MwSt 19 %" value={totals.totalMwst} muted />
        <Row label="Brutto" value={totals.totalBrutto} strong />
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {positionCount} {positionCount === 1 ? 'Zeile' : 'Zeilen'} insgesamt,{' '}
          <strong className="text-emerald-700 dark:text-emerald-300">{visibleCount} für Kunde sichtbar</strong>.
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
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
      <span
        className={clsx(
          'text-slate-500 dark:text-slate-400',
          strong && 'text-slate-900 dark:text-slate-100 font-semibold',
        )}
      >
        {label}
      </span>
      <span
        className={clsx(
          'tabular-nums',
          muted ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-slate-100',
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
  projectUpdatedAt,
  onOpenShare,
}: {
  shares: ShareSummary[];
  allShares: ShareSummary[];
  projectUpdatedAt: string;
  onOpenShare: () => void;
}) {
  // Heuristic stale detection: if the project was edited after a share's
  // snapshottedAt, the customer is potentially looking at outdated content.
  // (False positives are tolerable — banner is advisory, not blocking. Real
  // diff is computed server-side via /shares/:id/resnapshot-preview.)
  const projectTs = Date.parse(projectUpdatedAt);
  const isStale = (s: ShareSummary): boolean => {
    if (!s.snapshottedAt) return false;
    const snapTs = Date.parse(s.snapshottedAt);
    return Number.isFinite(snapTs) && Number.isFinite(projectTs) && projectTs - snapTs > 1000;
  };
  const staleCount = shares.filter(isStale).length;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Geteilte Links</h3>
        <button
          onClick={onOpenShare}
          className="text-xs text-primary-600 dark:text-primary-300 hover:underline font-medium"
        >
          + Neuer Link
        </button>
      </div>
      {staleCount > 0 && (
        <div className="mt-2 mb-3 flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="leading-relaxed">
            <span className="font-semibold">
              {staleCount === 1 ? '1 Link zeigt einen älteren Stand.' : `${staleCount} Links zeigen einen älteren Stand.`}
            </span>{' '}
            Sie haben das Projekt nach dem Teilen bearbeitet.{' '}
            <button
              type="button"
              onClick={onOpenShare}
              className="underline font-semibold hover:text-amber-700 dark:hover:text-amber-100"
            >
              Schnappschuss aktualisieren
            </button>
          </div>
        </div>
      )}
      {shares.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">
          Noch nicht geteilt. Erstellen Sie einen Link, um das Angebot dem Kunden zugänglich zu
          machen.
        </p>
      ) : (
        <ul className="mt-2 space-y-2 text-sm">
          {shares.map((s) => {
            const stale = isStale(s);
            return (
              <li key={s.id} className="flex items-center gap-2">
                <Eye className={`w-3.5 h-3.5 flex-shrink-0 ${stale ? 'text-amber-500' : 'text-emerald-500'}`} />
                <span className="flex-1 truncate font-mono text-xs text-slate-500 dark:text-slate-400">
                  /{s.token.slice(0, 10)}…
                </span>
                {stale && (
                  <span className="text-[10px] uppercase tracking-wider font-bold text-amber-700 bg-amber-100 dark:bg-amber-950/60 dark:text-amber-200 px-1.5 py-0.5 rounded">
                    Veraltet
                  </span>
                )}
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {s.viewCount}× gesehen
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {allShares.some((s) => s.revokedAt) && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
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
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
      <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
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

      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-5 gap-3">
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

      <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
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
      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>
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
      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>
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

/** PART O helper — remove a single key from the partial zuschlagAktuell
 *  override map, returning undefined if the result is empty so the field
 *  disappears from the saved JSON entirely (cleaner than `{}`). */
function removeKey<T extends object, K extends keyof T>(
  obj: T | undefined,
  key: K,
): T | undefined {
  if (!obj) return undefined;
  const { [key]: _dropped, ...rest } = obj;
  void _dropped;
  return Object.keys(rest).length === 0 ? undefined : (rest as T);
}

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
  Scale,
  Wrench,
  ChevronDown,
  Target,
  Eraser,
  FileSpreadsheet,
  FileCode2,
  FileDigit,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { Helmet } from 'react-helmet-async';
import { api, ApiError, VersionConflictError } from '@/lib/api';
import type {
  CalcParams,
  Position,
  PresencePeer,
  ProjectData,
  ProjectDetail as ProjectDetailType,
  ShareSummary,
} from './types';
import { calcTotals, formatEUR, formatNum, DEFAULT_CALC_PARAMS, recalcAll, baseNetto, solveZielAufschlag } from './calc';
import { mergeProjectData } from './mergeProject';
import { PresenceBar, TeamDialog } from './Collaboration';
import { fillBlankMeta } from './importMeta';
import { Breadcrumb } from '@/pages/panel/ui';
import PositionTable from './PositionTable';
import PositionTableV2 from './PositionTableV2';
import ShareDialog from './ShareDialog';
import ImportDialog from './ImportDialog';
import SnapshotDiffDialog from './SnapshotDiffDialog';
import SubmitValidatorDialog from './SubmitValidatorDialog';

const SAVE_DEBOUNCE_MS = 800;
/** Live-Zusammenarbeit: how often a tab heartbeats presence + polls for a
 *  coworker's save. 6 s keeps "live enough" without hammering the API. */
const COLLAB_POLL_MS = 6000;

type TableVersion = 'v1' | 'v2';
const TABLE_VERSION_KEY = 'kalku.tableVersion';

function readSavedTableVersion(): TableVersion {
  // Default to the new view (v2) for new users / anyone who hasn't chosen yet —
  // only an explicit earlier "Alte Ansicht" pick keeps the legacy table.
  if (typeof window === 'undefined') return 'v2';
  try {
    const v = window.localStorage.getItem(TABLE_VERSION_KEY);
    return v === 'v1' ? 'v1' : 'v2';
  } catch {
    return 'v2';
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
  // Live-Zusammenarbeit — coworkers currently in this calc + the Team dialog.
  const [peers, setPeers] = useState<PresencePeer[]>([]);
  const [showTeam, setShowTeam] = useState(false);
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
  // Live-Zusammenarbeit refs — let the polling interval read the freshest data
  // and save-state without restarting on every keystroke, and guard against two
  // reconciles overlapping.
  const dataRef = useRef<ProjectData | null>(null);
  const savingStateRef = useRef<typeof savingState>('idle');
  const reconcilingRef = useRef(false);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);
  useEffect(() => {
    savingStateRef.current = savingState;
  }, [savingState]);

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

  // Live-Zusammenarbeit: pull a coworker's latest save and fold MY unsaved edits
  // onto it via a row-level 3-way merge — replacing the old "please reload" wall
  // that risked losing work. Returns true if it adopted/merged a newer version.
  //  - clean tab  → silently adopt the coworker's version.
  //  - dirty tab  → merge (different rows from both survive); the resulting
  //    setData triggers the auto-save, which persists the merge.
  // `force` skips the freshness guard (used by the save-conflict path, where the
  // server already advanced past us).
  const reconcileWithServer = useCallback(
    async (opts: { silent?: boolean; force?: boolean } = {}): Promise<boolean> => {
      if (reconcilingRef.current) return false;
      reconcilingRef.current = true;
      try {
        const detail = await api.projects.get(id);
        const serverTs = new Date(detail.updatedAt).getTime();
        if (!opts.force && serverTs <= updatedAtRef.current) return false;
        const theirs = normalizeProject(detail.data);
        const mine = dataRef.current;
        const base = normalizeProject(
          lastSavedRef.current
            ? (JSON.parse(lastSavedRef.current) as ProjectData)
            : detail.data,
        );
        const myPayload = mine
          ? JSON.stringify({ ...mine, positions: recalcAll(mine.positions, mine.calcParams) })
          : '';
        const dirty = Boolean(mine) && myPayload !== lastSavedRef.current;

        // Update refs FIRST so the auto-save effect that fires after setData
        // reads the coworker's timestamp + baseline (so its next PUT matches).
        updatedAtRef.current = serverTs;
        lastSavedRef.current = JSON.stringify(detail.data);

        if (dirty && mine) {
          setData(normalizeProject(mergeProjectData(base, mine, theirs)));
          if (!opts.silent) toast('Änderungen eines Kollegen zusammengeführt.', { icon: '🔀' });
        } else {
          setData(theirs);
          if (!opts.silent) toast('Aktualisiert — ein Kollege hat gespeichert.', { icon: '🔄' });
        }
        setProject(detail);
        refreshCommentCounts();
        return true;
      } catch {
        return false;
      } finally {
        reconcilingRef.current = false;
      }
    },
    [id, refreshCommentCounts],
  );

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
        if (err instanceof VersionConflictError) {
          // A coworker saved between our read and write. Instead of the old
          // reload wall, merge their version with our pending edits; the merge's
          // setData schedules a fresh save that lands on the new base.
          setSavingState('pending');
          const ok = await reconcileWithServer({ silent: true, force: true });
          if (ok) {
            toast('Mit den Änderungen eines Kollegen zusammengeführt.', { icon: '🔀' });
          } else {
            setSavingState('error');
            toast.error('Speichern fehlgeschlagen — bitte die Seite neu laden.', {
              duration: 6000,
            });
          }
        } else {
          setSavingState('error');
          toast.error('Speichern fehlgeschlagen.');
        }
      }
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [data, id, reconcileWithServer]);

  // Live-Zusammenarbeit: one interval that (1) heartbeats my presence and reads
  // back who else is here, and (2) polls the cheap /head to learn if a coworker
  // saved — pulling + merging their change when so. Best-effort throughout: a
  // failed beat never disrupts editing.
  useEffect(() => {
    if (!id || loading || error) return;
    let cancelled = false;
    const beat = async () => {
      if (cancelled) return;
      const editing =
        savingStateRef.current === 'pending' || savingStateRef.current === 'saving';
      try {
        const { peers: live } = await api.projects.presence(id, editing);
        if (!cancelled) setPeers(live);
      } catch {
        /* presence is best-effort */
      }
      if (cancelled || savingStateRef.current === 'saving' || reconcilingRef.current) return;
      try {
        const head = await api.projects.head(id);
        if (!cancelled && head.updatedAt > updatedAtRef.current) {
          await reconcileWithServer();
        }
      } catch {
        /* poll is best-effort */
      }
    };
    beat();
    const timer = setInterval(beat, COLLAB_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
      // Clear my presence for the others right away instead of waiting for TTL.
      api.projects.presenceLeave(id).catch(() => {});
    };
  }, [id, loading, error, reconcileWithServer]);

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

  // "Preise zurücksetzen" — wipe every non-header position's calculator inputs
  // (Material/Zeit/NU + per-row Geräte-Satz + the inline formulas & F1..F7
  // scratch cells) so each row falls back to "EP fehlt" / 0,00 €. Mengen, OZ,
  // Texte, Sichtbarkeit und die globalen Stellschrauben bleiben unberührt —
  // dies setzt nur die eingegebenen Preise zurück, nicht das LV selbst.
  // Requires an explicit confirm because it's irreversible. recalcAll keeps the
  // stored EP/GP consistent immediately; the debounced auto-save persists it.
  const resetAllPrices = useCallback(() => {
    if (!data) return;
    const resettable = data.positions.filter((p) => !p.isHeader).length;
    if (resettable === 0) {
      toast('Keine Positionen zum Zurücksetzen vorhanden.');
      return;
    }
    if (
      typeof window !== 'undefined' &&
      !window.confirm(
        `Alle Preise von ${resettable} ${resettable === 1 ? 'Position' : 'Positionen'} auf 0 € zurücksetzen? ` +
          'Material, Zeit, NU und Geräte-Sätze werden geleert. Mengen und Texte bleiben erhalten. ' +
          'Diese Aktion lässt sich nicht rückgängig machen.',
      )
    ) {
      return;
    }
    const cleared = data.positions.map((p) =>
      p.isHeader
        ? p
        : {
            ...p,
            materialCost: 0,
            timeMinutes: 0,
            nuCost: 0,
            geraeteSatz: undefined,
            materialFormula: undefined,
            timeMinutesFormula: undefined,
            nuFormula: undefined,
            preCalcs: undefined,
          },
    );
    updatePositions(recalcAll(cleared, data.calcParams));
    toast.success(
      `Alle Preise zurückgesetzt — ${resettable} ${resettable === 1 ? 'Position' : 'Positionen'} auf 0 €.`,
    );
  }, [data, updatePositions]);

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
    // Wrapped like the PDF/GAEB siblings so a lazy exceljs chunk-load failure
    // (flaky connection) or writeBuffer error surfaces an error toast instead
    // of failing silently with no download and no feedback. (Audit P1.)
    try {
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
    } catch {
      toast.error('Excel-Export fehlgeschlagen.');
    }
  }

  async function exportToPdf() {
    if (!data) return;
    try {
      const { exportProjectPdf } = await import('./exportFormats');
      await exportProjectPdf(data);
    } catch {
      toast.error('PDF-Export fehlgeschlagen.');
    }
  }

  async function exportToGaeb(variant: 'xml' | 'd90') {
    if (!data) return;
    try {
      const mod = await import('./exportFormats');
      if (variant === 'xml') mod.exportProjectGaebXml(data);
      else mod.exportProjectGaeb90(data);
    } catch {
      toast.error('GAEB-Export fehlgeschlagen.');
    }
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
          <PresenceBar peers={peers} />
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
          <button
            onClick={() => setShowTeam(true)}
            className="btn btn-secondary flex items-center gap-2"
            title="Team / Zugriff — wer darf mitarbeiten"
          >
            <Users className="w-4 h-4" />
            Team
            {peers.length > 0 && (
              <span className="inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold">
                {peers.length}
              </span>
            )}
          </button>
          <ToolsMenu
            projectId={project.id}
            hasMultipleSnapshots={project.shares.filter((s) => !s.revokedAt).length >= 2}
            onValidate={() => setShowSubmit(true)}
            onDiff={() => setShowDiff(true)}
            onReset={resetAllPrices}
          />
          <button
            onClick={() => setShowImport(true)}
            className="btn btn-secondary flex items-center gap-2"
            title="GAEB · Excel · CSV importieren"
          >
            <Upload className="w-4 h-4" />
            Importieren
          </button>
          <ExportMenu
            onExcel={exportToExcel}
            onPdf={exportToPdf}
            onGaebXml={() => exportToGaeb('xml')}
            onGaeb90={() => exportToGaeb('d90')}
          />
          <button
            onClick={() => setShowShare({})}
            className="btn btn-primary flex items-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            Mit Kunde teilen
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-4 min-w-0">
          {totals && (
            <PriceBar
              totals={totals}
              positionCount={data.positions.length}
              visibleCount={visibleCount}
              positions={data.positions}
              params={data.calcParams}
              onSolveTarget={(target) =>
                updateCalcParams({
                  zielAufschlag: solveZielAufschlag(data.positions, data.calcParams, target),
                })
              }
              onResetTarget={() => updateCalcParams({ zielAufschlag: 0 })}
            />
          )}
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

        {/* Geteilte Links — unter der Tabelle (sekundär; „Mit Kunde teilen“ ist
            oben in der Toolbar, der finale Preis ganz oben in der PriceBar). */}
        <div className="max-w-lg">
          <SharesCard
            shares={activeShares}
            allShares={project.shares}
            projectUpdatedAt={project.updatedAt}
            onOpenShare={() => setShowShare({})}
          />
        </div>
      </div>

      {showShare && (
        <ShareDialog
          projectId={project.id}
          projectName={data.name}
          deadline={data.deadline}
          angeboteFolderUrl={data.angeboteFolderUrl}
          positions={data.positions}
          calcParams={data.calcParams}
          existingShares={project.shares}
          parentShareId={showShare.parentShareId}
          onClose={() => setShowShare(false)}
          onCreated={onShareCreated}
          onRequestNachtrag={(parentShareId) => setShowShare({ parentShareId })}
          onAngeboteUrlResolved={(url) => updateMeta({ angeboteFolderUrl: url })}
        />
      )}

      <SnapshotDiffDialog
        open={showDiff}
        onClose={() => setShowDiff(false)}
        projectId={project.id}
        projectName={data.name || 'Projekt'}
        shares={project.shares}
      />

      <TeamDialog projectId={project.id} open={showTeam} onClose={() => setShowTeam(false)} />

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
          if (mode === 'append') {
            updatePositions([...data.positions, ...rows]);
          } else {
            // Replace: positions get new ids, so any `actuals` / `nuQuotes`
            // keyed by old ids would become orphan garbage. Drop them.
            setData({ ...data, positions: rows, actuals: undefined, nuQuotes: undefined });
          }
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
          // keep the existing project's meta but adopt the new CalcParams.
          let adoptedName: string | undefined;
          if (mode === 'replace') {
            // Drop actuals + nuQuotes on replace — they're keyed by old
            // position ids which no longer exist after a template overwrite.
            setData({
              ...parsed.project,
              positions: rows,
              notes: data.notes,
              actuals: undefined,
              nuQuotes: undefined,
            });
            adoptedName = parsed.project.name;
          } else {
            // Append into an existing project: keep its meta, but if the
            // project is still blank (the common "Neues Projekt → Excel
            // importieren" flow) lift BV → Projektname, Bieter, AG … from the
            // file so it lands named + in the right Firma bucket. A project
            // that already has a real name/Bieter is left untouched.
            const metaPatch = fillBlankMeta(data, parsed.project);
            setData({
              ...data,
              ...metaPatch,
              positions: merged,
              calcParams: parsed.derivedCalcParams,
            });
            adoptedName = metaPatch.name;
          }
          // Auto-flip to v2 — the user just imported a Kalkulation-template,
          // they get the new layout to enjoy it (per Round 2 spec PART F.3).
          switchTableVersion('v2');
          const metaNote = adoptedName ? ` · »${adoptedName}«` : '';
          toast.success(
            mode === 'append'
              ? `${rows.length} Position${rows.length === 1 ? '' : 'en'} aus Vorlage angehängt${metaNote} — neue Ansicht aktiviert.`
              : `${rows.length} Position${rows.length === 1 ? '' : 'en'} aus Vorlage importiert (ersetzt)${metaNote} — neue Ansicht aktiviert.`,
          );
        }}
      />
    </div>
  );
}

export function ToolsMenu({
  projectId,
  hasMultipleSnapshots,
  onValidate,
  onDiff,
  onReset,
}: {
  projectId: string;
  hasMultipleSnapshots: boolean;
  onValidate: () => void;
  onDiff: () => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={clsx(
          'btn btn-secondary flex items-center gap-2',
          open && 'bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-500/10 dark:text-primary-100',
        )}
        title="EFB · Nachkalk · Preisspiegel · Validieren · Vergleichen · Preise zurücksetzen"
      >
        <Wrench className="w-4 h-4" />
        Werkzeuge
        <ChevronDown className={clsx('w-3 h-3 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-1.5 w-64 z-40 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl overflow-hidden"
        >
          <MenuLink
            to={`/panel/kalkulation/${projectId}/efb`}
            icon={FileText}
            label="EFB 221/222/223"
            sub="Preisblätter für VOB/A drucken"
            onClick={() => setOpen(false)}
          />
          <MenuLink
            to={`/panel/kalkulation/${projectId}/preisspiegel`}
            icon={Scale}
            label="Preisspiegel"
            sub="NU/Lieferant-Angebote vergleichen"
            onClick={() => setOpen(false)}
          />
          <MenuLink
            to={`/panel/kalkulation/${projectId}/actuals`}
            icon={TrendingUp}
            label="Nachkalkulation"
            sub="Soll vs. Ist nach Ausführung"
            onClick={() => setOpen(false)}
          />
          <div className="border-t border-slate-100 dark:border-slate-800" />
          <MenuButton
            icon={ShieldCheck}
            label="Submit-Validator"
            sub="Original-LV gegen Kalkulation prüfen"
            onClick={() => {
              setOpen(false);
              onValidate();
            }}
          />
          <MenuButton
            icon={GitCompareArrows}
            label="Versionen vergleichen"
            sub={hasMultipleSnapshots ? 'Snapshot-Diff zwischen Links' : 'Mind. 2 aktive Snapshots benötigt'}
            disabled={!hasMultipleSnapshots}
            onClick={() => {
              setOpen(false);
              onDiff();
            }}
          />
          <div className="border-t border-slate-100 dark:border-slate-800" />
          <MenuButton
            icon={Eraser}
            label="Preise zurücksetzen"
            sub="Alle Positionen auf 0 € — nicht umkehrbar"
            danger
            onClick={() => {
              setOpen(false);
              onReset();
            }}
          />
        </div>
      )}
    </div>
  );
}

export function ExportMenu({
  onExcel,
  onPdf,
  onGaebXml,
  onGaeb90,
}: {
  onExcel: () => void;
  onPdf: () => void;
  onGaebXml: () => void;
  onGaeb90: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={clsx(
          'btn btn-secondary flex items-center gap-2',
          open && 'bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-500/10 dark:text-primary-100',
        )}
        title="Excel · PDF · GAEB exportieren"
      >
        <Download className="w-4 h-4" />
        Export
        <ChevronDown className={clsx('w-3 h-3 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-1.5 w-64 z-40 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl overflow-hidden"
        >
          <MenuButton
            icon={FileSpreadsheet}
            label="Excel"
            sub="Kalkulations-Vorlage (.xlsx)"
            onClick={pick(onExcel)}
          />
          <MenuButton
            icon={FileText}
            label="PDF"
            sub="Angebot zum Drucken & Senden"
            onClick={pick(onPdf)}
          />
          <div className="border-t border-slate-100 dark:border-slate-800" />
          <MenuButton
            icon={FileCode2}
            label="GAEB (DA XML)"
            sub="Angebot .x84 — Standard-Austauschformat"
            onClick={pick(onGaebXml)}
          />
          <MenuButton
            icon={FileDigit}
            label="GAEB 90"
            sub="Angebot .d84 — ASCII-Altformat"
            onClick={pick(onGaeb90)}
          />
        </div>
      )}
    </div>
  );
}

function MenuLink({
  to,
  icon: Icon,
  label,
  sub,
  onClick,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      role="menuitem"
      className="flex items-start gap-3 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
    >
      <Icon className="w-4 h-4 mt-0.5 text-primary-600 dark:text-primary-300 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{sub}</p>
      </div>
    </Link>
  );
}

function MenuButton({
  icon: Icon,
  label,
  sub,
  onClick,
  disabled,
  danger,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  sub: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      role="menuitem"
      className={clsx(
        'w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent',
        danger
          ? 'hover:bg-red-50 dark:hover:bg-red-950/30'
          : 'hover:bg-slate-50 dark:hover:bg-slate-800',
      )}
    >
      <Icon
        className={clsx(
          'w-4 h-4 mt-0.5 flex-shrink-0',
          danger ? 'text-red-600 dark:text-red-400' : 'text-primary-600 dark:text-primary-300',
        )}
      />
      <div className="min-w-0">
        <p
          className={clsx(
            'text-sm font-semibold',
            danger ? 'text-red-700 dark:text-red-300' : 'text-slate-800 dark:text-slate-100',
          )}
        >
          {label}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{sub}</p>
      </div>
    </button>
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

/** Horizontal price summary shown ABOVE the position table: surfaces the final
 *  Netto/Brutto prominently and frees the full page width for the (now wide)
 *  table. Reuses EndbetragControl (bare) for the Ziel-Endbetrag input. */
function PriceBar({
  totals,
  positionCount,
  visibleCount,
  positions,
  params,
  onSolveTarget,
  onResetTarget,
}: {
  totals: ReturnType<typeof calcTotals>;
  positionCount: number;
  visibleCount: number;
  positions: Position[];
  params: CalcParams;
  onSolveTarget: (targetNetto: number) => void;
  onResetTarget: () => void;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 sm:px-5 py-4 shadow-sm">
      <div className="flex flex-col xl:flex-row xl:items-center gap-4 xl:gap-6">
        {/* Kosten-Zerlegung — kompakt, horizontal */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <BreakItem label="Lohn" value={totals.totalLohn} />
          <BreakItem label="Material" value={totals.totalMaterial} />
          <BreakItem label="Geräte" value={totals.totalGeraet} />
          <BreakItem label="NU" value={totals.totalNu} />
          <span className="hidden lg:inline text-[11px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
            {positionCount} {positionCount === 1 ? 'Zeile' : 'Zeilen'} ·{' '}
            <span className="text-emerald-700 dark:text-emerald-300 font-medium">{visibleCount} sichtbar</span> ·{' '}
            {formatNum(totals.totalHours, 1)} h
          </span>
        </div>

        {/* Endbetrag-Steuerung + finaler Preis — rechtsbündig & prominent */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 xl:ml-auto">
          <div className="sm:w-[230px] shrink-0">
            <EndbetragControl
              bare
              positions={positions}
              params={params}
              totalNetto={totals.totalNetto}
              onSolve={onSolveTarget}
              onReset={onResetTarget}
            />
          </div>
          <div className="flex items-end gap-5 sm:gap-7 sm:border-l sm:border-slate-200 sm:dark:border-slate-700 sm:pl-6">
            <PriceFigure label="Netto" value={totals.totalNetto} />
            <PriceFigure label="Brutto · inkl. 19 % MwSt" value={totals.totalBrutto} accent />
          </div>
        </div>
      </div>
    </div>
  );
}

function BreakItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        {label}
      </span>
      <span className="text-sm tabular-nums text-slate-600 dark:text-slate-300">{formatEUR(value)}</span>
    </div>
  );
}

function PriceFigure({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 whitespace-nowrap">
        {label}
      </span>
      <span
        className={clsx(
          'text-xl sm:text-2xl font-bold tabular-nums whitespace-nowrap',
          accent ? 'text-primary-700 dark:text-primary-300' : 'text-slate-900 dark:text-white',
        )}
      >
        {formatEUR(value)}
      </span>
    </div>
  );
}

/** Parse a user-typed amount using German conventions: "." groups thousands,
 *  "," is the decimal separator. Falls back to a lone-dot-as-thousands reading
 *  so "24.000" → 24000 (the common case from a WhatsApp "24k netto"). Returns
 *  null for empty/garbage input. */
function parseGermanAmount(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.,-]/g, '').trim();
  if (!cleaned || cleaned === '-') return null;
  const normalized = cleaned.includes(',')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned.replace(/\./g, '');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

/** "Endbetrag vorgeben" — type a desired net Angebotssumme; the global
 *  Ziel-Aufschlag is back-solved (`solveZielAufschlag`) so the bid lands on
 *  that total. Shows the resulting markup % + the raw basis it scales from. */
function EndbetragControl({
  positions,
  params,
  totalNetto,
  onSolve,
  onReset,
  bare = false,
}: {
  positions: Position[];
  params: CalcParams;
  totalNetto: number;
  onSolve: (targetNetto: number) => void;
  onReset: () => void;
  /** When true, drop the card's top divider/margin so the control can sit
   *  inline in the horizontal PriceBar. */
  bare?: boolean;
}) {
  const base = useMemo(() => baseNetto(positions, params), [positions, params]);
  const ziel = params.zielAufschlag ?? 0;
  const active = Math.abs(ziel) > 1e-9;
  // null = not editing → field mirrors the live total; string = user's draft.
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;
    const parsed = parseGermanAmount(draft);
    setDraft(null);
    if (parsed === null || parsed <= 0) return;
    // No-op if the target already matches the current total (within a cent) —
    // avoids re-solving + a churned save on a focus-then-blur with no edit.
    if (Math.abs(parsed - totalNetto) < 0.005) return;
    onSolve(parsed);
  };

  return (
    <div className={bare ? '' : 'mt-4 pt-3 border-t border-slate-100 dark:border-slate-800'}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
          <Target className="w-3 h-3" />
          Endbetrag vorgeben
        </span>
        {active && (
          <button
            type="button"
            onClick={onReset}
            className="text-[11px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 underline underline-offset-2"
          >
            Zurücksetzen
          </button>
        )}
      </div>
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          value={draft ?? formatNum(totalNetto, 2)}
          onFocus={() => setDraft(formatNum(totalNetto, 2))}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') {
              setDraft(null);
              e.currentTarget.blur();
            }
          }}
          aria-label="Ziel-Endbetrag netto"
          className="input text-sm tabular-nums w-full pr-7"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
          €
        </span>
      </div>
      {active ? (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
          Ziel-Aufschlag{' '}
          <strong
            className={clsx(
              ziel >= 0
                ? 'text-emerald-700 dark:text-emerald-300'
                : 'text-amber-700 dark:text-amber-300',
            )}
          >
            {ziel >= 0 ? '+' : '−'}
            {formatNum(Math.abs(ziel) * 100, 1)}&nbsp;%
          </strong>{' '}
          auf Kalkulationsbasis {formatEUR(base)}.
        </p>
      ) : (
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 leading-relaxed">
          Netto-Zielsumme eingeben — der Aufschlag wird automatisch über alle Positionen verteilt.
        </p>
      )}
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

      <label className="block mt-3">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
          Angebote-Ordner (SharePoint-Link)
        </span>
        <input
          type="url"
          value={meta.angeboteFolderUrl || ''}
          onChange={(e) => onMeta({ angeboteFolderUrl: e.target.value })}
          placeholder="https://…sharepoint.com/…/04_Angebote"
          className="mt-1 input text-sm font-mono"
        />
        <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
          Link zum „04_Angebote"-Ordner der Ausschreibung — wird über „Vorlage einfügen" in die
          Kunden-Begrüßung übernommen, damit der Kunde die eingegangenen Angebote einsehen kann.
        </span>
      </label>

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
          label="Geräte-Satz €/h"
          value={params.geraeteStundensatz}
          onChange={(v) => onParams({ geraeteStundensatz: v })}
        />
        <NumField
          label="Geräte Zuschlag %"
          value={(params.geraeteZuschlagPct ?? 0) * 100}
          onChange={(v) => onParams({ geraeteZuschlagPct: v / 100 })}
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

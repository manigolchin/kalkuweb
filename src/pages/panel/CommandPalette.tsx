import { useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutDashboard,
  Calculator,
  Inbox,
  Settings,
  FolderClosed,
  Plus,
  FileText,
  Building2,
  Folder,
  ArrowRight,
  X as XIcon,
  type LucideIcon,
} from 'lucide-react';
import clsx from 'clsx';
import { api } from '@/lib/api';
import type { ProjectSummary } from '@/features/kalkulation/types';
import { Kbd } from './ui';

/**
 * Round 12 — Linear-style "search everything" palette.
 *
 * Merges static navigation actions with three live result sources:
 *   - Kalkulationen  (api.projects.list)
 *   - Firmen         (api.firmen.list)
 *   - Ausschreibungen (api.firmen.detail for top-5 firms by lastSubmissionDate)
 *
 * Each fetch fires ONCE per palette open, cached in component state for the
 * lifetime of the open palette, refreshed on re-open. Failures degrade the
 * affected group with an inline placeholder ("(konnte nicht geladen werden)"
 * / "(nicht verfügbar)") instead of blocking the rest of the palette.
 *
 * Groups are capped at 5 entries by default. A "Mehr anzeigen…" affordance
 * expands a group to its full list and toggles back to collapsed on second
 * click. Substring search filters across ALL groups (labels, hints,
 * client/folder/trade strings, Ausschreibungs-namen, projectNumber).
 */

type GroupName = 'Navigation' | 'Aktion' | 'Kalkulationen' | 'Firmen' | 'Ausschreibungen';

type CmdItem = {
  id: string;
  label: string;
  /** Optional 2nd-line context shown next to the label (client, folder, etc.). */
  hint?: string;
  /** Optional 3rd-line trailing context (updated date, projectNumber, …). */
  trail?: string;
  group: GroupName;
  icon: LucideIcon;
  to: string;
  /** Hidden search-only haystack — concatenation of every text fragment that
   *  should match the substring filter. Lowercased once at build time. */
  searchHaystack: string;
};

const STATIC: CmdItem[] = [
  {
    id: 'nav-dashboard',
    label: 'Dashboard',
    group: 'Navigation',
    icon: LayoutDashboard,
    to: '/panel',
    hint: 'g d',
    searchHaystack: 'dashboard g d',
  },
  {
    id: 'nav-projects',
    label: 'Kalkulation',
    group: 'Navigation',
    icon: Calculator,
    to: '/panel/kalkulation',
    hint: 'g p',
    searchHaystack: 'kalkulation g p',
  },
  {
    id: 'nav-inbox',
    label: 'Kunden-Feedback',
    group: 'Navigation',
    icon: Inbox,
    to: '/panel/feedback',
    hint: 'g i',
    searchHaystack: 'kunden-feedback feedback g i',
  },
  {
    id: 'nav-archive',
    label: 'Archiv',
    group: 'Navigation',
    icon: FolderClosed,
    to: '/panel/archiv',
    searchHaystack: 'archiv',
  },
  {
    id: 'nav-settings',
    label: 'Einstellungen',
    group: 'Navigation',
    icon: Settings,
    to: '/panel/einstellungen',
    hint: 'g s',
    searchHaystack: 'einstellungen settings g s',
  },
  {
    id: 'act-new',
    label: 'Neues Projekt anlegen',
    group: 'Aktion',
    icon: Plus,
    to: '/panel/kalkulation?new=1',
    hint: 'c',
    searchHaystack: 'neues projekt anlegen new c',
  },
];

/** Display order — controls header positions in the dropdown. */
const GROUP_ORDER: GroupName[] = [
  'Navigation',
  'Aktion',
  'Kalkulationen',
  'Firmen',
  'Ausschreibungen',
];

const GROUP_CAP = 5;

/** Firmen row type — narrowed inline to avoid re-exporting the entire api shape. */
type FirmaRow = {
  kind: 'managed' | 'external' | 'local' | 'directory';
  id: number | string;
  folderName: string | null;
  displayName: string;
  tradeType: string | null;
  lastSubmissionDate: string | null;
};

type AusItem = {
  id: number | string;
  firmaKind: 'managed' | 'external' | 'local' | 'directory';
  firmaId: number | string;
  firmaName: string;
  name: string;
  projectNumber: string | null;
};

/** Format an ISO date as `dd.mm.yyyy`. Returns empty string on parse failure. */
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function CommandPalette({
  open,
  onClose,
  onNavigate,
}: {
  open: boolean;
  onClose: () => void;
  onNavigate: (to: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [expanded, setExpanded] = useState<Record<GroupName, boolean>>({
    Navigation: false,
    Aktion: false,
    Kalkulationen: false,
    Firmen: false,
    Ausschreibungen: false,
  });

  // Per-source state. `loaded` flips true regardless of success/failure so we
  // can tell "still in-flight" apart from "tried, no rows".
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState(false);
  const [projectsLoaded, setProjectsLoaded] = useState(false);

  const [firmen, setFirmen] = useState<FirmaRow[]>([]);
  const [firmenLoading, setFirmenLoading] = useState(false);
  const [firmenError, setFirmenError] = useState(false);
  const [firmenLoaded, setFirmenLoaded] = useState(false);

  const [auschreibungen, setAuschreibungen] = useState<AusItem[]>([]);
  const [ausLoading, setAusLoading] = useState(false);
  const [ausError, setAusError] = useState(false);
  const [ausLoaded, setAusLoaded] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  // Generation counter — invalidates in-flight fetches when palette re-opens.
  const fetchGenRef = useRef(0);

  // Fire all three fetches on open. Each is independent — a 503 from firmen
  // doesn't block projects, and the Ausschreibungs chain only kicks off after
  // firmen succeed (it depends on the firmen list).
  useEffect(() => {
    if (!open) return;
    const gen = ++fetchGenRef.current;

    // Reset all sources to "loading, not yet loaded".
    setProjects([]);
    setFirmen([]);
    setAuschreibungen([]);
    setProjectsError(false);
    setFirmenError(false);
    setAusError(false);
    setProjectsLoaded(false);
    setFirmenLoaded(false);
    setAusLoaded(false);
    setProjectsLoading(true);
    setFirmenLoading(true);
    setAusLoading(true);

    api.projects
      .list()
      .then((res) => {
        if (fetchGenRef.current !== gen) return;
        setProjects(res.projects);
      })
      .catch(() => {
        if (fetchGenRef.current !== gen) return;
        setProjectsError(true);
      })
      .finally(() => {
        if (fetchGenRef.current !== gen) return;
        setProjectsLoading(false);
        setProjectsLoaded(true);
      });

    api.firmen
      .list()
      .then(async (res) => {
        if (fetchGenRef.current !== gen) return;
        const rows: FirmaRow[] = res.rows.map((r) => ({
          kind: r.kind,
          id: r.id,
          folderName: r.folderName,
          displayName: r.displayName,
          tradeType: r.tradeType,
          lastSubmissionDate: r.lastSubmissionDate,
        }));
        setFirmen(rows);
        setFirmenLoading(false);
        setFirmenLoaded(true);

        // Kick off the Ausschreibungs chain — top-5 firmas by last submission.
        const topFive = [...rows]
          .sort((a, b) => {
            const ad = a.lastSubmissionDate ? Date.parse(a.lastSubmissionDate) : 0;
            const bd = b.lastSubmissionDate ? Date.parse(b.lastSubmissionDate) : 0;
            return bd - ad;
          })
          .slice(0, 5);

        if (topFive.length === 0) {
          if (fetchGenRef.current !== gen) return;
          setAusLoading(false);
          setAusLoaded(true);
          return;
        }

        try {
          const settled = await Promise.allSettled(
            topFive.map((f) => api.firmen.detail(f.kind, f.id)),
          );
          if (fetchGenRef.current !== gen) return;
          const items: AusItem[] = [];
          settled.forEach((s, i) => {
            if (s.status !== 'fulfilled') return;
            const firma = topFive[i];
            s.value.projects.forEach((p) => {
              items.push({
                id: p.id,
                firmaKind: firma.kind,
                firmaId: firma.id,
                firmaName: firma.displayName,
                // Ausschreibungs-name fallback chain — backend may set name,
                // baumassnahme, or just projectNumber for local rows.
                name: p.name || p.baumassnahme || p.projectNumber || `Ausschreibung ${p.id}`,
                projectNumber: p.projectNumber,
              });
            });
          });
          setAuschreibungen(items);
          // If every detail() failed, mark the whole group as errored — but
          // still pass through any items we managed to collect.
          if (items.length === 0 && settled.every((s) => s.status === 'rejected')) {
            setAusError(true);
          }
        } catch {
          if (fetchGenRef.current !== gen) return;
          setAusError(true);
        } finally {
          if (fetchGenRef.current === gen) {
            setAusLoading(false);
            setAusLoaded(true);
          }
        }
      })
      .catch(() => {
        if (fetchGenRef.current !== gen) return;
        setFirmenError(true);
        setFirmenLoading(false);
        setFirmenLoaded(true);
        // Without firmen we can't compose Ausschreibungen — close that group too.
        setAusLoading(false);
        setAusError(true);
        setAusLoaded(true);
      });
  }, [open]);

  // Reset query + selection + expansion + focus on open.
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(0);
    setExpanded({
      Navigation: false,
      Aktion: false,
      Kalkulationen: false,
      Firmen: false,
      Ausschreibungen: false,
    });
    const id = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(id);
  }, [open]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Build the per-group item lists, then apply search filter + cap.
  const groupedItems = useMemo(() => {
    const q = query.trim().toLowerCase();

    const projItems: CmdItem[] = projects.map((p) => {
      const updated = fmtDate(p.updatedAt);
      const client = p.client || '';
      return {
        id: `proj-${p.id}`,
        label: p.name || p.id,
        hint: client || undefined,
        trail: updated || undefined,
        group: 'Kalkulationen' as const,
        icon: FileText,
        to: `/panel/kalkulation/${p.id}`,
        searchHaystack: `${p.name || ''} ${client} ${p.id} ${updated}`.toLowerCase(),
      };
    });

    const firmaItems: CmdItem[] = firmen.map((f) => {
      const trade = f.tradeType || '';
      const folder = f.folderName || '';
      return {
        id: `firma-${f.kind}-${f.id}`,
        label: f.displayName,
        hint: trade || undefined,
        trail: folder || undefined,
        group: 'Firmen' as const,
        icon: Building2,
        to: `/panel/firmen/${f.kind}/${f.id}`,
        searchHaystack: `${f.displayName} ${trade} ${folder}`.toLowerCase(),
      };
    });

    const ausItems: CmdItem[] = auschreibungen.map((a) => ({
      id: `aus-${a.firmaKind}-${a.firmaId}-${a.id}`,
      label: a.name,
      hint: a.firmaName,
      trail: a.projectNumber || undefined,
      group: 'Ausschreibungen' as const,
      icon: Folder,
      // No dedicated Ausschreibungs-page yet — open the parent Firma page.
      to: `/panel/firmen/${a.firmaKind}/${a.firmaId}`,
      searchHaystack: `${a.name} ${a.firmaName} ${a.projectNumber || ''}`.toLowerCase(),
    }));

    function applyFilter(items: CmdItem[]): CmdItem[] {
      if (!q) return items;
      return items.filter((it) => it.searchHaystack.includes(q));
    }

    return {
      Navigation: applyFilter(STATIC.filter((s) => s.group === 'Navigation')),
      Aktion: applyFilter(STATIC.filter((s) => s.group === 'Aktion')),
      Kalkulationen: applyFilter(projItems),
      Firmen: applyFilter(firmaItems),
      Ausschreibungen: applyFilter(ausItems),
    } as Record<GroupName, CmdItem[]>;
  }, [projects, firmen, auschreibungen, query]);

  // Flat selectable list (after group cap). `Mehr anzeigen…` chips and group
  // headers are NOT in this list — keyboard nav only walks real items.
  const flat: CmdItem[] = useMemo(() => {
    const out: CmdItem[] = [];
    for (const g of GROUP_ORDER) {
      const items = groupedItems[g];
      const capped = expanded[g] ? items : items.slice(0, GROUP_CAP);
      out.push(...capped);
    }
    return out;
  }, [groupedItems, expanded]);

  // Clamp active when items change.
  useEffect(() => {
    if (active >= flat.length) setActive(Math.max(0, flat.length - 1));
  }, [flat.length, active]);

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(flat.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const it = flat[active];
      if (it) onNavigate(it.to);
    }
  }

  if (!open) return null;

  // Decide whether to render the global "Keine Treffer" empty state. Only
  // when the user has typed AND every group's filtered list is empty AND no
  // group is still loading (a loading group might still produce matches).
  const anyLoading = projectsLoading || firmenLoading || ausLoading;
  const totalAfterFilter = GROUP_ORDER.reduce((s, g) => s + groupedItems[g].length, 0);
  const showGlobalEmpty = !!query.trim() && totalAfterFilter === 0 && !anyLoading;

  let flatIndex = -1;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Befehlspalette"
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh] bg-slate-900/60 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={onKeyDown}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 h-12 border-b border-slate-200 dark:border-slate-800">
          <SearchIcon />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Befehl, Projekt oder Seite suchen…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-slate-400 dark:text-slate-100"
          />
          <button
            onClick={onClose}
            aria-label="Schließen"
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto py-1" data-testid="cmdk-list">
          {showGlobalEmpty ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              Keine Treffer für „{query}“.
            </div>
          ) : (
            GROUP_ORDER.map((group) => {
              const items = groupedItems[group];
              const groupState = stateForGroup(group, {
                projectsLoading,
                projectsError,
                projectsLoaded,
                firmenLoading,
                firmenError,
                firmenLoaded,
                ausLoading,
                ausError,
                ausLoaded,
              });

              // Hide a group when:
              //   - it's a static group (Navigation/Aktion) with nothing left after filter
              //   - it's a live group, fully loaded, NO items, NO error, NO empty-msg
              if (items.length === 0) {
                if (group === 'Navigation' || group === 'Aktion') return null;
                if (groupState.kind === 'loaded' && !groupState.emptyMsg) return null;
              }

              const visible = expanded[group] ? items : items.slice(0, GROUP_CAP);
              const hasMore = items.length > GROUP_CAP;

              return (
                <div key={group} className="px-1" data-testid={`cmdk-group-${group}`}>
                  <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {group}
                  </p>

                  {/* Per-group state messaging: loading spinner, error, or empty. */}
                  {groupState.kind === 'loading' && (
                    <div
                      data-testid={`cmdk-loading-${group}`}
                      className="px-3 py-2 text-xs text-slate-400 dark:text-slate-500 italic"
                    >
                      Lade…
                    </div>
                  )}
                  {groupState.kind === 'error' && (
                    <div
                      data-testid={`cmdk-error-${group}`}
                      className="px-3 py-2 text-xs text-slate-400 dark:text-slate-500 italic"
                    >
                      {groupState.message}
                    </div>
                  )}
                  {groupState.kind === 'loaded' && items.length === 0 && groupState.emptyMsg && (
                    <div
                      data-testid={`cmdk-empty-${group}`}
                      className="px-3 py-2 text-xs text-slate-400 dark:text-slate-500 italic"
                    >
                      {groupState.emptyMsg}
                    </div>
                  )}

                  {visible.map((it) => {
                    flatIndex += 1;
                    const idx = flatIndex;
                    const isActive = idx === active;
                    const Icon = it.icon;
                    return (
                      <button
                        key={it.id}
                        type="button"
                        data-testid={`cmdk-item-${it.id}`}
                        onMouseEnter={() => setActive(idx)}
                        onClick={() => onNavigate(it.to)}
                        className={clsx(
                          'group w-full flex items-center gap-3 px-3 h-10 rounded-lg text-sm text-left transition-colors',
                          isActive
                            ? 'bg-primary-50 text-primary-800 dark:bg-primary-500/15 dark:text-primary-100'
                            : 'text-slate-700 dark:text-slate-200',
                        )}
                      >
                        <Icon
                          className={clsx(
                            'w-4 h-4 flex-shrink-0',
                            isActive
                              ? 'text-primary-600 dark:text-primary-300'
                              : 'text-slate-400 dark:text-slate-500',
                          )}
                        />
                        <span className="flex-1 truncate">{it.label}</span>
                        {it.hint && (
                          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-[40%]">
                            {/* Static items render hints as Kbd chips; live
                                items render them as inline context strings. */}
                            {it.group === 'Navigation' || it.group === 'Aktion'
                              ? it.hint.split(' ').map((k, i) => <Kbd key={i}>{k}</Kbd>)
                              : it.hint}
                          </span>
                        )}
                        {it.trail && (
                          <span className="hidden md:inline text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                            {it.trail}
                          </span>
                        )}
                        <ArrowRight
                          className={clsx(
                            'w-3.5 h-3.5 transition-transform',
                            isActive ? 'translate-x-0 opacity-100' : '-translate-x-1 opacity-0',
                          )}
                        />
                      </button>
                    );
                  })}

                  {hasMore && (
                    <button
                      type="button"
                      data-testid={`cmdk-more-${group}`}
                      onClick={() =>
                        setExpanded((prev) => ({ ...prev, [group]: !prev[group] }))
                      }
                      className="w-full text-left px-3 py-1.5 text-[11px] text-primary-600 hover:text-primary-700 dark:text-primary-300 dark:hover:text-primary-200 font-medium"
                    >
                      {expanded[group]
                        ? 'Weniger anzeigen'
                        : `Mehr anzeigen… (+${items.length - GROUP_CAP})`}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-4 h-9 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
            Navigieren
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Kbd>↵</Kbd>
            Öffnen
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Kbd>Esc</Kbd>
            Schließen
          </span>
        </div>
      </div>
    </div>
  );
}

/** Translate per-group fetch state into a renderable banner. Static groups
 *  ('Navigation' / 'Aktion') never have loading/error/empty messaging. */
function stateForGroup(
  group: GroupName,
  s: {
    projectsLoading: boolean;
    projectsError: boolean;
    projectsLoaded: boolean;
    firmenLoading: boolean;
    firmenError: boolean;
    firmenLoaded: boolean;
    ausLoading: boolean;
    ausError: boolean;
    ausLoaded: boolean;
  },
):
  | { kind: 'none' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'loaded'; emptyMsg?: string } {
  if (group === 'Navigation' || group === 'Aktion') return { kind: 'none' };
  if (group === 'Kalkulationen') {
    if (s.projectsLoading) return { kind: 'loading' };
    if (s.projectsError) return { kind: 'error', message: '(konnte nicht geladen werden)' };
    if (s.projectsLoaded) return { kind: 'loaded', emptyMsg: 'Keine Kalkulationen' };
    return { kind: 'none' };
  }
  if (group === 'Firmen') {
    if (s.firmenLoading) return { kind: 'loading' };
    if (s.firmenError) return { kind: 'error', message: '(nicht verfügbar)' };
    if (s.firmenLoaded) return { kind: 'loaded' };
    return { kind: 'none' };
  }
  // Ausschreibungen
  if (s.ausLoading) return { kind: 'loading' };
  if (s.ausError) return { kind: 'error', message: '(konnte nicht geladen werden)' };
  if (s.ausLoaded) return { kind: 'loaded' };
  return { kind: 'none' };
}

function SearchIcon() {
  return (
    <svg
      className="w-4 h-4 text-slate-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="m21 21-4.35-4.35M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z"
      />
    </svg>
  );
}

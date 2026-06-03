import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  FolderOpen,
  Plus,
  Trash2,
  ArrowRight,
  Loader2,
  AlertTriangle,
  FileText,
  Search,
  Building2,
  ChevronDown,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import type { ProjectSummary } from './types';
import { Breadcrumb } from '@/pages/panel/ui';
import { Skeleton } from '@/components/panel/Skeleton';

/** The list endpoint also returns `bidder` (the Bauunternehmer the calc is
 *  for). It isn't part of the shared ProjectSummary type yet, so widen it
 *  locally rather than editing the shared type. */
type ProjectRow = ProjectSummary & { bidder?: string };

/* ── Firma identity — deterministic avatar tint + initials, mirroring the
 *    Kunden-Feedback inbox so both screens render companies consistently. ── */
const AVATAR_TINTS = [
  'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200',
  'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-200',
];

function tintFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_TINTS[Math.abs(h) % AVATAR_TINTS.length];
}

function initials(name: string): string {
  const cleaned = name.replace(/^\s*\d+\s+/, '').trim();
  const words = cleaned.split(/[\s.\-_/]+/).filter((w) => w && !/^(gmbh|ug|gbr|ag|kg|co|mbh|und|&)$/i.test(w));
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return (words[0] ?? cleaned).slice(0, 2).toUpperCase() || '–';
}

const UNKNOWN_GROUP_KEY = '__unknown__';
const UNKNOWN_LABEL = 'Ohne Zuordnung';

/** WHICH FIRMA a project belongs to — the Bauunternehmer (bidder) first, then
 *  the Auftraggeber (client), matching the Kunden-Feedback resolution so both
 *  screens bucket the same project under the same company. */
function companyOf(p: ProjectRow): string {
  const bidder = p.bidder?.trim();
  if (bidder) return bidder;
  const client = p.client?.trim();
  if (client) return client;
  return UNKNOWN_LABEL;
}

type ProjectGroup = {
  key: string;
  company: string;
  projects: ProjectRow[];
  /** Most-recent updatedAt across the group — the group sort key. */
  lastTs: number;
  isUnknown: boolean;
};

/** Bucket projects by Firma. Known companies sort by most-recent activity;
 *  the "Ohne Zuordnung" bucket always sinks last. */
function groupByCompany(rows: ProjectRow[]): ProjectGroup[] {
  const map = new Map<string, ProjectGroup>();
  for (const p of rows) {
    const company = companyOf(p);
    const isUnknown = company === UNKNOWN_LABEL;
    const key = isUnknown ? UNKNOWN_GROUP_KEY : company.toLowerCase();
    let g = map.get(key);
    if (!g) {
      g = { key, company, projects: [], lastTs: 0, isUnknown };
      map.set(key, g);
    }
    g.projects.push(p);
    const ts = Date.parse(p.updatedAt);
    if (Number.isFinite(ts) && ts > g.lastTs) g.lastTs = ts;
  }
  for (const g of map.values()) {
    g.projects.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  }
  return [...map.values()].sort((a, b) => {
    if (a.isUnknown !== b.isUnknown) return a.isUnknown ? 1 : -1;
    return b.lastTs - a.lastTs;
  });
}

function matchesQuery(p: ProjectRow, q: string): boolean {
  if (!q) return true;
  return [p.name, p.client, p.bidder ?? '', p.service].join(' ').toLowerCase().includes(q);
}

function fmtShortDate(ts: number): string {
  return new Date(ts).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
}

export default function ProjectsList() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProjectRow | null>(null);
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const searching = search.trim().length > 0;
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? projects.filter((p) => matchesQuery(p, q)) : projects;
  }, [projects, search]);
  const groups = useMemo(() => groupByCompany(filtered), [filtered]);
  const allCollapsed = groups.length > 0 && groups.every((g) => collapsed.has(g.key));

  function toggleGroup(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAll() {
    setCollapsed(allCollapsed ? new Set() : new Set(groups.map((g) => g.key)));
  }

  async function load() {
    setLoading(true);
    try {
      const { projects } = await api.projects.list();
      setProjects(projects);
    } catch {
      toast.error('Projekte konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreateBlank() {
    if (creating) return;
    setCreating(true);
    try {
      const p = await api.projects.create({ name: 'Neues Projekt', client: '' });
      navigate(`/panel/kalkulation/${p.id}`);
    } catch {
      toast.error('Projekt konnte nicht erstellt werden.');
      setCreating(false);
    }
  }

  // Auto-trigger creation when arriving from ⌘K / `c` shortcut / dashboard
  // button with ?new=1. Strip the param FIRST so a refresh doesn't loop, AND
  // so the subsequent navigate-away from onCreateBlank doesn't try to set
  // state on an unmounting component.
  useEffect(() => {
    if (params.get('new') === '1' && !loading && !creating) {
      const next = new URLSearchParams(params);
      next.delete('new');
      setParams(next, { replace: true });
      // Defer so the param-strip commits first.
      queueMicrotask(() => onCreateBlank());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, loading]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    try {
      await api.projects.delete(id);
      setProjects((arr) => arr.filter((p) => p.id !== id));
      toast.success('Projekt gelöscht.');
    } catch {
      toast.error('Löschen fehlgeschlagen.');
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Panel', to: '/panel' }, { label: 'Kalkulation' }]} />

      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary-50 border border-primary-100 dark:bg-primary-500/15 dark:border-primary-500/30">
            <FolderOpen className="w-5 h-5 text-primary-600 dark:text-primary-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Kalkulation</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {loading
                ? 'Lade…'
                : projects.length === 0
                  ? 'Noch keine Projekte'
                  : `${projects.length} ${projects.length === 1 ? 'Projekt' : 'Projekte'}`}
            </p>
          </div>
        </div>
        <button
          onClick={onCreateBlank}
          disabled={creating}
          className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          <span>Neues Projekt</span>
        </button>
      </header>

      {loading ? (
        <SkeletonGrid />
      ) : projects.length === 0 ? (
        <EmptyState onCreate={onCreateBlank} disabled={creating} />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Projekt, Firma oder Auftraggeber suchen …"
                aria-label="Projekte durchsuchen"
                className="input w-full pl-9"
              />
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
              <span>
                {groups.length} {groups.length === 1 ? 'Firma' : 'Firmen'}
                {searching && ` · ${filtered.length} Treffer`}
              </span>
              {groups.length > 1 && (
                <button
                  type="button"
                  onClick={toggleAll}
                  className="font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  {allCollapsed ? 'Alle ausklappen' : 'Alle einklappen'}
                </button>
              )}
            </div>
          </div>

          {groups.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400 dark:border-slate-800 dark:text-slate-500">
              Keine Projekte passen zur Suche „{search.trim()}".
            </div>
          ) : (
            <div role="list" aria-label="Projekte" className="space-y-4">
              {groups.map((g) => (
                <CompanyGroup
                  key={g.key}
                  group={g}
                  collapsed={!searching && collapsed.has(g.key)}
                  onToggle={() => toggleGroup(g.key)}
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {deleteTarget && (
        <ConfirmDelete
          name={deleteTarget.name}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

/** One Firma section: collapsible header (avatar + name + project count +
 *  last-activity date) over a responsive grid of the firm's project cards. */
function CompanyGroup({
  group,
  collapsed,
  onToggle,
  onDelete,
}: {
  group: ProjectGroup;
  collapsed: boolean;
  onToggle: () => void;
  onDelete: (p: ProjectRow) => void;
}) {
  const count = group.projects.length;
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/40">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-100/70 dark:hover:bg-slate-800/40"
      >
        <span
          aria-hidden
          className={clsx(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold',
            tintFor(group.company),
          )}
        >
          {initials(group.company)}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="inline-flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span
              className={clsx(
                'truncate font-semibold',
                group.isUnknown
                  ? 'italic text-slate-500 dark:text-slate-400'
                  : 'text-slate-900 dark:text-slate-100',
              )}
            >
              {group.company}
            </span>
          </span>
          <span className="pl-5 text-xs text-slate-400 dark:text-slate-500">
            {count} {count === 1 ? 'Projekt' : 'Projekte'} · zuletzt {fmtShortDate(group.lastTs)}
          </span>
        </span>
        <ChevronDown
          className={clsx(
            'h-4 w-4 shrink-0 text-slate-400 transition-transform',
            collapsed && '-rotate-90',
          )}
        />
      </button>
      {!collapsed && (
        <div className="grid grid-cols-1 gap-4 p-4 pt-1 sm:grid-cols-2 xl:grid-cols-3">
          {group.projects.map((p) => (
            <ProjectCard key={p.id} project={p} onDelete={() => onDelete(p)} />
          ))}
        </div>
      )}
    </section>
  );
}

function ProjectCard({ project, onDelete }: { project: ProjectSummary; onDelete: () => void }) {
  const updated = new Date(project.updatedAt);
  return (
    <Link
      to={`/panel/kalkulation/${project.id}`}
      role="listitem"
      aria-label={`Projekt ${project.name || 'Unbenanntes Projekt'}`}
      className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:border-primary-300 dark:hover:border-primary-500/50 hover:shadow-md dark:hover:shadow-slate-950/50 transition-all"
    >
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete();
        }}
        className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
        title="Projekt löschen"
        aria-label="Projekt löschen"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3 pr-8">
        <span className="inline-flex w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 items-center justify-center flex-shrink-0">
          <FileText className="w-4 h-4 text-slate-400 dark:text-slate-500" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">
            {project.name || 'Unbenanntes Projekt'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
            {project.client || 'Kein Auftraggeber'}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          {project.positionCount} {project.positionCount === 1 ? 'Position' : 'Positionen'}
        </span>
        <span className="text-slate-400 dark:text-slate-500 tabular-nums">
          {updated.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
          {project.versionNumber > 1 && ` · v${project.versionNumber}`}
        </span>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end text-primary-600 dark:text-primary-300 text-sm font-medium">
        Öffnen <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </Link>
  );
}

function SkeletonGrid() {
  return (
    <div
      aria-live="polite"
      aria-busy="true"
      data-testid="projects-loading"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      {/* Note: the page subtitle ("Lade…") already conveys the loading
          state to screen-reader users — no second announcement needed here. */}
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          data-testid="projects-skeleton-card"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="w-9 h-9 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-2.5 w-1/2" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onCreate, disabled }: { onCreate: () => void; disabled: boolean }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center">
      <div className="inline-flex p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 mb-4">
        <FolderOpen className="w-10 h-10 text-slate-300 dark:text-slate-600" />
      </div>
      <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">Noch keine Projekte</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-xs mx-auto">
        Erstellen Sie Ihre erste Kalkulation, um Positionen zu erfassen und mit Kunden zu teilen.
      </p>
      <button
        onClick={onCreate}
        disabled={disabled}
        className="mt-5 inline-flex items-center gap-2 h-9 px-3.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-50"
      >
        <Plus className="w-4 h-4" />
        Neues Projekt anlegen
      </button>
    </div>
  );
}

function ConfirmDelete({
  name,
  onConfirm,
  onCancel,
}: {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 w-full max-w-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900 shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Projekt löschen?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              <span className="font-medium text-slate-700 dark:text-slate-200">{name || 'Dieses Projekt'}</span> wird
              endgültig entfernt – inkl. aller Positionen, Versionen und geteilten Links.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onCancel}
            className="inline-flex items-center h-9 px-3.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Abbrechen
          </button>
          <button
            onClick={onConfirm}
            className="inline-flex items-center h-9 px-3.5 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700"
          >
            Löschen
          </button>
        </div>
      </div>
    </div>
  );
}

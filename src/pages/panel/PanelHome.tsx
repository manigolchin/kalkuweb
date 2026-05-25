import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calculator,
  Inbox,
  Share2,
  MessageSquare,
  ArrowRight,
  Plus,
  Activity,
  FileText,
  Clock,
  AlertCircle,
  Scale,
  TrendingUp,
  Wrench,
  Library,
} from 'lucide-react';
import clsx from 'clsx';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { ProjectSummary, InboxEntry } from '@/features/kalkulation/types';
import { StatusBadge, Skeleton, Kbd } from './ui';

type Stats = {
  activeProjects: number;
  activeShares: number;
  responsesLast7Days: number;
  upcomingDeadlines: number;
};

export default function PanelHome() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [inbox, setInbox] = useState<InboxEntry[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [pr, ib] = await Promise.all([api.projects.list(), api.inbox.list()]);
        if (!alive) return;
        setProjects(pr.projects);
        setInbox(ib.entries);
        // Compute time-relative stats here so the render stays pure.
        const now = Date.now();
        const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
        const fourteenDaysAhead = now + 14 * 24 * 60 * 60 * 1000;
        const responses = ib.entries.flatMap((e) => e.responses);
        const responsesLast7Days = responses.filter(
          (r) => new Date(r.respondedAt).getTime() >= sevenDaysAgo,
        ).length;
        const upcoming = pr.projects.filter((p) => {
          const summary = p as ProjectSummary & { deadline?: string };
          if (!summary.deadline) return false;
          const t = Date.parse(summary.deadline);
          return Number.isFinite(t) && t >= now && t <= fourteenDaysAhead;
        }).length;
        setStats({
          activeProjects: pr.projects.length,
          activeShares: ib.entries.length,
          responsesLast7Days,
          upcomingDeadlines: upcoming,
        });
      } catch {
        if (alive) setError('Daten konnten nicht geladen werden.');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Dashboard
          </p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {greeting()}, {user?.name?.split(' ')[0] || 'Inhaber'}.
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Übersicht über aktive Kalkulationen, geteilte Links und offene Rückmeldungen.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/panel/kalkulation?new=1"
            className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Neues Projekt
          </Link>
        </div>
      </header>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Aktive Projekte" value={stats?.activeProjects} icon={Calculator} accent="primary" to="/panel/kalkulation" />
        <KpiCard label="Geteilte Links" value={stats?.activeShares} icon={Share2} accent="sky" />
        <KpiCard label="Antworten · 7 Tage" value={stats?.responsesLast7Days} icon={MessageSquare} accent="violet" to="/panel/feedback" />
        <KpiCard label="Abgabe in 14 Tagen" value={stats?.upcomingDeadlines} icon={Clock} accent="amber" />
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-sm text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        {/* Recent activity */}
        <Card title="Letzte Aktivität" icon={Activity} action={{ label: 'Inbox öffnen', to: '/panel/feedback' }}>
          {inbox == null ? (
            <SkeletonRows />
          ) : inbox.length === 0 ? (
            <Empty
              icon={Inbox}
              title="Noch keine Aktivität"
              body="Sobald Sie einen Link teilen und der Kunde antwortet, erscheint hier die Aktivität."
            />
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800 -mx-5">
              {inbox.slice(0, 6).map((entry, i) => (
                <ActivityRow key={i} entry={entry} />
              ))}
            </ul>
          )}
        </Card>

        {/* Quick access + recent projects */}
        <div className="space-y-5">
          <Card title="Schnellzugriff" icon={ArrowRight}>
            <ul className="-mx-1 -my-1.5 space-y-0.5">
              <ShortcutRow to="/panel/kalkulation" icon={Calculator} label="Projekte" hint="g p" />
              <ShortcutRow to="/panel/vorlagen" icon={Library} label="Vorlagen-Bibliothek" />
              <ShortcutRow to="/panel/feedback" icon={Inbox} label="Kunden-Feedback" hint="g i" />
              <ShortcutRow to="/panel/einstellungen" icon={FileText} label="Profil & Logo" hint="g s" />
            </ul>
            <p className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5">
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
              <span>Befehlspalette öffnen</span>
            </p>
          </Card>

          {projects && projects.length > 0 && (
            <ToolsCard project={[...projects].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0]} />
          )}

          <Card
            title="Zuletzt bearbeitet"
            icon={FileText}
            action={projects && projects.length > 3 ? { label: 'Alle anzeigen', to: '/panel/kalkulation' } : undefined}
          >
            {projects == null ? (
              <SkeletonRows count={3} />
            ) : projects.length === 0 ? (
              <Empty
                icon={Calculator}
                title="Noch keine Projekte"
                body="Legen Sie Ihre erste Kalkulation an."
                action={{ label: 'Projekt anlegen', to: '/panel/kalkulation?new=1' }}
              />
            ) : (
              <ul className="-mx-1 space-y-0.5">
                {[...projects]
                  .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
                  .slice(0, 4)
                  .map((p) => (
                    <li key={p.id}>
                      <Link
                        to={`/panel/kalkulation/${p.id}`}
                        className="group flex items-start gap-2.5 px-2 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <FileText className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                            {p.name || 'Unbenanntes Projekt'}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {p.client || '—'} · {p.positionCount} Pos.
                          </p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 dark:group-hover:text-slate-300 mt-1 -translate-x-1 group-hover:translate-x-0 opacity-0 group-hover:opacity-100 transition-all" />
                      </Link>
                    </li>
                  ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ─── helpers ─────────────────────────────────────────────────────────── */

function ToolsCard({ project }: { project: ProjectSummary }) {
  const base = `/panel/kalkulation/${project.id}`;
  return (
    <Card title="Werkzeuge" icon={Wrench}>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
        Für <span className="font-semibold text-slate-700 dark:text-slate-200 truncate inline-block max-w-[10rem] align-bottom" title={project.name || 'Projekt'}>
          {project.name || 'zuletzt bearbeitetes Projekt'}
        </span>
      </p>
      <ul className="-mx-1 space-y-0.5">
        <ShortcutRow to={`${base}/efb`} icon={FileText} label="EFB 221/222/223" hint="VOB" />
        <ShortcutRow to={`${base}/preisspiegel`} icon={Scale} label="Preisspiegel" hint="NU" />
        <ShortcutRow to={`${base}/actuals`} icon={TrendingUp} label="Nachkalkulation" hint="Ist" />
      </ul>
      <p className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
        Pro Projekt im Werkzeuge-Menü oben rechts.
      </p>
    </Card>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Gute Nacht';
  if (h < 12) return 'Guten Morgen';
  if (h < 18) return 'Schönen Tag';
  return 'Guten Abend';
}

function KpiCard({
  label,
  value,
  icon: Icon,
  accent,
  to,
}: {
  label: string;
  value: number | undefined;
  icon: typeof Calculator;
  accent: 'primary' | 'sky' | 'violet' | 'amber';
  to?: string;
}) {
  const accentCls = {
    primary: 'text-primary-600 bg-primary-50 dark:text-primary-300 dark:bg-primary-500/15',
    sky: 'text-sky-700 bg-sky-50 dark:text-sky-300 dark:bg-sky-500/15',
    violet: 'text-violet-700 bg-violet-50 dark:text-violet-300 dark:bg-violet-500/15',
    amber: 'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-500/15',
  }[accent];
  const inner = (
    <>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <span className={clsx('inline-flex w-7 h-7 rounded-lg items-center justify-center', accentCls)}>
          <Icon className="w-3.5 h-3.5" />
        </span>
      </div>
      <div className="mt-3 text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
        {value == null ? <Skeleton className="inline-block h-7 w-10 align-middle" /> : value}
      </div>
    </>
  );
  const cls =
    'block p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors';
  return to ? (
    <Link to={to} className={cls}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

function Card({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  icon: typeof Activity;
  action?: { label: string; to: string };
  children: React.ReactNode;
}) {
  return (
    <section className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
      <header className="flex items-center justify-between mb-3">
        <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
          <Icon className="w-4 h-4 text-slate-400 dark:text-slate-500" /> {title}
        </h2>
        {action && (
          <Link
            to={action.to}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-300 dark:hover:text-primary-200"
          >
            {action.label} <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </header>
      {children}
    </section>
  );
}

function ActivityRow({ entry }: { entry: InboxEntry }) {
  const latest = entry.responses[0];
  const project = entry.project;
  const responseKind: 'approved' | 'changes' | 'rejected' | null = latest
    ? latest.responseType === 'approve'
      ? 'approved'
      : latest.responseType === 'reject'
        ? 'rejected'
        : 'changes'
    : null;
  const when = latest?.respondedAt ?? entry.share.lastViewedAt ?? entry.share.createdAt;
  const verb = latest
    ? latest.responseType === 'approve'
      ? 'hat freigegeben'
      : latest.responseType === 'reject'
        ? 'hat abgelehnt'
        : 'hat Änderungen angefordert'
    : entry.share.lastViewedAt
      ? 'hat den Link geöffnet'
      : 'Link erstellt';
  return (
    <li>
      <Link
        to={project ? `/panel/kalkulation/${project.id}` : '/panel/feedback'}
        className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
      >
        <span
          className={clsx(
            'mt-1 w-2 h-2 rounded-full flex-shrink-0',
            responseKind === 'approved'
              ? 'bg-emerald-500'
              : responseKind === 'rejected'
                ? 'bg-rose-500'
                : responseKind === 'changes'
                  ? 'bg-amber-500'
                  : 'bg-sky-500',
          )}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-slate-800 dark:text-slate-100">
            <span className="font-medium">
              {latest?.customerName || entry.share.settings.customerName || 'Kunde'}
            </span>{' '}
            <span className="text-slate-500 dark:text-slate-400">{verb}</span>
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
            {project?.name || '—'} {project?.client && `· ${project.client}`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {responseKind && <StatusBadge kind={responseKind} size="xs" />}
          {(() => {
            const rel = relativeTime(when);
            return rel ? (
              <time className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums whitespace-nowrap">
                {rel}
              </time>
            ) : null;
          })()}
        </div>
      </Link>
    </li>
  );
}

function ShortcutRow({
  to,
  icon: Icon,
  label,
  hint,
}: {
  to: string;
  icon: typeof Calculator;
  label: string;
  hint?: string;
}) {
  return (
    <li>
      <Link
        to={to}
        className="group flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <Icon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
        <span className="flex-1 text-sm text-slate-700 dark:text-slate-200">{label}</span>
        {hint && (
          <span className="hidden sm:inline-flex items-center gap-1">
            {hint.split(' ').map((k, i) => (
              <Kbd key={i}>{k}</Kbd>
            ))}
          </span>
        )}
      </Link>
    </li>
  );
}

function SkeletonRows({ count = 4 }: { count?: number }) {
  return (
    <ul className="-mx-5 divide-y divide-slate-100 dark:divide-slate-800">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 px-5 py-3">
          <Skeleton className="w-2 h-2 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-2.5 w-1/3" />
          </div>
          <Skeleton className="h-4 w-10" />
        </li>
      ))}
    </ul>
  );
}

function Empty({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: typeof Inbox;
  title: string;
  body: string;
  action?: { label: string; to: string };
}) {
  return (
    <div className="text-center py-10 px-4">
      <div className="inline-flex w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-slate-400 dark:text-slate-500" />
      </div>
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">{body}</p>
      {action && (
        <Link
          to={action.to}
          className="mt-4 inline-flex items-center gap-2 h-8 px-3 rounded-lg bg-primary-600 text-white text-xs font-semibold hover:bg-primary-700"
        >
          <Plus className="w-3.5 h-3.5" /> {action.label}
        </Link>
      )}
    </div>
  );
}

function relativeTime(input?: string | null): string {
  if (!input) return '';
  const t = Date.parse(input);
  if (!Number.isFinite(t)) return '';
  const diff = Date.now() - t;
  const min = Math.round(diff / 60_000);
  if (min < 1) return 'gerade';
  if (min < 60) return `vor ${min} min`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `vor ${hr} h`;
  const day = Math.round(hr / 24);
  if (day < 7) return `vor ${day} d`;
  try {
    return new Date(t).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
  } catch {
    return '';
  }
}

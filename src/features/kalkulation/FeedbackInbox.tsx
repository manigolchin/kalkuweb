import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Inbox,
  Check,
  MessageSquare,
  Eye,
  ArrowRight,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import type { InboxEntry, ShareResponse } from './types';
import { StatusBadge, Skeleton, Breadcrumb } from '@/pages/panel/ui';

type Bucket = { key: string; label: string; events: TimelineEvent[] };

type TimelineEvent = {
  ts: number;
  kind: 'approve' | 'changes' | 'reject' | 'viewed' | 'created';
  entry: InboxEntry;
  response?: ShareResponse;
};

function buildBuckets(entries: InboxEntry[]): Bucket[] {
  const events: TimelineEvent[] = [];
  for (const e of entries) {
    for (const r of e.responses) {
      events.push({
        ts: Date.parse(r.respondedAt),
        kind:
          r.responseType === 'approve'
            ? 'approve'
            : r.responseType === 'reject'
              ? 'reject'
              : 'changes',
        entry: e,
        response: r,
      });
    }
    if (e.share.lastViewedAt) {
      events.push({ ts: Date.parse(e.share.lastViewedAt), kind: 'viewed', entry: e });
    } else {
      events.push({ ts: Date.parse(e.share.createdAt), kind: 'created', entry: e });
    }
  }
  events.sort((a, b) => b.ts - a.ts);

  const now = Date.now();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const yesterday = startOfDay.getTime() - 24 * 60 * 60 * 1000;
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

  const order = ['Heute', 'Gestern', 'Diese Woche', 'Älter'] as const;
  const groups: Record<(typeof order)[number], TimelineEvent[]> = {
    Heute: [],
    Gestern: [],
    'Diese Woche': [],
    Älter: [],
  };
  for (const ev of events) {
    if (ev.ts >= startOfDay.getTime()) groups['Heute'].push(ev);
    else if (ev.ts >= yesterday) groups['Gestern'].push(ev);
    else if (ev.ts >= weekAgo) groups['Diese Woche'].push(ev);
    else groups['Älter'].push(ev);
  }
  return order
    .filter((k) => groups[k].length > 0)
    .map((k) => ({ key: k, label: k, events: groups[k] }));
}

export default function FeedbackInbox() {
  const [entries, setEntries] = useState<InboxEntry[] | null>(null);
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setEntries(null);
    setBuckets([]);
    setError(null);
    try {
      const { entries: list } = await api.inbox.list();
      const filtered = list.filter((e) => e.project !== null);
      setEntries(filtered);
      // Compute time-relative buckets here so render stays pure.
      setBuckets(buildBuckets(filtered));
    } catch {
      setError('Inbox konnte nicht geladen werden.');
      toast.error('Inbox konnte nicht geladen werden.');
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Panel', to: '/panel' }, { label: 'Kunden-Feedback' }]} />

      <header className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary-50 border border-primary-100 dark:bg-primary-500/15 dark:border-primary-500/30">
          <Inbox className="w-5 h-5 text-primary-600 dark:text-primary-300" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Kunden-Feedback</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Aufrufe, Annahmen und Änderungswünsche aller geteilten Links.
          </p>
        </div>
      </header>

      {error && (
        <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-sm text-rose-700 dark:text-rose-300">
          <span className="inline-flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {error}
          </span>
          <button onClick={load} className="text-xs font-semibold underline hover:no-underline">
            Erneut laden
          </button>
        </div>
      )}

      {entries == null ? (
        <SkeletonTimeline />
      ) : entries.length === 0 ? (
        <Empty />
      ) : (
        <div className="relative pl-4 sm:pl-6">
          {/* The single timeline rail */}
          <div className="absolute left-1.5 sm:left-2.5 top-2 bottom-2 w-px bg-slate-200 dark:bg-slate-800" aria-hidden />
          <div className="space-y-8">
            {buckets.map((b) => (
              <section key={b.key}>
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 -ml-4 sm:-ml-6 pl-4 sm:pl-6">
                  {b.label}
                </h2>
                <ul className="space-y-3">
                  {b.events.map((ev, i) => (
                    <TimelineRow key={`${b.key}-${i}`} ev={ev} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TimelineRow({ ev }: { ev: TimelineEvent }) {
  const project = ev.entry.project;
  if (!project) return null;
  const share = ev.entry.share;

  const meta = describeEvent(ev);

  return (
    <li className="relative">
      {/* Dot */}
      <span
        className={clsx(
          'absolute -left-4 sm:-left-6 top-4 w-3 h-3 rounded-full ring-2 ring-white dark:ring-slate-950',
          meta.dotCls,
        )}
        aria-hidden
      />
      <article className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5">
        <header className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <Link
              to={`/panel/kalkulation/${project.id}`}
              className="inline-flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100 hover:text-primary-700 dark:hover:text-primary-300"
            >
              {project.name || 'Unbenanntes Projekt'}
              <ArrowRight className="w-3.5 h-3.5 opacity-60" />
            </Link>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {project.client || 'Ohne Auftraggeber'} ·{' '}
              <span className="font-mono">/{share.token.slice(0, 10)}…</span>
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {meta.badge && <StatusBadge kind={meta.badge} size="xs" />}
            {(() => {
              const rel = fmtRelative(new Date(ev.ts).toISOString());
              return rel ? (
                <time className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums whitespace-nowrap">
                  {rel}
                </time>
              ) : null;
            })()}
          </div>
        </header>

        <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
          <span className="font-medium">{meta.actor}</span>{' '}
          <span className="text-slate-500 dark:text-slate-400">{meta.verb}</span>
        </p>

        {ev.response?.payload.message && (
          <blockquote className="mt-3 border-l-2 border-slate-200 dark:border-slate-700 pl-3 text-sm text-slate-600 dark:text-slate-300 italic whitespace-pre-wrap">
            „{ev.response.payload.message}"
          </blockquote>
        )}

        {ev.response?.payload.changes && ev.response.payload.changes.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {ev.response.payload.changes.map((c, idx) => (
              <li
                key={idx}
                className="text-xs text-slate-600 dark:text-slate-300 pl-3 border-l-2 border-amber-200 dark:border-amber-800"
              >
                <strong className="text-slate-800 dark:text-slate-100">
                  {c.type === 'remove'
                    ? 'Streichen'
                    : c.type === 'modify'
                      ? 'Änderung'
                      : 'Frage'}
                </strong>
                {c.positionId !== 'general' && (
                  <span className="text-slate-400 dark:text-slate-500 font-mono ml-1.5">· {c.positionId.slice(0, 8)}</span>
                )}
                <p className="mt-0.5 text-slate-700 dark:text-slate-200">{c.text}</p>
              </li>
            ))}
          </ul>
        )}

        {ev.kind === 'viewed' && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <Eye className="w-3 h-3" /> {share.viewCount}× geöffnet
            {share.lastViewedAt && (
              <>
                <span className="opacity-50">·</span>
                <Calendar className="w-3 h-3" /> {fmtRelative(share.lastViewedAt)}
              </>
            )}
          </p>
        )}
      </article>
    </li>
  );
}

function describeEvent(ev: TimelineEvent): {
  actor: string;
  verb: string;
  badge: 'approved' | 'changes' | 'rejected' | 'viewed' | 'shared' | null;
  dotCls: string;
} {
  const r = ev.response;
  if (ev.kind === 'approve' && r) {
    return {
      actor: r.customerName || 'Kunde',
      verb: 'hat das Angebot angenommen.',
      badge: 'approved',
      dotCls: 'bg-emerald-500',
    };
  }
  if (ev.kind === 'reject' && r) {
    return {
      actor: r.customerName || 'Kunde',
      verb: 'hat das Angebot abgelehnt.',
      badge: 'rejected',
      dotCls: 'bg-rose-500',
    };
  }
  if (ev.kind === 'changes' && r) {
    const n = r.payload.changes?.length ?? 0;
    return {
      actor: r.customerName || 'Kunde',
      verb: n > 0 ? `hat ${n} Änderungswunsch${n === 1 ? '' : 'e'} eingereicht.` : 'hat eine Nachricht hinterlassen.',
      badge: 'changes',
      dotCls: 'bg-amber-500',
    };
  }
  if (ev.kind === 'viewed') {
    return {
      actor: 'Der Kunde',
      verb: 'hat den geteilten Link geöffnet.',
      badge: 'viewed',
      dotCls: 'bg-violet-500',
    };
  }
  return {
    actor: 'Sie',
    verb: 'haben einen neuen Link erstellt.',
    badge: 'shared',
    dotCls: 'bg-sky-500',
  };
}

function SkeletonTimeline() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-3.5 w-16" />
          </div>
          <Skeleton className="h-2.5 w-1/3" />
          <Skeleton className="h-2.5 w-3/4 mt-2" />
        </div>
      ))}
    </div>
  );
}

function Empty() {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center">
      <div className="inline-flex w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 items-center justify-center mb-3">
        <Inbox className="w-5 h-5 text-slate-400 dark:text-slate-500" />
      </div>
      <p className="text-base font-semibold text-slate-700 dark:text-slate-200">Noch keine Aktivität</p>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm mx-auto">
        Sobald Sie ein Angebot mit einem Kunden teilen und dieser den Link öffnet, erscheinen
        hier alle Aufrufe und Rückmeldungen.
      </p>
    </div>
  );
}

function fmtRelative(iso: string): string {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'gerade eben';
  if (minutes < 60) return `vor ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `vor ${days} Tag${days === 1 ? '' : 'en'}`;
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Suppress unused-icon lint warning for icons retained for future variants
void Check;
void MessageSquare;

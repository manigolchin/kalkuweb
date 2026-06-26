/**
 * Kunden-Feedback — professional master-detail inbox.
 *
 * Left: feedback threads (one per shared Angebot) collected into collapsible
 * COMPANY (Firma) groups — every offer for the same Bauunternehmer sits under
 * one header (avatar + name + offer count + unread badge) so the list stays
 * tidy even when a firm has several shares. Per thread: project, status,
 * unread ("neu") marker, change/comment counts; plus search/type filters.
 *
 * Right: the selected thread's full activity — approvals/changes/rejections
 * plus per-position comments — each change/comment resolved to WHICH position
 * (OZ + short text) so the calculator instantly sees what the customer touched.
 *
 * The Firma is resolved best-effort (project.bidder → the share's recipient
 * name → a responder's name → the Auftraggeber) so far fewer threads fall
 * back to the generic "Unbekannte Firma" bucket.
 *
 * Data: api.inbox.list() (see panel-api/src/routes/inbox.ts). Deep-link
 * /panel/feedback?oz=<OZ> auto-selects the thread containing that position.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Inbox,
  Eye,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Search,
  RefreshCw,
  ExternalLink,
  Building2,
  MessageSquareText,
  CheckCircle2,
  XCircle,
  PencilLine,
  Hash,
  Clock,
  ChevronRight,
  ChevronDown,
  SlidersHorizontal,
  RotateCcw,
  ListChecks,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import type { InboxEntry, InboxComment, InboxChangeRequest, ShareResponse } from './types';
import {
  FIELD_LABEL,
  FIELD_SHORT,
  DIRECTION_LABEL,
  formatChangeValue,
  rollupChangeRequests,
  formatSignedEUR,
} from './changeRequest';
import { formatEUR } from './calc';
import { Skeleton, Breadcrumb } from '@/pages/panel/ui';

type FilterId = 'all' | 'wuensche' | 'changes' | 'comments' | 'approved' | 'rejected' | 'viewed';

const INTENT_LABEL: Record<InboxComment['intent'], string> = {
  accept: 'Akzeptiert',
  change_menge: 'Menge ändern',
  change_fabrikat: 'Fabrikat ändern',
  negotiate_ep: 'EP verhandeln',
  other: 'Anmerkung',
};

const CHANGE_LABEL: Record<'modify' | 'remove' | 'comment', string> = {
  modify: 'Änderung',
  remove: 'Streichen',
  comment: 'Frage',
};

/* ── Avatar helpers — deterministic tint per company name ──────────── */
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

/**
 * Resolve WHICH FIRMA an offer belongs to, best-effort so the list rarely
 * shows the generic fallback:
 *   1. project.bidder        — the Bauunternehmer the calc was made for
 *   2. share recipient name  — whom the calculator addressed the share to
 *   3. a responder's name    — whoever signed an approval / change request
 *   4. project.client        — the Auftraggeber (last resort, not the bidder)
 */
function companyOf(entry: InboxEntry): string {
  const bidder = entry.project?.bidder?.trim();
  if (bidder) return bidder;
  const recipient = entry.share.settings.customerName?.trim();
  if (recipient) return recipient;
  const responder = entry.responses.find((r) => r.customerName?.trim())?.customerName?.trim();
  if (responder) return responder;
  const client = entry.project?.client?.trim();
  if (client) return client;
  return 'Unbekannte Firma';
}

/* ── Company grouping for the master list ──────────────────────────── */
type CompanyGroupData = {
  /** Stable map key — lowercased company name, or the unknown sentinel. */
  key: string;
  company: string;
  threads: InboxEntry[];
  /** Most-recent activity across the group's threads (sort key). */
  lastTs: number;
  /** How many of the group's threads have unread activity. */
  unread: number;
  isUnknown: boolean;
};

const UNKNOWN_GROUP_KEY = '__unknown__';

/** Bucket the (already recency-sorted) threads by Firma. Known companies are
 *  ordered by most-recent activity; the "Unbekannte Firma" bucket sinks last. */
function groupByCompany(
  threads: InboxEntry[],
  meta: Map<string, ThreadMeta>,
): CompanyGroupData[] {
  const map = new Map<string, CompanyGroupData>();
  for (const e of threads) {
    const company = companyOf(e);
    const isUnknown = company === 'Unbekannte Firma';
    const key = isUnknown ? UNKNOWN_GROUP_KEY : company.toLowerCase();
    let g = map.get(key);
    if (!g) {
      g = { key, company, threads: [], lastTs: 0, unread: 0, isUnknown };
      map.set(key, g);
    }
    g.threads.push(e);
    const tm = meta.get(e.share.id)!;
    if (tm.lastTs > g.lastTs) g.lastTs = tm.lastTs;
    if (tm.hasUnread) g.unread += 1;
  }
  return [...map.values()].sort((a, b) => {
    if (a.isUnknown !== b.isUnknown) return a.isUnknown ? 1 : -1;
    return b.lastTs - a.lastTs;
  });
}

/* ── Per-thread derived metadata ───────────────────────────────────── */
type ThreadMeta = {
  lastTs: number;
  changeCount: number;
  commentCount: number;
  status: 'approved' | 'rejected' | 'changes' | 'open';
  hasUnread: boolean;
  /** Round 12 — structured Änderungswünsche (total + still-open). */
  changeRequestCount: number;
  openChangeRequests: number;
};

function threadMeta(entry: InboxEntry, lastSeen: number): ThreadMeta {
  let changeCount = 0;
  let status: ThreadMeta['status'] = 'open';
  let lastTs = entry.share.lastViewedAt
    ? Date.parse(entry.share.lastViewedAt)
    : Date.parse(entry.share.createdAt);
  // The LATEST response (by respondedAt) decides the headline status — don't
  // rely on the array already being newest-first.
  let latestRespTs = -Infinity;
  for (const r of entry.responses) {
    const ts = Date.parse(r.respondedAt);
    if (ts > lastTs) lastTs = ts;
    changeCount += r.payload.changes?.length ?? 0;
    if (ts >= latestRespTs) {
      latestRespTs = ts;
      status =
        r.responseType === 'approve' ? 'approved' : r.responseType === 'reject' ? 'rejected' : 'changes';
    }
  }
  for (const cm of entry.comments) {
    const ts = Date.parse(cm.createdAt);
    if (ts > lastTs) lastTs = ts;
  }
  let changeRequestCount = 0;
  let openChangeRequests = 0;
  for (const cr of entry.changeRequests ?? []) {
    const ts = Date.parse(cr.createdAt);
    if (ts > lastTs) lastTs = ts;
    changeRequestCount += 1;
    if (!cr.resolvedAt) openChangeRequests += 1;
  }
  // A pending Änderungswunsch puts an otherwise-quiet thread into "Änderungen".
  if (changeRequestCount > 0 && status === 'open') status = 'changes';
  const hasUnread = lastTs > lastSeen;
  return {
    lastTs,
    changeCount,
    commentCount: entry.comments.length,
    status,
    hasUnread,
    changeRequestCount,
    openChangeRequests,
  };
}

/* ── Unified activity feed for the detail pane ─────────────────────── */
type FeedEvent =
  | { kind: 'response'; ts: number; response: ShareResponse }
  | { kind: 'comment'; ts: number; comment: InboxComment }
  | { kind: 'changeRequest'; ts: number; cr: InboxChangeRequest }
  | { kind: 'viewed'; ts: number }
  | { kind: 'created'; ts: number };

function buildFeed(entry: InboxEntry): FeedEvent[] {
  const events: FeedEvent[] = [];
  for (const r of entry.responses) events.push({ kind: 'response', ts: Date.parse(r.respondedAt), response: r });
  for (const cm of entry.comments) events.push({ kind: 'comment', ts: Date.parse(cm.createdAt), comment: cm });
  for (const cr of entry.changeRequests ?? [])
    events.push({ kind: 'changeRequest', ts: Date.parse(cr.createdAt), cr });
  if (entry.share.lastViewedAt) events.push({ kind: 'viewed', ts: Date.parse(entry.share.lastViewedAt) });
  events.push({ kind: 'created', ts: Date.parse(entry.share.createdAt) });
  return events.sort((a, b) => b.ts - a.ts);
}

/* ── "Gewünschte Änderungen" overview ──────────────────────────────────
 * A consolidated worklist of EVERYTHING the customer wants changed — at a
 * glance, without scrolling the chronological feed. Aggregates two sources:
 *   1. structured Änderungswünsche (changeRequests) — field + Ist→Wunsch diff
 *   2. free-text changes inside a "changes" response (payload.changes)
 * Each row resolves to WHICH position (OZ + Kurztext) so the calculator sees
 * the full to-do list. Open items first, position-wise, Gesamtangebot last. */
type OverviewItem = {
  key: string;
  scope: 'position' | 'global';
  oz: string | null;
  shortText: string | null;
  /** Field short label (e.g. "Menge") or the change type (e.g. "Streichen"). */
  label: string;
  /** Compact wish: "10 → 8", "Wunsch 950,00 €", "günstiger" — or '' for free-text. */
  wish: string;
  /** The customer's note / free-text, if any. */
  note: string | null;
  resolved: boolean;
};

/** "10,00 → 8,00" / "Wunsch 950,00 €" / "günstiger" for one change request. */
function wishLine(cr: InboxChangeRequest): string {
  const cur = cr.currentValue != null ? formatChangeValue(cr.currentValue, cr.unit) : null;
  const req = cr.requestedValue != null ? formatChangeValue(cr.requestedValue, cr.unit) : null;
  if (cur && req) return `${cur} → ${req}`;
  if (req) return `Wunsch ${req}`;
  return DIRECTION_LABEL[cr.direction];
}

function collectChangeItems(entry: InboxEntry): OverviewItem[] {
  const items: OverviewItem[] = [];
  for (const cr of entry.changeRequests ?? []) {
    items.push({
      key: `cr-${cr.id}`,
      scope: cr.scope === 'global' ? 'global' : 'position',
      oz: cr.scope === 'global' ? null : cr.positionOz ?? null,
      shortText: cr.shortText ?? null,
      label: FIELD_SHORT[cr.field],
      wish: wishLine(cr),
      note: cr.note?.trim() || null,
      resolved: !!cr.resolvedAt,
    });
  }
  for (const r of entry.responses) {
    (r.payload.changes ?? []).forEach((ch, i) => {
      items.push({
        key: `ch-${r.id}-${i}`,
        scope: ch.positionId === 'general' ? 'global' : 'position',
        oz: ch.oz ?? null,
        shortText: ch.shortText ?? null,
        label: CHANGE_LABEL[ch.type],
        wish: '',
        note: ch.text?.trim() || null,
        resolved: false,
      });
    });
  }
  const ozKey = (it: OverviewItem) => (it.scope === 'global' ? '￿' : it.oz ?? '￾');
  return items.sort((a, b) => {
    if (a.resolved !== b.resolved) return a.resolved ? 1 : -1;
    return ozKey(a).localeCompare(ozKey(b), undefined, { numeric: true });
  });
}

export default function FeedbackInbox() {
  const [entries, setEntries] = useState<InboxEntry[] | null>(null);
  const [lastSeen, setLastSeen] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterId>('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [searchParams, setSearchParams] = useSearchParams();
  const ozParam = searchParams.get('oz');
  const handledOz = useRef<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const { entries: list, viewerLastSeenAt } = await api.inbox.list();
      const filtered = list.filter((e) => e.project !== null);
      setEntries(filtered);
      setLastSeen(viewerLastSeenAt ? Date.parse(viewerLastSeenAt) : 0);
    } catch {
      setError('Inbox konnte nicht geladen werden.');
      toast.error('Inbox konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }

  // Round 12: mark a change request erledigt / re-open it. Optimistic; reverts
  // by reloading on failure.
  async function resolveChangeRequest(id: string, resolved: boolean) {
    setEntries((prev) =>
      prev
        ? prev.map((e) => ({
            ...e,
            changeRequests: (e.changeRequests ?? []).map((cr) =>
              cr.id === id
                ? { ...cr, resolvedAt: resolved ? new Date().toISOString() : null }
                : cr,
            ),
          }))
        : prev,
    );
    try {
      await api.inbox.resolveChangeRequest(id, resolved);
    } catch {
      toast.error('Konnte nicht gespeichert werden.');
      load();
    }
  }

  // Round 12: resolve every open change request of a thread in one click.
  async function resolveManyChangeRequests(ids: string[], resolved: boolean) {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    setEntries((prev) =>
      prev
        ? prev.map((e) => ({
            ...e,
            changeRequests: (e.changeRequests ?? []).map((cr) =>
              idSet.has(cr.id)
                ? { ...cr, resolvedAt: resolved ? new Date().toISOString() : null }
                : cr,
            ),
          }))
        : prev,
    );
    try {
      await Promise.all(ids.map((id) => api.inbox.resolveChangeRequest(id, resolved)));
      toast.success(resolved ? 'Alle Wünsche als erledigt markiert.' : 'Wieder geöffnet.');
    } catch {
      toast.error('Konnte nicht gespeichert werden.');
      load();
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Deep-link: if ?oz= is present, select the first thread that has a comment
  // or change request for that position. Re-fires when the oz param changes
  // (e.g. clicking a different position badge) and resets when it's cleared.
  useEffect(() => {
    if (!ozParam) {
      handledOz.current = null;
      return;
    }
    if (!entries || handledOz.current === ozParam) return;
    const hit = entries.find(
      (e) =>
        e.comments.some((c) => c.positionOz === ozParam) ||
        (e.changeRequests ?? []).some((cr) => cr.positionOz === ozParam) ||
        e.responses.some((r) => r.payload.changes?.some((ch) => ch.oz === ozParam)),
    );
    if (hit) setSelectedId(hit.share.id);
    handledOz.current = ozParam;
  }, [entries, ozParam]);

  const meta = useMemo(() => {
    const m = new Map<string, ThreadMeta>();
    for (const e of entries ?? []) m.set(e.share.id, threadMeta(e, lastSeen));
    return m;
  }, [entries, lastSeen]);

  const threads = useMemo(() => {
    if (!entries) return [];
    const q = search.trim().toLowerCase();
    return entries
      .filter((e) => {
        const tm = meta.get(e.share.id)!;
        if (unreadOnly && !tm.hasUnread) return false;
        if (filter === 'wuensche' && tm.changeRequestCount === 0) return false;
        if (filter === 'changes' && tm.changeCount === 0) return false;
        if (filter === 'comments' && tm.commentCount === 0) return false;
        if (filter === 'approved' && tm.status !== 'approved') return false;
        if (filter === 'rejected' && tm.status !== 'rejected') return false;
        if (
          filter === 'viewed' &&
          (e.responses.length > 0 || e.comments.length > 0 || (e.changeRequests?.length ?? 0) > 0)
        )
          return false;
        if (!q) return true;
        const hay = [
          companyOf(e),
          e.project?.name ?? '',
          e.project?.client ?? '',
          ...e.comments.map((c) => `${c.shortText ?? ''} ${c.text}`),
          ...(e.changeRequests ?? []).map((cr) => `${cr.shortText ?? ''} ${FIELD_LABEL[cr.field]} ${cr.note}`),
          ...e.responses.flatMap((r) => [
            r.customerName ?? '',
            r.payload.message ?? '',
            ...(r.payload.changes ?? []).map((ch) => `${ch.shortText ?? ''} ${ch.text}`),
          ]),
        ]
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => {
        const d = meta.get(b.share.id)!.lastTs - meta.get(a.share.id)!.lastTs;
        return d !== 0 ? d : a.share.id.localeCompare(b.share.id);
      });
  }, [entries, search, filter, unreadOnly, meta]);

  // Derive from the full entries list (not the filtered threads) so an open
  // thread isn't lost when the user changes the search/filter.
  const selected = useMemo(
    () => (entries ?? []).find((e) => e.share.id === selectedId) ?? null,
    [entries, selectedId],
  );

  const groups = useMemo(() => groupByCompany(threads, meta), [threads, meta]);

  function toggleGroup(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const totalUnread = useMemo(
    () => [...meta.values()].filter((m) => m.hasUnread).length,
    [meta],
  );

  const FILTERS: ReadonlyArray<{ id: FilterId; label: string }> = [
    { id: 'all', label: 'Alle' },
    { id: 'wuensche', label: 'Wünsche' },
    { id: 'changes', label: 'Änderungen' },
    { id: 'comments', label: 'Kommentare' },
    { id: 'approved', label: 'Angenommen' },
    { id: 'rejected', label: 'Abgelehnt' },
    { id: 'viewed', label: 'Nur Aufrufe' },
  ];

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Panel', to: '/panel' }, { label: 'Kunden-Feedback' }]} />

      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-primary-100 bg-primary-50 p-2.5 dark:border-primary-500/30 dark:bg-primary-500/15">
            <Inbox className="h-5 w-5 text-primary-600 dark:text-primary-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Kunden-Feedback</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Rückmeldungen aller geteilten Angebote — nach Firma gruppiert.
              {totalUnread > 0 && (
                <span className="ml-1 font-medium text-primary-600 dark:text-primary-300">
                  {totalUnread} neu
                </span>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 self-start rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <RefreshCw className={clsx('h-3.5 w-3.5', loading && 'animate-spin')} />
          Aktualisieren
        </button>
      </header>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          <span className="inline-flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> {error}
          </span>
          <button onClick={load} className="text-xs font-semibold underline hover:no-underline">
            Erneut laden
          </button>
        </div>
      )}

      {loading && entries == null ? (
        <SkeletonInbox />
      ) : entries && entries.length === 0 ? (
        <Empty />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(320px,380px)_1fr]">
          {/* ── Master list ── */}
          <div className={clsx('flex flex-col gap-3', selected && 'hidden lg:flex')}>
            <div className="space-y-2.5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Firma, Projekt oder Position suchen …"
                  className="input w-full pl-9"
                  aria-label="Feedback durchsuchen"
                />
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    aria-pressed={filter === f.id}
                    className={clsx(
                      'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                      filter === f.id
                        ? 'bg-primary-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
                    )}
                  >
                    {f.label}
                  </button>
                ))}
                <button
                  onClick={() => setUnreadOnly((v) => !v)}
                  aria-pressed={unreadOnly}
                  className={clsx(
                    'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                    unreadOnly
                      ? 'bg-primary-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
                  )}
                >
                  Nur neu
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-400 dark:text-slate-500">
              {threads.length} {threads.length === 1 ? 'Eintrag' : 'Einträge'}
              {groups.length > 0 && (
                <> · {groups.length} {groups.length === 1 ? 'Firma' : 'Firmen'}</>
              )}
            </p>

            <div className="space-y-2.5 overflow-y-auto pr-0.5 lg:max-h-[calc(100vh-18rem)]">
              {groups.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400 dark:border-slate-800">
                  Keine Rückmeldung passt zu Suche und Filter.
                </div>
              ) : (
                groups.map((g) => (
                  <CompanyGroup
                    key={g.key}
                    group={g}
                    collapsed={collapsed.has(g.key)}
                    onToggle={() => toggleGroup(g.key)}
                    meta={meta}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                  />
                ))
              )}
            </div>
          </div>

          {/* ── Detail ── */}
          <div className={clsx(!selected && 'hidden lg:block')}>
            {selected ? (
              <ThreadDetail
                entry={selected}
                highlightOz={ozParam}
                lastSeen={lastSeen}
                onResolveChangeRequest={resolveChangeRequest}
                onResolveAllChangeRequests={resolveManyChangeRequests}
                onBack={() => {
                  setSelectedId(null);
                  if (ozParam) {
                    searchParams.delete('oz');
                    setSearchParams(searchParams, { replace: true });
                  }
                }}
              />
            ) : (
              <div className="hidden h-full min-h-[20rem] place-items-center rounded-2xl border border-dashed border-slate-200 text-center dark:border-slate-800 lg:grid">
                <div className="text-slate-400 dark:text-slate-500">
                  <MessageSquareText className="mx-auto mb-2 h-7 w-7" />
                  <p className="text-sm">Wählen Sie links eine Rückmeldung.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────── */

/** One Firma section: a header (avatar + name + offer count + unread badge)
 *  that collapses, over the firm's threads. Company is shown ONCE here so the
 *  thread rows below can stay focused on the project + its status. */
function CompanyGroup({
  group,
  collapsed,
  onToggle,
  meta,
  selectedId,
  onSelect,
}: {
  group: CompanyGroupData;
  collapsed: boolean;
  onToggle: () => void;
  meta: Map<string, ThreadMeta>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
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
            {group.threads.length} {group.threads.length === 1 ? 'Angebot' : 'Angebote'}
          </span>
        </span>
        {group.unread > 0 && (
          <span className="inline-flex shrink-0 items-center rounded-full bg-primary-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-600 dark:bg-primary-500/15 dark:text-primary-300">
            {group.unread} neu
          </span>
        )}
        <ChevronDown
          className={clsx('h-4 w-4 shrink-0 text-slate-400 transition-transform', collapsed && '-rotate-90')}
        />
      </button>
      {!collapsed && (
        <ul className="space-y-1.5 border-t border-slate-100 p-2 dark:border-slate-800/80">
          {group.threads.map((e) => (
            <ThreadListItem
              key={e.share.id}
              entry={e}
              meta={meta.get(e.share.id)!}
              selected={e.share.id === selectedId}
              onSelect={() => onSelect(e.share.id)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function ThreadListItem({
  entry,
  meta,
  selected,
  onSelect,
}: {
  entry: InboxEntry;
  meta: ThreadMeta;
  selected: boolean;
  onSelect: () => void;
}) {
  const summary = buildSnippet(entry);
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected}
        className={clsx(
          'w-full rounded-xl border px-3 py-2.5 text-left transition-colors',
          selected
            ? 'border-primary-300 bg-primary-50 ring-1 ring-primary-300 dark:border-primary-500/50 dark:bg-primary-500/10 dark:ring-primary-500/40'
            : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/50',
        )}
      >
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                {entry.project?.name || 'Unbenanntes Projekt'}
              </span>
              {meta.hasUnread && (
                <span className="h-2 w-2 shrink-0 rounded-full bg-primary-500" title="Neu seit Ihrem letzten Besuch" />
              )}
              <time className="ml-auto shrink-0 text-[11px] tabular-nums text-slate-400 dark:text-slate-500">
                {fmtRelative(new Date(meta.lastTs).toISOString())}
              </time>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <StatusPill status={meta.status} />
              {meta.changeCount > 0 && (
                <Chip icon={<PencilLine className="h-3 w-3" />}>{meta.changeCount} Änderung{meta.changeCount === 1 ? '' : 'en'}</Chip>
              )}
              {meta.commentCount > 0 && (
                <Chip icon={<MessageSquareText className="h-3 w-3" />}>{meta.commentCount} Kommentar{meta.commentCount === 1 ? '' : 'e'}</Chip>
              )}
              {meta.changeRequestCount > 0 && (
                <Chip icon={<SlidersHorizontal className="h-3 w-3" />}>
                  {meta.changeRequestCount} {meta.changeRequestCount === 1 ? 'Wunsch' : 'Wünsche'}
                </Chip>
              )}
            </div>
            {summary && <p className="mt-1.5 line-clamp-1 text-xs italic text-slate-400 dark:text-slate-500">{summary}</p>}
          </div>
          <ChevronRight className="mt-1 hidden h-4 w-4 shrink-0 text-slate-300 lg:block dark:text-slate-600" />
        </div>
      </button>
    </li>
  );
}

function buildSnippet(entry: InboxEntry): string {
  const msg = entry.responses.find((r) => r.payload.message)?.payload.message;
  if (msg) return msg;
  const firstChange = entry.responses.flatMap((r) => r.payload.changes ?? [])[0];
  if (firstChange) return firstChange.text;
  if (entry.comments[0]) return entry.comments[0].text;
  return '';
}

function ThreadDetail({
  entry,
  highlightOz,
  lastSeen,
  onResolveChangeRequest,
  onResolveAllChangeRequests,
  onBack,
}: {
  entry: InboxEntry;
  highlightOz: string | null;
  lastSeen: number;
  onResolveChangeRequest: (id: string, resolved: boolean) => void;
  onResolveAllChangeRequests: (ids: string[], resolved: boolean) => void;
  onBack: () => void;
}) {
  const company = companyOf(entry);
  const project = entry.project!;
  const feed = useMemo(() => buildFeed(entry), [entry]);
  const changeReqs = entry.changeRequests ?? [];
  const overview = useMemo(() => collectChangeItems(entry), [entry]);
  // "Echte" Rückmeldung = Annahme/Ablehnung, Kommentar oder Änderungswunsch.
  // Reine Aufrufe (nur geöffnet) zählen NICHT — dann ist der Feed leer und der
  // Hinweis unten macht klar, dass noch nichts vorliegt (statt eines Eindrucks,
  // die Anzeige sei defekt).
  const hasFeedback =
    entry.responses.length > 0 || entry.comments.length > 0 || changeReqs.length > 0;
  const openCrIds = changeReqs.filter((cr) => !cr.resolvedAt).map((cr) => cr.id);
  const rollup = rollupChangeRequests(changeReqs);
  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/share/${entry.share.token}`;

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 lg:hidden dark:hover:text-slate-100"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Zurück zur Liste
      </button>

      {/* Company / project header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className={clsx('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold', tintFor(company))}
          >
            {initials(company)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
              <h2 className="truncate text-lg font-bold text-slate-900 dark:text-slate-100">{company}</h2>
            </div>
            <Link
              to={`/panel/kalkulation/${project.id}`}
              className="mt-0.5 inline-flex items-center gap-1.5 text-sm font-medium text-primary-700 hover:underline dark:text-primary-300"
            >
              {project.name || 'Unbenanntes Projekt'}
              <ArrowRight className="h-3.5 w-3.5 opacity-60" />
            </Link>
            <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              {project.client && (
                <div>
                  <dt className="inline font-medium text-slate-400 dark:text-slate-500">Auftraggeber: </dt>
                  <dd className="inline text-slate-600 dark:text-slate-300">{project.client}</dd>
                </div>
              )}
              <div className="inline-flex items-center gap-1">
                <Eye className="h-3 w-3" /> {entry.share.viewCount}× aufgerufen
              </div>
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-mono text-slate-500 hover:text-primary-600 hover:underline dark:text-slate-400"
              >
                /{entry.share.token.slice(0, 10)}… <ExternalLink className="h-3 w-3" />
              </a>
            </dl>
          </div>
        </div>
      </div>

      {/* Round 12: Änderungswunsch summary + bulk resolve */}
      {changeReqs.length > 0 && (
        <div
          data-testid="cr-summary"
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary-200 bg-primary-50/60 px-4 py-2.5 dark:border-primary-500/30 dark:bg-primary-500/10"
        >
          <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-medium text-primary-900 dark:text-primary-100">
            <SlidersHorizontal className="h-4 w-4" />
            {changeReqs.length} {changeReqs.length === 1 ? 'Änderungswunsch' : 'Änderungswünsche'}
            {openCrIds.length > 0 ? (
              <span className="text-primary-700 dark:text-primary-300">· {openCrIds.length} offen</span>
            ) : (
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> alle erledigt
              </span>
            )}
          </span>
          {openCrIds.length > 0 && (
            <button
              type="button"
              data-testid="cr-resolve-all"
              onClick={() => onResolveAllChangeRequests(openCrIds, true)}
              className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-white px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:bg-slate-900 dark:text-emerald-300"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Alle erledigt
            </button>
          )}

          {/* Negotiation roll-up — what the customer wants financially. */}
          {(rollup.endbetragDelta != null || rollup.positionsDelta != null) && (
            <div
              data-testid="cr-rollup"
              className="mt-1 flex w-full flex-wrap items-center gap-x-5 gap-y-1 border-t border-primary-200/70 pt-1.5 text-xs dark:border-primary-500/20"
            >
              {rollup.endbetragDelta != null && (
                <span className="text-primary-900 dark:text-primary-100">
                  Endbetrag-Wunsch:{' '}
                  <span className="tabular-nums font-semibold">{formatEUR(rollup.endbetragRequested!)}</span>{' '}
                  <span className="tabular-nums font-medium text-slate-500 dark:text-slate-400">
                    ({formatSignedEUR(rollup.endbetragDelta)})
                  </span>
                </span>
              )}
              {rollup.positionsDelta != null && (
                <span className="text-primary-900 dark:text-primary-100">
                  Positionswünsche:{' '}
                  <span className="tabular-nums font-semibold">{formatSignedEUR(rollup.positionsDelta)}</span>
                  <span className="text-slate-400 dark:text-slate-500"> (Richtwert)</span>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Überblick: WAS der Kunde geändert haben möchte (konsolidierte Liste). */}
      {overview.length > 0 && <ChangeOverview items={overview} />}

      {/* Kunde hat nur geöffnet, aber (noch) nichts zurückgemeldet. */}
      {!hasFeedback && (
        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3.5 dark:border-slate-800 dark:bg-slate-800/30">
          <Eye className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
          <div className="min-w-0 text-sm">
            <p className="font-medium text-slate-700 dark:text-slate-200">
              Noch keine Rückmeldung
            </p>
            <p className="mt-0.5 text-slate-500 dark:text-slate-400">
              {entry.share.viewCount > 0
                ? 'Der Kunde hat das Angebot bisher nur geöffnet. Sobald er es annimmt, ablehnt oder eine Position kommentiert, erscheint es hier — mit genauer Position und gewünschter Änderung.'
                : 'Das Angebot wurde noch nicht geöffnet. Sobald der Kunde den Link aufruft und reagiert, erscheint die Rückmeldung hier.'}
            </p>
          </div>
        </div>
      )}

      {/* Activity feed */}
      <div className="space-y-3">
        {feed.map((ev, i) => (
          <FeedCard
            key={i}
            ev={ev}
            highlightOz={highlightOz}
            isNew={ev.ts > lastSeen}
            onResolveChangeRequest={onResolveChangeRequest}
          />
        ))}
      </div>
    </div>
  );
}

/** Consolidated "Gewünschte Änderungen" — the customer's whole change worklist
 *  in one compact, scannable list (position · field · Ist→Wunsch · note). */
function ChangeOverview({ items }: { items: OverviewItem[] }) {
  const open = items.filter((it) => !it.resolved).length;
  return (
    <section
      data-testid="change-overview"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
        <ListChecks className="h-4 w-4 text-primary-600 dark:text-primary-300" />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Gewünschte Änderungen
        </h3>
        <span className="inline-flex items-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {items.length}
        </span>
        {open > 0 && open < items.length && (
          <span className="text-xs text-slate-400 dark:text-slate-500">· {open} offen</span>
        )}
      </div>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {items.map((it) => (
          <li
            key={it.key}
            className={clsx(
              'flex items-start gap-3 px-4 py-2.5',
              it.resolved && 'opacity-55',
            )}
          >
            <span className="mt-0.5 shrink-0">
              {it.scope === 'global' ? (
                <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  Gesamt
                </span>
              ) : it.oz ? (
                <span className="inline-flex items-center rounded bg-primary-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-primary-700 dark:bg-primary-500/15 dark:text-primary-300">
                  {it.oz}
                </span>
              ) : (
                <span className="inline-flex items-center font-mono text-[11px] text-slate-400">—</span>
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="inline-flex items-center rounded-md bg-primary-50 px-1.5 py-0.5 text-[11px] font-semibold text-primary-700 ring-1 ring-inset ring-primary-200 dark:bg-primary-500/15 dark:text-primary-300 dark:ring-primary-500/30">
                  {it.label}
                </span>
                {it.wish && (
                  <span className="tabular-nums text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {it.wish}
                  </span>
                )}
                {it.shortText && (
                  <span className="truncate text-xs text-slate-500 dark:text-slate-400">{it.shortText}</span>
                )}
                {it.resolved && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" /> erledigt
                  </span>
                )}
              </div>
              {it.note && (
                <p className="mt-0.5 line-clamp-2 whitespace-pre-wrap text-xs text-slate-500 dark:text-slate-400">
                  {it.note}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function FeedCard({
  ev,
  highlightOz,
  isNew,
  onResolveChangeRequest,
}: {
  ev: FeedEvent;
  highlightOz: string | null;
  isNew: boolean;
  onResolveChangeRequest: (id: string, resolved: boolean) => void;
}) {
  if (ev.kind === 'changeRequest') {
    return (
      <ChangeRequestCard
        cr={ev.cr}
        isNew={isNew}
        highlightOz={highlightOz}
        onResolve={onResolveChangeRequest}
      />
    );
  }
  if (ev.kind === 'created') {
    return (
      <Meta>
        <Clock className="h-3.5 w-3.5" /> Link erstellt · {fmtRelative(new Date(ev.ts).toISOString())}
      </Meta>
    );
  }
  if (ev.kind === 'viewed') {
    return (
      <Meta>
        <Eye className="h-3.5 w-3.5 text-violet-500" /> Vom Kunden geöffnet · {fmtRelative(new Date(ev.ts).toISOString())}
      </Meta>
    );
  }
  if (ev.kind === 'comment') {
    const c = ev.comment;
    return (
      <article
        className={clsx(
          'rounded-xl border bg-white p-4 dark:bg-slate-900',
          highlightOz && c.positionOz === highlightOz
            ? 'border-primary-300 ring-1 ring-primary-300 dark:border-primary-500/50'
            : 'border-slate-200 dark:border-slate-800',
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <PositionRef oz={c.positionOz} shortText={c.shortText} />
          <div className="flex items-center gap-1.5">
            {isNew && <NewDot />}
            <time className="text-[11px] text-slate-400 dark:text-slate-500">{fmtRelative(new Date(ev.ts).toISOString())}</time>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-800">
            {INTENT_LABEL[c.intent]}
          </span>
          {c.authorName && <span className="text-xs text-slate-500 dark:text-slate-400">{c.authorName}</span>}
          {c.resolvedAt && (
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" /> erledigt
            </span>
          )}
        </div>
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{c.text}</p>
      </article>
    );
  }
  // response
  const r = ev.response;
  const tone =
    r.responseType === 'approve'
      ? { icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />, label: 'Angebot angenommen', cls: 'border-emerald-200 dark:border-emerald-900' }
      : r.responseType === 'reject'
        ? { icon: <XCircle className="h-4 w-4 text-rose-600" />, label: 'Angebot abgelehnt', cls: 'border-rose-200 dark:border-rose-900' }
        : { icon: <PencilLine className="h-4 w-4 text-amber-600" />, label: 'Änderungswünsche', cls: 'border-amber-200 dark:border-amber-900' };
  return (
    <article className={clsx('rounded-xl border-l-4 bg-white p-4 dark:bg-slate-900', tone.cls, 'border border-slate-200 dark:border-slate-800')}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {tone.icon}
          <span className="font-semibold text-slate-900 dark:text-slate-100">{tone.label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {isNew && <NewDot />}
          <time className="text-[11px] text-slate-400 dark:text-slate-500">{fmtRelative(new Date(ev.ts).toISOString())}</time>
        </div>
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        von {r.customerName || 'Kunde'}
        {r.customerEmail && <span className="text-slate-400 dark:text-slate-500"> · {r.customerEmail}</span>}
      </p>
      {r.payload.message && (
        <blockquote className="mt-2.5 whitespace-pre-wrap border-l-2 border-slate-200 pl-3 text-sm italic text-slate-600 dark:border-slate-700 dark:text-slate-300">
          „{r.payload.message}"
        </blockquote>
      )}
      {r.payload.changes && r.payload.changes.length > 0 && (
        <div className="mt-3 space-y-2">
          {r.payload.changes.map((ch, idx) => (
            <div
              key={idx}
              className={clsx(
                'rounded-lg border bg-slate-50 p-2.5 dark:bg-slate-800/40',
                highlightOz && ch.oz === highlightOz
                  ? 'border-primary-300 dark:border-primary-500/50'
                  : 'border-slate-200 dark:border-slate-800',
              )}
            >
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded bg-slate-200 px-1.5 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                  {CHANGE_LABEL[ch.type]}
                </span>
                {ch.positionId !== 'general' && <PositionRef oz={ch.oz} shortText={ch.shortText} fallbackId={ch.positionId} />}
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{ch.text}</p>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

/** Round 12: one structured Änderungswunsch — WHERE (position or Gesamtangebot),
 *  WHAT (field), the Ist → Wunsch diff, the note, and an "erledigt" toggle. */
function ChangeRequestCard({
  cr,
  isNew,
  highlightOz,
  onResolve,
}: {
  cr: InboxChangeRequest;
  isNew: boolean;
  highlightOz: string | null;
  onResolve: (id: string, resolved: boolean) => void;
}) {
  const resolved = !!cr.resolvedAt;
  const isGlobal = cr.scope === 'global';
  const highlighted = !isGlobal && !!highlightOz && cr.positionOz === highlightOz;
  return (
    <article
      data-testid="change-request-card"
      className={clsx(
        'rounded-xl border bg-white p-4 dark:bg-slate-900',
        highlighted
          ? 'border-primary-300 ring-1 ring-primary-300 dark:border-primary-500/50'
          : 'border-slate-200 dark:border-slate-800',
        resolved && 'opacity-70',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        {isGlobal ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-200">
            <SlidersHorizontal className="h-3.5 w-3.5 text-primary-500" /> Gesamtangebot
          </span>
        ) : (
          <PositionRef oz={cr.positionOz} shortText={cr.shortText} />
        )}
        <div className="flex items-center gap-1.5">
          {isNew && !resolved && <NewDot />}
          <time className="text-[11px] text-slate-400 dark:text-slate-500">{fmtRelative(cr.createdAt)}</time>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-md bg-primary-50 px-1.5 py-0.5 text-[11px] font-semibold text-primary-700 ring-1 ring-inset ring-primary-200 dark:bg-primary-500/15 dark:text-primary-300 dark:ring-primary-500/30">
          {FIELD_LABEL[cr.field]}
        </span>
        <WunschDiff cr={cr} />
        {cr.authorName && <span className="text-xs text-slate-500 dark:text-slate-400">{cr.authorName}</span>}
      </div>

      {cr.note && (
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{cr.note}</p>
      )}

      <div className="mt-3 flex items-center justify-end">
        {resolved ? (
          <button
            type="button"
            onClick={() => onResolve(cr.id, false)}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <RotateCcw className="h-3 w-3" /> Wieder öffnen
          </button>
        ) : (
          <button
            type="button"
            data-testid="cr-resolve"
            onClick={() => onResolve(cr.id, true)}
            className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
          >
            <CheckCircle2 className="h-3 w-3" /> Als erledigt markieren
          </button>
        )}
      </div>
    </article>
  );
}

/** "Ist 1.071,54 € → Wunsch 950,00 €" — or just a direction when no value. */
function WunschDiff({ cr }: { cr: InboxChangeRequest }) {
  const dirColor =
    cr.direction === 'lower'
      ? 'text-emerald-700 dark:text-emerald-300'
      : cr.direction === 'higher'
        ? 'text-amber-700 dark:text-amber-300'
        : 'text-slate-700 dark:text-slate-200';
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 text-xs">
      {cr.currentValue != null && (
        <>
          <span className="text-slate-400 dark:text-slate-500">Ist</span>
          <span className="tabular-nums font-medium text-slate-500 dark:text-slate-400">
            {formatChangeValue(cr.currentValue, cr.unit)}
          </span>
        </>
      )}
      <ArrowRight className="h-3 w-3 text-slate-400" />
      <span className="text-slate-400 dark:text-slate-500">Wunsch</span>
      {cr.requestedValue != null ? (
        <span className={clsx('tabular-nums font-bold', dirColor)}>
          {formatChangeValue(cr.requestedValue, cr.unit)}
        </span>
      ) : (
        <span className={clsx('font-semibold', dirColor)}>{DIRECTION_LABEL[cr.direction]}</span>
      )}
    </span>
  );
}

/** "WHICH part" — the position OZ + its short text. */
function PositionRef({
  oz,
  shortText,
  fallbackId,
}: {
  oz?: string | null;
  shortText?: string | null;
  fallbackId?: string;
}) {
  if (!oz && !shortText) {
    return fallbackId ? (
      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-400">
        <Hash className="h-3 w-3" />
        {fallbackId.slice(0, 8)}
      </span>
    ) : (
      <span className="text-xs text-slate-400">Gesamtes Angebot</span>
    );
  }
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-xs">
      {oz && (
        <span className="shrink-0 rounded bg-primary-50 px-1.5 py-0.5 font-mono font-semibold text-primary-700 dark:bg-primary-500/15 dark:text-primary-300">
          {oz}
        </span>
      )}
      {shortText && <span className="truncate font-medium text-slate-700 dark:text-slate-200">{shortText}</span>}
    </span>
  );
}

function StatusPill({ status }: { status: ThreadMeta['status'] }) {
  const map = {
    approved: { label: 'Angenommen', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:ring-emerald-800' },
    rejected: { label: 'Abgelehnt', cls: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/30 dark:text-rose-200 dark:ring-rose-800' },
    changes: { label: 'Änderungen', cls: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-800' },
    open: { label: 'Offen', cls: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700' },
  }[status];
  return <span className={clsx('inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset', map.cls)}>{map.label}</span>;
}

function Chip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
      {icon}
      {children}
    </span>
  );
}

function NewDot() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-600 dark:bg-primary-500/15 dark:text-primary-300">
      neu
    </span>
  );
}

function Meta({ children }: { children: React.ReactNode }) {
  return (
    <p className="inline-flex items-center gap-1.5 pl-1 text-[11px] text-slate-400 dark:text-slate-500">{children}</p>
  );
}

function SkeletonInbox() {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(320px,380px)_1fr]">
      <div className="space-y-2">
        <Skeleton className="h-9 w-full" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
            <div className="flex gap-3">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-2.5 w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="hidden rounded-2xl border border-slate-200 p-5 lg:block dark:border-slate-800">
        <Skeleton className="h-11 w-1/2" />
      </div>
    </div>
  );
}

function Empty() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
        <Inbox className="h-5 w-5 text-slate-400 dark:text-slate-500" />
      </div>
      <p className="text-base font-semibold text-slate-700 dark:text-slate-200">Noch keine Aktivität</p>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-500 dark:text-slate-400">
        Sobald Sie ein Angebot mit einer Firma teilen und diese den Link öffnet, erscheinen hier
        alle Aufrufe, Annahmen und Änderungswünsche.
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

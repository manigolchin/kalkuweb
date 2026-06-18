/**
 * Posteingang — the panel's cross-company "Mother-Inbox".
 *
 * A 3-pane webmail client (companies · email list · reading pane) over the
 * supplier emails that preisanfrage has already fetched (IMAP) and
 * AI-classified. READ-ONLY: write-actions (save-to-SharePoint, re-classify)
 * stay in preisanfrage — the reading pane links out for those. preisanfrage's
 * own Posteingang is one-company-at-a-time; this is the one place that shows
 * every firma's mailbox at once.
 *
 * Data: api.posteingang.* → panel-api → preisanfrage (admin service token).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Mail,
  Paperclip,
  Search,
  Building2,
  ExternalLink,
  AlertTriangle,
  Inbox,
  ChevronLeft,
  RefreshCw,
  CornerUpLeft,
  CheckCircle2,
  FolderOpen,
  PlugZap,
  Send,
  X,
  Forward,
  PenSquare,
  Star,
  Archive,
  ArchiveRestore,
  CheckCheck,
  Trash2,
  FileEdit,
  Tag,
  Plus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  api,
  ApiError,
  type PosteingangOverview,
  type PosteingangCompany,
  type PosteingangEmail,
} from '@/lib/api';

/* ─── helpers ──────────────────────────────────────────────────────────── */

type ClassFilter = 'all' | 'angebot' | 'rueckfrage' | 'absage' | 'unklar';
type ComposerMode = 'reply' | 'forward' | 'new';
type EmailState = { read: boolean; starred: boolean; archived: boolean; deleted: boolean; labels: string[] };
const EMPTY_STATE: EmailState = { read: false, starred: false, archived: false, deleted: false, labels: [] };
type MailView = 'inbox' | 'sent' | 'drafts' | 'archived' | 'trash';
type DraftEmail = {
  id: string;
  kind: 'reply' | 'compose' | 'forward';
  to: string;
  subject: string;
  body: string;
  inReplyToEmailId: number | null;
  updatedAt: string;
};
/** Deterministic chip colour per label name. */
const LABEL_COLORS = [
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
];
function labelColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return LABEL_COLORS[h % LABEL_COLORS.length];
}
type SentEmail = {
  id: string;
  kind: 'reply' | 'compose' | 'forward';
  to: string;
  subject: string;
  body: string;
  inReplyToEmailId: number | null;
  sentAt: string;
};
const VIEW_LABELS: Record<MailView, string> = {
  inbox: 'Posteingang',
  sent: 'Gesendet',
  drafts: 'Entwürfe',
  archived: 'Archiv',
  trash: 'Papierkorb',
};

const CLASS_FILTERS: { key: ClassFilter; label: string }[] = [
  { key: 'all', label: 'Alle' },
  { key: 'angebot', label: 'Angebote' },
  { key: 'rueckfrage', label: 'Rückfragen' },
  { key: 'absage', label: 'Absagen' },
  { key: 'unklar', label: 'Unklar' },
];

function classMeta(c: string | null): { label: string; badge: string; dot: string } {
  switch (c) {
    case 'angebot':
      return { label: 'Angebot', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200', dot: 'bg-emerald-500' };
    case 'rueckfrage':
      return { label: 'Rückfrage', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200', dot: 'bg-amber-500' };
    case 'absage':
      return { label: 'Absage', badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200', dot: 'bg-rose-500' };
    default:
      return { label: 'Unklar', badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300', dot: 'bg-slate-400' };
  }
}

const AVATAR_PALETTE = [
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
];
function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function relDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const min = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (min < 1) return 'gerade eben';
  if (min < 60) return `vor ${min} Min`;
  const sameDay = now.toDateString() === d.toDateString();
  if (sameDay) return `vor ${Math.floor(min / 60)} Std`;
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (yest.toDateString() === d.toDateString()) return 'Gestern';
  const sameYear = now.getFullYear() === d.getFullYear();
  return d.toLocaleDateString('de-DE', sameYear ? { day: '2-digit', month: '2-digit' } : { day: '2-digit', month: '2-digit', year: '2-digit' });
}
function fullDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('de-DE', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function formatBytes(n: number | null): string {
  if (!n || n <= 0) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
function snippet(body: string | null): string {
  if (!body) return '';
  const line = body.split('\n').map((l) => l.trim()).find((l) => l.length > 0) ?? '';
  return line.length > 140 ? `${line.slice(0, 140)}…` : line;
}
/** SSO deep-link into preisanfrage's Posteingang for this company — where the
 *  write-actions (save-to-SharePoint, re-classify) live. */
function ssoHref(companyId: number): string {
  return `/api/panel/sso/preisanfrage?next=${encodeURIComponent(`/posteingang?company=${companyId}`)}`;
}

/* ─── component ────────────────────────────────────────────────────────── */

export default function Posteingang() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [overview, setOverview] = useState<PosteingangOverview | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  const [selectedCompany, setSelectedCompany] = useState<number | null>(() => {
    const p = Number(searchParams.get('company'));
    return Number.isInteger(p) && p > 0 ? p : null;
  });
  const [emails, setEmails] = useState<PosteingangEmail[] | null>(null);
  const [emailsError, setEmailsError] = useState<string | null>(null);
  const [loadingEmails, setLoadingEmails] = useState(false);

  const [selectedEmailId, setSelectedEmailId] = useState<number | null>(null);
  const [classFilter, setClassFilter] = useState<ClassFilter>('all');
  const [query, setQuery] = useState('');
  const [companyQuery, setCompanyQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [polling, setPolling] = useState(false);
  const [composer, setComposer] = useState<{
    mode: ComposerMode;
    email: PosteingangEmail | null;
    draftId?: string;
    initialTo?: string;
    initialSubject?: string;
    initialBody?: string;
  } | null>(null);
  // Panel-local triage flags (read/starred/archived/deleted), keyed by email id.
  const [stateMap, setStateMap] = useState<Record<number, EmailState>>({});
  const [view, setView] = useState<MailView>('inbox');
  const [sentList, setSentList] = useState<SentEmail[] | null>(null);
  const [loadingSent, setLoadingSent] = useState(false);
  const [selectedSentId, setSelectedSentId] = useState<string | null>(null);
  const [draftList, setDraftList] = useState<DraftEmail[] | null>(null);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [labelFilter, setLabelFilter] = useState<string | null>(null);

  // Master-detail navigation on < lg. On lg the three panes show side by side.
  const [mobilePane, setMobilePane] = useState<'companies' | 'list' | 'reading'>('companies');

  const emState = useCallback((id: number): EmailState => stateMap[id] ?? EMPTY_STATE, [stateMap]);

  const loadOverview = useCallback(async () => {
    setLoadingOverview(true);
    setOverviewError(null);
    try {
      const res = await api.posteingang.overview();
      setOverview(res);
      // Pick a company: the URL one if it has activity, else the first row.
      setSelectedCompany((cur) => {
        if (cur && res.companies.some((co) => co.id === cur)) return cur;
        return res.companies[0]?.id ?? null;
      });
    } catch (e) {
      setOverviewError(e instanceof ApiError ? humanError(e) : 'Posteingang konnte nicht geladen werden.');
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  // Load the selected company's emails.
  const loadEmails = useCallback(async (companyId: number) => {
    setLoadingEmails(true);
    setEmailsError(null);
    try {
      const [res, st] = await Promise.all([
        api.posteingang.emails(companyId, { limit: 100 }),
        // Triage flags are a nice-to-have overlay — never let them break the inbox.
        api.posteingang.state(companyId).catch(() => ({ state: {} as Record<number, EmailState> })),
      ]);
      setEmails(res.emails);
      setStateMap(st.state ?? {});
      setSelectedEmailId(res.emails[0]?.id ?? null);
    } catch (e) {
      setEmails([]);
      setStateMap({});
      setSelectedEmailId(null);
      setEmailsError(e instanceof ApiError ? humanError(e) : 'E-Mails konnten nicht geladen werden.');
    } finally {
      setLoadingEmails(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCompany == null) {
      setEmails(null);
      return;
    }
    void loadEmails(selectedCompany);
    // keep the URL shareable
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('company', String(selectedCompany));
      return next;
    }, { replace: true });
  }, [selectedCompany, loadEmails, setSearchParams]);

  async function refresh() {
    setRefreshing(true);
    await loadOverview();
    if (selectedCompany != null) await loadEmails(selectedCompany);
    setRefreshing(false);
  }

  // On-demand: ask preisanfrage to IMAP-fetch + classify new mail for this firma
  // right now (instead of waiting for the hourly auto-poll), then reload.
  async function pollNow() {
    if (selectedCompany == null || polling) return;
    setPolling(true);
    try {
      const res = await api.posteingang.poll(selectedCompany);
      await loadEmails(selectedCompany);
      await loadOverview();
      toast.success(
        res.emailsNew > 0
          ? `${res.emailsNew} neue E-Mail${res.emailsNew === 1 ? '' : 's'} abgerufen`
          : 'Keine neuen E-Mails',
      );
    } catch (e) {
      const code = e instanceof ApiError ? (e.body as { error?: string } | null)?.error : undefined;
      if (code === 'smtp_not_configured') toast.error('Für diese Firma ist kein Postfach (IMAP) konfiguriert.');
      else if (code === 'posteingang_disabled') toast.error('Posteingang ist für diese Firma deaktiviert.');
      else toast.error('Abrufen fehlgeschlagen — bitte erneut versuchen.');
    } finally {
      setPolling(false);
    }
  }

  // Optimistic toggle of a triage flag; reverts + toasts on failure.
  const toggleState = useCallback(
    async (emailId: number, patch: Partial<EmailState>) => {
      if (selectedCompany == null) return;
      const prev = stateMap[emailId] ?? EMPTY_STATE;
      setStateMap((m) => ({ ...m, [emailId]: { ...(m[emailId] ?? EMPTY_STATE), ...patch } }));
      try {
        await api.posteingang.setState(emailId, selectedCompany, patch);
      } catch {
        setStateMap((m) => ({ ...m, [emailId]: prev }));
        toast.error('Konnte nicht speichern.');
      }
    },
    [selectedCompany, stateMap],
  );

  async function markAllRead() {
    if (selectedCompany == null) return;
    const ids = (emails ?? []).filter((e) => !emState(e.id).read).map((e) => e.id);
    if (!ids.length) {
      toast('Alles bereits gelesen');
      return;
    }
    setStateMap((m) => {
      const next = { ...m };
      for (const id of ids) next[id] = { ...(next[id] ?? EMPTY_STATE), read: true };
      return next;
    });
    try {
      await api.posteingang.setStateBulk(selectedCompany, ids, { read: true });
      toast.success(`${ids.length} als gelesen markiert`);
    } catch {
      toast.error('Konnte nicht speichern.');
      if (selectedCompany != null) void loadEmails(selectedCompany);
    }
  }

  function pickCompany(id: number) {
    setSelectedCompany(id);
    setClassFilter('all');
    setLabelFilter(null);
    setQuery('');
    setView('inbox');
    setMobilePane('list');
  }

  // Lazy-load the "Gesendet" list when that folder is opened.
  useEffect(() => {
    if (view !== 'sent' || selectedCompany == null) return;
    let alive = true;
    setLoadingSent(true);
    api.posteingang
      .sent(selectedCompany)
      .then((res) => {
        if (!alive) return;
        setSentList(res.sent);
        setSelectedSentId(res.sent[0]?.id ?? null);
      })
      .catch(() => alive && setSentList([]))
      .finally(() => alive && setLoadingSent(false));
    return () => {
      alive = false;
    };
  }, [view, selectedCompany]);

  const reloadDrafts = useCallback(async () => {
    if (selectedCompany == null) return;
    try {
      const res = await api.posteingang.drafts(selectedCompany);
      setDraftList(res.drafts);
    } catch {
      /* keep previous */
    }
  }, [selectedCompany]);

  // Lazy-load the "Entwürfe" list when that folder is opened.
  useEffect(() => {
    if (view !== 'drafts' || selectedCompany == null) return;
    let alive = true;
    setLoadingDrafts(true);
    api.posteingang
      .drafts(selectedCompany)
      .then((res) => alive && setDraftList(res.drafts))
      .catch(() => alive && setDraftList([]))
      .finally(() => alive && setLoadingDrafts(false));
    return () => {
      alive = false;
    };
  }, [view, selectedCompany]);

  function pickEmail(id: number) {
    setSelectedEmailId(id);
    setMobilePane('reading');
    if (!emState(id).read) void toggleState(id, { read: true });
  }

  function openDraft(d: DraftEmail) {
    const original = d.inReplyToEmailId != null ? (emails ?? []).find((e) => e.id === d.inReplyToEmailId) ?? null : null;
    const mode: ComposerMode = d.kind === 'compose' ? 'new' : d.kind;
    setComposer({ mode, email: original, draftId: d.id, initialTo: d.to, initialSubject: d.subject, initialBody: d.body });
  }
  async function discardDraft(id: string) {
    try {
      await api.posteingang.deleteDraft(id);
      await reloadDrafts();
      toast.success('Entwurf gelöscht');
    } catch {
      toast.error('Konnte nicht löschen.');
    }
  }
  function saveDraftFromComposer(vals: { to: string; subject: string; body: string }) {
    if (!composer) return;
    const companyId = composer.email?.companyId ?? selectedCompany;
    if (companyId == null) return;
    const { draftId, mode, email } = composer;
    setComposer(null);
    void (async () => {
      try {
        await api.posteingang.saveDraft(companyId, {
          id: draftId,
          kind: mode === 'new' ? 'compose' : mode,
          to: vals.to,
          subject: vals.subject,
          body: vals.body,
          inReplyToEmailId: email?.id ?? null,
        });
        await reloadDrafts();
        toast.success('Entwurf gespeichert');
      } catch {
        toast.error('Entwurf konnte nicht gespeichert werden.');
      }
    })();
  }

  const companies = useMemo(() => overview?.companies ?? [], [overview]);
  const filteredCompanies = useMemo(() => {
    const q = companyQuery.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((c) => c.name.toLowerCase().includes(q) || (c.tradeType ?? '').toLowerCase().includes(q));
  }, [companies, companyQuery]);

  const activeCompany = companies.find((c) => c.id === selectedCompany) ?? null;

  // Does an incoming email belong in the currently-open folder?
  const matchesView = useCallback(
    (id: number): boolean => {
      const s = stateMap[id] ?? EMPTY_STATE;
      if (view === 'trash') return s.deleted;
      if (s.deleted) return false; // inbox + archiv hide trashed mail
      return view === 'archived' ? s.archived : !s.archived;
    },
    [stateMap, view],
  );

  const filteredEmails = useMemo(() => {
    if (view === 'sent' || view === 'drafts') return [];
    let list = (emails ?? []).filter((e) => matchesView(e.id));
    if (classFilter !== 'all') list = list.filter((e) => (e.classification ?? 'unklar') === classFilter);
    if (labelFilter) list = list.filter((e) => (stateMap[e.id]?.labels ?? []).includes(labelFilter));
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (e) =>
          (e.subject ?? '').toLowerCase().includes(q) ||
          (e.fromName ?? '').toLowerCase().includes(q) ||
          (e.fromEmail ?? '').toLowerCase().includes(q) ||
          (e.bodyText ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [emails, classFilter, query, view, matchesView, labelFilter, stateMap]);

  // Filter-chip counts — scoped to the current folder.
  const classCounts = useMemo(() => {
    const c: Record<ClassFilter, number> = { all: 0, angebot: 0, rueckfrage: 0, absage: 0, unklar: 0 };
    if (view === 'sent' || view === 'drafts') return c;
    for (const e of emails ?? []) {
      if (!matchesView(e.id)) continue;
      c.all++;
      const k = (e.classification ?? 'unklar') as ClassFilter;
      if (k in c) c[k]++;
      else c.unklar++;
    }
    return c;
  }, [emails, view, matchesView]);

  // All labels currently used in this company's mailbox (for the label filter).
  const allLabels = useMemo(() => {
    const set = new Set<string>();
    for (const e of emails ?? []) for (const l of stateMap[e.id]?.labels ?? []) set.add(l);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [emails, stateMap]);

  // Per-folder totals for the folder tabs + the unread badge.
  const folderCounts = useMemo(() => {
    let inbox = 0;
    let archived = 0;
    let trash = 0;
    let unread = 0;
    for (const e of emails ?? []) {
      const s = stateMap[e.id] ?? EMPTY_STATE;
      if (s.deleted) {
        trash++;
        continue;
      }
      if (s.archived) {
        archived++;
        continue;
      }
      inbox++;
      if (!s.read) unread++;
    }
    return { inbox, archived, trash, unread };
  }, [emails, stateMap]);

  const selectedEmail = (emails ?? []).find((e) => e.id === selectedEmailId) ?? null;
  const selectedSent = (sentList ?? []).find((s) => s.id === selectedSentId) ?? null;

  // Keep the selection valid as folder/filters change — and advance to the next
  // mail after the open one is archived/deleted (Gmail-style).
  useEffect(() => {
    if (view === 'sent' || view === 'drafts') return;
    if (selectedEmailId != null && filteredEmails.some((e) => e.id === selectedEmailId)) return;
    setSelectedEmailId(filteredEmails[0]?.id ?? null);
  }, [filteredEmails, view, selectedEmailId]);

  // Keyboard shortcuts (Superhuman-style). Scoped to this page; ignores typing
  // and when a composer is open. Uses keys that don't clash with PanelLayout's
  // global c / g / "/" hotkeys.  j/k move · e archive · s star · u unread ·
  // r reply · f forward · n new · ⌫ delete.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (composer) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) return;
      const k = e.key.toLowerCase();

      if (k === 'n') {
        if (selectedCompany != null) {
          e.preventDefault();
          setComposer({ mode: 'new', email: null });
        }
        return;
      }

      // j/k navigation within the current list (incoming or sent)
      if (k === 'j' || k === 'k') {
        const ids: (number | string)[] =
          view === 'sent' ? (sentList ?? []).map((s) => s.id) : filteredEmails.map((x) => x.id);
        if (!ids.length) return;
        e.preventDefault();
        const curId = view === 'sent' ? selectedSentId : selectedEmailId;
        const idx = ids.findIndex((id) => id === curId);
        const nextIdx = idx < 0 ? 0 : k === 'j' ? Math.min(ids.length - 1, idx + 1) : Math.max(0, idx - 1);
        const nextId = ids[nextIdx];
        if (view === 'sent') {
          setSelectedSentId(nextId as string);
        } else {
          setSelectedEmailId(nextId as number);
          if (!emState(nextId as number).read) void toggleState(nextId as number, { read: true });
        }
        return;
      }

      if (view === 'sent') return; // remaining actions are incoming-only
      const sel = filteredEmails.find((x) => x.id === selectedEmailId);
      if (!sel) return;
      if (k === 'e') {
        e.preventDefault();
        void toggleState(sel.id, { archived: !emState(sel.id).archived });
      } else if (k === 's') {
        e.preventDefault();
        void toggleState(sel.id, { starred: !emState(sel.id).starred });
      } else if (k === 'u') {
        e.preventDefault();
        void toggleState(sel.id, { read: !emState(sel.id).read });
      } else if (k === 'r') {
        e.preventDefault();
        setComposer({ mode: 'reply', email: sel });
      } else if (k === 'f') {
        e.preventDefault();
        setComposer({ mode: 'forward', email: sel });
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        void toggleState(sel.id, { deleted: !emState(sel.id).deleted });
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [composer, view, filteredEmails, sentList, selectedEmailId, selectedSentId, selectedCompany, toggleState, emState]);

  /* ── integration disabled / hard error states ── */
  if (!loadingOverview && overview && !overview.enabled) {
    return <DisabledState />;
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-6.5rem)] min-h-[34rem]">
      <Helmet>
        <title>Posteingang · KALKU Panel</title>
      </Helmet>

      {/* slim top bar */}
      <div className="flex items-center gap-3 pb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Mail className="w-5 h-5 text-primary-600 dark:text-primary-300 shrink-0" />
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">Posteingang</h1>
          {overview?.totals && overview.totals.needsAttention > 0 && (
            <span className="inline-flex items-center justify-center h-5 px-2 rounded-full bg-amber-500 text-white text-[11px] font-bold tabular-nums">
              {overview.totals.needsAttention} offen
            </span>
          )}
        </div>
        {overview?.mock && (
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200">
            Demo-Daten
          </span>
        )}
        <button
          type="button"
          onClick={() => selectedCompany != null && setComposer({ mode: 'new', email: null })}
          disabled={selectedCompany == null}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-2.5 h-8 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          title={selectedCompany != null ? `Neue E-Mail im Namen von ${activeCompany?.name ?? 'dieser Firma'}` : 'Erst eine Firma wählen'}
        >
          <PenSquare className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Neue E-Mail</span>
        </button>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={refreshing || loadingOverview}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 h-8 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
          title="Ansicht aktualisieren"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Aktualisieren</span>
        </button>
      </div>

      {/* 3-pane body */}
      <div className="flex flex-1 min-h-0 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
        {/* ── pane 1: companies ── */}
        <aside
          className={`${mobilePane === 'companies' ? 'flex' : 'hidden'} lg:flex flex-col w-full lg:w-64 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60`}
        >
          <div className="p-2.5 border-b border-slate-200 dark:border-slate-800">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                value={companyQuery}
                onChange={(e) => setCompanyQuery(e.target.value)}
                placeholder="Firma suchen…"
                className="w-full h-8 pl-8 pr-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 dark:focus:ring-primary-500/40"
                aria-label="Firma suchen"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
            {loadingOverview ? (
              <ListSkeleton rows={6} />
            ) : overviewError ? (
              <ErrorBlock message={overviewError} onRetry={() => void loadOverview()} />
            ) : filteredCompanies.length === 0 ? (
              <EmptyHint icon={Building2} text={companies.length === 0 ? 'Keine Postfächer mit Aktivität.' : 'Keine Firma gefunden.'} />
            ) : (
              filteredCompanies.map((co) => (
                <CompanyRow key={co.id} company={co} active={co.id === selectedCompany} onClick={() => pickCompany(co.id)} />
              ))
            )}
          </div>
          {overview?.capped && (
            <p className="px-3 py-2 text-[11px] text-amber-700 dark:text-amber-300 border-t border-slate-200 dark:border-slate-800">
              Liste gekürzt — nicht alle Firmen geprüft.
            </p>
          )}
        </aside>

        {/* ── pane 2: email list ── */}
        <section
          className={`${mobilePane === 'list' ? 'flex' : 'hidden'} lg:flex flex-col w-full lg:w-[22rem] shrink-0 border-r border-slate-200 dark:border-slate-800 min-w-0`}
        >
          {/* list header */}
          <div className="border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 px-3 pt-2.5 pb-2">
              <button type="button" onClick={() => setMobilePane('companies')} className="lg:hidden -ml-1 p-1 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Zurück zu Firmen">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">{activeCompany?.name ?? 'Postfach'}</span>
              {activeCompany && (
                <button
                  type="button"
                  onClick={() => void pollNow()}
                  disabled={polling}
                  className="ml-auto shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-2 h-7 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
                  title="Neue E-Mails jetzt von preisanfrage abrufen (IMAP)"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${polling ? 'animate-spin' : ''}`} />
                  {polling ? 'Lädt…' : 'Jetzt abrufen'}
                </button>
              )}
            </div>
            {/* folder tabs */}
            <div className="flex items-center gap-1 px-2 pb-2 overflow-x-auto">
              {(['inbox', 'sent', 'drafts', 'archived', 'trash'] as MailView[]).map((v) => {
                const Icon = v === 'inbox' ? Inbox : v === 'sent' ? Send : v === 'drafts' ? FileEdit : v === 'archived' ? Archive : Trash2;
                const count =
                  v === 'inbox' ? folderCounts.inbox
                  : v === 'archived' ? folderCounts.archived
                  : v === 'trash' ? folderCounts.trash
                  : v === 'drafts' ? (draftList?.length ?? null)
                  : null;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => { setView(v); setClassFilter('all'); setLabelFilter(null); }}
                    className={`shrink-0 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-medium transition-colors ${
                      view === v
                        ? 'bg-primary-600 text-white'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" /> {VIEW_LABELS[v]}
                    {count != null && count > 0 && (
                      <span className={`tabular-nums ${view === v ? 'text-white/80' : 'text-slate-400 dark:text-slate-500'}`}>{count}</span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="px-2 pb-2 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={view === 'sent' ? 'Gesendete suchen…' : 'In E-Mails suchen…'}
                className="w-full h-8 pl-8 pr-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 dark:focus:ring-primary-500/40"
                aria-label="In E-Mails suchen"
              />
            </div>
            {view !== 'sent' && view !== 'drafts' && (
              <div className="flex items-center gap-1 px-2 pb-2 overflow-x-auto">
                {CLASS_FILTERS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setClassFilter(f.key)}
                    className={`shrink-0 inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-xs font-medium transition-colors ${
                      classFilter === f.key
                        ? 'bg-primary-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    {f.label}
                    <span className={`tabular-nums ${classFilter === f.key ? 'text-white/80' : 'text-slate-400 dark:text-slate-500'}`}>
                      {classCounts[f.key]}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {view !== 'sent' && view !== 'drafts' && allLabels.length > 0 && (
              <div className="flex items-center gap-1 px-2 pb-2 overflow-x-auto">
                <Tag className="w-3 h-3 text-slate-400 shrink-0" />
                {allLabels.map((lab) => (
                  <button
                    key={lab}
                    type="button"
                    onClick={() => setLabelFilter((cur) => (cur === lab ? null : lab))}
                    className={`shrink-0 inline-flex items-center h-6 px-2 rounded-full text-[11px] font-medium transition-colors ${
                      labelFilter === lab ? 'ring-2 ring-primary-400 ' + labelColor(lab) : labelColor(lab) + ' opacity-80 hover:opacity-100'
                    }`}
                  >
                    {lab}
                  </button>
                ))}
                {labelFilter && (
                  <button type="button" onClick={() => setLabelFilter(null)} className="shrink-0 text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 px-1">
                    ×
                  </button>
                )}
              </div>
            )}
            {view === 'inbox' && folderCounts.unread > 0 && (
              <div className="flex items-center px-3 pb-2">
                <button
                  type="button"
                  onClick={() => void markAllRead()}
                  className="ml-auto inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Alle sichtbaren E-Mails als gelesen markieren"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Alle gelesen ({folderCounts.unread})
                </button>
              </div>
            )}
          </div>
          {/* list body */}
          <div className="flex-1 overflow-y-auto">
            {view === 'sent' ? (
              loadingSent ? (
                <div className="p-2"><ListSkeleton rows={6} /></div>
              ) : !sentList || sentList.length === 0 ? (
                <EmptyHint icon={Send} text="Noch nichts aus dem Panel gesendet." />
              ) : (
                sentList
                  .filter((s) => {
                    const q = query.trim().toLowerCase();
                    return !q || s.to.toLowerCase().includes(q) || s.subject.toLowerCase().includes(q) || s.body.toLowerCase().includes(q);
                  })
                  .map((s) => (
                    <SentRow
                      key={s.id}
                      sent={s}
                      active={s.id === selectedSentId}
                      onClick={() => { setSelectedSentId(s.id); setMobilePane('reading'); }}
                    />
                  ))
              )
            ) : view === 'drafts' ? (
              loadingDrafts ? (
                <div className="p-2"><ListSkeleton rows={5} /></div>
              ) : !draftList || draftList.length === 0 ? (
                <EmptyHint icon={FileEdit} text="Keine Entwürfe." />
              ) : (
                draftList
                  .filter((d) => {
                    const q = query.trim().toLowerCase();
                    return !q || d.to.toLowerCase().includes(q) || d.subject.toLowerCase().includes(q) || d.body.toLowerCase().includes(q);
                  })
                  .map((d) => (
                    <DraftRow key={d.id} draft={d} onOpen={() => openDraft(d)} onDelete={() => void discardDraft(d.id)} />
                  ))
              )
            ) : loadingEmails ? (
              <div className="p-2"><ListSkeleton rows={7} /></div>
            ) : emailsError ? (
              <ErrorBlock message={emailsError} onRetry={() => selectedCompany != null && void loadEmails(selectedCompany)} />
            ) : filteredEmails.length === 0 ? (
              <EmptyHint
                icon={view === 'trash' ? Trash2 : view === 'archived' ? Archive : Inbox}
                text={
                  (emails?.length ?? 0) === 0
                    ? 'Keine E-Mails in diesem Postfach.'
                    : view === 'trash'
                      ? 'Papierkorb ist leer.'
                      : view === 'archived'
                        ? 'Kein archiviertes E-Mail.'
                        : 'Keine E-Mail passt zum Filter.'
                }
              />
            ) : (
              filteredEmails.map((e) => (
                <EmailRow
                  key={e.id}
                  email={e}
                  state={emState(e.id)}
                  active={e.id === selectedEmailId}
                  onClick={() => pickEmail(e.id)}
                  onToggleStar={() => void toggleState(e.id, { starred: !emState(e.id).starred })}
                  onToggleArchive={() => void toggleState(e.id, { archived: !emState(e.id).archived })}
                  onToggleDelete={() => void toggleState(e.id, { deleted: !emState(e.id).deleted })}
                />
              ))
            )}
          </div>
        </section>

        {/* ── pane 3: reading ── */}
        <article className={`${mobilePane === 'reading' ? 'flex' : 'hidden'} lg:flex flex-col flex-1 min-w-0`}>
          {view === 'drafts' ? (
            <EmptyReading text="Entwurf anklicken, um ihn zu bearbeiten und zu senden." />
          ) : view === 'sent' ? (
            selectedSent ? (
              <SentReadingPane sent={selectedSent} onBack={() => setMobilePane('list')} />
            ) : (
              <EmptyReading text="Wählen Sie eine gesendete E-Mail." />
            )
          ) : selectedEmail ? (
            <ReadingPane
              email={selectedEmail}
              state={emState(selectedEmail.id)}
              companyName={activeCompany?.name ?? ''}
              onBack={() => setMobilePane('list')}
              onReply={() => setComposer({ mode: 'reply', email: selectedEmail })}
              onForward={() => setComposer({ mode: 'forward', email: selectedEmail })}
              onToggleStar={() => void toggleState(selectedEmail.id, { starred: !emState(selectedEmail.id).starred })}
              onToggleArchive={() => void toggleState(selectedEmail.id, { archived: !emState(selectedEmail.id).archived })}
              onToggleRead={() => void toggleState(selectedEmail.id, { read: !emState(selectedEmail.id).read })}
              onToggleDelete={() => void toggleState(selectedEmail.id, { deleted: !emState(selectedEmail.id).deleted })}
              onSetLabels={(labels) => void toggleState(selectedEmail.id, { labels })}
            />
          ) : (
            <EmptyReading text="Wählen Sie eine E-Mail, um sie zu lesen." />
          )}
        </article>
      </div>

      {composer && (composer.email?.companyId ?? selectedCompany) != null && (
        <Composer
          // key forces a fresh mount (re-initialised fields) whenever the mode,
          // target email, or draft changes — without it, useState would keep
          // stale To/Subject/Body.
          key={`${composer.mode}:${composer.draftId ?? composer.email?.id ?? 'new'}`}
          mode={composer.mode}
          companyId={(composer.email?.companyId ?? selectedCompany) as number}
          companyName={activeCompany?.name ?? ''}
          email={composer.email}
          initialTo={composer.initialTo}
          initialSubject={composer.initialSubject}
          initialBody={composer.initialBody}
          onClose={() => setComposer(null)}
          onSent={() => {
            const did = composer.draftId;
            setComposer(null);
            if (did) void api.posteingang.deleteDraft(did).then(reloadDrafts).catch(() => {});
          }}
          onSaveDraft={saveDraftFromComposer}
        />
      )}
    </div>
  );
}

/* ─── sub-components ───────────────────────────────────────────────────── */

function CompanyRow({ company, active, onClick }: { company: PosteingangCompany; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-colors ${
        active ? 'bg-primary-50 dark:bg-primary-500/15' : 'hover:bg-slate-100 dark:hover:bg-slate-800/70'
      }`}
    >
      <span className={`grid place-items-center w-8 h-8 rounded-lg text-xs font-bold shrink-0 ${avatarColor(company.name)}`}>
        {initials(company.name)}
      </span>
      <span className="flex-1 min-w-0">
        <span className={`block text-sm truncate ${active ? 'font-semibold text-primary-800 dark:text-primary-100' : 'font-medium text-slate-800 dark:text-slate-200'}`}>
          {company.name}
        </span>
        <span className="block text-[11px] text-slate-400 dark:text-slate-500 truncate capitalize">{company.tradeType || '—'}</span>
      </span>
      {company.needsAttention > 0 ? (
        <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-amber-500 text-white text-[11px] font-bold tabular-nums shrink-0">
          {company.needsAttention}
        </span>
      ) : (
        <span className="text-[11px] text-slate-300 dark:text-slate-600 tabular-nums shrink-0">{company.total}</span>
      )}
    </button>
  );
}

function EmailRow({
  email,
  state,
  active,
  onClick,
  onToggleStar,
  onToggleArchive,
  onToggleDelete,
}: {
  email: PosteingangEmail;
  state: EmailState;
  active: boolean;
  onClick: () => void;
  onToggleStar: () => void;
  onToggleArchive: () => void;
  onToggleDelete: () => void;
}) {
  const cm = classMeta(email.classification);
  const unread = !state.read;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          onClick();
        }
      }}
      className={`group w-full cursor-pointer text-left px-3 py-2.5 border-b border-slate-100 dark:border-slate-800/70 transition-colors focus:outline-none focus-visible:bg-primary-50 dark:focus-visible:bg-primary-500/15 ${
        active ? 'bg-primary-50 dark:bg-primary-500/15' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
      }`}
    >
      <div className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full shrink-0 ${unread ? cm.dot : 'bg-transparent'}`} aria-hidden />
        <span className={`flex-1 min-w-0 truncate text-sm ${unread ? 'font-semibold text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-300'}`}>
          {email.fromName || email.fromEmail || 'Unbekannt'}
        </span>
        <button
          type="button"
          onClick={(ev) => { ev.stopPropagation(); onToggleArchive(); }}
          className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 shrink-0"
          title={state.archived ? 'Wiederherstellen' : 'Archivieren'}
          aria-label={state.archived ? 'Wiederherstellen' : 'Archivieren'}
        >
          {state.archived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
        </button>
        <button
          type="button"
          onClick={(ev) => { ev.stopPropagation(); onToggleDelete(); }}
          className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-0.5 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 shrink-0"
          title={state.deleted ? 'Wiederherstellen' : 'In den Papierkorb'}
          aria-label={state.deleted ? 'Wiederherstellen' : 'In den Papierkorb'}
        >
          {state.deleted ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
        </button>
        <button
          type="button"
          onClick={(ev) => { ev.stopPropagation(); onToggleStar(); }}
          className="p-0.5 rounded shrink-0"
          title={state.starred ? 'Markierung entfernen' : 'Markieren'}
          aria-label={state.starred ? 'Markierung entfernen' : 'Markieren'}
        >
          <Star className={`w-3.5 h-3.5 ${state.starred ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600 group-hover:text-slate-400 dark:group-hover:text-slate-500'}`} />
        </button>
        <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0 tabular-nums">{relDate(email.receivedAt)}</span>
      </div>
      <div className={`mt-0.5 truncate text-sm ${unread ? 'text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}>
        {email.subject || '(kein Betreff)'}
      </div>
      <div className="mt-1 flex items-center gap-1.5">
        <span className={`inline-flex items-center h-4 px-1.5 rounded text-[10px] font-medium ${cm.badge}`}>{cm.label}</span>
        {state.labels.slice(0, 3).map((l) => (
          <span key={l} className={`inline-flex items-center h-4 px-1.5 rounded text-[10px] font-medium ${labelColor(l)}`}>{l}</span>
        ))}
        {email.sharepointSaved && (
          <span className="inline-flex items-center h-4 px-1.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">abgelegt</span>
        )}
        {email.hasAttachments && (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400 dark:text-slate-500">
            <Paperclip className="w-3 h-3" />
            {email.attachmentCount}
          </span>
        )}
        <span className="flex-1 min-w-0 truncate text-[11px] text-slate-400 dark:text-slate-500">{snippet(email.bodyText)}</span>
      </div>
    </div>
  );
}

function ReadingPane({
  email,
  state,
  companyName,
  onBack,
  onReply,
  onForward,
  onToggleStar,
  onToggleArchive,
  onToggleRead,
  onToggleDelete,
  onSetLabels,
}: {
  email: PosteingangEmail;
  state: EmailState;
  companyName: string;
  onBack: () => void;
  onReply: () => void;
  onForward: () => void;
  onToggleStar: () => void;
  onToggleArchive: () => void;
  onToggleRead: () => void;
  onToggleDelete: () => void;
  onSetLabels: (labels: string[]) => void;
}) {
  const cm = classMeta(email.classification);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Scroll body to top whenever the selected email changes.
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [email.id]);

  const replyHref = email.fromEmail
    ? `mailto:${email.fromEmail}?subject=${encodeURIComponent(`AW: ${email.subject ?? ''}`)}`
    : null;
  const canReply = Boolean(email.fromEmail);

  return (
    <>
      {/* header */}
      <header className="px-4 sm:px-6 pt-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 mb-2">
          <button type="button" onClick={onBack} className="lg:hidden -ml-1 p-1 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Zurück zur Liste">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className={`inline-flex items-center h-5 px-2 rounded text-[11px] font-medium ${cm.badge}`}>{cm.label}</span>
          {typeof email.classificationConfidence === 'number' && (
            <span className="text-[11px] text-slate-400 dark:text-slate-500" title="Konfidenz der KI-Einstufung">
              {Math.round(email.classificationConfidence * 100)} %
            </span>
          )}
          {email.sharepointSaved ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> abgelegt
            </span>
          ) : email.classification === 'angebot' ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">noch nicht abgelegt</span>
          ) : null}
          <div className="ml-auto flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={onToggleStar}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              title={state.starred ? 'Markierung entfernen' : 'Markieren'}
              aria-label={state.starred ? 'Markierung entfernen' : 'Markieren'}
            >
              <Star className={`w-4 h-4 ${state.starred ? 'fill-amber-400 text-amber-400' : 'text-slate-400'}`} />
            </button>
            <button
              type="button"
              onClick={onToggleRead}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              title={state.read ? 'Als ungelesen markieren' : 'Als gelesen markieren'}
              aria-label={state.read ? 'Als ungelesen markieren' : 'Als gelesen markieren'}
            >
              {state.read ? <Mail className="w-4 h-4" /> : <CheckCheck className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onToggleArchive}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              title={state.archived ? 'Wiederherstellen' : 'Archivieren'}
              aria-label={state.archived ? 'Wiederherstellen' : 'Archivieren'}
            >
              {state.archived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onToggleDelete}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              title={state.deleted ? 'Wiederherstellen' : 'In den Papierkorb'}
              aria-label={state.deleted ? 'Wiederherstellen' : 'In den Papierkorb'}
            >
              {state.deleted ? <ArchiveRestore className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 leading-snug">{email.subject || '(kein Betreff)'}</h2>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">{email.fromName || email.fromEmail || 'Unbekannt'}</span>
          {email.fromEmail && email.fromName && <span className="text-slate-400 dark:text-slate-500">&lt;{email.fromEmail}&gt;</span>}
          <span className="text-slate-400 dark:text-slate-500">· {fullDate(email.receivedAt)}</span>
        </div>
        {(email.projectName || email.supplierName) && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {email.projectName && (
              <span className="inline-flex items-center gap-1 h-6 px-2 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-300">
                <FolderOpen className="w-3 h-3" /> {email.projectName}
              </span>
            )}
            {email.supplierName && (
              <span className="inline-flex items-center gap-1 h-6 px-2 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-300">
                <Building2 className="w-3 h-3" /> {email.supplierName}
              </span>
            )}
          </div>
        )}
        <LabelEditor labels={state.labels} onChange={onSetLabels} />
      </header>

      {/* body */}
      <div ref={bodyRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
        {email.bodyText ? (
          <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-slate-700 dark:text-slate-300">{email.bodyText}</pre>
        ) : (
          <p className="text-sm text-slate-400 dark:text-slate-500 italic">Kein Text-Inhalt.</p>
        )}

        {email.attachments.length > 0 && (
          <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">
              {email.attachments.length} Anhang{email.attachments.length === 1 ? '' : 'änge'}
            </p>
            <div className="grid sm:grid-cols-2 gap-2">
              {email.attachments.map((a) => (
                <AttachmentCard key={a.id} filename={a.filename} sizeBytes={a.sizeBytes} url={a.sharepointUrl} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* actions */}
      <footer className="px-4 sm:px-6 py-2.5 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
        <button
          type="button"
          onClick={onReply}
          disabled={!canReply}
          title={canReply ? 'Antworten' : 'Keine Absenderadresse'}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 h-8 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          <CornerUpLeft className="w-3.5 h-3.5" /> Antworten
        </button>
        <button
          type="button"
          onClick={onForward}
          title="Weiterleiten"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 h-8 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Forward className="w-3.5 h-3.5" /> Weiterleiten
        </button>
        {replyHref && (
          <a
            href={replyHref}
            title="Stattdessen im Mail-Programm öffnen"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 w-8 h-8 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <Mail className="w-3.5 h-3.5" />
          </a>
        )}
        <a
          href={ssoHref(email.companyId)}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 h-8 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          title={`Im preisanfrage-Posteingang von ${companyName} öffnen (Ablegen, neu einstufen …)`}
        >
          In preisanfrage öffnen <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </footer>
    </>
  );
}

function AttachmentCard({ filename, sizeBytes, url }: { filename: string | null; sizeBytes: number | null; url: string | null }) {
  const name = filename || 'Anhang';
  const size = formatBytes(sizeBytes);
  const inner = (
    <>
      <span className="grid place-items-center w-9 h-9 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-500 shrink-0">
        <Paperclip className="w-4 h-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-slate-700 dark:text-slate-200 truncate">{name}</span>
        <span className="block text-[11px] text-slate-400 dark:text-slate-500">{url ? (size ? `${size} · SharePoint` : 'SharePoint') : size || 'noch nicht abgelegt'}</span>
      </span>
      {url && <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
    </>
  );
  const cls = 'flex items-center gap-2.5 p-2 rounded-lg border border-slate-200 dark:border-slate-800';
  return url ? (
    <a href={url} target="_blank" rel="noopener noreferrer" className={`${cls} hover:bg-slate-50 dark:hover:bg-slate-800/60`}>
      {inner}
    </a>
  ) : (
    <div className={`${cls} opacity-80`} title="Wird beim Ablegen in preisanfrage nach SharePoint hochgeladen">
      {inner}
    </div>
  );
}

/* ─── small states ─────────────────────────────────────────────────────── */

function ListSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-1.5 p-1.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-2.5 p-1.5">
          <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-2.5 w-3/4 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <div className="h-2 w-1/2 rounded bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyHint({ icon: Icon, text }: { icon: typeof Inbox; text: string }) {
  return (
    <div className="grid place-items-center py-12 px-4 text-center">
      <div>
        <Icon className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
        <p className="mt-2 text-sm text-slate-400 dark:text-slate-500">{text}</p>
      </div>
    </div>
  );
}

function ErrorBlock({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="m-3 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 p-3 text-sm">
      <div className="flex items-start gap-2 text-rose-700 dark:text-rose-300">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        <p>{message}</p>
      </div>
      <button type="button" onClick={onRetry} className="mt-2 inline-flex items-center gap-1.5 text-rose-700 dark:text-rose-300 hover:underline">
        <RefreshCw className="w-3.5 h-3.5" /> Erneut versuchen
      </button>
    </div>
  );
}

function DisabledState() {
  return (
    <div className="grid place-items-center min-h-[60vh] px-4 text-center">
      <div className="max-w-md">
        <div className="mx-auto w-12 h-12 grid place-items-center rounded-xl bg-slate-100 dark:bg-slate-800">
          <PlugZap className="w-6 h-6 text-slate-400" />
        </div>
        <h1 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Posteingang nicht verbunden</h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          Die Verbindung zu preisanfrage ist nicht konfiguriert. Sobald der Service-Zugang gesetzt ist,
          erscheinen hier die E-Mail-Postfächer aller Firmen.
        </p>
      </div>
    </div>
  );
}

function humanError(e: ApiError): string {
  const code = (e.body as { error?: string } | null)?.error;
  if (code === 'integration_disabled') return 'Die Verbindung zu preisanfrage ist nicht konfiguriert.';
  if (code === 'posteingang_disabled') return 'Der Posteingang ist für diese Firma deaktiviert.';
  if (e.status === 503) return 'preisanfrage ist derzeit nicht erreichbar.';
  return 'Etwas ist schiefgelaufen. Bitte erneut versuchen.';
}

/* ─── composer (reply / forward / new), Gmail-style modal ───────────────── */

function withPrefix(subject: string, mode: ComposerMode): string {
  const s = (subject || '').trim();
  if (mode === 'reply') return /^(aw:|re:)/i.test(s) ? s : `AW: ${s}`.trim();
  if (mode === 'forward') return /^(wg:|fwd:|fw:)/i.test(s) ? s : `WG: ${s}`.trim();
  return s;
}

function Composer({
  mode,
  companyId,
  companyName,
  email,
  initialTo,
  initialSubject,
  initialBody,
  onClose,
  onSent,
  onSaveDraft,
}: {
  mode: ComposerMode;
  companyId: number;
  companyName: string;
  email: PosteingangEmail | null;
  initialTo?: string;
  initialSubject?: string;
  initialBody?: string;
  onClose: () => void;
  onSent: () => void;
  onSaveDraft: (vals: { to: string; subject: string; body: string }) => void;
}) {
  const [to, setTo] = useState(initialTo ?? (mode === 'reply' ? (email?.fromEmail ?? '') : ''));
  const [subject, setSubject] = useState(initialSubject ?? (mode === 'new' ? '' : withPrefix(email?.subject ?? '', mode)));
  const [body, setBody] = useState(initialBody ?? '');
  const [sending, setSending] = useState(false);

  const title = mode === 'new' ? 'Neue E-Mail' : mode === 'reply' ? 'Antworten' : 'Weiterleiten';
  const toEditable = mode !== 'reply';
  const subjectEditable = mode === 'new';
  const bodyRequired = mode !== 'forward'; // forward note is optional — original is quoted server-side

  // Escape closes (unless sending).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !sending) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, sending]);

  const canSend = Boolean(to.trim()) && (!bodyRequired || Boolean(body.trim())) && !sending;

  async function send() {
    if (!canSend) return;
    setSending(true);
    try {
      const recipient = to.trim();
      if (mode === 'reply' && email) await api.posteingang.reply(email.id, companyId, body.trim());
      else if (mode === 'forward' && email) await api.posteingang.forward(email.id, companyId, recipient, body.trim() || undefined);
      else await api.posteingang.compose(companyId, recipient, subject.trim(), body.trim());
      toast.success(`Gesendet an ${recipient}`);
      onSent();
    } catch (e) {
      const code = e instanceof ApiError ? (e.body as { error?: string } | null)?.error : undefined;
      if (code && /(unavailable)$/.test(code))
        toast.error('Serverseitig noch nicht aktiv — preisanfrage-Update nötig.');
      else if (code === 'send_failed' || code === 'cannot_send' || code === 'cannot_reply')
        toast.error('Senden fehlgeschlagen (SMTP).');
      else if (code === 'missing_recipient') toast.error('Bitte einen Empfänger angeben.');
      else toast.error('Senden fehlgeschlagen — bitte erneut versuchen.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !sending) onClose();
      }}
    >
      <div className="w-full sm:max-w-2xl bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92dvh]">
        {/* header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <Send className="w-4 h-4 text-primary-600 dark:text-primary-300 shrink-0" />
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate">· {companyName}</span>
          <button
            type="button"
            onClick={() => !sending && onClose()}
            className="ml-auto p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Schließen"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* fields */}
        <div className="px-4 py-3 space-y-2 overflow-y-auto">
          <label className="flex items-center gap-2 text-sm border-b border-slate-100 dark:border-slate-800 pb-2">
            <span className="w-16 shrink-0 text-slate-400 dark:text-slate-500">An</span>
            {toEditable ? (
              <input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                autoFocus
                placeholder="empfaenger@firma.de"
                className="flex-1 bg-transparent focus:outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
              />
            ) : (
              <span className="flex-1 truncate text-slate-700 dark:text-slate-300">
                {email?.fromName || email?.fromEmail}
                {email?.fromEmail && email?.fromName && <span className="text-slate-400 dark:text-slate-500"> &lt;{email.fromEmail}&gt;</span>}
              </span>
            )}
          </label>
          <label className="flex items-center gap-2 text-sm border-b border-slate-100 dark:border-slate-800 pb-2">
            <span className="w-16 shrink-0 text-slate-400 dark:text-slate-500">Betreff</span>
            {subjectEditable ? (
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Betreff"
                className="flex-1 bg-transparent focus:outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
              />
            ) : (
              <span className="flex-1 truncate text-slate-700 dark:text-slate-300">{subject || '(kein Betreff)'}</span>
            )}
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={mode === 'forward' ? 4 : 9}
            autoFocus={!toEditable}
            placeholder={mode === 'forward' ? 'Optionale Nachricht oberhalb der weitergeleiteten E-Mail…' : 'Ihre Nachricht…'}
            disabled={sending}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary-300 dark:focus:ring-primary-500/40 resize-y disabled:opacity-60"
          />
          {mode === 'forward' && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Die Originalnachricht{email?.hasAttachments ? ` + ${email.attachmentCount} Anhang/Anhänge` : ''} werden automatisch angehängt.
            </p>
          )}
        </div>

        {/* footer */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => void send()}
            disabled={!canSend}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 h-9 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? 'Senden…' : 'Senden'}
          </button>
          <button
            type="button"
            onClick={() => onSaveDraft({ to: to.trim(), subject: subject.trim(), body: body.trim() })}
            disabled={sending || (!to.trim() && !subject.trim() && !body.trim())}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 h-9 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
            title="Als Entwurf speichern"
          >
            <FileEdit className="w-4 h-4" /> Entwurf
          </button>
          <button
            type="button"
            onClick={() => !sending && onClose()}
            disabled={sending}
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 h-9 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            Abbrechen
          </button>
          <span className="ml-auto text-[11px] text-slate-400 dark:text-slate-500">Wird über preisanfrage gesendet</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Gesendet (sent) folder ────────────────────────────────────────────── */

function EmptyReading({ text }: { text: string }) {
  return (
    <div className="flex-1 grid place-items-center p-8 text-center">
      <div>
        <Mail className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{text}</p>
      </div>
    </div>
  );
}

function sentKindLabel(kind: SentEmail['kind']): string {
  return kind === 'reply' ? 'Antwort' : kind === 'forward' ? 'Weitergeleitet' : 'Neu';
}

function SentRow({ sent, active, onClick }: { sent: SentEmail; active: boolean; onClick: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          onClick();
        }
      }}
      className={`w-full cursor-pointer text-left px-3 py-2.5 border-b border-slate-100 dark:border-slate-800/70 transition-colors focus:outline-none focus-visible:bg-primary-50 dark:focus-visible:bg-primary-500/15 ${
        active ? 'bg-primary-50 dark:bg-primary-500/15' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="flex-1 min-w-0 truncate text-sm text-slate-700 dark:text-slate-300">An: {sent.to}</span>
        <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0 tabular-nums">{relDate(sent.sentAt)}</span>
      </div>
      <div className="mt-0.5 truncate text-sm text-slate-600 dark:text-slate-400">{sent.subject || '(kein Betreff)'}</div>
      <div className="mt-1 flex items-center gap-1.5">
        <span className="inline-flex items-center h-4 px-1.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          {sentKindLabel(sent.kind)}
        </span>
        <span className="flex-1 min-w-0 truncate text-[11px] text-slate-400 dark:text-slate-500">{snippet(sent.body)}</span>
      </div>
    </div>
  );
}

function SentReadingPane({ sent, onBack }: { sent: SentEmail; onBack: () => void }) {
  return (
    <>
      <header className="px-4 sm:px-6 pt-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 mb-2">
          <button type="button" onClick={onBack} className="lg:hidden -ml-1 p-1 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Zurück zur Liste">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="inline-flex items-center gap-1 h-5 px-2 rounded text-[11px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <Send className="w-3 h-3" /> Gesendet · {sentKindLabel(sent.kind)}
          </span>
        </div>
        <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 leading-snug">{sent.subject || '(kein Betreff)'}</h2>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
          <span className="text-slate-500 dark:text-slate-400">An:</span>
          <span className="font-medium text-slate-700 dark:text-slate-200">{sent.to}</span>
          <span className="text-slate-400 dark:text-slate-500">· {fullDate(sent.sentAt)}</span>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
        {sent.body ? (
          <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-slate-700 dark:text-slate-300">{sent.body}</pre>
        ) : (
          <p className="text-sm text-slate-400 dark:text-slate-500 italic">Kein Text.</p>
        )}
        {sent.kind === 'forward' && (
          <p className="mt-4 text-[11px] text-slate-400 dark:text-slate-500">Die weitergeleitete Originalnachricht + Anhänge wurden mitgesendet.</p>
        )}
      </div>
    </>
  );
}

function DraftRow({ draft, onOpen, onDelete }: { draft: DraftEmail; onOpen: () => void; onDelete: () => void }) {
  const kindLabel = draft.kind === 'reply' ? 'Antwort' : draft.kind === 'forward' ? 'Weiterleitung' : 'Neu';
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          onOpen();
        }
      }}
      className="group w-full cursor-pointer text-left px-3 py-2.5 border-b border-slate-100 dark:border-slate-800/70 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 focus:outline-none focus-visible:bg-primary-50 dark:focus-visible:bg-primary-500/15"
    >
      <div className="flex items-center gap-2">
        <span className="flex-1 min-w-0 truncate text-sm text-slate-700 dark:text-slate-300">{draft.to ? `An: ${draft.to}` : 'Ohne Empfänger'}</span>
        <button
          type="button"
          onClick={(ev) => { ev.stopPropagation(); onDelete(); }}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 shrink-0"
          title="Entwurf löschen"
          aria-label="Entwurf löschen"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0 tabular-nums">{relDate(draft.updatedAt)}</span>
      </div>
      <div className="mt-0.5 truncate text-sm text-slate-600 dark:text-slate-400">{draft.subject || '(kein Betreff)'}</div>
      <div className="mt-1 flex items-center gap-1.5">
        <span className="inline-flex items-center h-4 px-1.5 rounded text-[10px] font-medium bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300">
          Entwurf · {kindLabel}
        </span>
        <span className="flex-1 min-w-0 truncate text-[11px] text-slate-400 dark:text-slate-500">{snippet(draft.body)}</span>
      </div>
    </div>
  );
}

function LabelEditor({ labels, onChange }: { labels: string[]; onChange: (labels: string[]) => void }) {
  const [adding, setAdding] = useState(false);
  const [val, setVal] = useState('');
  function commit() {
    const t = val.trim().slice(0, 40);
    if (t && !labels.includes(t)) onChange([...labels, t]);
    setVal('');
    setAdding(false);
  }
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {labels.map((l) => (
        <span key={l} className={`inline-flex items-center gap-1 h-6 px-2 rounded-md text-[11px] font-medium ${labelColor(l)}`}>
          {l}
          <button
            type="button"
            onClick={() => onChange(labels.filter((x) => x !== l))}
            className="hover:opacity-70"
            aria-label={`Label ${l} entfernen`}
          >
            ×
          </button>
        </span>
      ))}
      {adding ? (
        <input
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            } else if (e.key === 'Escape') {
              setAdding(false);
              setVal('');
            }
          }}
          onBlur={commit}
          placeholder="Label…"
          className="h-6 w-24 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary-300 dark:focus:ring-primary-500/40"
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1 h-6 px-2 rounded-md border border-dashed border-slate-300 dark:border-slate-600 text-[11px] text-slate-500 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-500"
        >
          <Plus className="w-3 h-3" /> Label
        </button>
      )}
    </div>
  );
}

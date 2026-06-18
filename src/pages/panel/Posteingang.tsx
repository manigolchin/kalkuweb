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
function isUnread(e: PosteingangEmail): boolean {
  return e.status === 'new';
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

  // Master-detail navigation on < lg. On lg the three panes show side by side.
  const [mobilePane, setMobilePane] = useState<'companies' | 'list' | 'reading'>('companies');

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
      const res = await api.posteingang.emails(companyId, { limit: 100 });
      setEmails(res.emails);
      setSelectedEmailId(res.emails[0]?.id ?? null);
    } catch (e) {
      setEmails([]);
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

  function pickCompany(id: number) {
    setSelectedCompany(id);
    setClassFilter('all');
    setQuery('');
    setMobilePane('list');
  }
  function pickEmail(id: number) {
    setSelectedEmailId(id);
    setMobilePane('reading');
  }

  const companies = useMemo(() => overview?.companies ?? [], [overview]);
  const filteredCompanies = useMemo(() => {
    const q = companyQuery.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((c) => c.name.toLowerCase().includes(q) || (c.tradeType ?? '').toLowerCase().includes(q));
  }, [companies, companyQuery]);

  const activeCompany = companies.find((c) => c.id === selectedCompany) ?? null;

  const filteredEmails = useMemo(() => {
    let list = emails ?? [];
    if (classFilter !== 'all') list = list.filter((e) => (e.classification ?? 'unklar') === classFilter);
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
  }, [emails, classFilter, query]);

  // Counts for the filter chips, from the loaded list.
  const classCounts = useMemo(() => {
    const c: Record<ClassFilter, number> = { all: 0, angebot: 0, rueckfrage: 0, absage: 0, unklar: 0 };
    for (const e of emails ?? []) {
      c.all++;
      const k = (e.classification ?? 'unklar') as ClassFilter;
      if (k in c) c[k]++;
      else c.unklar++;
    }
    return c;
  }, [emails]);

  const selectedEmail = (emails ?? []).find((e) => e.id === selectedEmailId) ?? null;

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
          onClick={() => void refresh()}
          disabled={refreshing || loadingOverview}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 h-8 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
          title="Aktualisieren"
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
                  {polling ? 'Lädt…' : 'Abrufen'}
                </button>
              )}
            </div>
            <div className="px-2 pb-2 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="In E-Mails suchen…"
                className="w-full h-8 pl-8 pr-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 dark:focus:ring-primary-500/40"
                aria-label="In E-Mails suchen"
              />
            </div>
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
          </div>
          {/* list body */}
          <div className="flex-1 overflow-y-auto">
            {loadingEmails ? (
              <div className="p-2"><ListSkeleton rows={7} /></div>
            ) : emailsError ? (
              <ErrorBlock message={emailsError} onRetry={() => selectedCompany != null && void loadEmails(selectedCompany)} />
            ) : filteredEmails.length === 0 ? (
              <EmptyHint icon={Inbox} text={(emails?.length ?? 0) === 0 ? 'Keine E-Mails in diesem Postfach.' : 'Keine E-Mail passt zum Filter.'} />
            ) : (
              filteredEmails.map((e) => (
                <EmailRow key={e.id} email={e} active={e.id === selectedEmailId} onClick={() => pickEmail(e.id)} />
              ))
            )}
          </div>
        </section>

        {/* ── pane 3: reading ── */}
        <article className={`${mobilePane === 'reading' ? 'flex' : 'hidden'} lg:flex flex-col flex-1 min-w-0`}>
          {selectedEmail ? (
            <ReadingPane
              email={selectedEmail}
              companyName={activeCompany?.name ?? ''}
              onBack={() => setMobilePane('list')}
            />
          ) : (
            <div className="flex-1 grid place-items-center p-8 text-center">
              <div>
                <Mail className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Wählen Sie eine E-Mail, um sie zu lesen.</p>
              </div>
            </div>
          )}
        </article>
      </div>
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

function EmailRow({ email, active, onClick }: { email: PosteingangEmail; active: boolean; onClick: () => void }) {
  const cm = classMeta(email.classification);
  const unread = isUnread(email);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 border-b border-slate-100 dark:border-slate-800/70 transition-colors ${
        active ? 'bg-primary-50 dark:bg-primary-500/15' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full shrink-0 ${unread ? cm.dot : 'bg-transparent'}`} aria-hidden />
        <span className={`flex-1 min-w-0 truncate text-sm ${unread ? 'font-semibold text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-300'}`}>
          {email.fromName || email.fromEmail || 'Unbekannt'}
        </span>
        <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0 tabular-nums">{relDate(email.receivedAt)}</span>
      </div>
      <div className={`mt-0.5 truncate text-sm ${unread ? 'text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}>
        {email.subject || '(kein Betreff)'}
      </div>
      <div className="mt-1 flex items-center gap-1.5">
        <span className={`inline-flex items-center h-4 px-1.5 rounded text-[10px] font-medium ${cm.badge}`}>{cm.label}</span>
        {email.sharepointSaved ? (
          <span className="inline-flex items-center h-4 px-1.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">abgelegt</span>
        ) : email.status === 'new' ? (
          <span className="inline-flex items-center h-4 px-1.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">neu</span>
        ) : null}
        {email.hasAttachments && (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400 dark:text-slate-500">
            <Paperclip className="w-3 h-3" />
            {email.attachmentCount}
          </span>
        )}
        <span className="flex-1 min-w-0 truncate text-[11px] text-slate-400 dark:text-slate-500">{snippet(email.bodyText)}</span>
      </div>
    </button>
  );
}

function ReadingPane({ email, companyName, onBack }: { email: PosteingangEmail; companyName: string; onBack: () => void }) {
  const cm = classMeta(email.classification);
  const bodyRef = useRef<HTMLDivElement>(null);
  // Scroll body to top whenever the selected email changes.
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [email.id]);

  const replyHref = email.fromEmail
    ? `mailto:${email.fromEmail}?subject=${encodeURIComponent(`AW: ${email.subject ?? ''}`)}`
    : null;

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
        {replyHref && (
          <a href={replyHref} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 h-8 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
            <CornerUpLeft className="w-3.5 h-3.5" /> Antworten
          </a>
        )}
        <a
          href={ssoHref(email.companyId)}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 h-8 text-sm font-medium text-white hover:bg-primary-700"
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

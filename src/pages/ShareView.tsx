import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import {
  Check,
  Loader2,
  AlertCircle,
  MessageSquarePlus,
  MessageSquare,
  Building2,
  ShieldCheck,
  Calendar,
  Phone,
  Mail,
  Fingerprint,
  Clock,
  Download,
  ChevronRight,
  Lock,
  AlertTriangle,
  RefreshCcw,
  Users,
  Search,
  Calculator,
  Layers,
  ArrowDownWideNarrow,
  X,
  SlidersHorizontal,
  Plus,
  FolderOpen,
  ExternalLink,
} from 'lucide-react';
import clsx from 'clsx';
import { api, ApiError } from '@/lib/api';
import type {
  ChangeRequestInput,
  CustomerViewPayload,
  ShareCalcSummary,
  ShareSettings,
} from '@/features/kalkulation/types';
import { formatEUR } from '@/features/kalkulation/calc';
import {
  assembleChangeRequests,
  availableFields,
  globalCurrentValue,
  draftsToBasketItems,
  basketItemToInput,
  type ChangeRequestDraftMap,
  type WunschBasketItem,
} from '@/features/kalkulation/changeRequest';
import PositionCommentPanel from '@/pages/share/PositionCommentPanel';
import ChangeRequestFields from '@/pages/share/ChangeRequestFields';
import WunschKorb from '@/pages/share/WunschKorb';

type ChangeDraft = { positionId: string; type: 'modify' | 'remove' | 'comment'; text: string };
type SharePosition = CustomerViewPayload['positions'][number];
type SortMode = 'order' | 'expensive' | 'cheap' | 'oz';
// Stable empty array so the `allPositions` fallback keeps a constant identity
// across renders (avoids re-running the useMemo on every render while loading).
const EMPTY_POSITIONS: SharePosition[] = [];
type ViewState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string; status?: number }
  | { kind: 'password-required'; previousAttemptFailed?: boolean }
  | { kind: 'ready'; payload: CustomerViewPayload };

export default function ShareView() {
  const { token = '' } = useParams<{ token: string }>();
  const [state, setState] = useState<ViewState>({ kind: 'loading' });
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [generalMessage, setGeneralMessage] = useState('');
  const [changes, setChanges] = useState<Record<string, ChangeDraft>>({});
  const [submitted, setSubmitted] = useState<'approve' | 'changes' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // PART G: per-position side-panel state. `panelPositionId` holds the id of
  // the position whose comment panel is currently open (null = closed).
  const [panelPositionId, setPanelPositionId] = useState<string | null>(null);
  // Round 12d: the customer's Wunsch-Korb — wishes collected from the per-position
  // panels + the global panel, reviewed and sent together in one batch.
  const [basket, setBasket] = useState<WunschBasketItem[]>([]);
  // Position list controls — sort by price, free-text search, "nur kommentierte".
  // Display-only: totals + summary always reflect the FULL offer, never the
  // filtered view. Safe to reorder — feedback is keyed by stable positionId.
  const [sortMode, setSortMode] = useState<SortMode>('order');
  const [query, setQuery] = useState('');
  const [onlyCommented, setOnlyCommented] = useState(false);

  // PART H: persist unlock state in sessionStorage so a reload during the
  // same session doesn't force the customer to re-enter the password. Keyed
  // by token (each share has its own).
  const sessionKey = `kalku.share.unlock.${token}`;

  const loadShare = useCallback(
    async (password?: string) => {
      setState({ kind: 'loading' });
      try {
        const payload = await api.public.getShare(token, password);
        // Persist working password for the session so reloads work without
        // re-prompting. Cleared on logout-style scenarios.
        if (password) {
          try { window.sessionStorage.setItem(sessionKey, password); } catch { /* private mode */ }
        }
        if (payload.settings.customerName) setCustomerName(payload.settings.customerName);
        if (payload.settings.customerEmail) setCustomerEmail(payload.settings.customerEmail);
        setState({ kind: 'ready', payload });
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          // Password required / wrong password. Clear any stale session-stored
          // value so the user gets the prompt cleanly.
          try { window.sessionStorage.removeItem(sessionKey); } catch { /* ignore */ }
          setState({
            kind: 'password-required',
            previousAttemptFailed: password !== undefined,
          });
        } else if (err instanceof ApiError && err.status === 410) {
          // Body may carry { reason: 'expired' | 'revoked' } — show specific text.
          const reason = (err.body as { reason?: string } | undefined)?.reason;
          setState({
            kind: 'error',
            message:
              reason === 'expired'
                ? 'Dieser Link ist abgelaufen.'
                : 'Dieser Link wurde widerrufen.',
            status: 410,
          });
        } else if (err instanceof ApiError && err.status === 404) {
          setState({ kind: 'error', message: 'Link nicht gefunden.', status: 404 });
        } else {
          setState({ kind: 'error', message: 'Angebot konnte nicht geladen werden.' });
        }
      }
    },
    [token, sessionKey],
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      let storedPwd: string | undefined;
      try { storedPwd = window.sessionStorage.getItem(sessionKey) ?? undefined; } catch { /* ignore */ }
      await loadShare(storedPwd);
      if (!alive) return;
    })();
    return () => {
      alive = false;
    };
  }, [token, loadShare, sessionKey]);

  // Captured once on mount so the render stays pure (lint: react-hooks/purity).
  const [mountedAtMs] = useState<number>(() => Date.now());

  const bindefrist = useMemo(() => {
    if (state.kind !== 'ready') return null;
    const days = state.payload.settings.bindefristDays ?? 30;
    const createdAt = new Date(state.payload.createdAt);
    const until = new Date(createdAt.getTime() + days * 24 * 60 * 60 * 1000);
    return { days, createdAt, until, isExpired: mountedAtMs > until.getTime() };
  }, [state, mountedAtMs]);

  const visibleTotal = useMemo(() => {
    if (state.kind !== 'ready') return { netto: 0, mwst: 0, brutto: 0 };
    const netto = state.payload.positions.reduce((s, p) => (p.isHeader ? s : s + p.gp), 0);
    const mwst = state.payload.settings.showMwst ? netto * state.payload.project.mwst : 0;
    return { netto, mwst, brutto: netto + mwst };
  }, [state]);

  const allPositions = state.kind === 'ready' ? state.payload.positions : EMPTY_POSITIONS;
  const priceablePositions = useMemo(
    () => allPositions.filter((p) => !p.isHeader),
    [allPositions],
  );
  const isFiltered = sortMode !== 'order' || query.trim().length > 0 || onlyCommented;
  const displayedPositions = useMemo(() => {
    // When a sort/search/filter is active we flatten (drop Titel headings) so
    // the result reads as one ranked list; otherwise we keep the LV structure.
    let list = isFiltered ? priceablePositions : allPositions;
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((p) =>
        `${p.oz} ${p.shortText} ${p.longText}`.toLowerCase().includes(q),
      );
    }
    if (onlyCommented) {
      list = list.filter((p) => changes[p.id]?.text?.trim());
    }
    if (sortMode === 'expensive') list = [...list].sort((a, b) => b.gp - a.gp);
    else if (sortMode === 'cheap') list = [...list].sort((a, b) => a.gp - b.gp);
    else if (sortMode === 'oz')
      list = [...list].sort((a, b) => a.oz.localeCompare(b.oz, 'de', { numeric: true }));
    return list;
  }, [allPositions, priceablePositions, isFiltered, query, onlyCommented, sortMode, changes]);

  function setChange(positionId: string, patch: Partial<ChangeDraft>) {
    setChanges((prev) => {
      const cur = prev[positionId] || { positionId, type: 'modify', text: '' };
      return { ...prev, [positionId]: { ...cur, ...patch } };
    });
  }

  function removeChange(positionId: string) {
    setChanges((prev) => {
      const next = { ...prev };
      delete next[positionId];
      return next;
    });
  }

  async function submitApprove() {
    if (state.kind !== 'ready') return;
    if (!customerName.trim()) return;
    setSubmitting(true);
    try {
      await api.public.approve(token, {
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim() || undefined,
        message: generalMessage.trim() || undefined,
      });
      setSubmitted('approve');
    } catch {
      toast.error('Annahme konnte nicht gesendet werden. Bitte später erneut versuchen.');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitChanges() {
    if (state.kind !== 'ready') return;
    if (!customerName.trim()) return;
    const items = Object.values(changes).filter((c) => c.text.trim().length > 0);
    if (items.length === 0 && !generalMessage.trim()) return;
    setSubmitting(true);
    try {
      await api.public.requestChanges(token, {
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim() || undefined,
        message: generalMessage.trim() || undefined,
        changes: items.length > 0 ? items : [{ positionId: 'general', type: 'comment', text: generalMessage.trim() }],
      });
      setSubmitted('changes');
    } catch {
      toast.error('Rückmeldung konnte nicht gesendet werden. Bitte später erneut versuchen.');
    } finally {
      setSubmitting(false);
    }
  }

  /** Round 12: POST a batch of structured price/quantity wishes. Throws on
   *  failure so the caller keeps its draft open for a retry. */
  async function submitChangeRequestItems(items: ChangeRequestInput[]) {
    if (items.length === 0) return;
    let storedPwd: string | undefined;
    try { storedPwd = window.sessionStorage.getItem(sessionKey) ?? undefined; } catch { /* ignore */ }
    await api.public.submitChangeRequests(
      token,
      {
        customerName: customerName.trim() || undefined,
        customerEmail: customerEmail.trim() || undefined,
        items,
      },
      storedPwd,
    );
  }

  // Round 12d: Wunsch-Korb collectors. Wishes are gathered (not sent) until the
  // customer reviews + sends them together.
  function addToBasket(items: WunschBasketItem[]) {
    if (items.length === 0) return;
    setBasket((prev) => [...prev, ...items]);
    toast.success(items.length === 1 ? 'Zum Wunsch-Korb hinzugefügt.' : `${items.length} Wünsche zum Korb hinzugefügt.`);
  }
  function removeFromBasket(key: string) {
    setBasket((prev) => prev.filter((i) => i.key !== key));
  }
  function clearBasket() {
    setBasket([]);
  }
  async function sendBasket() {
    try {
      await submitChangeRequestItems(basket.map(basketItemToInput));
      toast.success('Alle Änderungswünsche wurden gesendet.');
      setBasket([]);
    } catch (e) {
      toast.error('Wünsche konnten nicht gesendet werden. Bitte später erneut versuchen.');
      throw e;
    }
  }

  if (state.kind === 'loading') {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50">
        <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (state.kind === 'password-required') {
    return <PasswordGate previousAttemptFailed={state.previousAttemptFailed} onSubmit={loadShare} />;
  }

  if (state.kind === 'error') {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50 px-4">
        <div className="max-w-md text-center bg-white border border-slate-200/80 rounded-2xl p-8">
          <div className="inline-flex p-3 rounded-full bg-red-50 mb-3">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <h1 className="text-lg font-semibold text-slate-900">{state.message}</h1>
          <p className="text-sm text-slate-500 mt-2">
            {state.status === 410
              ? 'Bitte beim Absender einen neuen Link anfragen.'
              : 'Bitte prüfen Sie den Link in Ihrer E-Mail.'}
          </p>
        </div>
      </div>
    );
  }

  const { payload } = state;
  const { project, owner, positions, settings, snapshotHash } = payload;
  const summary = payload.summary ?? null;
  const showBreakdown = settings.showCostBreakdown !== false;
  const showCalculation = settings.showCalculation !== false;
  const brandHeader = settings.brandHeader;
  const isNachtrag = (payload.nachtragNumber ?? 0) > 0;
  const parentDate = payload.parent?.createdAt
    ? new Date(payload.parent.createdAt).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null;
  const shortHash = snapshotHash?.slice(0, 10) || null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Helmet>
        <title>Angebot · {project.name || 'Bauleistung'}</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex items-center gap-4">
          {owner.companyLogoUrl ? (
            <img
              src={owner.companyLogoUrl}
              alt={owner.companyName}
              className="h-10 w-auto"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-primary-500 grid place-items-center text-white font-bold">
              {(owner.companyName || owner.name || 'K').slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-slate-900 truncate">
              {owner.companyName || owner.name || 'Anbieter'}
            </h1>
            {owner.name && owner.companyName && owner.name !== owner.companyName && (
              <p className="text-xs text-slate-500 truncate">{owner.name}</p>
            )}
            {(owner.companyPhone || owner.contactEmail) && (
              <p className="text-xs text-slate-500 truncate mt-0.5 flex items-center gap-3 flex-wrap">
                {owner.companyPhone && (
                  <a href={`tel:${owner.companyPhone.replace(/\s+/g, '')}`} className="inline-flex items-center gap-1 hover:text-slate-800">
                    <Phone className="w-3 h-3" />
                    {owner.companyPhone}
                  </a>
                )}
                {owner.contactEmail && (
                  <a href={`mailto:${owner.contactEmail}`} className="inline-flex items-center gap-1 hover:text-slate-800">
                    <Mail className="w-3 h-3" />
                    {owner.contactEmail}
                  </a>
                )}
              </p>
            )}
          </div>
          <a
            href={`/api/panel/share/${token}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Angebot als PDF herunterladen"
            className="inline-flex items-center justify-center gap-1.5 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 px-3 sm:py-1.5 rounded-lg border border-slate-200 text-xs sm:text-sm text-slate-700 hover:bg-slate-50 whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">PDF</span>
          </a>
          {brandHeader === 'co-branded' && (
            <a
              href="https://kalku.de"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-400 hover:text-slate-600 hidden sm:inline-flex items-center gap-1"
            >
              powered by <strong className="text-primary-600">KALKU</strong>
            </a>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        {/* PART H: revision banner — surfaced when the calculator has edited
            after this share was last snapshotted. Customer can ask for an
            updated link (URL is the same — server resnapshots in place). */}
        {payload.hasNewerVersion && (
          <div
            data-testid="share-revision-banner"
            className="bg-amber-50 border border-amber-300 rounded-2xl px-5 py-4 flex items-start gap-3"
          >
            <RefreshCcw className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-semibold text-amber-900">
                Neue Version verfügbar
                {payload.latestVersionNumber && (
                  <span className="font-normal text-amber-800">
                    {' '}(v{payload.latestVersionNumber} statt v{project.versionNumber})
                  </span>
                )}
              </p>
              <p className="text-xs text-amber-800/90 mt-1 leading-relaxed">
                Der Anbieter hat das Angebot nach Ihrem ersten Aufruf bearbeitet.
                Bitte beim Absender (
                <a href={`mailto:${owner.contactEmail}`} className="underline font-medium">
                  {owner.contactEmail}
                </a>
                ) einen aktualisierten Link anfragen oder die Seite neu laden, sobald
                eine neue Schnappschuss-Version vorliegt.
                <strong className="block mt-1">
                  Ihre bisherigen Anmerkungen bleiben erhalten — sie sind dem Anbieter zugeordnet.
                </strong>
              </p>
            </div>
          </div>
        )}

        {/* Project meta */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <p
                className={clsx(
                  'text-xs font-semibold uppercase tracking-wider mb-1',
                  isNachtrag ? 'text-amber-700' : 'text-primary-600',
                )}
              >
                {isNachtrag
                  ? `Nachtrag N${payload.nachtragNumber}${parentDate ? ' · zum Angebot vom ' + parentDate : ''}`
                  : `Angebot${project.versionNumber > 1 ? ' · Version ' + project.versionNumber : ''}`}
              </p>
              <h2 className="text-2xl font-bold text-slate-900">
                {project.name || 'Bauleistung'}
              </h2>
              {project.service && (
                <p className="text-sm text-slate-600 mt-1">{project.service}</p>
              )}
              {project.client && (
                <p className="text-sm text-slate-500 mt-2">
                  <strong className="text-slate-700">An:</strong> {project.client}
                </p>
              )}
            </div>
            {project.deadline && (
              <div className="text-xs text-slate-500 inline-flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Bis: {formatDate(project.deadline)}
              </div>
            )}
          </div>

          {/* Bindefrist indicator — anchors §145 BGB for the customer */}
          {bindefrist && (
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-3 flex-wrap text-xs">
              <span className="inline-flex items-center gap-1.5 text-slate-600">
                <Clock className="w-3.5 h-3.5" />
                Erstellt am <strong className="text-slate-800">{formatDateLong(bindefrist.createdAt)}</strong>
              </span>
              <span className="text-slate-300">·</span>
              <span
                className={clsx(
                  'inline-flex items-center gap-1.5',
                  bindefrist.isExpired ? 'text-red-700 font-medium' : 'text-slate-600',
                )}
              >
                {bindefrist.isExpired ? 'Bindefrist abgelaufen am' : 'Gültig bis'}{' '}
                <strong className={clsx(bindefrist.isExpired ? 'text-red-700' : 'text-slate-800')}>
                  {formatDateLong(bindefrist.until)}
                </strong>
                <span className="text-slate-400">({bindefrist.days} Tage Bindefrist)</span>
              </span>
            </div>
          )}

          {settings.message && (
            <div className="mt-5 pt-5 border-t border-slate-100">
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
                <LinkifiedText text={settings.message} />
              </p>
            </div>
          )}

          {/* Toggle-gated button to the „04_Angebote" folder. The server only
              ships angeboteFolderUrl when showAngebote is on + the value is an
              http(s) URL; the regex here is a defensive second check before we
              render it as an href. Opens in a new tab (the folder lives on the
              firm's SharePoint, not in this app). */}
          {settings.showAngebote &&
            settings.angeboteFolderUrl &&
            /^https?:\/\//i.test(settings.angeboteFolderUrl) && (
              <div className="mt-5 pt-5 border-t border-slate-100">
                <a
                  href={settings.angeboteFolderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="share-angebote-button"
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-primary-200 bg-primary-50 text-sm font-semibold text-primary-700 hover:bg-primary-100 transition-colors"
                >
                  <FolderOpen className="w-4 h-4" />
                  Eingegangene Angebote ansehen
                  <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                </a>
                <p className="text-xs text-slate-400 mt-2">
                  Öffnet den Ordner mit den eingegangenen Lieferanten-Angeboten in einem neuen Tab.
                </p>
              </div>
            )}
        </div>

        {/* Kalkulations-Übersicht — the professional summary block. Gated by
            showTotals (master "show money" flag); inner detail by the two new
            flags. Hidden entirely on legacy snapshots without a summary. */}
        {settings.showTotals && summary && (
          <AngebotsUebersicht
            summary={summary}
            mwst={project.mwst}
            showMwst={settings.showMwst}
            showBreakdown={showBreakdown}
            showCalculation={showCalculation}
            isNachtrag={isNachtrag}
          />
        )}

        {/* Round 12: global "Gesamtangebot anpassen" — request a change to the
            Endbetrag or an overall cost type, with current→Wunsch values. */}
        {!submitted && settings.allowChangeRequests && (
          <GlobalChangeRequestPanel summary={summary} settings={settings} onAddToBasket={addToBasket} />
        )}

        {/* Positions */}
        <section className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden">
          <header className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="font-semibold text-slate-900">Leistungen</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isFiltered
                  ? `${displayedPositions.length} von ${priceablePositions.length} Positionen`
                  : `${priceablePositions.length} Positionen`}
              </p>
            </div>
          </header>

          <PositionFilterBar
            sortMode={sortMode}
            onSortMode={setSortMode}
            query={query}
            onQuery={setQuery}
            onlyCommented={onlyCommented}
            onOnlyCommented={setOnlyCommented}
            commentFilterAvailable={!submitted && settings.allowChangeRequests}
            commentedCount={priceablePositions.filter((p) => changes[p.id]?.text?.trim()).length}
          />

          <div className="divide-y divide-slate-100">
            {displayedPositions.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-slate-500">
                <Search className="w-5 h-5 mx-auto mb-2 text-slate-300" />
                Keine Position gefunden.
                {(query || onlyCommented) && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      setOnlyCommented(false);
                    }}
                    className="block mx-auto mt-2 text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Filter zurücksetzen
                  </button>
                )}
              </div>
            ) : (
              displayedPositions.map((p) => (
                <div
                  key={p.id}
                  className={clsx(
                    'px-6 py-4',
                    p.isHeader && 'bg-primary-50/40',
                  )}
                >
                  {p.isHeader ? (
                    /* PART N: KG/Titel heading wraps in full. */
                    <h4 className="font-semibold text-primary-700 whitespace-pre-wrap break-words leading-[1.45]">
                      {p.shortText}
                    </h4>
                  ) : (
                    <>
                      <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
                        <span className="text-xs font-mono text-slate-400 w-16 mt-0.5 flex-shrink-0 whitespace-pre">
                          {p.oz || '–'}
                        </span>
                        <div className="flex-1 min-w-0">
                          {/* PART N: full Bezeichnung wraps; no truncation, no
                              line-clamp. Customer always sees the complete text. */}
                          <p
                            data-testid={`share-bezeichnung-${p.id}`}
                            className="text-sm font-medium text-slate-900 whitespace-pre-wrap break-words leading-[1.45]"
                          >
                            {p.shortText}
                          </p>
                          {settings.showLongText !== false && p.longText && (
                            <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap break-words leading-[1.45]">
                              {p.longText}
                            </p>
                          )}
                          <p className="text-xs text-slate-500 mt-1.5 tabular-nums">
                            {formatNumber(p.quantity)} {p.unit} × {formatEUR(p.ep)}
                          </p>
                          {showBreakdown && <PositionCostBreakdown position={p} />}
                        </div>
                        <div className="text-right tabular-nums sm:w-32 flex-shrink-0">
                          <p className="font-semibold text-slate-900">{formatEUR(p.gp)}</p>
                        </div>
                      </div>
                      {!submitted && settings.allowChangeRequests && (
                        <PositionCommentTrigger
                          positionId={p.id}
                          positionShortText={p.shortText}
                          draft={changes[p.id]}
                          onOpen={() => setPanelPositionId(p.id)}
                        />
                      )}
                    </>
                  )}
                </div>
              ))
            )}
          </div>

          {settings.showTotals && (
            <footer className="border-t border-slate-200 px-6 py-5 bg-slate-50/60">
              <dl className="ml-auto max-w-xs space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-slate-600">Netto{isNachtrag ? ' (Nachtrag)' : ''}</dt>
                  <dd className="text-slate-900 tabular-nums">{formatEUR(visibleTotal.netto)}</dd>
                </div>
                {settings.showMwst && (
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-600">
                      MwSt {(project.mwst * 100).toFixed(0)} %
                    </dt>
                    <dd className="text-slate-900 tabular-nums">{formatEUR(visibleTotal.mwst)}</dd>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 mt-1 border-t border-slate-200">
                  <dt className="font-semibold text-slate-900">
                    {settings.showMwst ? 'Brutto-Summe' : 'Gesamt'}
                    {isNachtrag && <span className="text-xs font-normal text-amber-700 ml-1">(Nachtrag)</span>}
                  </dt>
                  <dd className="font-bold text-slate-900 tabular-nums text-lg">
                    {formatEUR(visibleTotal.brutto)}
                  </dd>
                </div>
                {isNachtrag && payload.parent && (
                  <div className="mt-3 pt-3 border-t border-amber-200/60 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Ursprüngliches Angebot vom {parentDate}</span>
                      <span className="tabular-nums">{formatEUR(payload.parent.brutto)}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500">
                      <span>+ dieser Nachtrag N{payload.nachtragNumber}</span>
                      <span className="tabular-nums">{formatEUR(visibleTotal.brutto)}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-amber-300/40 text-amber-800 font-semibold">
                      <span>= Gesamt (Original + Nachträge)</span>
                      <span className="tabular-nums text-base">
                        {formatEUR(payload.parent.brutto + visibleTotal.brutto)}
                      </span>
                    </div>
                  </div>
                )}
              </dl>
            </footer>
          )}
        </section>

        {/* Action section */}
        {submitted ? (
          <SubmittedState type={submitted} ownerName={owner.companyName || owner.name} />
        ) : (
          <ActionSection
            settings={settings}
            customerName={customerName}
            customerEmail={customerEmail}
            generalMessage={generalMessage}
            onName={setCustomerName}
            onEmail={setCustomerEmail}
            onMessage={setGeneralMessage}
            changes={Object.values(changes)}
            onApprove={submitApprove}
            onSendChanges={submitChanges}
            submitting={submitting}
            hasPriceableContent={positions.some((p) => !p.isHeader)}
          />
        )}

        <footer className="text-xs text-slate-400 text-center py-6 space-y-2">
          {shortHash && (
            <p className="inline-flex items-center justify-center gap-1.5 text-slate-500">
              <Fingerprint className="w-3.5 h-3.5" />
              <span>
                Dokument-Fingerabdruck:{' '}
                <code className="font-mono text-[10px] tracking-wider bg-slate-100 px-1.5 py-0.5 rounded">{shortHash}…</code>
              </span>
              <span className="text-slate-300">·</span>
              <span title={snapshotHash || ''} className="cursor-help">SHA-256</span>
            </p>
          )}
          {brandHeader === 'co-branded' ? (
            <p>
              Sicher gehostet auf{' '}
              <a href="https://kalku.de" className="underline hover:text-slate-600" target="_blank" rel="noreferrer">
                kalku.de
              </a>{' '}
              · Keine Cookies, kein Tracking.
            </p>
          ) : (
            <p>Vertrauliches Angebot — bitte nicht weiterleiten.</p>
          )}
        </footer>
      </main>

      {/* Sticky bottom totals bar — shows running brutto while customer scrolls */}
      {settings.showTotals && !submitted && (
        <div className="sticky bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.04)] pb-[env(safe-area-inset-bottom)]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-4 flex-wrap min-w-0">
              <span className="text-slate-500 hidden sm:inline">Netto <strong className="text-slate-800 tabular-nums">{formatEUR(visibleTotal.netto)}</strong></span>
              {settings.showMwst && (
                <span className="text-slate-500 hidden sm:inline">+ MwSt <strong className="text-slate-800 tabular-nums">{formatEUR(visibleTotal.mwst)}</strong></span>
              )}
              <span className="text-slate-900 font-bold tabular-nums text-base sm:text-lg">
                = {formatEUR(visibleTotal.brutto)} <span className="text-xs font-normal text-slate-500">{settings.showMwst ? 'brutto' : 'gesamt'}</span>
              </span>
            </div>
            {settings.allowApproval && (
              <a
                href="#approve-form"
                className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 sm:px-3 sm:py-1.5 rounded-lg bg-emerald-600 text-white text-xs sm:text-sm font-semibold hover:bg-emerald-700 whitespace-nowrap"
              >
                <ShieldCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Angebot annehmen</span>
                <span className="sm:hidden">Annehmen</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* PART G: side-panel for per-position comments. Renders absolutely
          fixed; doesn't share the document flow.
          PART K: also wires onSubmitToServer so the panel POSTs to the
          new /comments endpoint on "Anmerkung senden". */}
      <PositionCommentPanel
        open={panelPositionId !== null}
        position={panelPositionId ? positions.find((p) => p.id === panelPositionId) ?? null : null}
        draft={panelPositionId ? changes[panelPositionId] : undefined}
        customerName={customerName}
        customerEmail={customerEmail}
        onClose={() => setPanelPositionId(null)}
        onSet={(patch) => panelPositionId && setChange(panelPositionId, patch)}
        onClear={() => panelPositionId && removeChange(panelPositionId)}
        onSetCustomerName={setCustomerName}
        onSetCustomerEmail={setCustomerEmail}
        showCostBreakdown={showBreakdown}
        onAddChangeRequests={addToBasket}
        onSubmitToServer={async (input) => {
          // Map the legacy panel intent enum (modify | remove | comment)
          // to the richer PART K enum. 'modify' is the most common case
          // and best maps to 'change_menge' as the canonical "I want
          // something different" bucket; 'remove' has no direct match so
          // it lands in 'other' with the user's free-text carrying intent.
          const intentMap: Record<typeof input.intent, 'change_menge' | 'other'> = {
            modify: 'change_menge',
            remove: 'other',
            comment: 'other',
          };
          // Best-effort retrieval of the session-cached password (set in
          // loadShare on successful unlock). Lets a password-gated share
          // post comments without re-prompting.
          let storedPwd: string | undefined;
          try { storedPwd = window.sessionStorage.getItem(sessionKey) ?? undefined; } catch { /* ignore */ }
          await api.public.postComment(token, {
            positionOz: input.positionOz,
            intent: intentMap[input.intent],
            text: input.text,
            authorName: input.authorName,
            authorEmail: input.authorEmail,
          }, storedPwd);
          toast.success('Anmerkung gesendet.');
        }}
      />

      {/* Round 12d: Wunsch-Korb — review + send all collected wishes at once. */}
      {!submitted && settings.allowChangeRequests && (
        <WunschKorb
          items={basket}
          customerName={customerName}
          customerEmail={customerEmail}
          onSetCustomerName={setCustomerName}
          onSetCustomerEmail={setCustomerEmail}
          onRemove={removeFromBasket}
          onClear={clearBasket}
          onSend={sendBasket}
        />
      )}
    </div>
  );
}

/** Shared color language for the four cost types — used by both the summary
 *  composition bar and the per-position breakdown. Class strings are literal
 *  (not interpolated) so Tailwind's content scanner keeps them. */
const COST_STYLE = {
  lohn: { label: 'Lohn / Zeit', short: 'Lohn', bar: 'bg-sky-500', dot: 'bg-sky-500', text: 'text-sky-700' },
  material: { label: 'Material', short: 'Material', bar: 'bg-emerald-500', dot: 'bg-emerald-500', text: 'text-emerald-700' },
  geraete: { label: 'Geräte', short: 'Geräte', bar: 'bg-amber-500', dot: 'bg-amber-500', text: 'text-amber-700' },
  nu: { label: 'Nachunternehmer', short: 'NU', bar: 'bg-violet-500', dot: 'bg-violet-500', text: 'text-violet-700' },
} as const;
type CostKey = keyof typeof COST_STYLE;
const COST_ORDER: CostKey[] = ['lohn', 'material', 'geraete', 'nu'];

function formatPct(n: number, digits = 1): string {
  return (
    new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(n * 100) + ' %'
  );
}

/**
 * Round 12: the global "Gesamtangebot anpassen" panel. Lets the customer pick a
 * change to the Endbetrag or an overall cost type (Lohn / Material / Gerät /
 * Arbeitszeit), each as a current→Wunsch value, and drop it into the Wunsch-Korb.
 */
function GlobalChangeRequestPanel({
  summary,
  settings,
  onAddToBasket,
}: {
  summary: ShareCalcSummary | null;
  settings: ShareSettings;
  onAddToBasket: (items: WunschBasketItem[]) => void;
}) {
  const [drafts, setDrafts] = useState<ChangeRequestDraftMap>({});
  const fields = useMemo(() => availableFields('global', settings), [settings]);
  const items = useMemo(() => assembleChangeRequests('global', undefined, drafts), [drafts]);

  if (fields.length === 0) return null;

  return (
    <section className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden" data-testid="global-change-request">
      <header className="px-6 py-4 border-b border-slate-100">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-primary-600" />
          Gesamtes Angebot anpassen
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Sie möchten beim Endbetrag oder einer Kostenart etwas ändern? Wählen Sie aus, was
          angepasst werden soll, nennen Sie Ihren Wunschwert und legen Sie ihn in den Wunsch-Korb.
        </p>
      </header>
      <div className="px-6 py-4 space-y-3">
        <ChangeRequestFields
          scope="global"
          fields={fields}
          currentValueFor={(f) => globalCurrentValue(f, summary)}
          drafts={drafts}
          onChange={setDrafts}
        />
        <div className="flex items-center justify-end gap-3">
          {items.length > 0 && (
            <span className="text-[11px] text-slate-400">
              {items.length} {items.length === 1 ? 'Wunsch' : 'Wünsche'} ausgewählt
            </span>
          )}
          <button
            type="button"
            data-testid="global-cr-submit"
            disabled={items.length === 0}
            onClick={() => {
              onAddToBasket(
                draftsToBasketItems('global', drafts, {
                  where: 'Gesamtangebot',
                  currentValueFor: (f) => globalCurrentValue(f, summary),
                }),
              );
              setDrafts({});
            }}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" /> In den Wunsch-Korb
          </button>
        </div>
      </div>
    </section>
  );
}

/**
 * The professional "Angebotskalkulation" summary block at the top of the share.
 * Three tiers, each independently gated:
 *   1. Angebotssumme (always, when showTotals) — netto / brutto hero.
 *   2. Kostenzusammensetzung (showBreakdown) — VERKAUF split as a stacked bar.
 *   3. Kalkulation (showCalculation) — Einkauf / Zuschlag / Verkauf per cost
 *      type, Überschuss, and project KPIs.
 */
function AngebotsUebersicht({
  summary,
  mwst,
  showMwst,
  showBreakdown,
  showCalculation,
  isNachtrag,
}: {
  summary: ShareCalcSummary;
  mwst: number;
  showMwst: boolean;
  showBreakdown: boolean;
  showCalculation: boolean;
  isNachtrag: boolean;
}) {
  const composition = COST_ORDER.map((k) => ({
    key: k,
    ...COST_STYLE[k],
    vk: summary.costTypes[k].vk,
    pct: summary.netto > 0 ? summary.costTypes[k].vk / summary.netto : 0,
  })).filter((c) => c.vk > 0);

  const calcRows = COST_ORDER.map((k) => ({
    key: k,
    ...COST_STYLE[k],
    ct: summary.costTypes[k],
  })).filter((r) => r.ct.ek !== 0 || r.ct.vk !== 0);

  return (
    <section className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 space-y-7">
      {/* 1 — Angebotssumme hero */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary-600 mb-2">
          Angebotskalkulation{isNachtrag ? ' · Nachtrag' : ''}
        </p>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs text-slate-500">Angebotssumme netto</p>
            <p className="text-3xl sm:text-4xl font-bold text-slate-900 tabular-nums leading-tight">
              {formatEUR(summary.netto)}
            </p>
          </div>
          {showMwst && (
            <div className="text-right">
              <p className="text-xs text-slate-500">zzgl. {formatPct(mwst, 0)} MwSt → brutto</p>
              <p className="text-2xl font-semibold text-primary-700 tabular-nums leading-tight">
                {formatEUR(summary.brutto)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 2 — Kostenzusammensetzung (VERKAUF split) */}
      {showBreakdown && composition.length > 0 && (
        <div className="pt-5 border-t border-slate-100">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 inline-flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            Zusammensetzung
          </p>
          <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-100">
            {composition.map((c) => (
              <div
                key={c.key}
                className={c.bar}
                style={{ width: `${(c.pct * 100).toFixed(2)}%` }}
                title={`${c.label}: ${formatEUR(c.vk)} (${formatPct(c.pct)})`}
              />
            ))}
          </div>
          <dl className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {composition.map((c) => (
              <div key={c.key} className="min-w-0">
                <dt className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className={clsx('w-2 h-2 rounded-full flex-shrink-0', c.dot)} />
                  <span className="truncate">{c.label}</span>
                </dt>
                <dd className="mt-0.5 text-sm font-semibold text-slate-900 tabular-nums">
                  {formatEUR(c.vk)}
                  <span className="ml-1 text-xs font-normal text-slate-400">{formatPct(c.pct)}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {/* 3 — Kalkulation: Einkauf / Zuschlag / Verkauf + Überschuss + KPIs */}
      {showCalculation && (
        <div className="pt-5 border-t border-slate-100 space-y-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 inline-flex items-center gap-1.5">
            <Calculator className="w-3.5 h-3.5" />
            Kalkulation
          </p>
          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-xs text-slate-400">
                  <th className="text-left font-medium pb-2">Kostenart</th>
                  <th className="text-right font-medium pb-2">Einkauf</th>
                  <th className="text-right font-medium pb-2">Zuschlag</th>
                  <th className="text-right font-medium pb-2">Verkauf</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {calcRows.map((r) => (
                  <tr key={r.key}>
                    <td className="py-2 text-slate-700">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={clsx('w-2 h-2 rounded-full flex-shrink-0', r.dot)} />
                        {r.label}
                      </span>
                    </td>
                    <td className="py-2 text-right tabular-nums text-slate-500">{formatEUR(r.ct.ek)}</td>
                    <td className="py-2 text-right tabular-nums text-slate-500">
                      {r.ct.ek > 0 ? formatPct(r.ct.zuschlagPct) : '–'}
                    </td>
                    <td className="py-2 text-right tabular-nums font-medium text-slate-900">{formatEUR(r.ct.vk)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 font-semibold text-slate-900">
                  <td className="pt-2.5">Summe</td>
                  <td className="pt-2.5 text-right tabular-nums">{formatEUR(summary.ekTotal)}</td>
                  <td className="pt-2.5" />
                  <td className="pt-2.5 text-right tabular-nums">{formatEUR(summary.netto)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3">
            <span className="text-sm font-medium text-emerald-900">
              Überschuss <span className="text-xs font-normal text-emerald-700/80">(Verkauf − Einkauf)</span>
            </span>
            <span className="text-lg font-bold text-emerald-700 tabular-nums">{formatEUR(summary.ueberschuss)}</span>
          </div>

          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Kpi icon={<Users className="w-4 h-4" />} label="Mitarbeiter" value={formatNumber(summary.mitarbeiter)} />
            <Kpi icon={<Clock className="w-4 h-4" />} label="Gesamtstunden" value={`${formatNumber(summary.totalHours)} h`} />
            <Kpi icon={<Calendar className="w-4 h-4" />} label="Arbeitstage" value={formatNumber(summary.arbeitstage)} />
            <Kpi icon={<Calendar className="w-4 h-4" />} label="Monate" value={formatNumber(summary.monate)} />
          </dl>
        </div>
      )}
    </section>
  );
}

function Kpi({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200/80 px-3 py-2.5">
      <dt className="flex items-center gap-1.5 text-xs text-slate-500">
        <span className="text-slate-400">{icon}</span>
        <span className="truncate">{label}</span>
      </dt>
      <dd className="mt-0.5 text-base font-semibold text-slate-900 tabular-nums">{value}</dd>
    </div>
  );
}

/**
 * Compact per-position Material/Gerät/Zeit split shown under each line. Renders
 * only when the snapshot carries the breakdown AND the line genuinely mixes ≥2
 * cost types (a single-component line adds no info beyond its GP). Values are
 * the GP split (per-unit × Menge), so they sum to the line's Gesamtpreis.
 */
function PositionCostBreakdown({ position }: { position: SharePosition }) {
  const parts = COST_ORDER.map((k) => {
    const gpKey = ({ lohn: 'gpLohn', material: 'gpMaterial', geraete: 'gpGeraet', nu: 'gpNu' } as const)[k];
    const gp = position[gpKey];
    return { key: k, ...COST_STYLE[k], value: gp ?? 0, hasData: gp !== undefined };
  });
  if (!parts.some((p) => p.hasData)) return null;
  const nonZero = parts.filter((p) => Math.abs(p.value) > 0.005);
  if (nonZero.length < 2) return null;
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
      {nonZero.map((p) => (
        <span key={p.key} className="inline-flex items-center gap-1">
          <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', p.dot)} />
          {p.short} <span className="tabular-nums text-slate-700">{formatEUR(p.value)}</span>
        </span>
      ))}
    </div>
  );
}

/** Sort / search / filter toolbar above the position list. Display-only. */
function PositionFilterBar({
  sortMode,
  onSortMode,
  query,
  onQuery,
  onlyCommented,
  onOnlyCommented,
  commentFilterAvailable,
  commentedCount,
}: {
  sortMode: SortMode;
  onSortMode: (m: SortMode) => void;
  query: string;
  onQuery: (v: string) => void;
  onlyCommented: boolean;
  onOnlyCommented: (v: boolean) => void;
  commentFilterAvailable: boolean;
  commentedCount: number;
}) {
  return (
    <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2 flex-wrap">
      <div className="relative flex-1 min-w-[160px]">
        <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Position suchen…"
          aria-label="Positionen durchsuchen"
          className="input h-9 pl-8 pr-8 text-sm w-full"
        />
        {query && (
          <button
            type="button"
            onClick={() => onQuery('')}
            aria-label="Suche leeren"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <label className="inline-flex items-center gap-1.5 text-sm text-slate-600">
        <ArrowDownWideNarrow className="w-4 h-4 text-slate-400" />
        <span className="sr-only">Sortierung</span>
        <select
          value={sortMode}
          onChange={(e) => onSortMode(e.target.value as SortMode)}
          aria-label="Positionen sortieren"
          className="input h-9 text-sm py-0 pr-7"
        >
          <option value="order">Reihenfolge</option>
          <option value="expensive">Teuerste zuerst</option>
          <option value="cheap">Günstigste zuerst</option>
          <option value="oz">Nach OZ</option>
        </select>
      </label>
      {commentFilterAvailable && (
        <button
          type="button"
          onClick={() => onOnlyCommented(!onlyCommented)}
          aria-pressed={onlyCommented}
          className={clsx(
            'h-9 px-3 rounded-lg border text-sm inline-flex items-center gap-1.5 whitespace-nowrap',
            onlyCommented
              ? 'border-amber-300 bg-amber-50 text-amber-800'
              : 'border-slate-200 text-slate-600 hover:bg-white',
          )}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Nur kommentierte
          {commentedCount > 0 && <span className="tabular-nums">({commentedCount})</span>}
        </button>
      )}
    </div>
  );
}

/**
 * Inline trigger that opens the side-panel for a given position. If a
 * draft already exists, surfaces a chip-style indicator showing the intent
 * + a snippet of the comment so the customer remembers what they wrote.
 * Click anywhere on the trigger → opens the panel.
 */
function PositionCommentTrigger({
  positionId: _positionId,
  positionShortText,
  draft,
  onOpen,
}: {
  positionId: string;
  positionShortText: string;
  draft: ChangeDraft | undefined;
  onOpen: () => void;
}) {
  if (draft && draft.text.trim().length > 0) {
    const intentLabel =
      draft.type === 'modify' ? 'Änderung' : draft.type === 'remove' ? 'Streichen' : 'Frage';
    const intentColor =
      draft.type === 'modify'
        ? 'border-amber-300 bg-amber-50/80 text-amber-900'
        : draft.type === 'remove'
          ? 'border-rose-300 bg-rose-50/80 text-rose-900'
          : 'border-sky-300 bg-sky-50/80 text-sky-900';
    return (
      <button
        type="button"
        onClick={onOpen}
        data-testid="position-comment-trigger-active"
        className={clsx(
          'mt-2 w-full text-left inline-flex items-start gap-2 px-3 py-2 rounded-lg border text-xs',
          intentColor,
          'hover:brightness-95',
        )}
      >
        <MessageSquare className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <span className="flex-1 min-w-0">
          <strong className="font-semibold">{intentLabel}: </strong>
          <span className="line-clamp-2 break-words">{draft.text}</span>
        </span>
        <ChevronRight className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 opacity-60" />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onOpen}
      data-testid="position-comment-trigger"
      className="mt-2 text-xs inline-flex items-center gap-1 text-slate-500 hover:text-primary-600"
    >
      <MessageSquarePlus className="w-3.5 h-3.5" />
      Anmerkung zu „{positionShortText.slice(0, 28)}{positionShortText.length > 28 ? '…' : ''}"
    </button>
  );
}

/**
 * PART H: password gate. Rendered when the share endpoint returns 401.
 * On submit, calls loadShare(password) which retries the GET with the
 * X-Share-Password header. The server is expected to rate-limit failed
 * attempts (client-side has no rate limiter beyond the natural delay of
 * a network round-trip).
 *
 * State design: lifts password into local state (NOT shareView's state)
 * so the input doesn't survive an unmount + remount when the parent
 * re-renders the loading spinner mid-request.
 */
function PasswordGate({
  previousAttemptFailed,
  onSubmit,
}: {
  previousAttemptFailed?: boolean;
  onSubmit: (password: string) => void | Promise<void>;
}) {
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  return (
    <div
      className="min-h-screen grid place-items-center bg-slate-50 px-4"
      data-testid="share-password-gate"
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!password) return;
          setSubmitting(true);
          try {
            await onSubmit(password);
          } finally {
            setSubmitting(false);
          }
        }}
        className="max-w-md w-full bg-white border border-slate-200/80 rounded-2xl p-7 sm:p-8 shadow-sm"
      >
        <div className="inline-flex p-3 rounded-full bg-primary-50 mb-3">
          <Lock className="w-5 h-5 text-primary-600" />
        </div>
        <h1 className="text-lg font-semibold text-slate-900">
          Geschütztes Angebot
        </h1>
        <p className="text-sm text-slate-500 mt-1 leading-relaxed">
          Der Anbieter hat diesen Link mit einem Passwort versehen. Bitte das
          Passwort eingeben, das Sie per Telefon, SMS oder separater E-Mail
          erhalten haben.
        </p>

        {previousAttemptFailed && (
          <div className="mt-4 flex items-start gap-2 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-700">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Passwort stimmt nicht. Bitte erneut versuchen.</span>
          </div>
        )}

        <label className="block mt-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Passwort
          </span>
          <input
            type="password"
            autoFocus
            autoComplete="off"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 input"
            placeholder="••••••••"
          />
        </label>

        <button
          type="submit"
          disabled={!password || submitting}
          className="mt-5 w-full inline-flex items-center justify-center gap-2 h-11 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700 disabled:opacity-50"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
          Angebot öffnen
        </button>

        <p className="text-[11px] text-slate-400 mt-4 text-center">
          Wir speichern das Passwort nur in dieser Browser-Sitzung. Nach dem
          Schließen des Tabs wird es vergessen.
        </p>
      </form>
    </div>
  );
}

function ActionSection({
  settings,
  customerName,
  customerEmail,
  generalMessage,
  onName,
  onEmail,
  onMessage,
  changes,
  onApprove,
  onSendChanges,
  submitting,
  hasPriceableContent,
}: {
  settings: CustomerViewPayload['settings'];
  customerName: string;
  customerEmail: string;
  generalMessage: string;
  onName: (v: string) => void;
  onEmail: (v: string) => void;
  onMessage: (v: string) => void;
  changes: ChangeDraft[];
  onApprove: () => void;
  onSendChanges: () => void;
  submitting: boolean;
  hasPriceableContent: boolean;
}) {
  const hasChanges = changes.some((c) => c.text.trim().length > 0) || generalMessage.trim().length > 0;
  const canSubmit = customerName.trim().length > 0;
  return (
    <section id="approve-form" className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 space-y-5">
      <div>
        <h3 className="font-semibold text-slate-900">Ihre Rückmeldung</h3>
        <p className="text-sm text-slate-500 mt-1">
          Damit wir Sie zuordnen können, bitten wir um Ihren Namen.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-medium text-slate-700">Ihr Name *</span>
          <input
            value={customerName}
            onChange={(e) => onName(e.target.value)}
            placeholder="z. B. Familie Schmidt"
            className="mt-1 input"
            autoComplete="name"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-700">E-Mail (optional)</span>
          <input
            value={customerEmail}
            onChange={(e) => onEmail(e.target.value)}
            type="email"
            placeholder="ihre@email.de"
            className="mt-1 input"
            autoComplete="email"
          />
        </label>
      </div>

      <label className="block">
        <span className="text-xs font-medium text-slate-700">Nachricht (optional)</span>
        <textarea
          value={generalMessage}
          onChange={(e) => onMessage(e.target.value)}
          placeholder="Allgemeine Anmerkung an den Anbieter…"
          className="mt-1 input min-h-[80px] resize-y"
        />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100">
        {settings.allowApproval && (
          <button
            type="button"
            disabled={!canSubmit || submitting || !hasPriceableContent}
            onClick={onApprove}
            title={!hasPriceableContent ? 'Dieses Angebot enthält keine bepreisten Positionen.' : undefined}
            className={clsx(
              'inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl',
              'text-base font-semibold text-white',
              'bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed',
              'shadow-sm shadow-emerald-600/10 transition-all',
            )}
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
            Angebot annehmen
          </button>
        )}
        {settings.allowChangeRequests && (
          <button
            type="button"
            disabled={!canSubmit || submitting || !hasChanges}
            onClick={onSendChanges}
            className={clsx(
              'inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl',
              'text-base font-semibold text-amber-700',
              'bg-amber-50 border border-amber-200 hover:bg-amber-100',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-all',
            )}
          >
            <MessageSquarePlus className="w-5 h-5" />
            Rückmeldung senden ({changes.filter((c) => c.text.trim()).length})
          </button>
        )}
      </div>

      {!canSubmit && (
        <p className="text-xs text-slate-500 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" />
          Bitte Ihren Namen eingeben, um senden zu können.
        </p>
      )}

      <p className="text-xs text-slate-400 leading-relaxed pt-2 border-t border-slate-100">
        <Building2 className="w-3 h-3 inline mr-1 -mt-0.5" />
        Mit dem Klick auf <strong>Angebot annehmen</strong> erklären Sie die rechtsverbindliche
        Annahme dieses Angebots (§ 145 ff. BGB). Datum, IP-Adresse und Ihr Name werden zu
        Beweiszwecken protokolliert.
      </p>
    </section>
  );
}

function SubmittedState({ type, ownerName }: { type: 'approve' | 'changes'; ownerName: string }) {
  return (
    <section className="bg-white border border-emerald-200 rounded-2xl p-8 text-center">
      <div className="inline-flex p-3 rounded-full bg-emerald-50 mb-3">
        <Check className="w-7 h-7 text-emerald-600" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900">
        {type === 'approve' ? 'Vielen Dank — Angebot angenommen' : 'Rückmeldung gesendet'}
      </h3>
      <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
        {type === 'approve'
          ? `${ownerName} hat Ihre Annahme erhalten und meldet sich mit den nächsten Schritten.`
          : `${ownerName} hat Ihre Anmerkungen erhalten und wird Ihnen eine überarbeitete Fassung zukommen lassen.`}
      </p>
    </section>
  );
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }).format(n);
}

function formatDate(iso: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return iso;
  }
}

function formatDateLong(d: Date): string {
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
}

/**
 * Render text with http(s) URLs turned into safe clickable links. Splits on a
 * capturing URL regex (odd indices are the matched URLs) and renders plain
 * strings + <a> elements — no dangerouslySetInnerHTML, so the customer's
 * greeting can't inject markup. External links get rel="noopener noreferrer"
 * (reverse-tabnabbing guard) + target="_blank".
 */
function LinkifiedText({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 underline decoration-primary-300 underline-offset-2 break-all hover:text-primary-700"
          >
            {part}
          </a>
        ) : (
          part
        ),
      )}
    </>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Check,
  Loader2,
  AlertCircle,
  MessageSquarePlus,
  X,
  Building2,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import clsx from 'clsx';
import { api, ApiError } from '@/lib/api';
import type { CustomerViewPayload } from '@/features/kalkulation/types';
import { formatEUR } from '@/features/kalkulation/calc';

type ChangeDraft = { positionId: string; type: 'modify' | 'remove' | 'comment'; text: string };
type ViewState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string; status?: number }
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

  useEffect(() => {
    let alive = true;
    (async () => {
      setState({ kind: 'loading' });
      try {
        const payload = await api.public.getShare(token);
        if (!alive) return;
        if (payload.settings.customerName) setCustomerName(payload.settings.customerName);
        if (payload.settings.customerEmail) setCustomerEmail(payload.settings.customerEmail);
        setState({ kind: 'ready', payload });
      } catch (err) {
        if (!alive) return;
        if (err instanceof ApiError && err.status === 410) {
          setState({ kind: 'error', message: 'Dieser Link wurde widerrufen.', status: 410 });
        } else if (err instanceof ApiError && err.status === 404) {
          setState({ kind: 'error', message: 'Link nicht gefunden.', status: 404 });
        } else {
          setState({ kind: 'error', message: 'Angebot konnte nicht geladen werden.' });
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  const visibleTotal = useMemo(() => {
    if (state.kind !== 'ready') return { netto: 0, mwst: 0, brutto: 0 };
    const netto = state.payload.positions.reduce((s, p) => (p.isHeader ? s : s + p.gp), 0);
    const mwst = state.payload.settings.showMwst ? netto * state.payload.project.mwst : 0;
    return { netto, mwst, brutto: netto + mwst };
  }, [state]);

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
      window.alert('Annahme konnte nicht gesendet werden. Bitte später erneut versuchen.');
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
      window.alert('Rückmeldung konnte nicht gesendet werden. Bitte später erneut versuchen.');
    } finally {
      setSubmitting(false);
    }
  }

  if (state.kind === 'loading') {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50">
        <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
      </div>
    );
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
              ? 'Der Anbieter hat diesen Link inzwischen widerrufen. Bitte beim Absender einen neuen Link anfragen.'
              : 'Bitte prüfen Sie den Link in Ihrer E-Mail.'}
          </p>
        </div>
      </div>
    );
  }

  const { payload } = state;
  const { project, owner, positions, settings } = payload;
  const brandHeader = settings.brandHeader;

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
            <p className="text-xs text-slate-500 truncate">{owner.email}</p>
          </div>
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
        {/* Project meta */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary-600 mb-1">
                Angebot {project.versionNumber > 1 ? `· Version ${project.versionNumber}` : ''}
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

          {settings.message && (
            <div className="mt-5 pt-5 border-t border-slate-100">
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {settings.message}
              </p>
            </div>
          )}
        </div>

        {/* Positions */}
        <section className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden">
          <header className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Leistungen</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {positions.filter((p) => !p.isHeader).length} Positionen
            </p>
          </header>

          <div className="divide-y divide-slate-100">
            {positions.map((p) => (
              <div
                key={p.id}
                className={clsx(
                  'px-6 py-4',
                  p.isHeader && 'bg-primary-50/40',
                )}
              >
                {p.isHeader ? (
                  <h4 className="font-semibold text-primary-700">{p.shortText}</h4>
                ) : (
                  <>
                    <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
                      <span className="text-xs font-mono text-slate-400 w-12 mt-0.5 flex-shrink-0">
                        {p.oz || '–'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900">{p.shortText}</p>
                        {p.longText && (
                          <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap leading-relaxed">
                            {p.longText}
                          </p>
                        )}
                        <p className="text-xs text-slate-500 mt-1.5 tabular-nums">
                          {formatNumber(p.quantity)} {p.unit} × {formatEUR(p.ep)}
                        </p>
                      </div>
                      <div className="text-right tabular-nums sm:w-32 flex-shrink-0">
                        <p className="font-semibold text-slate-900">{formatEUR(p.gp)}</p>
                      </div>
                    </div>
                    {!submitted && settings.allowChangeRequests && (
                      <PositionFeedback
                        position={p}
                        draft={changes[p.id]}
                        onSet={(patch) => setChange(p.id, patch)}
                        onClear={() => removeChange(p.id)}
                      />
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          {settings.showTotals && (
            <footer className="border-t border-slate-200 px-6 py-5 bg-slate-50/60">
              <dl className="ml-auto max-w-xs space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-slate-600">Netto</dt>
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
                  </dt>
                  <dd className="font-bold text-slate-900 tabular-nums text-lg">
                    {formatEUR(visibleTotal.brutto)}
                  </dd>
                </div>
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
          />
        )}

        <footer className="text-xs text-slate-400 text-center py-6">
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
    </div>
  );
}

function PositionFeedback({
  position,
  draft,
  onSet,
  onClear,
}: {
  position: { id: string; shortText: string };
  draft: ChangeDraft | undefined;
  onSet: (patch: Partial<ChangeDraft>) => void;
  onClear: () => void;
}) {
  if (!draft) {
    return (
      <button
        type="button"
        onClick={() => onSet({ type: 'modify', text: '' })}
        className="mt-2 text-xs inline-flex items-center gap-1 text-slate-500 hover:text-primary-600"
      >
        <MessageSquarePlus className="w-3.5 h-3.5" />
        Anmerkung / Änderung zu „{position.shortText.slice(0, 28)}{position.shortText.length > 28 ? '…' : ''}"
      </button>
    );
  }
  return (
    <div className="mt-3 p-3 rounded-xl border border-amber-200 bg-amber-50/60">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <label className="inline-flex items-center gap-1 text-xs">
          <input
            type="radio"
            checked={draft.type === 'modify'}
            onChange={() => onSet({ type: 'modify' })}
            className="text-primary-600"
          />
          <span className="text-slate-700">Änderung wünschen</span>
        </label>
        <label className="inline-flex items-center gap-1 text-xs">
          <input
            type="radio"
            checked={draft.type === 'remove'}
            onChange={() => onSet({ type: 'remove' })}
            className="text-primary-600"
          />
          <span className="text-slate-700">Streichen</span>
        </label>
        <label className="inline-flex items-center gap-1 text-xs">
          <input
            type="radio"
            checked={draft.type === 'comment'}
            onChange={() => onSet({ type: 'comment' })}
            className="text-primary-600"
          />
          <span className="text-slate-700">Nur Frage</span>
        </label>
        <button
          onClick={onClear}
          className="ml-auto text-xs text-slate-400 hover:text-slate-600 inline-flex items-center gap-1"
        >
          <X className="w-3 h-3" /> Verwerfen
        </button>
      </div>
      <textarea
        autoFocus
        placeholder={
          draft.type === 'modify'
            ? 'z. B. Bitte 8 m² statt 10 m². Oder: lieber Fliesen 60×60 statt 30×30.'
            : draft.type === 'remove'
              ? 'z. B. Diese Position nicht beauftragen.'
              : 'z. B. Welches Material ist hier vorgesehen?'
        }
        value={draft.text}
        onChange={(e) => onSet({ text: e.target.value })}
        className="w-full text-sm bg-white border border-amber-200 rounded-lg px-3 py-2 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-200 min-h-[56px]"
      />
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
}) {
  const hasChanges = changes.some((c) => c.text.trim().length > 0) || generalMessage.trim().length > 0;
  const canSubmit = customerName.trim().length > 0;
  return (
    <section className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 space-y-5">
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
            disabled={!canSubmit || submitting}
            onClick={onApprove}
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

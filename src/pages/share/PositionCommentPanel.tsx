/**
 * Side-panel comment composer for the public ShareView (PART G).
 *
 * Opens when a customer clicks any position row in the LV. The panel:
 *   - shows the position OZ + Bezeichnung + Menge + EP + GP (read-only)
 *   - lets the customer pick an intent (Änderung wünschen / Streichen /
 *     Frage stellen)
 *   - captures their name + email on the first comment (then prefills
 *     thereafter)
 *   - saves the draft to the parent's `changes` map (NOT sent to the
 *     server here — the global submit at the bottom of the page batches
 *     all per-row drafts plus the general message in one POST to
 *     api.public.requestChanges)
 *
 * Security: the panel ONLY receives the position fields the customer is
 * already allowed to see (CustomerViewPayload.positions). Internal cost
 * fields are not in the type — they cannot be rendered even by accident.
 */

import { useEffect, useRef, useState } from 'react';
import { X, MessageSquare, Trash2, HelpCircle, Pencil, Mail, User } from 'lucide-react';
import clsx from 'clsx';
import type { CustomerViewPayload } from '@/features/kalkulation/types';
import { formatEUR } from '@/features/kalkulation/calc';

export type CommentDraft = {
  positionId: string;
  type: 'modify' | 'remove' | 'comment';
  text: string;
};

type Position = CustomerViewPayload['positions'][number];

type Props = {
  open: boolean;
  position: Position | null;
  draft: CommentDraft | undefined;
  customerName: string;
  customerEmail: string;
  onClose: () => void;
  onSet: (patch: Partial<CommentDraft>) => void;
  onClear: () => void;
  onSetCustomerName: (v: string) => void;
  onSetCustomerEmail: (v: string) => void;
  /** PART K: optional persist-to-server handler. When provided, "Anmerkung
   *  merken" calls this with the current draft + identity. The parent
   *  (ShareView) translates the legacy intent enum into the PART K enum
   *  and POSTs to /share/:token/comments. When omitted, the panel falls
   *  back to local-state-only behaviour (the existing batched flow). */
  onSubmitToServer?: (input: {
    positionOz: string;
    intent: CommentDraft['type'];
    text: string;
    authorName?: string;
    authorEmail?: string;
  }) => Promise<void>;
};

const INTENTS: Array<{ key: CommentDraft['type']; label: string; hint: string; icon: typeof Pencil }> = [
  { key: 'modify', label: 'Änderung wünschen', hint: 'z. B. Menge anders, anderes Fabrikat, Preis verhandeln', icon: Pencil },
  { key: 'remove', label: 'Streichen', hint: 'Diese Position soll nicht beauftragt werden', icon: Trash2 },
  { key: 'comment', label: 'Frage stellen', hint: 'Nur eine Rückfrage, kein Änderungswunsch', icon: HelpCircle },
];

export default function PositionCommentPanel({
  open,
  position,
  draft,
  customerName,
  customerEmail,
  onClose,
  onSet,
  onClear,
  onSetCustomerName,
  onSetCustomerEmail,
  onSubmitToServer,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus the textarea when the panel opens so the customer can start
  // typing immediately. Skip the auto-focus on touch devices where it
  // would push the keyboard up before they've read the row.
  useEffect(() => {
    if (!open) return;
    const isTouch = typeof window !== 'undefined' && 'ontouchstart' in window;
    if (isTouch) return;
    const t = setTimeout(() => textareaRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [open, position?.id]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !position) return null;

  const activeIntent: CommentDraft['type'] = draft?.type ?? 'modify';
  const hasContact = customerName.trim().length > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="comment-panel-title"
      data-testid="position-comment-panel"
      className="fixed inset-0 z-40 flex"
    >
      {/* backdrop — click to close */}
      <button
        type="button"
        aria-label="Schließen"
        onClick={onClose}
        className="flex-1 bg-slate-900/30 backdrop-blur-[1px] cursor-default"
      />
      {/* panel */}
      <aside
        className={clsx(
          'w-full sm:w-[420px] max-w-full bg-white border-l border-slate-200 shadow-2xl flex flex-col',
          'animate-in slide-in-from-right duration-150',
        )}
      >
        <header className="flex items-center gap-3 h-14 px-4 border-b border-slate-200 flex-shrink-0">
          <MessageSquare className="w-4 h-4 text-primary-600" />
          <h2 id="comment-panel-title" className="font-semibold text-slate-900 text-sm">
            Anmerkung zu dieser Position
          </h2>
          <button
            onClick={onClose}
            className="ml-auto p-2 -mr-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            aria-label="Schließen"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* read-only position summary */}
        <section className="px-4 py-3 border-b border-slate-100 bg-slate-50/60 text-sm">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-mono text-xs text-slate-500 whitespace-nowrap">{position.oz || '—'}</span>
            <span className="font-medium text-slate-900 line-clamp-2">{position.shortText}</span>
          </div>
          <div className="flex items-baseline justify-between gap-3 mt-2 text-xs">
            <span className="text-slate-500">
              {new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }).format(position.quantity)} {position.unit}
              {' · '}
              <span className="tabular-nums">{formatEUR(position.ep)}/EH</span>
            </span>
            <span className="tabular-nums font-semibold text-slate-900">{formatEUR(position.gp)}</span>
          </div>
        </section>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Intent picker */}
          <fieldset>
            <legend className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Was möchten Sie sagen?
            </legend>
            <div className="grid grid-cols-1 gap-1.5">
              {INTENTS.map(({ key, label, hint, icon: Icon }) => (
                <label
                  key={key}
                  className={clsx(
                    'flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors',
                    activeIntent === key
                      ? 'border-primary-300 bg-primary-50/60 text-primary-900'
                      : 'border-slate-200 hover:border-slate-300',
                  )}
                >
                  <input
                    type="radio"
                    name="comment-intent"
                    checked={activeIntent === key}
                    onChange={() => onSet({ type: key, text: draft?.text ?? '' })}
                    className="mt-0.5 text-primary-600"
                  />
                  <span className="flex-1 min-w-0">
                    <span className="font-medium text-sm flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </span>
                    <span className="block text-[11px] text-slate-500 mt-0.5">{hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Free-text */}
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5 block">
              Ihre Anmerkung
            </span>
            <textarea
              ref={textareaRef}
              value={draft?.text ?? ''}
              onChange={(e) => onSet({ type: activeIntent, text: e.target.value })}
              placeholder={
                activeIntent === 'modify'
                  ? 'z. B. Bitte 8 m² statt 10 m². Oder: lieber Fliesen 60×60 statt 30×30.'
                  : activeIntent === 'remove'
                    ? 'z. B. Diese Position nicht beauftragen.'
                    : 'z. B. Welches Material ist hier vorgesehen?'
              }
              rows={5}
              className="w-full text-sm bg-white border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-200 min-h-[120px] resize-y"
            />
          </label>

          {/* Identity capture — only shown if not already provided */}
          {!hasContact && (
            <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 space-y-2">
              <p className="text-xs text-amber-900 font-medium">
                Damit der Anbieter weiß, von wem die Anmerkung kommt:
              </p>
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-900 mb-1 flex items-center gap-1">
                  <User className="w-3 h-3" /> Ihr Name
                </span>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => onSetCustomerName(e.target.value)}
                  placeholder="Vor- und Nachname"
                  className="w-full text-sm bg-white border border-amber-300 rounded-lg px-3 py-1.5 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-200"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-900 mb-1 flex items-center gap-1">
                  <Mail className="w-3 h-3" /> E-Mail (für Rückfragen)
                </span>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => onSetCustomerEmail(e.target.value)}
                  placeholder="ihre@firma.de"
                  className="w-full text-sm bg-white border border-amber-300 rounded-lg px-3 py-1.5 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-200"
                />
              </label>
            </section>
          )}

          {hasContact && (
            <p className="text-[11px] text-slate-500">
              Sie schreiben als <strong className="text-slate-700">{customerName}</strong>
              {customerEmail && <> · {customerEmail}</>}
            </p>
          )}
        </div>

        {/* Footer actions */}
        <footer className="flex items-center justify-between gap-3 px-4 h-14 border-t border-slate-200 bg-slate-50/40 flex-shrink-0">
          {draft && draft.text.trim().length > 0 ? (
            <button
              type="button"
              onClick={() => {
                onClear();
                onClose();
              }}
              className="text-xs text-slate-500 hover:text-rose-600 inline-flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" /> Verwerfen
            </button>
          ) : (
            <span className="text-[11px] text-slate-400">
              Wird mit anderen Anmerkungen am Ende gesendet.
            </span>
          )}
          <button
            type="button"
            onClick={async () => {
              // If there's a non-empty draft AND a server handler, POST it
              // before closing. Falls back to local-state-only behaviour
              // when onSubmitToServer is omitted (preserves the legacy
              // batched flow for callers that haven't opted in).
              const text = (draft?.text ?? '').trim();
              if (text.length > 0 && onSubmitToServer && position) {
                setSubmitting(true);
                try {
                  await onSubmitToServer({
                    positionOz: (position.oz || '').trim(),
                    intent: draft?.type ?? 'comment',
                    text,
                    authorName: customerName.trim() || undefined,
                    authorEmail: customerEmail.trim() || undefined,
                  });
                } catch {
                  // Don't close on error — let the user retry.
                  setSubmitting(false);
                  return;
                }
                setSubmitting(false);
              }
              onClose();
            }}
            disabled={
              submitting ||
              (!hasContact && (draft?.text.trim().length ?? 0) > 0)
            }
            data-testid="position-comment-submit"
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            title={!hasContact && (draft?.text.trim().length ?? 0) > 0 ? 'Bitte Namen eintragen' : undefined}
          >
            {submitting ? 'Senden…' : 'Anmerkung senden'}
          </button>
        </footer>
      </aside>
    </div>
  );
}

/**
 * Wunsch-Korb — the customer's basket of change requests. A sticky trigger bar
 * appears as soon as ≥1 wish is collected (from per-position panels + the global
 * panel); opening it shows every wish as an Ist→Wunsch line with a remove (×),
 * captures name/email once, and sends the whole batch in one POST.
 */
import { useState } from 'react';
import { ShoppingCart, X, Trash2, ArrowRight, Send, User, Mail, SlidersHorizontal } from 'lucide-react';
import {
  FIELD_LABEL,
  DIRECTION_LABEL,
  formatChangeValue,
  type WunschBasketItem,
} from '@/features/kalkulation/changeRequest';

type Props = {
  items: WunschBasketItem[];
  customerName: string;
  customerEmail: string;
  onSetCustomerName: (v: string) => void;
  onSetCustomerEmail: (v: string) => void;
  onRemove: (key: string) => void;
  onClear: () => void;
  /** Sends every basket item. Throws on failure so the drawer stays open. */
  onSend: () => Promise<void>;
};

export default function WunschKorb({
  items,
  customerName,
  customerEmail,
  onSetCustomerName,
  onSetCustomerEmail,
  onRemove,
  onClear,
  onSend,
}: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const hasContact = customerName.trim().length > 0;

  if (items.length === 0) return null;

  return (
    <>
      {/* Sticky trigger bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-4 pointer-events-none">
        <button
          type="button"
          data-testid="korb-open"
          onClick={() => setOpen(true)}
          className="pointer-events-auto inline-flex items-center gap-2.5 rounded-full bg-primary-600 px-5 py-3 text-sm font-semibold text-white shadow-xl shadow-primary-900/20 hover:bg-primary-700"
        >
          <span className="relative inline-flex">
            <ShoppingCart className="h-4 w-4" />
            <span className="absolute -right-2 -top-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-primary-700">
              {items.length}
            </span>
          </span>
          Wunsch-Korb · Prüfen &amp; senden
        </button>
      </div>

      {/* Drawer */}
      {open && (
        <div role="dialog" aria-modal="true" aria-labelledby="korb-title" className="fixed inset-0 z-40 flex">
          <button
            type="button"
            aria-label="Schließen"
            onClick={() => setOpen(false)}
            className="flex-1 bg-slate-900/30 backdrop-blur-[1px] cursor-default"
          />
          <aside className="w-full sm:w-[460px] max-w-full bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-150">
            <header className="flex items-center gap-3 h-14 px-4 border-b border-slate-200 flex-shrink-0">
              <ShoppingCart className="w-4 h-4 text-primary-600" />
              <h2 id="korb-title" className="font-semibold text-slate-900 text-sm">
                Wunsch-Korb ({items.length})
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="ml-auto p-2 -mr-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                aria-label="Schließen"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              <p className="text-xs text-slate-500">
                Prüfen Sie Ihre Änderungswünsche und senden Sie alle gemeinsam an den Anbieter.
              </p>
              {items.map((it) => (
                <div
                  key={it.key}
                  data-testid="korb-item"
                  className="rounded-lg border border-slate-200 bg-slate-50/60 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex min-w-0 items-center gap-1.5 text-xs">
                      {it.scope === 'global' ? (
                        <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                          <SlidersHorizontal className="h-3.5 w-3.5 text-primary-500" /> Gesamtangebot
                        </span>
                      ) : (
                        <span className="truncate font-medium text-slate-700">{it.where}</span>
                      )}
                    </span>
                    <button
                      type="button"
                      data-testid={`korb-remove-${it.key}`}
                      onClick={() => onRemove(it.key)}
                      aria-label="Wunsch entfernen"
                      className="-mr-1 -mt-1 p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-md bg-primary-50 px-1.5 py-0.5 text-[11px] font-semibold text-primary-700 ring-1 ring-inset ring-primary-200">
                      {FIELD_LABEL[it.field]}
                    </span>
                    <span className="inline-flex flex-wrap items-center gap-1.5 text-xs">
                      {it.currentValue != null && (
                        <>
                          <span className="text-slate-400">Ist</span>
                          <span className="tabular-nums font-medium text-slate-500">
                            {formatChangeValue(it.currentValue, it.unit)}
                          </span>
                        </>
                      )}
                      <ArrowRight className="h-3 w-3 text-slate-400" />
                      <span className="text-slate-400">Wunsch</span>
                      {it.requestedValue != null ? (
                        <span className="tabular-nums font-bold text-slate-800">
                          {formatChangeValue(it.requestedValue, it.unit)}
                        </span>
                      ) : (
                        <span className="font-semibold text-slate-700">
                          {DIRECTION_LABEL[it.direction ?? 'unspecified']}
                        </span>
                      )}
                    </span>
                  </div>
                  {it.note && <p className="mt-1.5 text-xs text-slate-600 whitespace-pre-wrap">{it.note}</p>}
                </div>
              ))}

              {!hasContact && (
                <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 space-y-2">
                  <p className="text-xs text-amber-900 font-medium">Damit der Anbieter weiß, von wem die Wünsche kommen:</p>
                  <label className="block">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-900 mb-1 flex items-center gap-1">
                      <User className="w-3 h-3" /> Ihr Name
                    </span>
                    <input
                      data-testid="korb-name"
                      value={customerName}
                      onChange={(e) => onSetCustomerName(e.target.value)}
                      placeholder="Vor- und Nachname"
                      className="w-full text-sm bg-white border border-amber-300 rounded-lg px-3 py-1.5 outline-none focus:border-amber-500"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-900 mb-1 flex items-center gap-1">
                      <Mail className="w-3 h-3" /> E-Mail (optional)
                    </span>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => onSetCustomerEmail(e.target.value)}
                      placeholder="ihre@firma.de"
                      className="w-full text-sm bg-white border border-amber-300 rounded-lg px-3 py-1.5 outline-none focus:border-amber-500"
                    />
                  </label>
                </section>
              )}
            </div>

            <footer className="flex items-center justify-between gap-3 px-4 h-14 border-t border-slate-200 bg-slate-50/40 flex-shrink-0">
              <button
                type="button"
                onClick={onClear}
                className="text-xs text-slate-500 hover:text-rose-600 inline-flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Korb leeren
              </button>
              <button
                type="button"
                data-testid="korb-send"
                disabled={busy || !hasContact}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await onSend();
                    setOpen(false);
                  } catch {
                    /* keep open for retry; caller toasts */
                  } finally {
                    setBusy(false);
                  }
                }}
                title={!hasContact ? 'Bitte Namen eintragen' : undefined}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
                {busy ? 'Senden…' : `${items.length} ${items.length === 1 ? 'Wunsch' : 'Wünsche'} senden`}
              </button>
            </footer>
          </aside>
        </div>
      )}
    </>
  );
}

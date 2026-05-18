import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Phone, MessageCircle, Calendar, X } from 'lucide-react';
import { NAP, SERVICES } from '@/lib/constants';
import { telHref, whatsappHref } from '@/lib/utils';

const DISMISS_KEY = 'kalku.stickyDismissed';
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Sticky CTA bar at the bottom of the screen on mobile only.
 * Appears after scroll > 400px (so not on hero), persists, and offers
 * three low-friction conversion actions.
 *
 * Hides on /kontakt/ (the bar's CTAs would compete with the form),
 * hides while an input/textarea/select is focused (mobile keyboard up),
 * and is dismissible for 24h via the close button.
 */
export default function StickyMobileCta() {
  const { pathname } = useLocation();
  const [show, setShow] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  // Scroll trigger
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Hide while a text-entry control is focused (keyboard up on mobile)
  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT') {
        setInputFocused(true);
      }
    };
    const onFocusOut = () => setInputFocused(false);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  // Read dismissed state from localStorage (24h TTL)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (!raw) {
        setDismissed(false);
        return;
      }
      const ts = Number(raw);
      if (!Number.isFinite(ts) || Date.now() - ts > DISMISS_TTL_MS) {
        localStorage.removeItem(DISMISS_KEY);
        setDismissed(false);
      }
    } catch {
      setDismissed(false);
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore storage errors (Safari private mode) */
    }
    setDismissed(true);
  };

  const hideOnRoute = pathname.startsWith('/kontakt');

  if (hideOnRoute || dismissed || !show || inputFocused) return null;

  return (
    <div
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]"
      role="region"
      aria-label="Schnell-Kontakt"
    >
      <div className="relative flex items-stretch">
        <a
          href={telHref(NAP.phone)}
          className="flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[44px] text-xs font-semibold text-primary-800 hover:bg-primary-50 active:bg-primary-100"
        >
          <Phone className="w-5 h-5" aria-hidden="true" />
          <span>Anrufen</span>
        </a>
        <a
          href={whatsappHref(NAP.whatsapp, 'Hallo KALKU, ich habe eine Frage zu Ihrer Kalkulationsdienstleistung.')}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[44px] text-xs font-semibold text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100 border-l border-gray-200"
        >
          <MessageCircle className="w-5 h-5" aria-hidden="true" />
          <span>WhatsApp</span>
        </a>
        <a
          href={SERVICES.calendlyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[44px] text-xs font-semibold text-primary-800 hover:bg-primary-50 active:bg-primary-100 border-l border-gray-200"
        >
          <Calendar className="w-5 h-5" aria-hidden="true" />
          <span>Termin</span>
        </a>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Schnellkontakt-Leiste schließen"
          className="absolute top-1 right-1 w-7 h-7 inline-flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-full"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

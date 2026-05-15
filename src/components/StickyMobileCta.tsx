import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Phone, MessageCircle, Calendar, X } from 'lucide-react';
import { NAP } from '@/lib/constants';
import { telHref, whatsappHref } from '@/lib/utils';

const DISMISSED_KEY = 'kalku.stickyMobileDismissedAt';
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000; // 24 h

/**
 * Sticky CTA bar at the bottom of the screen on mobile.
 *
 * Visibility rules (post-research-recalibration):
 *  - Appears after 30% scroll OR 8s dwell (whichever first)
 *  - Hides on /kontakt/ (visitor is already there)
 *  - Hides when an input has focus (avoid iOS keyboard overlap)
 *  - Dismissible — 24h cooldown
 */
export default function StickyMobileCta() {
  const [visible, setVisible] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === '/kontakt/') {
      setVisible(false);
      return;
    }

    const dismissedAt = Number(localStorage.getItem(DISMISSED_KEY) || 0);
    if (Date.now() - dismissedAt < DISMISS_TTL_MS) {
      return;
    }

    const dwellTimer = setTimeout(() => setVisible(true), 8000);
    function onScroll() {
      const pct = window.scrollY / Math.max(1, document.body.scrollHeight - window.innerHeight);
      if (pct > 0.25) setVisible(true);
    }
    function onFocus(e: FocusEvent) {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName)) setInputFocused(true);
    }
    function onBlur(e: FocusEvent) {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName)) setInputFocused(false);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('focusin', onFocus);
    document.addEventListener('focusout', onBlur);
    return () => {
      clearTimeout(dwellTimer);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('focusin', onFocus);
      document.removeEventListener('focusout', onBlur);
    };
  }, [location.pathname]);

  function dismiss() {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  }

  if (!visible || inputFocused) return null;

  return (
    <div
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]"
      role="region"
      aria-label="Schnell-Kontakt"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Schließen"
        className="absolute -top-3 right-3 w-7 h-7 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-500 hover:text-gray-700"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      <div className="grid grid-cols-3 divide-x divide-gray-100">
        <a
          href={telHref(NAP.phone)}
          className="flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] text-xs font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100"
        >
          <Phone className="w-5 h-5 text-primary-600" />
          Anrufen
        </a>
        <a
          href={whatsappHref(NAP.whatsapp, `Hallo KALKU, ich bin auf ${location.pathname} und habe eine Frage.`)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] text-xs font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100"
        >
          <MessageCircle className="w-5 h-5 text-emerald-600" />
          WhatsApp
        </a>
        <Link
          to="/kontakt/#termin"
          className="flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] text-xs font-medium text-white bg-kalku-green hover:opacity-95 active:opacity-90"
        >
          <Calendar className="w-5 h-5" />
          Termin
        </Link>
      </div>
    </div>
  );
}

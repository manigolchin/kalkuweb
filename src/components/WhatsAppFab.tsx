import { useEffect, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { NAP } from '@/lib/constants';
import { whatsappHref } from '@/lib/utils';

const STORAGE_KEY = 'kalku.waFabDismissed';

/**
 * Floating WhatsApp button bottom-right on desktop (hidden on mobile —
 * StickyMobileCta covers the mobile case). Shows a small response-time
 * teaser pill on first reveal, dismissible.
 */
export default function WhatsAppFab() {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const wasDismissed = localStorage.getItem(STORAGE_KEY) === '1';
    setDismissed(wasDismissed);

    function onScroll() {
      if (!wasDismissed && window.scrollY > 600) {
        setOpen(true);
      }
    }

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function dismiss() {
    setOpen(false);
    setDismissed(true);
    localStorage.setItem(STORAGE_KEY, '1');
  }

  if (dismissed && !open) {
    return (
      <a
        href={whatsappHref(NAP.whatsapp, 'Hallo KALKU, ich habe eine Frage.')}
        target="_blank"
        rel="noopener noreferrer"
        className="hidden md:inline-flex fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-xl items-center justify-center transition-all hover:scale-105"
        aria-label="WhatsApp-Chat öffnen"
      >
        <MessageCircle className="w-6 h-6" />
      </a>
    );
  }

  return (
    <div className="hidden md:block fixed bottom-6 right-6 z-30">
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 p-5 max-w-xs animate-in fade-in slide-in-from-bottom-2 duration-200">
        <button
          type="button"
          onClick={dismiss}
          className="absolute -top-2 -right-2 w-11 h-11 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-500 hover:text-gray-700"
          aria-label="Schließen"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <MessageCircle className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm leading-tight">Schneller per WhatsApp.</p>
            <p className="text-xs text-gray-500 mt-1">Antwort werktags ⌀ unter 30 Minuten.</p>
          </div>
        </div>
        <a
          href={whatsappHref(NAP.whatsapp, 'Hallo KALKU, ich habe eine Frage zu Ihrer Kalkulationsdienstleistung.')}
          target="_blank"
          rel="noopener noreferrer"
          onClick={dismiss}
          className="btn btn-success w-full justify-center text-sm"
        >
          <MessageCircle className="w-4 h-4" /> Chat starten
        </a>
      </div>
    </div>
  );
}

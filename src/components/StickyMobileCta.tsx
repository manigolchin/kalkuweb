import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, MessageCircle, Calendar } from 'lucide-react';
import { NAP } from '@/lib/constants';
import { telHref, whatsappHref } from '@/lib/utils';

/**
 * Sticky CTA bar at the bottom of the screen on mobile only.
 * Appears after scroll > 400px (so not on hero), persists, and offers
 * three low-friction conversion actions.
 */
export default function StickyMobileCta() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 400);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]"
      role="region"
      aria-label="Schnell-Kontakt"
    >
      <div className="grid grid-cols-3 divide-x divide-gray-100">
        <a
          href={telHref(NAP.phone)}
          className="flex flex-col items-center justify-center gap-1 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100"
        >
          <Phone className="w-5 h-5 text-primary-600" />
          Anrufen
        </a>
        <a
          href={whatsappHref(NAP.whatsapp, 'Hallo KALKU, ich habe eine Frage zu Ihrer Kalkulationsdienstleistung.')}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center gap-1 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100"
        >
          <MessageCircle className="w-5 h-5 text-emerald-600" />
          WhatsApp
        </a>
        <Link
          to="/kontakt/"
          className="flex flex-col items-center justify-center gap-1 py-2.5 text-xs font-medium text-white bg-kalku-green hover:opacity-95 active:opacity-90"
        >
          <Calendar className="w-5 h-5" />
          Termin
        </Link>
      </div>
    </div>
  );
}

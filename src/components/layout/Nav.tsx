import { useEffect, useId, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/leistungen/', label: 'Leistungen' },
  { to: '/ablauf/', label: 'Ablauf' },
  { to: '/konditionen/', label: 'Konditionen' },
  { to: '/referenzen/', label: 'Referenzen' },
  { to: '/tools/', label: 'Tools' },
  { to: '/ueber-uns/', label: 'Über uns' },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const panelId = useId();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Mobile menu: body-scroll lock, Escape to close, focus restore on close
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // When the drawer opens, move focus to the first link inside it.
  // When it closes, restore focus to the trigger button.
  useEffect(() => {
    if (open) {
      // Defer one tick so the link is in the DOM
      const t = window.setTimeout(() => {
        firstLinkRef.current?.focus();
      }, 0);
      return () => window.clearTimeout(t);
    } else {
      triggerRef.current?.focus();
    }
  }, [open]);

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 bg-white transition-shadow duration-300',
        scrolled ? 'shadow-md' : '',
      )}
    >
      <div className="container-page">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
            <div className="w-9 h-9 rounded-lg bg-primary-500 flex items-center justify-center">
              <Send className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-bold text-gray-900">KALKU</span>
              <span className="text-xs text-gray-500">Baukalkulationen</span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                    isActive ? 'text-primary-600 bg-primary-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
            <Link to="/kontakt/" className="btn btn-success ml-2">
              Erstgespräch vereinbaren
            </Link>
          </div>

          <button
            ref={triggerRef}
            type="button"
            className="md:hidden p-3 -mr-3 text-gray-700 min-w-[44px] min-h-[44px] flex items-center justify-center"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Menü schließen' : 'Menü öffnen'}
            aria-expanded={open}
            aria-controls={panelId}
          >
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {open && (
          <>
            {/* Backdrop — click to close */}
            <div
              className="md:hidden fixed inset-0 top-16 z-40 bg-black/30"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <div
              id={panelId}
              className="md:hidden relative z-50 border-t border-gray-100 py-3 bg-white"
              role="dialog"
              aria-modal="true"
              aria-label="Hauptnavigation"
            >
              {NAV_ITEMS.map((item, idx) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  ref={idx === 0 ? firstLinkRef : undefined}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'block px-3 py-2.5 rounded-lg text-base font-medium',
                      isActive ? 'text-primary-600 bg-primary-50' : 'text-gray-700 hover:bg-gray-50',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              <Link
                to="/kontakt/"
                onClick={() => setOpen(false)}
                className="btn btn-success w-full justify-center mt-3"
              >
                Erstgespräch vereinbaren
              </Link>
            </div>
          </>
        )}
      </div>
    </nav>
  );
}

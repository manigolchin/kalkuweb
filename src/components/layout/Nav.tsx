import { useEffect, useState } from 'react';
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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
            type="button"
            className="md:hidden p-3 -mr-3 text-gray-700 min-w-[44px] min-h-[44px] flex items-center justify-center"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Menü schließen' : 'Menü öffnen'}
            aria-expanded={open}
          >
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {open && (
          <div className="md:hidden border-t border-gray-100 py-3">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
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
        )}
      </div>
    </nav>
  );
}

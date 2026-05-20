import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Calculator, LogOut, Settings, FolderClosed, Inbox } from 'lucide-react';
import { useAuth } from '@/lib/auth';

type Tab = {
  to: string;
  label: string;
  icon: typeof Calculator;
  end?: boolean;
};

const tabs: Tab[] = [
  { to: '/panel/kalkulation', label: 'Kalkulation', icon: Calculator },
  { to: '/panel/feedback', label: 'Kunden-Feedback', icon: Inbox },
  { to: '/panel/archiv', label: 'Archiv', icon: FolderClosed },
  { to: '/panel/einstellungen', label: 'Einstellungen', icon: Settings },
];

export default function PanelLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function onLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Helmet>
        <title>KALKU Panel</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <header className="sticky top-0 z-30 bg-white border-b border-slate-200/80">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <NavLink to="/panel" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary-500 grid place-items-center text-white text-sm font-bold">
              K
            </div>
            <span className="font-semibold text-slate-900 hidden sm:inline">KALKU Panel</span>
          </NavLink>

          <nav className="flex-1 flex items-center gap-1 overflow-x-auto -mx-1 px-1">
            {tabs.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end leading-tight">
              <span className="text-sm font-medium text-slate-900">{user?.name}</span>
              <span className="text-xs text-slate-500">{user?.companyName || user?.email}</span>
            </div>
            <button
              onClick={onLogout}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              title="Abmelden"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}

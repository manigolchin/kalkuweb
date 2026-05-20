import { useEffect, useState, type FormEvent } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Calculator, LogOut, Settings, FolderClosed, Inbox, Lock, Loader2, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth';
import { api, ApiError } from '@/lib/api';

type Tab = {
  to: string;
  label: string;
  icon: typeof Calculator;
  end?: boolean;
  badge?: string;
};

const tabs: Tab[] = [
  { to: '/panel/kalkulation', label: 'Kalkulation', icon: Calculator },
  { to: '/panel/feedback', label: 'Kunden-Feedback', icon: Inbox },
  { to: '/panel/archiv', label: 'Archiv', icon: FolderClosed, badge: 'Bald' },
  { to: '/panel/einstellungen', label: 'Einstellungen', icon: Settings },
];

export default function PanelLayout() {
  const { user, logout, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadFeedback, setUnreadFeedback] = useState<number>(0);

  async function onLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  // Refresh the unread-count whenever the panel route changes — cheap, no polling.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { count } = await api.notifications.unread();
        if (alive) setUnreadFeedback(count);
      } catch {
        // Ignore — badge stays at last known value.
      }
    })();
    return () => { alive = false; };
  }, [location.pathname]);

  // When the user navigates INTO the feedback inbox, mark as viewed so the
  // badge clears on next pathname change.
  useEffect(() => {
    if (location.pathname.startsWith('/panel/feedback')) {
      api.notifications.markViewed().catch(() => {});
    }
  }, [location.pathname]);

  const forceChange = user?.mustChangePassword === true;

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
            {tabs.map(({ to, label, icon: Icon, end, badge }) => (
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
                {to === '/panel/feedback' && unreadFeedback > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-amber-500 text-white text-xs font-bold tabular-nums">
                    {unreadFeedback > 99 ? '99+' : unreadFeedback}
                  </span>
                )}
                {badge && (
                  <span className="inline-flex items-center justify-center h-5 px-1.5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
                    {badge}
                  </span>
                )}
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

      {forceChange && user && (
        <ForcePasswordChange
          onChanged={(updated) => setUser(updated)}
          onAbort={onLogout}
        />
      )}
    </div>
  );
}

function ForcePasswordChange({
  onChanged,
  onAbort,
}: {
  onChanged: (u: import('@/features/kalkulation/types').AuthUser) => void;
  onAbort: () => void;
}) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (next.length < 12) {
      toast.error('Neues Passwort muss mindestens 12 Zeichen haben.');
      return;
    }
    if (next !== confirm) {
      toast.error('Bestätigung stimmt nicht überein.');
      return;
    }
    if (next === current) {
      toast.error('Das neue Passwort darf nicht mit dem aktuellen identisch sein.');
      return;
    }
    setSaving(true);
    try {
      await api.auth.changePassword(current, next);
      // Re-fetch /me so mustChangePassword flips to false.
      const { user: refreshed } = await api.auth.me();
      onChanged(refreshed);
      toast.success('Passwort geändert.');
    } catch (err) {
      if (err instanceof ApiError && (err.body as { error?: string })?.error === 'invalid_current_password') {
        toast.error('Aktuelles Passwort stimmt nicht.');
      } else {
        toast.error('Passwort konnte nicht geändert werden.');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="force-pwd-title"
    >
      <form
        onSubmit={submit}
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4"
      >
        <header className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-50 border border-amber-100 shrink-0">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 id="force-pwd-title" className="font-semibold text-slate-900">
              Bitte zuerst ein neues Passwort setzen
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Sie verwenden noch das Initial-Passwort. Aus Sicherheitsgründen ist das Panel erst
              nach Vergabe eines eigenen Passworts nutzbar.
            </p>
          </div>
        </header>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Aktuelles (Initial-)Passwort</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            autoFocus
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className="mt-1 input"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Neues Passwort (min. 12 Zeichen)</span>
          <input
            type="password"
            autoComplete="new-password"
            required
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className="mt-1 input"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Bestätigen</span>
          <input
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="mt-1 input"
          />
        </label>

        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={onAbort}
            className="text-sm text-slate-500 hover:text-slate-800"
          >
            Abmelden
          </button>
          <button
            type="submit"
            disabled={saving || !current || !next || !confirm}
            className="btn btn-primary disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            Passwort speichern
          </button>
        </div>
      </form>
    </div>
  );
}

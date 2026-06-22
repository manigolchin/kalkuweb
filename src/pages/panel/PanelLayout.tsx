import { useEffect, useState, type FormEvent } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Calculator,
  LogOut,
  Settings,
  FolderClosed,
  FolderOpen,
  Inbox,
  Lock,
  Loader2,
  ShieldAlert,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Moon,
  Sun,
  Menu,
  X,
  Building2,
  Mail,
  Library,
  MapPin,
  List,
  TrendingUp,
  ExternalLink,
  Users,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth';
import { api, ApiError } from '@/lib/api';
import { hasPanelPermission, isPanelAdmin } from '@/lib/panelPermissions';
import type { PanelPermissionKey } from '@/features/kalkulation/types';
import { usePanelTheme, StatusBadge, Kbd } from './ui';
import CommandPalette from './CommandPalette';
import PanelErrorBoundary from '@/components/panel/PanelErrorBoundary';

type NavItem = {
  to: string;
  label: string;
  icon: typeof Calculator;
  end?: boolean;
  comingSoon?: boolean;
  /** Opens in a new tab via <a> instead of an in-app <NavLink> route. */
  external?: boolean;
  /** When set, the item is hidden unless the user has this feature
   *  permission (admins implicitly pass). Unset = always visible. */
  permission?: PanelPermissionKey;
  /** When true, only role==='admin' sees the item. */
  adminOnly?: boolean;
};

const NAV: NavItem[] = [
  { to: '/panel', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/panel/firmen', label: 'Firmen', icon: Building2, permission: 'firmen' },
  {
    // Cross-company supplier-email hub — a read-only view onto preisanfrage's
    // already-classified Posteingang (all firmen's mailboxes in one place).
    // Gated by the `firmen` key: it's company-scoped data, same domain.
    to: '/panel/posteingang',
    label: 'Posteingang',
    icon: Mail,
    permission: 'firmen',
  },
  {
    // Vergabe-Kiosk in preisanfrage = Projekte + Submissionskarte. Surface the
    // Projekte-Board here too (SSO-routed like the others) and gate it behind
    // the same `submissionskarte` key so the pair always appears together for
    // whoever sees the Vergabe-Bereich.
    to: '/api/panel/sso/preisanfrage?next=/projects',
    label: 'Projekte',
    icon: FolderOpen,
    external: true,
    permission: 'submissionskarte',
  },
  {
    // Routed through the panel SSO handoff so a logged-in user lands in
    // preisanfrage already authenticated (falls back to manual login).
    // Deep-links to the Karte (map) view across ALL Firmen (view=karte,
    // mode=alle-firmen). The `next` value is URL-encoded because it carries
    // its own query string through the SSO handoff.
    to: '/api/panel/sso/preisanfrage?next=%2Fsubmissionskarte%3Fview%3Dkarte%26mode%3Dalle-firmen',
    label: 'Submissionskarte',
    icon: MapPin,
    external: true,
    permission: 'submissionskarte',
  },
  {
    // Same Submissionskarte page, Liste view across ALL Firmen — the
    // company-wide submission overview. Same permission key as the Karte link.
    to: '/api/panel/sso/preisanfrage?next=%2Fsubmissionskarte%3Fview%3Dliste%26mode%3Dalle-firmen',
    label: 'Submissionsliste',
    icon: List,
    external: true,
    permission: 'submissionskarte',
  },
  {
    to: '/api/panel/sso/preisanfrage?next=/statistik',
    label: 'Statistik',
    icon: TrendingUp,
    external: true,
    permission: 'statistik',
  },
  { to: '/panel/kalkulation', label: 'Kalkulation', icon: Calculator, permission: 'kalkulation' },
  { to: '/panel/vorlagen', label: 'Vorlagen', icon: Library, permission: 'vorlagen' },
  { to: '/panel/feedback', label: 'Kunden-Feedback', icon: Inbox, permission: 'feedback' },
  { to: '/panel/archiv', label: 'Archiv', icon: FolderClosed, comingSoon: true },
  { to: '/panel/benutzer', label: 'Benutzer', icon: Users, adminOnly: true },
  { to: '/panel/einstellungen', label: 'Einstellungen', icon: Settings },
];

/** Filter the static NAV down to what `user` may see. */
function visibleNav(user: ReturnType<typeof useAuth>['user']): NavItem[] {
  return NAV.filter((item) => {
    if (item.adminOnly) return isPanelAdmin(user);
    if (item.permission) return hasPanelPermission(user, item.permission);
    return true;
  });
}

const SIDEBAR_KEY = 'kalku.panel.sidebarCollapsed';

export default function PanelLayout() {
  const { user, logout, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // The Kalkulations-Detailseite has a very wide table (18 Spalten) and its own
  // top PriceBar — let it use the FULL window width; every other panel page keeps
  // the readable 1600px cap.
  const isWidePage = /^\/panel\/kalkulation\/[^/]+$/.test(location.pathname);
  const { theme, toggle: toggleTheme } = usePanelTheme();
  const [unreadFeedback, setUnreadFeedback] = useState<number>(0);
  const [posteingangCount, setPosteingangCount] = useState<number>(0);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(SIDEBAR_KEY) === '1';
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  function setCollapsedAndPersist(next: boolean) {
    setCollapsed(next);
    window.localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0');
  }

  async function onLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  // Refresh unread-count on every route change — cheap, no polling.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { count } = await api.notifications.unread();
        if (alive) setUnreadFeedback(count);
      } catch {
        /* badge keeps last value */
      }
    })();
    return () => {
      alive = false;
    };
  }, [location.pathname]);

  // Posteingang attention-count for the sidebar badge — only for users with the
  // firmen permission; the overview is cached upstream (60 s) so this is cheap,
  // and any failure just keeps the last value (never blocks navigation).
  useEffect(() => {
    if (!hasPanelPermission(user, 'firmen')) return;
    let alive = true;
    (async () => {
      try {
        const o = await api.posteingang.overview();
        if (alive) setPosteingangCount(o.enabled ? o.totals.needsAttention : 0);
      } catch {
        /* badge keeps last value */
      }
    })();
    return () => {
      alive = false;
    };
  }, [location.pathname, user]);

  // Mark inbox as viewed when user enters it.
  useEffect(() => {
    if (location.pathname.startsWith('/panel/feedback')) {
      api.notifications.markViewed().catch(() => {});
    }
  }, [location.pathname]);

  // Close mobile drawer on route change.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const forceChange = user?.mustChangePassword === true;

  // Global hotkeys: ⌘K / Ctrl+K open palette; g+i / g+p / g+s navigate.
  // Disabled entirely while the force-password modal is open (security gate).
  // While the palette is open, only the ⌘K toggle works — so the user can
  // close it. Other shortcuts skip so they don't navigate behind the modal.
  useEffect(() => {
    let leader = false;
    let leaderTimer: number | null = null;
    function clearLeader() {
      leader = false;
      if (leaderTimer) {
        window.clearTimeout(leaderTimer);
        leaderTimer = null;
      }
    }
    function isTyping(target: EventTarget | null) {
      const el = target as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        el.isContentEditable === true
      );
    }
    function onKey(e: KeyboardEvent) {
      if (forceChange) return; // hard-block while force-password is up
      // ⌘K / Ctrl+K — palette open/close. Allowed even when palette is open
      // (so ⌘K closes it). Always pre-empts everything else.
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        clearLeader();
        return;
      }
      // While palette is open, leave all other input handling to the palette.
      if (paletteOpen) return;
      if (isTyping(e.target)) {
        clearLeader();
        return;
      }
      // Forward-slash to focus the palette as a search box
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setPaletteOpen(true);
        clearLeader();
        return;
      }
      // `c` — quick create (Kalkulation list handles this on its own page,
      // but we route to the list with a query so the modal opens).
      if (e.key === 'c' && !leader && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        navigate('/panel/kalkulation?new=1');
        return;
      }
      // `g` enters leader mode for two-key navigation.
      if (e.key === 'g' && !leader) {
        leader = true;
        leaderTimer = window.setTimeout(clearLeader, 1200);
        return;
      }
      if (leader) {
        const k = e.key.toLowerCase();
        clearLeader();
        if (k === 'p') {
          e.preventDefault();
          navigate('/panel/kalkulation');
        } else if (k === 'i') {
          e.preventDefault();
          navigate('/panel/feedback');
        } else if (k === 's') {
          e.preventDefault();
          navigate('/panel/einstellungen');
        } else if (k === 'd') {
          e.preventDefault();
          navigate('/panel');
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate, paletteOpen, forceChange]);

  return (
    <div
      className={clsx(
        'min-h-screen flex bg-slate-50 text-slate-900',
        'dark:bg-slate-950 dark:text-slate-100',
      )}
    >
      <Helmet>
        <title>KALKU Panel</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      {/* Skip-to-content link — first focusable element. Visible on keyboard
          focus so Tab-from-page-load users (and screen readers) can jump
          past the sidebar straight into the route outlet. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:px-3 focus:py-2 focus:rounded-lg focus:bg-primary-600 focus:text-white focus:font-medium focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-300"
      >
        Zum Hauptinhalt springen
      </a>

      {/* ─── Sidebar (desktop) ─────────────────────────────────────── */}
      <Sidebar
        collapsed={collapsed}
        unreadFeedback={unreadFeedback}
        posteingangCount={posteingangCount}
        user={user}
        onLogout={onLogout}
        theme={theme}
        onToggleTheme={toggleTheme}
        onToggleCollapsed={() => setCollapsedAndPersist(!collapsed)}
        // Pin the desktop sidebar to the viewport so its nav + the user/logout
        // footer stay visible on long pages (Firmen, Posteingang) instead of
        // scrolling away with the body. h-screen caps it at one viewport;
        // self-start stops the flex row from stretching it to full page height
        // (which would defeat the sticky). The inner <nav> scrolls on its own.
        className="hidden lg:flex lg:sticky lg:top-0 lg:h-screen lg:self-start"
      />

      {/* ─── Sidebar (mobile drawer) ───────────────────────────────── */}
      {mobileOpen && (
        <>
          <div
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-30 bg-slate-900/60 backdrop-blur-sm lg:hidden"
            aria-hidden
          />
          <Sidebar
            collapsed={false}
            unreadFeedback={unreadFeedback}
            posteingangCount={posteingangCount}
            user={user}
            onLogout={onLogout}
            theme={theme}
            onToggleTheme={toggleTheme}
            onToggleCollapsed={() => setMobileOpen(false)}
            mobile
            className="fixed inset-y-0 left-0 z-40 lg:hidden"
          />
        </>
      )}

      {/* ─── Main column ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-20 h-14 flex items-center gap-3 px-4 sm:px-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Menü öffnen"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Command-palette opener (Cmd+K) */}
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="flex items-center gap-2 h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors w-full max-w-md"
          >
            <SearchIcon />
            <span className="flex-1 text-left">Suchen oder Befehl</span>
            <span className="hidden sm:inline-flex items-center gap-1">
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
            </span>
          </button>

          <div className="flex items-center gap-1 ml-auto" />
        </header>

        <main
          id="main-content"
          tabIndex={-1}
          className={`flex-1 px-4 sm:px-6 py-6 w-full mx-auto focus:outline-none ${
            isWidePage ? 'max-w-none' : 'max-w-[1600px]'
          }`}
        >
          <PanelErrorBoundary>
            <Outlet />
          </PanelErrorBoundary>
        </main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onNavigate={(to) => {
          setPaletteOpen(false);
          navigate(to);
        }}
      />

      {forceChange && user && (
        <ForcePasswordChange onChanged={(updated) => setUser(updated)} onAbort={onLogout} />
      )}
    </div>
  );
}

/* ─── Sidebar ────────────────────────────────────────────────────────── */

function Sidebar({
  collapsed,
  unreadFeedback,
  posteingangCount,
  user,
  onLogout,
  theme,
  onToggleTheme,
  onToggleCollapsed,
  mobile = false,
  className,
}: {
  collapsed: boolean;
  unreadFeedback: number;
  posteingangCount: number;
  user: ReturnType<typeof useAuth>['user'];
  onLogout: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onToggleCollapsed: () => void;
  mobile?: boolean;
  className?: string;
}) {
  return (
    <aside
      className={clsx(
        'flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-[width] duration-200 ease-out',
        collapsed ? 'w-16' : 'w-60',
        className,
      )}
      aria-label="Hauptnavigation"
    >
      {/* Brand */}
      <div className={clsx('h-14 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800', collapsed ? 'justify-center px-2' : 'px-4')}>
        <NavLink to="/panel" className="flex items-center gap-2 min-w-0">
          <img src="/logo.png" alt="KALKU" className="w-7 h-7 rounded-lg object-cover flex-shrink-0" />
          {!collapsed && (
            <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">KALKU Panel</span>
          )}
        </NavLink>
        {mobile && (
          <button
            onClick={onToggleCollapsed}
            className="ml-auto p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label="Menü schließen"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {visibleNav(user).map((item) => {
          const { to, label, icon: Icon, end, comingSoon, external } = item;
          const cls = (isActive: boolean) =>
            clsx(
              'group relative flex items-center gap-3 rounded-lg text-sm font-medium transition-colors',
              collapsed ? 'justify-center h-10' : 'px-3 h-10',
              isActive
                ? 'bg-primary-50 text-primary-700 dark:bg-primary-500/15 dark:text-primary-200'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
            );
          const body = (
            <>
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 truncate">{label}</span>
                  {external && (
                    <ExternalLink
                      className="w-3.5 h-3.5 flex-shrink-0 text-slate-400 dark:text-slate-500"
                      aria-hidden
                    />
                  )}
                  {to === '/panel/feedback' && unreadFeedback > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-amber-500 text-white text-[11px] font-bold tabular-nums">
                      {unreadFeedback > 99 ? '99+' : unreadFeedback}
                    </span>
                  )}
                  {to === '/panel/posteingang' && posteingangCount > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-amber-500 text-white text-[11px] font-bold tabular-nums">
                      {posteingangCount > 99 ? '99+' : posteingangCount}
                    </span>
                  )}
                  {comingSoon && <StatusBadge kind="soon" size="xs" />}
                </>
              )}
              {/* Collapsed: tiny dot indicator for unread */}
              {collapsed && to === '/panel/feedback' && unreadFeedback > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500" />
              )}
              {collapsed && to === '/panel/posteingang' && posteingangCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500" />
              )}
            </>
          );
          if (external) {
            return (
              <a
                key={to}
                href={to}
                target="_blank"
                rel="noopener noreferrer"
                className={cls(false)}
                title={collapsed ? label : undefined}
              >
                {body}
              </a>
            );
          }
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => cls(isActive)}
              title={collapsed ? label : undefined}
            >
              {body}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={clsx('border-t border-slate-200 dark:border-slate-800', collapsed ? 'px-2 py-2 space-y-1' : 'px-3 py-3 space-y-2')}>
        {!collapsed && user && (
          <div className="flex items-center gap-2.5 px-1 py-1.5">
            <div className="w-8 h-8 rounded-full bg-primary-500 dark:bg-primary-500/30 grid place-items-center text-white dark:text-primary-100 text-xs font-bold flex-shrink-0">
              {(user.name || user.email).slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 leading-tight">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{user.name || 'Inhaber'}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user.companyName || user.email}</p>
            </div>
          </div>
        )}

        <div className={clsx('flex items-center gap-1', collapsed ? 'flex-col' : 'flex-row')}>
          <button
            onClick={onToggleTheme}
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800"
            title={theme === 'dark' ? 'Hell-Modus' : 'Dunkel-Modus'}
            aria-label={theme === 'dark' ? 'Hell-Modus aktivieren' : 'Dunkel-Modus aktivieren'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          {!mobile && (
            <button
              onClick={onToggleCollapsed}
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800"
              title={collapsed ? 'Seitenleiste ausklappen' : 'Seitenleiste einklappen'}
              aria-label={collapsed ? 'Seitenleiste ausklappen' : 'Seitenleiste einklappen'}
            >
              {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={onLogout}
            className={clsx(
              'inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-300 dark:hover:bg-rose-950/40',
              !collapsed && 'ml-auto',
            )}
            title="Abmelden"
            aria-label="Abmelden"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

function SearchIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.35-4.35M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z" />
    </svg>
  );
}

/* ─── Force-password-change modal (unchanged behaviour) ─────────────────── */

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
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4"
      >
        <header className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-900 shrink-0">
            <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 id="force-pwd-title" className="font-semibold text-slate-900 dark:text-slate-100">
              Bitte zuerst ein neues Passwort setzen
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Sie verwenden noch das Initial-Passwort. Aus Sicherheitsgründen ist das Panel erst
              nach Vergabe eines eigenen Passworts nutzbar.
            </p>
          </div>
        </header>

        <label className="block">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Aktuelles (Initial-)Passwort</span>
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
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Neues Passwort (min. 12 Zeichen)</span>
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
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Bestätigen</span>
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
            className="text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
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

/* Shared atoms for the panel redesign. Kept in one file so the foundation
 * lives in a single place — the rest of the panel imports from here. */
import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

/* ─── Theme (light / dark) ───────────────────────────────────────────────── */

const THEME_KEY = 'kalku.panel.theme';
export type PanelTheme = 'light' | 'dark';

function readStoredTheme(): PanelTheme {
  if (typeof window === 'undefined') return 'light';
  const v = window.localStorage.getItem(THEME_KEY);
  if (v === 'dark' || v === 'light') return v;
  // First-run: respect OS preference.
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(t: PanelTheme) {
  const root = document.documentElement;
  if (t === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}

/** Drives the `dark` class on <html> while a panel page is mounted.
 *  Light is restored on unmount so marketing pages aren't affected. */
export function usePanelTheme(): { theme: PanelTheme; toggle: () => void; set: (t: PanelTheme) => void } {
  const [theme, setTheme] = useState<PanelTheme>(() => readStoredTheme());
  useEffect(() => {
    applyTheme(theme);
    return () => {
      // Restore light on unmount so other React roots stay light.
      applyTheme('light');
    };
  }, [theme]);
  const set = useCallback((t: PanelTheme) => {
    setTheme(t);
    window.localStorage.setItem(THEME_KEY, t);
  }, []);
  const toggle = useCallback(() => set(theme === 'dark' ? 'light' : 'dark'), [theme, set]);
  return { theme, toggle, set };
}

/* ─── Density (comfortable / dense) ──────────────────────────────────────── */

const DENSITY_KEY = 'kalku.panel.density';
export type PanelDensity = 'comfortable' | 'dense';

function readStoredDensity(): PanelDensity {
  if (typeof window === 'undefined') return 'comfortable';
  const v = window.localStorage.getItem(DENSITY_KEY);
  return v === 'dense' ? 'dense' : 'comfortable';
}

export function usePanelDensity(): { density: PanelDensity; toggle: () => void } {
  const [density, setDensity] = useState<PanelDensity>(() => readStoredDensity());
  const toggle = useCallback(() => {
    setDensity((prev) => {
      const next = prev === 'dense' ? 'comfortable' : 'dense';
      window.localStorage.setItem(DENSITY_KEY, next);
      return next;
    });
  }, []);
  return { density, toggle };
}

/* ─── StatusBadge ────────────────────────────────────────────────────────── */

export type StatusKind =
  | 'draft'        // Entwurf, nicht geteilt
  | 'shared'       // Geteilt, noch nicht angeschaut
  | 'viewed'       // Vom Kunden geöffnet
  | 'approved'     // Freigegeben
  | 'changes'      // Änderungswünsche
  | 'rejected'     // Abgelehnt
  | 'revoked'      // Widerrufen
  | 'stale'        // Snapshot älter als aktueller Stand
  | 'nachtrag'     // VOB §2 Nr.3/5/6 Nachtrag
  | 'soon';        // Generisch "kommt bald"

const STATUS_STYLES: Record<StatusKind, { label: string; cls: string }> = {
  draft: {
    label: 'Entwurf',
    cls: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
  },
  shared: {
    label: 'Geteilt',
    cls: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-800',
  },
  viewed: {
    label: 'Gesehen',
    cls: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-800',
  },
  approved: {
    label: 'Freigegeben',
    cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-800',
  },
  changes: {
    label: 'Änderungen',
    cls: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-800',
  },
  rejected: {
    label: 'Abgelehnt',
    cls: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-800',
  },
  revoked: {
    label: 'Widerrufen',
    cls: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-800',
  },
  stale: {
    label: 'Veraltet',
    cls: 'bg-amber-100 text-amber-800 ring-amber-300 dark:bg-amber-900/50 dark:text-amber-200 dark:ring-amber-700',
  },
  nachtrag: {
    label: 'Nachtrag',
    cls: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200 dark:bg-fuchsia-950/50 dark:text-fuchsia-300 dark:ring-fuchsia-800',
  },
  soon: {
    label: 'Bald',
    cls: 'bg-slate-100 text-slate-500 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700',
  },
};

export function StatusBadge({
  kind,
  label,
  size = 'sm',
}: {
  kind: StatusKind;
  label?: string;
  size?: 'xs' | 'sm';
}) {
  const s = STATUS_STYLES[kind];
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full font-semibold uppercase tracking-wider ring-1 ring-inset',
        size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]',
        s.cls,
      )}
    >
      {label ?? s.label}
    </span>
  );
}

/* ─── Skeleton (shimmer) ─────────────────────────────────────────────────── */

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded bg-slate-200/70 dark:bg-slate-800',
        'after:absolute after:inset-0 after:-translate-x-full after:animate-[shimmer_1.6s_infinite]',
        'after:bg-gradient-to-r after:from-transparent after:via-white/40 after:to-transparent',
        'dark:after:via-white/5',
        className,
      )}
    />
  );
}

/* ─── Kbd ────────────────────────────────────────────────────────────────── */

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded border border-slate-200 bg-slate-50 px-1 font-sans text-[10px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
      {children}
    </kbd>
  );
}

/* ─── Breadcrumb ─────────────────────────────────────────────────────────── */

export type Crumb = { label: string; to?: string };

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Pfad" className="flex items-center text-xs text-slate-500 dark:text-slate-400">
      {items.map((c, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="inline-flex items-center">
            {i > 0 && <span className="mx-1.5 text-slate-300 dark:text-slate-600">›</span>}
            {c.to && !isLast ? (
              <Link
                to={c.to}
                className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                {c.label}
              </Link>
            ) : (
              <span className={clsx(isLast && 'text-slate-700 dark:text-slate-200 font-medium')}>
                {c.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

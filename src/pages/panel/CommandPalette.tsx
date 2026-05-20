import { useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutDashboard,
  Calculator,
  Inbox,
  Settings,
  FolderClosed,
  Plus,
  FileText,
  ArrowRight,
  X as XIcon,
  type LucideIcon,
} from 'lucide-react';
import clsx from 'clsx';
import { api } from '@/lib/api';
import type { ProjectSummary } from '@/features/kalkulation/types';
import { Kbd } from './ui';

type CmdItem = {
  id: string;
  label: string;
  hint?: string;
  group: 'Navigation' | 'Aktion' | 'Projekte';
  icon: LucideIcon;
  to: string;
};

const STATIC: CmdItem[] = [
  { id: 'nav-dashboard', label: 'Dashboard', group: 'Navigation', icon: LayoutDashboard, to: '/panel', hint: 'g d' },
  { id: 'nav-projects', label: 'Kalkulation', group: 'Navigation', icon: Calculator, to: '/panel/kalkulation', hint: 'g p' },
  { id: 'nav-inbox', label: 'Kunden-Feedback', group: 'Navigation', icon: Inbox, to: '/panel/feedback', hint: 'g i' },
  { id: 'nav-archive', label: 'Archiv', group: 'Navigation', icon: FolderClosed, to: '/panel/archiv' },
  { id: 'nav-settings', label: 'Einstellungen', group: 'Navigation', icon: Settings, to: '/panel/einstellungen', hint: 'g s' },
  { id: 'act-new', label: 'Neues Projekt anlegen', group: 'Aktion', icon: Plus, to: '/panel/kalkulation?new=1', hint: 'c' },
];

export default function CommandPalette({
  open,
  onClose,
  onNavigate,
}: {
  open: boolean;
  onClose: () => void;
  onNavigate: (to: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load projects on first open. Cached after that (this list is small).
  const loadedRef = useRef(false);
  useEffect(() => {
    if (!open || loadedRef.current) return;
    loadedRef.current = true;
    api.projects
      .list()
      .then((res) => setProjects(res.projects))
      .catch(() => {
        /* palette degrades to nav-only on failure */
      });
  }, [open]);

  // Reset query + selection + focus on open
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(0);
    const id = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(id);
  }, [open]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const items: CmdItem[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const projItems: CmdItem[] = projects.map((p) => ({
      id: `proj-${p.id}`,
      label: p.name || p.id,
      hint: p.client || undefined,
      group: 'Projekte' as const,
      icon: FileText,
      to: `/panel/kalkulation/${p.id}`,
    }));
    const all = [...STATIC, ...projItems];
    if (!q) return all.slice(0, 20);
    return all
      .filter(
        (it) =>
          it.label.toLowerCase().includes(q) || (it.hint && it.hint.toLowerCase().includes(q)),
      )
      .slice(0, 20);
  }, [projects, query]);

  // Clamp active when items change
  useEffect(() => {
    if (active >= items.length) setActive(Math.max(0, items.length - 1));
  }, [items.length, active]);

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(items.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const it = items[active];
      if (it) onNavigate(it.to);
    }
  }

  if (!open) return null;

  // Group items in display order while preserving the activeIndex mapping
  const grouped: Array<[CmdItem['group'], CmdItem[]]> = [];
  for (const it of items) {
    const last = grouped[grouped.length - 1];
    if (last && last[0] === it.group) last[1].push(it);
    else grouped.push([it.group, [it]]);
  }

  let flatIndex = -1;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Befehlspalette"
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh] bg-slate-900/60 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={onKeyDown}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 h-12 border-b border-slate-200 dark:border-slate-800">
          <SearchIcon />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Befehl, Projekt oder Seite suchen…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-slate-400 dark:text-slate-100"
          />
          <button
            onClick={onClose}
            aria-label="Schließen"
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto py-1">
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              Keine Treffer für „{query}“.
            </div>
          ) : (
            grouped.map(([group, list]) => (
              <div key={group} className="px-1">
                <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {group}
                </p>
                {list.map((it) => {
                  flatIndex += 1;
                  const idx = flatIndex;
                  const isActive = idx === active;
                  const Icon = it.icon;
                  return (
                    <button
                      key={it.id}
                      type="button"
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => onNavigate(it.to)}
                      className={clsx(
                        'group w-full flex items-center gap-3 px-3 h-10 rounded-lg text-sm text-left transition-colors',
                        isActive
                          ? 'bg-primary-50 text-primary-800 dark:bg-primary-500/15 dark:text-primary-100'
                          : 'text-slate-700 dark:text-slate-200',
                      )}
                    >
                      <Icon className={clsx('w-4 h-4 flex-shrink-0', isActive ? 'text-primary-600 dark:text-primary-300' : 'text-slate-400 dark:text-slate-500')} />
                      <span className="flex-1 truncate">{it.label}</span>
                      {it.hint && (
                        <span className="hidden sm:inline-flex items-center gap-1">
                          {it.hint.split(' ').map((k, i) => (
                            <Kbd key={i}>{k}</Kbd>
                          ))}
                        </span>
                      )}
                      <ArrowRight className={clsx('w-3.5 h-3.5 transition-transform', isActive ? 'translate-x-0 opacity-100' : '-translate-x-1 opacity-0')} />
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-4 h-9 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
            Navigieren
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Kbd>↵</Kbd>
            Öffnen
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Kbd>Esc</Kbd>
            Schließen
          </span>
        </div>
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.35-4.35M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z" />
    </svg>
  );
}

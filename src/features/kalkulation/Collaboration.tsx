import { useCallback, useEffect, useState } from 'react';
import { Users, X, UserPlus, Crown, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { api, ApiError } from '@/lib/api';
import type { PresencePeer, ProjectCollaborators } from './types';

/** Deterministic, accessible colour per person so the same name always gets the
 *  same avatar tint across tabs. */
const AVATAR_TINTS = [
  'bg-sky-600',
  'bg-emerald-600',
  'bg-violet-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-teal-600',
  'bg-indigo-600',
] as const;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function tintFor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return AVATAR_TINTS[h % AVATAR_TINTS.length];
}

/**
 * Live-Zusammenarbeit presence bar — shows the coworkers currently viewing this
 * calculation. A pulsing ring marks someone who has unsaved edits in flight.
 * Renders nothing when nobody else is here (keeps the toolbar quiet solo).
 */
export function PresenceBar({ peers }: { peers: PresencePeer[] }) {
  if (peers.length === 0) return null;
  const shown = peers.slice(0, 4);
  const overflow = peers.length - shown.length;
  return (
    <div
      className="flex items-center gap-1.5 pl-1 pr-2 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60"
      aria-label={`${peers.length} weitere Person${peers.length === 1 ? '' : 'en'} aktiv`}
      title={peers.map((p) => p.name + (p.editing ? ' (bearbeitet)' : '')).join(', ')}
    >
      <div className="flex -space-x-1.5">
        {shown.map((p) => (
          <span
            key={p.userId}
            className={clsx(
              'inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold text-white ring-2',
              tintFor(p.userId),
              p.editing
                ? 'ring-emerald-400 animate-pulse'
                : 'ring-white dark:ring-slate-900',
            )}
          >
            {initials(p.name)}
          </span>
        ))}
        {overflow > 0 && (
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold text-slate-600 dark:text-slate-200 bg-slate-200 dark:bg-slate-700 ring-2 ring-white dark:ring-slate-900">
            +{overflow}
          </span>
        )}
      </div>
      <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
        {peers.some((p) => p.editing) ? 'bearbeiten gerade' : 'online'}
      </span>
    </div>
  );
}

type TeamDialogProps = {
  projectId: string;
  open: boolean;
  onClose: () => void;
};

/**
 * Manage who can edit this calculation. The owner (or an admin) can grant access
 * to another panel user by email and revoke it; everyone with access sees the
 * roster. Backs "Bülent + Unternehmer + Mitarbeiter an einer Kalkulation".
 */
export function TeamDialog({ projectId, open, onClose }: TeamDialogProps) {
  const [roster, setRoster] = useState<ProjectCollaborators | null>(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRoster(await api.projects.collaborators(projectId));
    } catch {
      setError('Team konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const canManage = roster?.canManage ?? false;

  async function addByEmail(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!value) return;
    setAdding(true);
    setError(null);
    try {
      const { collaborator } = await api.projects.addCollaborator(projectId, { email: value });
      toast.success(`${collaborator.name} kann jetzt mitarbeiten.`);
      setEmail('');
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError('Kein Panel-Benutzer mit dieser E-Mail gefunden.');
      } else if (err instanceof ApiError && err.message === 'already_owner') {
        setError('Diese Person ist bereits Eigentümer der Kalkulation.');
      } else if (err instanceof ApiError && err.status === 403) {
        setError('Nur der Eigentümer kann Personen hinzufügen.');
      } else {
        setError('Hinzufügen fehlgeschlagen.');
      }
    } finally {
      setAdding(false);
    }
  }

  async function remove(userId: string, name: string) {
    if (typeof window !== 'undefined' && !window.confirm(`${name} den Zugriff entziehen?`)) return;
    try {
      await api.projects.removeCollaborator(projectId, userId);
      toast.success(`${name} entfernt.`);
      await load();
    } catch {
      toast.error('Entfernen fehlgeschlagen.');
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Team / Zugriff"
      className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-8 bg-slate-900/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[calc(100vh-4rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center gap-3 h-14 px-5 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <Users className="w-4 h-4 text-primary-600 dark:text-primary-300" />
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">Team / Zugriff</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Wer darf diese Kalkulation öffnen und bearbeiten
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Schließen"
            className="ml-auto p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-sm text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
            </div>
          )}

          {loading && !roster ? (
            <div className="flex items-center gap-2 text-sm text-slate-500 py-6 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Lädt…
            </div>
          ) : (
            <ul className="space-y-1.5">
              {roster?.owner && (
                <li className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <span
                    className={clsx(
                      'inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold text-white',
                      tintFor(roster.owner.id),
                    )}
                  >
                    {initials(roster.owner.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {roster.owner.name}
                    </div>
                    <div className="text-xs text-slate-500 truncate">{roster.owner.email}</div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                    <Crown className="w-3.5 h-3.5" /> Eigentümer
                  </span>
                </li>
              )}
              {roster?.collaborators.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <span
                    className={clsx(
                      'inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold text-white',
                      tintFor(c.id),
                    )}
                  >
                    {initials(c.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {c.name}
                    </div>
                    <div className="text-xs text-slate-500 truncate">{c.email}</div>
                  </div>
                  {canManage && (
                    <button
                      onClick={() => remove(c.id, c.name)}
                      aria-label={`${c.name} entfernen`}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </li>
              ))}
              {roster && roster.collaborators.length === 0 && (
                <li className="text-xs text-slate-400 px-3 py-2">
                  Noch niemand eingeladen — fügen Sie Kolleg:innen hinzu, damit mehrere gleichzeitig
                  an dieser Kalkulation arbeiten können.
                </li>
              )}
            </ul>
          )}

          {canManage && (
            <form
              onSubmit={addByEmail}
              className="flex items-center gap-2 pt-3 border-t border-slate-200 dark:border-slate-800"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kollege@kalku.de"
                className="input flex-1"
                aria-label="E-Mail des Kollegen"
              />
              <button
                type="submit"
                disabled={adding || !email.trim()}
                className="btn btn-primary flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
              >
                {adding ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                Hinzufügen
              </button>
            </form>
          )}
          {!canManage && roster && (
            <p className="text-xs text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800">
              Nur der Eigentümer kann das Team ändern.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import {
  Loader2,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Pencil,
  Power,
  Copy,
  Check,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api, ApiError, type AdminUserInput, type AdminUserPatch } from '@/lib/api';
import {
  PANEL_PERMISSION_KEYS,
  PANEL_PERMISSION_LABELS,
  isPanelAdmin,
} from '@/lib/panelPermissions';
import type { AdminUser, PanelPermissionKey, UserRole } from '@/features/kalkulation/types';
import { Breadcrumb } from './ui';

type PermMap = Record<PanelPermissionKey, boolean>;

function permsFrom(value: boolean): PermMap {
  return PANEL_PERMISSION_KEYS.reduce((acc, k) => {
    acc[k] = value;
    return acc;
  }, {} as PermMap);
}

function permsFromRaw(raw: Partial<Record<PanelPermissionKey, boolean>>): PermMap {
  return PANEL_PERMISSION_KEYS.reduce((acc, k) => {
    acc[k] = raw[k] === true;
    return acc;
  }, {} as PermMap);
}

/** Map a server error code to a German message for the toast. */
function errorMessage(err: unknown, fallback: string): string {
  const code = err instanceof ApiError ? (err.body as { error?: string } | null)?.error : undefined;
  switch (code) {
    case 'email_taken':
      return 'Diese E-Mail ist bereits vergeben.';
    case 'last_admin':
      return 'Das ist der letzte aktive Administrator — Rolle/Status kann nicht entfernt werden.';
    case 'cannot_demote_self':
      return 'Sie können sich nicht selbst die Admin-Rolle entziehen.';
    case 'cannot_deactivate_self':
      return 'Sie können sich nicht selbst deaktivieren.';
    case 'invalid_input':
      return 'Eingabe ungültig — bitte Felder prüfen (Passwort min. 12 Zeichen).';
    default:
      return fallback;
  }
}

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AdminUser | 'new' | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  /** Initial/reset password to display once. {email,password} or null. */
  const [revealed, setRevealed] = useState<{ email: string; password: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { users: list } = await api.admin.listUsers();
      setUsers(list);
    } catch {
      toast.error('Benutzer konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isPanelAdmin(me)) load();
  }, [load, me]);

  async function toggleActive(u: AdminUser) {
    setBusyId(u.id);
    try {
      const { user: updated } = await api.admin.updateUser(u.id, { isActive: !u.isActive });
      setUsers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      toast.success(updated.isActive ? 'Benutzer aktiviert.' : 'Benutzer deaktiviert.');
    } catch (err) {
      toast.error(errorMessage(err, 'Status konnte nicht geändert werden.'));
    } finally {
      setBusyId(null);
    }
  }

  async function resetPassword(u: AdminUser) {
    setBusyId(u.id);
    try {
      const { generatedPassword } = await api.admin.resetPassword(u.id);
      if (generatedPassword) setRevealed({ email: u.email, password: generatedPassword });
      toast.success('Passwort zurückgesetzt.');
      load();
    } catch (err) {
      toast.error(errorMessage(err, 'Passwort konnte nicht zurückgesetzt werden.'));
    } finally {
      setBusyId(null);
    }
  }

  if (!isPanelAdmin(me)) {
    return (
      <div className="max-w-2xl">
        <Breadcrumb items={[{ label: 'Panel', to: '/panel' }, { label: 'Benutzer' }]} />
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 p-4">
          <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-slate-900 dark:text-slate-100">Kein Zugriff</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Die Benutzerverwaltung ist nur für Administratoren sichtbar.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      <Breadcrumb items={[{ label: 'Panel', to: '/panel' }, { label: 'Benutzer' }]} />

      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Benutzer</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Benutzer anlegen und festlegen, welche Bereiche jeder sehen darf.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="btn btn-primary flex items-center gap-2 shrink-0"
        >
          <UserPlus className="w-4 h-4" /> Neuer Benutzer
        </button>
      </header>

      {revealed && (
        <PasswordReveal
          email={revealed.email}
          password={revealed.password}
          onClose={() => setRevealed(null)}
        />
      )}

      {loading ? (
        <div className="grid place-items-center py-16">
          <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-4 py-3 font-medium">Benutzer</th>
                  <th className="px-4 py-3 font-medium">Rolle</th>
                  <th className="px-4 py-3 font-medium">Zugriff</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = u.id === me?.id;
                  return (
                    <tr
                      key={u.id}
                      className="border-b border-slate-100 dark:border-slate-800/60 last:border-0"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          {u.name || u.email}
                          {isSelf && (
                            <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary-50 text-primary-700 dark:bg-primary-500/15 dark:text-primary-200">
                              Sie
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{u.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        {u.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 dark:text-primary-300">
                            <ShieldCheck className="w-3.5 h-3.5" /> Admin
                          </span>
                        ) : (
                          <span className="text-xs text-slate-600 dark:text-slate-300">Benutzer</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <PermissionSummary user={u} />
                      </td>
                      <td className="px-4 py-3">
                        {u.isActive ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Aktiv
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Inaktiv
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <IconButton
                            title="Bearbeiten"
                            onClick={() => setEditing(u)}
                            disabled={busyId === u.id}
                          >
                            <Pencil className="w-4 h-4" />
                          </IconButton>
                          <IconButton
                            title="Passwort zurücksetzen"
                            onClick={() => resetPassword(u)}
                            disabled={busyId === u.id}
                          >
                            <KeyRound className="w-4 h-4" />
                          </IconButton>
                          <IconButton
                            title={isSelf ? 'Eigenes Konto nicht deaktivierbar' : u.isActive ? 'Deaktivieren' : 'Aktivieren'}
                            onClick={() => toggleActive(u)}
                            disabled={busyId === u.id || isSelf}
                            danger={u.isActive}
                          >
                            {busyId === u.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Power className="w-4 h-4" />
                            )}
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing && (
        <UserFormModal
          mode={editing === 'new' ? 'create' : 'edit'}
          initial={editing === 'new' ? null : editing}
          isSelf={editing !== 'new' && editing.id === me?.id}
          onClose={() => setEditing(null)}
          onSaved={(generated) => {
            setEditing(null);
            if (generated) setRevealed(generated);
            load();
          }}
        />
      )}
    </div>
  );
}

/* ─── Permission summary chip row ───────────────────────────────────────── */

function PermissionSummary({ user }: { user: AdminUser }) {
  if (user.role === 'admin') {
    return <span className="text-xs text-slate-500 dark:text-slate-400">Alle Bereiche</span>;
  }
  const granted = PANEL_PERMISSION_KEYS.filter((k) => user.effectivePermissions[k]);
  if (granted.length === 0) {
    return <span className="text-xs text-slate-400 dark:text-slate-500">Keine</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {granted.map((k) => (
        <span
          key={k}
          className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
        >
          {PANEL_PERMISSION_LABELS[k].label}
        </span>
      ))}
    </div>
  );
}

/* ─── Small round icon button ───────────────────────────────────────────── */

function IconButton({
  children,
  title,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={
        'inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ' +
        (danger
          ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-300 dark:hover:bg-rose-950/40'
          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800')
      }
    >
      {children}
    </button>
  );
}

/* ─── Generated-password reveal banner (shown once) ─────────────────────── */

function PasswordReveal({
  email,
  password,
  onClose,
}: {
  email: string;
  password: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Kopieren nicht möglich — bitte manuell markieren.');
    }
  }
  return (
    <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-slate-900 dark:text-slate-100">
            Initial-Passwort für {email}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Wird nur jetzt angezeigt. Jetzt kopieren und sicher übergeben — der Benutzer muss es bei
            der ersten Anmeldung ändern.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="px-2 py-1 rounded bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900 font-mono text-sm text-slate-900 dark:text-slate-100 select-all">
              {password}
            </code>
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-300 hover:underline"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Kopiert' : 'Kopieren'}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Schließen"
          className="p-1.5 rounded-lg text-slate-500 hover:bg-white/60 dark:hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ─── Create / edit modal ───────────────────────────────────────────────── */

function UserFormModal({
  mode,
  initial,
  isSelf,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit';
  initial: AdminUser | null;
  isSelf: boolean;
  onClose: () => void;
  onSaved: (generated: { email: string; password: string } | null) => void;
}) {
  const [email, setEmail] = useState(initial?.email ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [role, setRole] = useState<UserRole>(initial?.role ?? 'user');
  const [perms, setPerms] = useState<PermMap>(
    initial ? permsFromRaw(initial.permissions) : permsFrom(true),
  );
  const [companyName, setCompanyName] = useState(initial?.companyName ?? '');
  const [companyPhone, setCompanyPhone] = useState(initial?.companyPhone ?? '');
  const [companyContactEmail, setCompanyContactEmail] = useState(initial?.companyContactEmail ?? '');
  const [password, setPassword] = useState('');
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [saving, setSaving] = useState(false);

  const title = mode === 'create' ? 'Neuer Benutzer' : `Benutzer bearbeiten`;
  const adminEffective = role === 'admin';

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password && password.length < 12) {
      toast.error('Passwort muss mindestens 12 Zeichen haben (oder leer lassen).');
      return;
    }
    setSaving(true);
    try {
      if (mode === 'create') {
        const input: AdminUserInput = {
          email: email.trim(),
          name: name.trim(),
          role,
          permissions: perms,
          companyName: companyName.trim() || undefined,
          companyPhone: companyPhone.trim() || undefined,
          companyContactEmail: companyContactEmail.trim() || undefined,
          ...(password ? { password } : {}),
        };
        const { user: created, generatedPassword } = await api.admin.createUser(input);
        toast.success('Benutzer angelegt.');
        onSaved(generatedPassword ? { email: created.email, password: generatedPassword } : null);
      } else if (initial) {
        const patch: AdminUserPatch = {
          name: name.trim(),
          email: email.trim(),
          role,
          permissions: perms,
          isActive,
          companyName: companyName.trim(),
          companyPhone: companyPhone.trim(),
          companyContactEmail: companyContactEmail.trim(),
        };
        await api.admin.updateUser(initial.id, patch);
        toast.success('Änderungen gespeichert.');
        onSaved(null);
      }
    } catch (err) {
      toast.error(errorMessage(err, 'Speichern fehlgeschlagen.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center px-4 py-8 overflow-y-auto bg-slate-900/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-form-title"
    >
      <form
        onSubmit={submit}
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 my-auto"
      >
        <header className="flex items-center justify-between">
          <h2 id="user-form-title" className="font-semibold text-lg text-slate-900 dark:text-slate-100">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Name</span>
            <input className="mt-1 input" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Vor- und Nachname" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">E-Mail (Login)</span>
            <input type="email" className="mt-1 input" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="name@firma.de" />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Rolle</span>
          <select
            className="mt-1 input"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            disabled={isSelf}
          >
            <option value="user">Benutzer (eingeschränkt)</option>
            <option value="admin">Administrator (Vollzugriff + Benutzerverwaltung)</option>
          </select>
          {isSelf && (
            <span className="block text-xs text-slate-500 dark:text-slate-400 mt-1">
              Die eigene Rolle kann nicht geändert werden.
            </span>
          )}
        </label>

        <fieldset className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
          <legend className="px-1 text-sm font-medium text-slate-700 dark:text-slate-300">
            Zugriff auf Bereiche
          </legend>
          {adminEffective ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 px-1 py-1">
              Administratoren haben Zugriff auf alle Bereiche.
            </p>
          ) : (
            <div className="space-y-1.5">
              {PANEL_PERMISSION_KEYS.map((k) => (
                <label key={k} className="flex items-start gap-2.5 px-1 py-1 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    checked={perms[k]}
                    onChange={(e) => setPerms({ ...perms, [k]: e.target.checked })}
                  />
                  <span className="leading-tight">
                    <span className="block text-sm text-slate-800 dark:text-slate-200">
                      {PANEL_PERMISSION_LABELS[k].label}
                    </span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      {PANEL_PERMISSION_LABELS[k].description}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </fieldset>

        {mode === 'edit' && (
          <label className="flex items-center gap-2.5">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 disabled:opacity-50"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              disabled={isSelf}
            />
            <span className="text-sm text-slate-800 dark:text-slate-200">
              Konto aktiv {isSelf && <span className="text-xs text-slate-500">(eigenes Konto)</span>}
            </span>
          </label>
        )}

        {mode === 'create' && (
          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Initial-Passwort (optional)
            </span>
            <input
              type="text"
              autoComplete="off"
              className="mt-1 input font-mono"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="leer lassen → wird automatisch erzeugt"
            />
            <span className="block text-xs text-slate-500 dark:text-slate-400 mt-1">
              Mind. 12 Zeichen. Bleibt das Feld leer, erzeugt das System ein Passwort und zeigt es
              einmalig an. Der Benutzer ändert es bei der ersten Anmeldung.
            </span>
          </label>
        )}

        <details className="rounded-lg border border-slate-200 dark:border-slate-800">
          <summary className="px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
            Firma & Kontakt (optional)
          </summary>
          <div className="px-3 pb-3 space-y-3">
            <label className="block">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Firmenname</span>
              <input className="mt-1 input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="z. B. Mustermann Bau GmbH" />
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Telefon</span>
                <input className="mt-1 input" value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} placeholder="+49 …" />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Antwort-E-Mail</span>
                <input type="email" className="mt-1 input" value={companyContactEmail} onChange={(e) => setCompanyContactEmail(e.target.value)} placeholder="kontakt@firma.de" />
              </label>
            </div>
          </div>
        </details>

        <div className="flex items-center justify-end gap-3 pt-1">
          <button type="button" onClick={onClose} className="text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
            Abbrechen
          </button>
          <button type="submit" disabled={saving} className="btn btn-primary disabled:opacity-50 flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {mode === 'create' ? 'Anlegen' : 'Speichern'}
          </button>
        </div>
      </form>
    </div>
  );
}

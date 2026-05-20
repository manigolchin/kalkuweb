import { useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Save, Lock, Building2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api, ApiError } from '@/lib/api';

export default function PanelSettings() {
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState({
    name: user?.name || '',
    companyName: user?.companyName || '',
    companyLogoUrl: user?.companyLogoUrl || '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [savingPwd, setSavingPwd] = useState(false);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const { user: updated } = await api.auth.updateProfile(profile);
      setUser(updated);
      toast.success('Profil gespeichert.');
    } catch {
      toast.error('Speichern fehlgeschlagen.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePwd(e: FormEvent) {
    e.preventDefault();
    if (pwd.next.length < 8) {
      toast.error('Neues Passwort muss mindestens 8 Zeichen haben.');
      return;
    }
    if (pwd.next !== pwd.confirm) {
      toast.error('Bestätigung stimmt nicht überein.');
      return;
    }
    setSavingPwd(true);
    try {
      await api.auth.changePassword(pwd.current, pwd.next);
      setPwd({ current: '', next: '', confirm: '' });
      toast.success('Passwort geändert.');
    } catch (err) {
      if (err instanceof ApiError && err.body && (err.body as { error?: string }).error === 'invalid_current_password') {
        toast.error('Aktuelles Passwort stimmt nicht.');
      } else {
        toast.error('Passwort konnte nicht geändert werden.');
      }
    } finally {
      setSavingPwd(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Einstellungen</h1>
        <p className="text-sm text-slate-500 mt-1">Profil und Passwort</p>
      </header>

      <form onSubmit={saveProfile} className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold text-slate-900 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary-500" /> Firma & Profil
        </h2>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Name</span>
          <input
            className="mt-1 input"
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            placeholder="Vor- und Nachname"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Firmenname</span>
          <input
            className="mt-1 input"
            value={profile.companyName}
            onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
            placeholder="z. B. Mustermann Bau GmbH"
          />
          <span className="block text-xs text-slate-500 mt-1">
            Wird im Header des Kunden-Angebots angezeigt.
          </span>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Logo-URL (optional)</span>
          <input
            className="mt-1 input"
            value={profile.companyLogoUrl}
            onChange={(e) => setProfile({ ...profile, companyLogoUrl: e.target.value })}
            placeholder="https://…/logo.png"
          />
        </label>

        <div className="pt-2">
          <button
            type="submit"
            disabled={savingProfile}
            className="btn btn-primary disabled:opacity-50 flex items-center gap-2"
          >
            {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Speichern
          </button>
        </div>
      </form>

      <form onSubmit={changePwd} className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold text-slate-900 flex items-center gap-2">
          <Lock className="w-4 h-4 text-primary-500" /> Passwort ändern
        </h2>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Aktuelles Passwort</span>
          <input
            type="password"
            autoComplete="current-password"
            className="mt-1 input"
            value={pwd.current}
            onChange={(e) => setPwd({ ...pwd, current: e.target.value })}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Neues Passwort (min. 8 Zeichen)</span>
          <input
            type="password"
            autoComplete="new-password"
            className="mt-1 input"
            value={pwd.next}
            onChange={(e) => setPwd({ ...pwd, next: e.target.value })}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Bestätigen</span>
          <input
            type="password"
            autoComplete="new-password"
            className="mt-1 input"
            value={pwd.confirm}
            onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })}
          />
        </label>

        <div className="pt-2">
          <button
            type="submit"
            disabled={savingPwd || !pwd.current || !pwd.next}
            className="btn btn-primary disabled:opacity-50 flex items-center gap-2"
          >
            {savingPwd ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            Passwort speichern
          </button>
        </div>
      </form>
    </div>
  );
}

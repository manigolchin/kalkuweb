import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Loader2, LogIn, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api';

type LocationState = { from?: { pathname?: string } };

export default function Login() {
  const { status, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const from = (location.state as LocationState | null)?.from?.pathname || '/panel';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'authenticated') {
      navigate(from, { replace: true });
    }
  }, [status, from, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await login(email.trim().toLowerCase(), password);
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('E-Mail oder Passwort stimmt nicht.');
      } else if (err instanceof ApiError && err.status === 400) {
        setError('Bitte gültige E-Mail und Passwort eingeben.');
      } else {
        setError('Anmeldung fehlgeschlagen. Bitte später erneut versuchen.');
      }
      setSubmitting(false);
    }
  }

  return (
    <>
      <Helmet>
        <title>Anmeldung – KALKU Panel</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-primary-50/40">
        <header className="px-6 py-5">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück zu kalku.de
          </Link>
        </header>

        <main className="flex-1 grid place-items-center px-6 pb-16">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary-500 text-white mb-4">
                <span className="font-bold text-lg">K</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900">KALKU Panel</h1>
              <p className="text-sm text-slate-500 mt-2">
                Anmeldung für Inhaber / Bauunternehmer
              </p>
            </div>

            <form
              onSubmit={onSubmit}
              className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-sm"
            >
              {error && (
                <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-800 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <label className="block mb-4">
                <span className="text-sm font-medium text-slate-700">E-Mail</span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 input"
                  placeholder="ihre@firma.de"
                />
              </label>

              <label className="block mb-6">
                <span className="text-sm font-medium text-slate-700">Passwort</span>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 input"
                  placeholder="••••••••"
                />
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="w-full btn btn-primary disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                Anmelden
              </button>

              <p className="text-xs text-slate-400 mt-6 text-center">
                Zugang vergessen? Wenden Sie sich an Ihren KALKU-Ansprechpartner.
              </p>
            </form>
          </div>
        </main>
      </div>
    </>
  );
}

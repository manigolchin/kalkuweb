import { useEffect, useState } from 'react';
import { X, Download, CheckCircle2 } from 'lucide-react';

const STORAGE_KEY = 'kalku.exitIntentDismissed';
const COOLDOWN_DAYS = 30;

function shouldShow(): boolean {
  if (typeof window === 'undefined') return false;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return true;
  const ts = parseInt(raw, 10);
  if (isNaN(ts)) return true;
  return Date.now() - ts > COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
}

function dismiss() {
  localStorage.setItem(STORAGE_KEY, String(Date.now()));
}

export default function ExitIntent() {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!shouldShow()) return;

    let armed = false;
    let scrollDepth = 0;
    let dwellMs = 0;
    const dwellStart = Date.now();

    function onScroll() {
      const depth =
        window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      scrollDepth = Math.max(scrollDepth, depth);
    }

    function onMouseLeave(e: MouseEvent) {
      if (!armed) return;
      // Only trigger when leaving via the top of the viewport
      if (e.clientY > 0) return;
      dwellMs = Date.now() - dwellStart;
      if (scrollDepth > 0.25 && dwellMs > 8000) {
        setShow(true);
        armed = false;
        document.removeEventListener('mouseleave', onMouseLeave);
      }
    }

    // Arm only after 5s — avoid annoying users who land and leave quickly
    const t = setTimeout(() => {
      armed = true;
    }, 5000);

    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('mouseleave', onMouseLeave);

    return () => {
      clearTimeout(t);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('mouseleave', onMouseLeave);
    };
  }, []);

  function close() {
    dismiss();
    setShow(false);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes('@')) return;
    // TODO Phase 5 backend: POST /api/forms/submit type=whitepaper
    setSubmitted(true);
    dismiss();
  }

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="exit-intent-title"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={close}
    >
      <div
        className="relative max-w-lg w-full bg-white rounded-3xl shadow-2xl p-8 sm:p-10"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={close}
          className="absolute top-3 right-3 w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-lg"
          aria-label="Schließen"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="text-center py-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
            <h3 id="exit-intent-title" className="text-2xl font-bold text-gray-900 mb-2">
              Vielen Dank!
            </h3>
            <p className="text-gray-600">
              Wir senden Ihnen das Whitepaper an {email} innerhalb der nächsten Minuten.
            </p>
          </div>
        ) : (
          <>
            <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mb-5">
              <Download className="w-7 h-7 text-amber-600" />
            </div>
            <h3 id="exit-intent-title" className="text-2xl font-bold text-gray-900 mb-2">
              Bevor Sie gehen — 7 Fehler in der VOB-Kalkulation.
            </h3>
            <p className="text-gray-600 mb-6">
              Kostenloses Whitepaper. Die häufigsten Stolpersteine bei der Kalkulation
              öffentlicher Ausschreibungen — und wie Sie sie vermeiden.
            </p>
            <form onSubmit={submit} className="space-y-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ihre@firma.de"
                className="input"
                autoFocus
              />
              <button type="submit" className="btn btn-success w-full justify-center">
                <Download className="w-4 h-4" /> Whitepaper anfordern
              </button>
            </form>
            <p className="text-xs text-gray-400 mt-4 text-center">
              DSGVO-konform. Einmalige Lieferung. Kein Newsletter.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

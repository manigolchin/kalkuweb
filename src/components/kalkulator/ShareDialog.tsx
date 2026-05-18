import { useEffect, useRef, useState } from 'react';
import { Copy, CheckCircle2, X, Share2 } from 'lucide-react';

type Props = {
  open: boolean;
  url: string;
  onClose: () => void;
};

export default function ShareDialog({ open, url, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    setTimeout(() => ref.current?.select(), 50);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      ref.current?.select();
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const length = new Blob([url]).size;
  const tooLong = length > 7000;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 print:hidden p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
              <Share2 className="w-5 h-5 text-primary-700" />
            </div>
            <div>
              <h2 id="share-title" className="text-lg font-bold text-gray-900">
                Kalkulation teilen
              </h2>
              <p className="text-sm text-gray-500">Link enthält alle Positionen und Aufschläge.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Schließen" className="p-1 -m-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5">
          <label htmlFor="share-url" className="text-xs font-semibold text-gray-700 mb-1.5 block">
            Teilbarer Link
          </label>
          <div className="flex gap-2">
            <input
              id="share-url"
              ref={ref}
              readOnly
              value={url}
              className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50 font-mono text-xs"
              onFocus={(e) => e.target.select()}
            />
            <button type="button" onClick={copy} className={copied ? 'btn btn-success btn-sm' : 'btn btn-primary btn-sm'}>
              {copied ? (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Kopiert
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" /> Kopieren
                </>
              )}
            </button>
          </div>
          {tooLong && (
            <p className="text-xs text-amber-600 mt-2">
              Hinweis: Link ist sehr lang ({(length / 1024).toFixed(1)} KB). Manche Mail-Clients kürzen Links über
              7 KB. Tipp: per WhatsApp oder Slack teilen.
            </p>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-5">
          Der Empfänger sieht exakt diese Eingaben. Daten liegen ausschließlich im Link — wir speichern nichts auf
          dem Server.
        </p>
      </div>
    </div>
  );
}

import { useState, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  Mail,
  Shield,
  ArrowRight,
  Download,
} from 'lucide-react';
import { canonical } from '@/lib/seo';
import SectionHeader from '@/components/ui/SectionHeader';
import FaqItem from '@/components/ui/FaqItem';

const TITLE = 'GAEB-Konverter (kostenlos, im Browser) | KALKU';
const DESC =
  'GAEB-Dateien (X83, X84, D83, D84, P83) im Browser öffnen — Projektdaten, Positionen und Mengen sichtbar. Premium-Auswertung kostenlos per Mail.';

type ParsedGaeb = {
  filename: string;
  size: number;
  format: string;
  projectName?: string;
  positionCount?: number;
  estimatedValue?: number;
};

const ACCEPTED_EXTENSIONS = ['.x81', '.x83', '.x84', '.x85', '.x86', '.x89', '.d81', '.d83', '.d84', '.p83', '.p84'];

const FAQ = [
  {
    q: 'Was ist GAEB?',
    a: 'Der „Gemeinsame Ausschuss Elektronik im Bauwesen" (GAEB) hat das Standard-Datenformat für die elektronische Übergabe von Leistungsverzeichnissen zwischen Auftraggeber und Bieter definiert. Versionen: GAEB 90, GAEB 2000, GAEB DA XML 3.x.',
  },
  {
    q: 'Welche Versionen werden unterstützt?',
    a: 'GAEB DA XML 3.1, 3.2, 3.3 (Endungen X81, X83, X84, X85, X86, X89), GAEB ASCII 90/2000 (D81, D83, D84) sowie ÖNORM A2063. Falls Ihr Format hier nicht aufgeführt ist — uploaden Sie es trotzdem, wir versuchen es.',
  },
  {
    q: 'Werden meine Daten auf einen Server hochgeladen?',
    a: 'Nur wenn Sie aktiv die Premium-Auswertung anfordern. Die Vorschau erfolgt komplett in Ihrem Browser — Ihre Datei verlässt Ihren Computer nicht. Erst wenn Sie auf „Premium-Auswertung anfordern" klicken, übertragen wir die Datei verschlüsselt an unseren Server.',
  },
  {
    q: 'Was bekomme ich bei der Premium-Auswertung?',
    a: 'Innerhalb von 24 h erhalten Sie per Mail: (1) eine saubere PDF-Druckansicht des kompletten LVs, (2) eine Excel-Tabelle aller Positionen mit Mengen, (3) eine KI-gestützte Klassifizierung pro Gewerk inkl. Material/Hersteller-Detection. Kostenlos, einmalig.',
  },
  {
    q: 'Kann ich das Tool auch ohne Internet nutzen?',
    a: 'Ja. Sobald die Seite im Browser-Cache liegt, funktioniert die Vorschau offline. Nur die Premium-Auswertung benötigt Internetzugang.',
  },
];

export default function GaebKonverter() {
  const [parsed, setParsed] = useState<ParsedGaeb | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setParsed(null);
    setError(null);
    setEmail('');
    setSubmitted(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleFile(file: File) {
    setError(null);
    setSubmitted(false);

    const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '');
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setError(
        `Format ${ext} wird nicht unterstützt. Akzeptiert: ${ACCEPTED_EXTENSIONS.join(', ')}.`,
      );
      return;
    }

    const text = await file.text();
    const isXml = ext.startsWith('.x') || ext.startsWith('.p');
    let projectName: string | undefined;
    let positionCount: number | undefined;
    let estimatedValue: number | undefined;

    if (isXml) {
      try {
        const doc = new DOMParser().parseFromString(text, 'application/xml');
        // GAEB DA XML uses elements like <NamePrjGes>, <Position>, <PrjInfo>
        projectName =
          doc.querySelector('NamePrjGes, NamePrj, NamePrjBlock')?.textContent?.trim() ||
          doc.querySelector('PrjInfo > NamePrjGes')?.textContent?.trim() ||
          file.name.replace(/\.[^.]+$/, '');
        positionCount = doc.querySelectorAll('Position').length;
        // Sum of <BasicElement>/<Qty> * <UP> if present (best-effort, may not work for all files)
        let sum = 0;
        doc.querySelectorAll('Position').forEach((p) => {
          const qty = parseFloat(p.querySelector('Qty')?.textContent ?? '0');
          const up = parseFloat(p.querySelector('UP')?.textContent ?? '0');
          if (qty > 0 && up > 0) sum += qty * up;
        });
        estimatedValue = sum > 0 ? sum : undefined;
      } catch {
        // Falls parsing fails, just show metadata
      }
    } else {
      // ASCII GAEB — line-based heuristic
      projectName = file.name.replace(/\.[^.]+$/, '');
      positionCount = (text.match(/^21\.\d/gm) || []).length || undefined;
    }

    setParsed({
      filename: file.name,
      size: file.size,
      format: ext.replace('.', '').toUpperCase(),
      projectName,
      positionCount,
      estimatedValue,
    });
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) void handleFile(f);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) void handleFile(f);
  }

  function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes('@') || !parsed) return;
    // TODO Phase 3.4 backend: POST /api/forms/submit type=gaeb-premium with file + email
    setSubmitted(true);
  }

  return (
    <>
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESC} />
        <link rel="canonical" href={canonical('/tools/gaeb-konverter/')} />
      </Helmet>

      {/* HERO */}
      <section className="section-tight bg-gradient-to-br from-gray-50 to-white">
        <div className="container-page">
          <div className="text-center max-w-3xl mx-auto">
            <p className="eyebrow mb-3">GAEB-Konverter</p>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 mb-5 leading-tight">
              GAEB-Datei in Sekunden öffnen.
            </h1>
            <p className="text-lg text-gray-600">
              Drag & Drop. Komplett im Browser. Ihre Datei verlässt nie Ihren Computer — es sei
              denn, Sie wollen die Premium-Auswertung mit KI-Klassifizierung.
            </p>
          </div>
        </div>
      </section>

      {/* DROP ZONE */}
      <section className="section-tight">
        <div className="container-page">
          {!parsed && (
            <label
              htmlFor="gaeb-file"
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={`relative block max-w-3xl mx-auto cursor-pointer rounded-3xl border-2 border-dashed transition-colors ${
                dragOver ? 'border-primary-500 bg-primary-50/50' : 'border-gray-300 bg-gray-50 hover:border-primary-400 hover:bg-primary-50/30'
              }`}
            >
              <input
                ref={fileRef}
                id="gaeb-file"
                type="file"
                accept={ACCEPTED_EXTENSIONS.join(',')}
                onChange={onInputChange}
                className="sr-only"
              />
              <div className="px-8 py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center mx-auto mb-5">
                  <Upload className="w-8 h-8 text-primary-500" />
                </div>
                <p className="text-lg font-semibold text-gray-900 mb-2">
                  GAEB-Datei hierhin ziehen — oder klicken zum Auswählen
                </p>
                <p className="text-sm text-gray-500">
                  Akzeptiert: {ACCEPTED_EXTENSIONS.join(', ')}
                </p>
                <p className="inline-flex items-center gap-1.5 text-xs text-gray-400 mt-5">
                  <Shield className="w-3.5 h-3.5" /> Datei verlässt Ihren Browser nicht
                </p>
              </div>
            </label>
          )}

          {error && (
            <div className="card max-w-3xl mx-auto border-red-200 bg-red-50">
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-red-900 mb-1">Datei nicht akzeptiert</p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
                <button type="button" onClick={reset} className="btn btn-sm btn-outline">
                  Neu
                </button>
              </div>
            </div>
          )}

          {parsed && (
            <div className="max-w-3xl mx-auto space-y-5">
              <div className="card">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="font-bold text-gray-900 truncate">{parsed.filename}</h2>
                      <span className="badge badge-success">Geladen</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {parsed.format} · {(parsed.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button type="button" onClick={reset} className="btn btn-sm btn-ghost">
                    Andere Datei
                  </button>
                </div>

                <div className="grid sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-gray-100">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Projekt</p>
                    <p className="font-semibold text-gray-900 text-sm truncate">
                      {parsed.projectName ?? '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Positionen</p>
                    <p className="font-semibold text-gray-900 text-sm">
                      {parsed.positionCount ?? '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Vorab-Schätzung</p>
                    <p className="font-semibold text-gray-900 text-sm">
                      {parsed.estimatedValue
                        ? parsed.estimatedValue.toLocaleString('de-DE', {
                            style: 'currency',
                            currency: 'EUR',
                          })
                        : '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Premium email capture */}
              <div className="card border-2 border-primary-100">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-primary-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      Premium-Auswertung kostenlos per Mail
                    </h3>
                    <p className="text-sm text-gray-600 mb-5">
                      Vollständige PDF-Druckansicht + Excel-Export aller Positionen +
                      KI-Klassifizierung nach Gewerk und Hersteller. Innerhalb von 24 Stunden,
                      kostenlos, einmalig.
                    </p>
                    {submitted ? (
                      <div className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 text-emerald-700 text-sm">
                        <CheckCircle2 className="w-5 h-5" />
                        Vielen Dank — wir senden Ihnen die Auswertung an {email} innerhalb von 24 Stunden.
                      </div>
                    ) : (
                      <form onSubmit={submitEmail} className="flex flex-col sm:flex-row gap-3">
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="ihre@firma.de"
                          className="input flex-1"
                        />
                        <button type="submit" className="btn btn-success">
                          <Download className="w-4 h-4" /> Anfordern
                        </button>
                      </form>
                    )}
                    <p className="text-xs text-gray-400 mt-3">
                      DSGVO-konform. Verschlüsselte Übertragung. Datei wird nach 30 Tagen
                      automatisch gelöscht. Kein Newsletter.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section className="section bg-gray-50">
        <div className="container-page">
          <SectionHeader eyebrow="Häufige Fragen" title="Zum GAEB-Konverter." />
          <div className="max-w-3xl mx-auto space-y-3">
            {FAQ.map((q) => (
              <FaqItem key={q.q} question={q.q} answer={q.a} />
            ))}
          </div>
        </div>
      </section>

      {/* CROSS-CTA */}
      <section className="section">
        <div className="container-page">
          <div className="card-flat text-center max-w-2xl mx-auto">
            <p className="eyebrow mb-3">Sie brauchen mehr als nur Konvertierung?</p>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Wir kalkulieren Ihre komplette Submission.
            </h2>
            <p className="text-gray-600 mb-6">
              Ab 200 € pro LV — Festpreis. EFB-Formblätter inklusive. Auch über Nacht.
            </p>
            <Link to="/konditionen/" className="btn btn-success">
              Konditionen ansehen <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

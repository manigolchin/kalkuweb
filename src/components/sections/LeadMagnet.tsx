import { useState, useId } from 'react';
import { Download, Mail, CheckCircle2, FileText } from 'lucide-react';

export default function LeadMagnet() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const formId = useId();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes('@')) return;
    // TODO Phase 5 backend: POST /api/forms/submit type=lead-magnet-checklist
    setSent(true);
  }

  return (
    <section className="section">
      <div className="container-page">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-center max-w-6xl mx-auto">
          {/* eBook cover mockup */}
          <div className="lg:col-span-5">
            <div className="relative max-w-sm mx-auto lg:mx-0 group">
              {/* Shadow stack — second card */}
              <div
                aria-hidden
                className="absolute -bottom-2 -right-2 w-full h-full bg-primary-100 rounded-lg rotate-1"
              />
              {/* Main cover */}
              <div className="relative aspect-[3/4] rounded-lg bg-gradient-to-br from-primary-700 via-primary-700 to-primary-900 p-7 sm:p-9 flex flex-col text-white shadow-xl group-hover:-translate-y-0.5 transition-transform">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] font-bold text-primary-200 mb-6">
                  <FileText className="w-3 h-3" /> KALKU Checkliste · 2026
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold leading-tight mb-4 tracking-tight">
                  Die 17-Punkte-Checkliste für ein VOB-konformes LV
                </h3>
                <p className="text-sm text-primary-100 leading-relaxed mb-auto">
                  Was bei der Bepreisung einer öffentlichen Ausschreibung schiefgehen kann — und
                  wie Sie es vor Submissions-Termin abfangen.
                </p>
                <div className="mt-6 pt-6 border-t border-white/20">
                  <p className="text-xs text-primary-200">
                    1-Seiten-PDF · Druck-fertig · 2026er Stand
                  </p>
                </div>
              </div>
              {/* Page-edge accent */}
              <div
                aria-hidden
                className="absolute right-0 top-3 bottom-3 w-1 bg-gradient-to-b from-transparent via-white/20 to-transparent"
              />
            </div>
          </div>

          {/* Form + copy */}
          <div className="lg:col-span-7">
            <p className="text-xs uppercase tracking-[0.18em] font-bold text-primary-700 mb-3">
              Lead-Magnet
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-gray-900 mb-5 leading-tight">
              17-Punkte-Checkliste — kostenlos per Mail.
            </h2>
            <p className="text-lg text-gray-600 mb-7 leading-relaxed">
              Was Sie vor jeder VOB-Submission abklopfen sollten. Aus 14 Jahren Praxis und
              tausenden bepreisten LVs in 10 Gewerken zusammengestellt.
            </p>

            {sent ? (
              <div className="inline-flex items-center gap-3 px-5 py-4 rounded-lg bg-emerald-50 border border-emerald-200">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <p className="text-sm text-emerald-900">
                  Vielen Dank! Wir senden die Checkliste binnen weniger Minuten an{' '}
                  <span className="font-semibold">{email}</span>.
                </p>
              </div>
            ) : (
              <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3 max-w-md mb-4">
                <label htmlFor={formId} className="sr-only">
                  E-Mail-Adresse
                </label>
                <div className="relative flex-1">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id={formId}
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ihre@firma.de"
                    className="input pl-10"
                  />
                </div>
                <button type="submit" className="btn btn-success">
                  <Download className="w-4 h-4" /> Anfordern
                </button>
              </form>
            )}

            <p className="text-xs text-gray-500 max-w-md leading-relaxed">
              DSGVO-konform. Einmalige Lieferung der Checkliste, danach optional 1 Mail/Monat
              mit Praxis-Tipps. Jederzeit kündbar mit einem Klick.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

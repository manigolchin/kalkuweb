import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowLeft, CheckCircle2, Send, AlertCircle, Phone, MessageCircle, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn, telHref, whatsappHref } from '@/lib/utils';
import { NAP } from '@/lib/constants';

const GEWERKE = [
  'Hochbau',
  'Tiefbau',
  'Straßenbau',
  'GaLaBau',
  'HLS / Haustechnik',
  'Innenausbau',
  'Erd- / Abbrucharbeiten',
  'Elektro',
  'Fenster',
  'Schadstoff',
  'Sonstiges',
];

const RADIUS_OPTIONS = ['25 km', '50 km', '75 km', '100 km', '150 km', '200 km', 'bundesweit'];
const MA_OPTIONS = ['1–3', '4–10', '11–25', '26–50', '51–100', '100+'];

type FormState = {
  firma: string;
  gewerk: string;
  einzugsgebiet: string;
  radius: string;
  mitarbeiter: string;
  vorname: string;
  nachname: string;
  email: string;
  telefon: string;
  anfrage: string;
  consent: boolean;
  /** Honeypot — bots fill this; humans don't see it */
  website: string;
};

const INITIAL: FormState = {
  firma: '',
  gewerk: '',
  einzugsgebiet: '',
  radius: '',
  mitarbeiter: '',
  vorname: '',
  nachname: '',
  email: '',
  telefon: '',
  anfrage: '',
  consent: false,
  website: '',
};

const STORAGE_KEY = 'kalku.formErstgespraech';
const STORAGE_TTL_MS = 24 * 60 * 60 * 1000;

type Props = {
  defaultGewerk?: string;
};

export default function MultiStepForm({ defaultGewerk }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [data, setData] = useState<FormState>({ ...INITIAL, gewerk: defaultGewerk ?? '' });
  const [touched, setTouched] = useState<Set<keyof FormState>>(new Set());
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const startedAt = useRef(Date.now());

  /* ------------------------------- persistence ------------------------------ */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { data: FormState; step: 1|2|3; ts: number };
      if (Date.now() - saved.ts > STORAGE_TTL_MS) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      setData((d) => ({ ...d, ...saved.data, gewerk: defaultGewerk || saved.data.gewerk }));
      if (saved.step > 1) setStep(saved.step);
    } catch {
      /* ignore */
    }
  }, [defaultGewerk]);

  useEffect(() => {
    if (sent) return;
    if (step === 1 && !data.firma && !data.email) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ data, step, ts: Date.now() }));
  }, [data, step, sent]);

  /* ------------------------------ helpers ----------------------------------- */
  function update<K extends keyof FormState>(k: K, v: FormState[K]) {
    setData((d) => ({ ...d, [k]: v }));
  }
  function markTouched(k: keyof FormState) {
    setTouched((t) => new Set(t).add(k));
  }
  function err(k: keyof FormState, msg: string): string | null {
    if (!touched.has(k)) return null;
    if (k === 'email' && data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return 'Bitte gültige E-Mail-Adresse eingeben.';
    }
    if (!data[k]) return msg;
    return null;
  }

  const step1Valid =
    data.firma && data.gewerk && data.einzugsgebiet && data.radius && data.mitarbeiter;
  const step2Valid = data.vorname && data.nachname && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email);
  const step3Valid = data.consent;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!step3Valid) return;
    if (data.website) return; // honeypot tripped — silent drop
    if (Date.now() - startedAt.current < 3000) return; // too-fast bot

    setSubmitting(true);
    try {
      // Phase-4 backend endpoint — implementation lives at /api/forms/submit
      await new Promise((r) => setTimeout(r, 600));
      setSent(true);
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setSubmitting(false);
    }
  }

  /* ------------------------------ success state ----------------------------- */
  if (sent) {
    return (
      <div className="bg-white rounded-2xl ring-1 ring-gray-200 shadow-sm p-7 sm:p-9 max-w-xl mx-auto">
        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-3 text-center">
          Vielen Dank, {data.vorname}!
        </h3>
        <p className="text-gray-600 text-center mb-7 leading-relaxed">
          Ihre Anfrage ist eingegangen. Wir melden uns binnen 4 Werktagsstunden — meistens unter{' '}
          <span className="font-semibold text-gray-900">{data.telefon || data.email}</span>.
        </p>
        <div className="rounded-xl bg-paper ring-1 ring-gray-200 p-5 space-y-3">
          <p className="text-xs uppercase tracking-wider font-bold text-gray-500">
            Schneller? Drei direkte Wege:
          </p>
          <div className="grid sm:grid-cols-3 gap-2.5">
            <a href={telHref(NAP.phone)} className="btn btn-outline btn-sm justify-center">
              <Phone className="w-3.5 h-3.5" /> Anrufen
            </a>
            <a
              href={whatsappHref(NAP.whatsapp, 'Hallo KALKU, ich habe eben das Formular ausgefüllt.')}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline btn-sm justify-center"
            >
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
            </a>
            <Link to="/kontakt/#termin" className="btn btn-success btn-sm justify-center">
              <Calendar className="w-3.5 h-3.5" /> Termin
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------- form ------------------------------------- */
  return (
    <form
      onSubmit={submit}
      className="bg-white rounded-2xl ring-1 ring-gray-200 shadow-sm p-6 sm:p-8 max-w-xl mx-auto"
    >
      {/* Honeypot — visually hidden, screen-reader hidden */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        value={data.website}
        onChange={(e) => update('website', e.target.value)}
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '-9999px',
          width: 1,
          height: 1,
          opacity: 0,
        }}
      />

      {/* Progress */}
      <div className="flex items-center gap-2 mb-7">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex-1">
            <div
              className={cn(
                'h-1.5 rounded-full transition-colors',
                s <= step ? 'bg-primary-500' : 'bg-gray-200',
              )}
            />
            <p
              className={cn(
                'text-xs font-medium mt-2',
                s === step ? 'text-primary-600' : 'text-gray-400',
              )}
            >
              Schritt {s}
            </p>
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900 mb-3">Ihr Unternehmen</h3>
          <Field label="Firma" required error={err('firma', 'Bitte Firmennamen angeben.')}>
            <input
              type="text"
              required
              value={data.firma}
              onChange={(e) => update('firma', e.target.value)}
              onBlur={() => markTouched('firma')}
              className="input"
              placeholder="Mustermann Bau GmbH"
              autoComplete="organization"
            />
          </Field>
          <Field label="Gewerk" required error={err('gewerk', 'Bitte ein Gewerk wählen.')}>
            <select
              required
              value={data.gewerk}
              onChange={(e) => update('gewerk', e.target.value)}
              onBlur={() => markTouched('gewerk')}
              className="input"
            >
              <option value="">Bitte wählen</option>
              {GEWERKE.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Einzugsgebiet"
            required
            error={err('einzugsgebiet', 'Bitte Einzugsgebiet angeben.')}
          >
            <input
              type="text"
              required
              value={data.einzugsgebiet}
              onChange={(e) => update('einzugsgebiet', e.target.value)}
              onBlur={() => markTouched('einzugsgebiet')}
              className="input"
              placeholder="z.B. Saarland + Rheinland-Pfalz"
            />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Umkreis" required error={err('radius', 'Bitte Umkreis wählen.')}>
              <select
                required
                value={data.radius}
                onChange={(e) => update('radius', e.target.value)}
                onBlur={() => markTouched('radius')}
                className="input"
              >
                <option value="">Bitte wählen</option>
                {RADIUS_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Mitarbeiter"
              required
              error={err('mitarbeiter', 'Bitte MA-Zahl wählen.')}
            >
              <select
                required
                value={data.mitarbeiter}
                onChange={(e) => update('mitarbeiter', e.target.value)}
                onBlur={() => markTouched('mitarbeiter')}
                className="input"
              >
                <option value="">Bitte wählen</option>
                {MA_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {data.mitarbeiter === '1–3' && (
            <div className="rounded-lg bg-amber-50 ring-1 ring-amber-200 p-4 text-xs text-amber-900 leading-relaxed">
              <strong className="font-bold">Hinweis:</strong> Wir arbeiten ab 3 Mitarbeitern, da für
              öffentliche Ausschreibungen Eignungsnachweise (Sozialkasse, Referenzen) erforderlich sind.
              Mit weniger Mitarbeitern lohnt sich vorab unser <Link to="/tools/kalkulator/" className="underline">kostenloser Position-Kalkulator</Link>.
            </div>
          )}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              disabled={!step1Valid}
              onClick={() => setStep(2)}
              className="btn btn-success btn-lg cta-magnetic"
            >
              Weiter <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900 mb-3">Ihre Kontaktdaten</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Vorname" required>
              <input
                type="text"
                required
                value={data.vorname}
                onChange={(e) => update('vorname', e.target.value)}
                onBlur={() => markTouched('vorname')}
                className="input"
                autoComplete="given-name"
              />
            </Field>
            <Field label="Nachname" required>
              <input
                type="text"
                required
                value={data.nachname}
                onChange={(e) => update('nachname', e.target.value)}
                onBlur={() => markTouched('nachname')}
                className="input"
                autoComplete="family-name"
              />
            </Field>
          </div>
          <Field label="E-Mail" required error={err('email', 'Bitte E-Mail-Adresse angeben.')}>
            <input
              type="email"
              required
              value={data.email}
              onChange={(e) => update('email', e.target.value)}
              onBlur={() => markTouched('email')}
              className="input"
              autoComplete="email"
            />
          </Field>
          <Field label="Telefon (empfohlen)">
            <input
              type="tel"
              value={data.telefon}
              onChange={(e) => update('telefon', e.target.value)}
              className="input"
              placeholder="+49 ..."
              autoComplete="tel"
            />
          </Field>
          <Field label="Worum geht's? (optional)">
            <textarea
              value={data.anfrage}
              onChange={(e) => update('anfrage', e.target.value)}
              className="input min-h-[88px]"
              placeholder="Submissionstermin, Gewerke, was Sie sich konkret vorstellen ..."
            />
          </Field>
          <p className="text-xs text-gray-500">
            Ihre Daten dienen ausschließlich der Bearbeitung Ihrer Anfrage. Wir geben sie nicht weiter.
            Details in der{' '}
            <Link to="/datenschutz/" className="text-primary-700 hover:underline">
              Datenschutzerklärung
            </Link>
            .
          </p>
          <div className="flex justify-between pt-2">
            <button type="button" onClick={() => setStep(1)} className="btn btn-ghost">
              <ArrowLeft className="w-4 h-4" /> Zurück
            </button>
            <button
              type="button"
              disabled={!step2Valid}
              onClick={() => setStep(3)}
              className="btn btn-success btn-lg cta-magnetic"
            >
              Weiter <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900 mb-3">Bestätigung</h3>
          <div className="rounded-xl bg-paper ring-1 ring-gray-200 p-5 text-sm space-y-1.5">
            <Row label="Firma" value={data.firma} />
            <Row label="Gewerk" value={data.gewerk} />
            <Row label="Region" value={`${data.einzugsgebiet} (${data.radius})`} />
            <Row label="Mitarbeiter" value={data.mitarbeiter} />
            <Row
              label="Kontakt"
              value={`${data.vorname} ${data.nachname} · ${data.email}${data.telefon ? ' · ' + data.telefon : ''}`}
            />
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={data.consent}
              onChange={(e) => update('consent', e.target.checked)}
              className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              required
            />
            <span className="text-sm text-gray-700">
              Ich willige ein, dass meine Angaben zur Bearbeitung meiner Anfrage gespeichert und verarbeitet
              werden. Die{' '}
              <Link to="/datenschutz/" className="text-primary-700 hover:underline">Datenschutzerklärung</Link>{' '}
              habe ich zur Kenntnis genommen.
            </span>
          </label>
          <div className="flex justify-between pt-2">
            <button type="button" onClick={() => setStep(2)} className="btn btn-ghost">
              <ArrowLeft className="w-4 h-4" /> Zurück
            </button>
            <button
              type="submit"
              disabled={!step3Valid || submitting}
              className="btn btn-success btn-lg cta-magnetic"
            >
              <Send className="w-4 h-4" />
              {submitting ? 'Wird gesendet ...' : 'Anfrage senden'}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}

function Field({
  label,
  children,
  error,
  required,
}: {
  label: string;
  children: React.ReactNode;
  error?: string | null;
  required?: boolean;
}) {
  return (
    <div>
      <label className="label">
        {label}
        {required && <span className="text-emerald-600 ml-0.5" aria-hidden> *</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-red-600">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </p>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="text-gray-500">{label}:</span>{' '}
      <span className="font-medium text-gray-900">{value}</span>
    </p>
  );
}

import { useState } from 'react';
import { ArrowRight, ArrowLeft, CheckCircle2, Send, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

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
};

type Props = {
  /** Optional pre-filled subject when form is opened from a specific page (e.g. Gewerk-LP). */
  defaultGewerk?: string;
};

export default function MultiStepForm({ defaultGewerk }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [data, setData] = useState<FormState>({ ...INITIAL, gewerk: defaultGewerk ?? '' });
  const [touched, setTouched] = useState<Set<keyof FormState>>(new Set());
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof FormState>(k: K, v: FormState[K]) {
    setData((d) => ({ ...d, [k]: v }));
  }

  function markTouched(k: keyof FormState) {
    setTouched((t) => new Set(t).add(k));
  }

  function err(k: keyof FormState, msg: string): string | null {
    if (!touched.has(k)) return null;
    if (k === 'email' && data.email && !data.email.includes('@')) return 'Bitte gültige E-Mail-Adresse eingeben.';
    if (!data[k]) return msg;
    return null;
  }

  const step1Valid = data.firma && data.gewerk && data.einzugsgebiet && data.radius && data.mitarbeiter;
  const step2Valid = data.vorname && data.nachname && data.email.includes('@') && data.telefon;
  const step3Valid = data.consent;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!step3Valid) return;
    setSubmitting(true);
    try {
      // TODO Phase 3.4 backend: POST /api/forms/submit (Pipedrive async push + retry queue)
      await new Promise((r) => setTimeout(r, 600));
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="card text-center max-w-xl mx-auto">
        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Vielen Dank, {data.vorname}!</h3>
        <p className="text-gray-600">
          Wir haben Ihre Anfrage erhalten und melden uns innerhalb eines Werktags telefonisch unter{' '}
          <span className="font-semibold text-gray-900">{data.telefon}</span>.
        </p>
        <p className="text-xs text-gray-400 mt-6">Bei dringenden Submissionen rufen Sie uns gerne direkt an.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card max-w-xl mx-auto">
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
          <Field label="Firma" error={err('firma', 'Bitte Firmennamen angeben.')}>
            <input
              type="text"
              required
              value={data.firma}
              onChange={(e) => update('firma', e.target.value)}
              onBlur={() => markTouched('firma')}
              className="input"
              placeholder="Mustermann Bau GmbH"
            />
          </Field>
          <Field label="Branche / Gewerk" error={err('gewerk', 'Bitte ein Gewerk wählen.')}>
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
          <Field label="Einzugsgebiet" error={err('einzugsgebiet', 'Bitte Einzugsgebiet angeben.')}>
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
            <Field label="Umkreis (km)" error={err('radius', 'Bitte Umkreis wählen.')}>
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
            <Field label="Mitarbeiterzahl" error={err('mitarbeiter', 'Bitte MA-Zahl wählen.')}>
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
          <div className="flex justify-end pt-2">
            <button
              type="button"
              disabled={!step1Valid}
              onClick={() => setStep(2)}
              className="btn btn-success"
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
            <Field label="Vorname">
              <input
                type="text"
                required
                value={data.vorname}
                onChange={(e) => update('vorname', e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Nachname">
              <input
                type="text"
                required
                value={data.nachname}
                onChange={(e) => update('nachname', e.target.value)}
                className="input"
              />
            </Field>
          </div>
          <Field label="E-Mail">
            <input
              type="email"
              required
              value={data.email}
              onChange={(e) => update('email', e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Telefon">
            <input
              type="tel"
              required
              value={data.telefon}
              onChange={(e) => update('telefon', e.target.value)}
              className="input"
              placeholder="+49 ..."
            />
          </Field>
          <Field label="Kurze Anfrage (optional)">
            <textarea
              value={data.anfrage}
              onChange={(e) => update('anfrage', e.target.value)}
              className="input min-h-[88px]"
              placeholder="Worum geht's? Submissionstermin, Gewerke, was Sie sich konkret vorstellen ..."
            />
          </Field>
          <p className="text-xs text-gray-500">
            Ihre Daten dienen ausschließlich der Kommunikation zwischen Ihnen und uns. Wir geben
            Ihre Daten an keine Dritten weiter.
          </p>
          <div className="flex justify-between pt-2">
            <button type="button" onClick={() => setStep(1)} className="btn btn-ghost">
              <ArrowLeft className="w-4 h-4" /> Zurück
            </button>
            <button
              type="button"
              disabled={!step2Valid}
              onClick={() => setStep(3)}
              className="btn btn-success"
            >
              Weiter <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900 mb-3">Bestätigung</h3>
          <div className="card-flat bg-gray-50 text-sm space-y-1.5">
            <p>
              <span className="text-gray-500">Firma:</span>{' '}
              <span className="font-medium text-gray-900">{data.firma}</span>
            </p>
            <p>
              <span className="text-gray-500">Gewerk:</span>{' '}
              <span className="font-medium text-gray-900">{data.gewerk}</span>
            </p>
            <p>
              <span className="text-gray-500">Region:</span>{' '}
              <span className="font-medium text-gray-900">
                {data.einzugsgebiet} ({data.radius})
              </span>
            </p>
            <p>
              <span className="text-gray-500">MA:</span>{' '}
              <span className="font-medium text-gray-900">{data.mitarbeiter}</span>
            </p>
            <p>
              <span className="text-gray-500">Kontakt:</span>{' '}
              <span className="font-medium text-gray-900">
                {data.vorname} {data.nachname} · {data.email} · {data.telefon}
              </span>
            </p>
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
              Ich bin damit einverstanden, dass meine Angaben zur Bearbeitung meiner Anfrage
              gespeichert und verarbeitet werden. Die Datenschutzerklärung habe ich zur Kenntnis
              genommen.
            </span>
          </label>
          <div className="flex justify-between pt-2">
            <button type="button" onClick={() => setStep(2)} className="btn btn-ghost">
              <ArrowLeft className="w-4 h-4" /> Zurück
            </button>
            <button
              type="submit"
              disabled={!step3Valid || submitting}
              className="btn btn-success"
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
}: {
  label: string;
  children: React.ReactNode;
  error?: string | null;
}) {
  return (
    <div>
      <label className="label">{label}</label>
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

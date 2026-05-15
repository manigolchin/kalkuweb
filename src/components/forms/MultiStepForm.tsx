import { useState } from 'react';
import { ArrowRight, ArrowLeft, CheckCircle2, Send, AlertCircle, Calendar, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import CalendlyEmbed from '@/components/CalendlyEmbed';

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

const STEPS = [
  { n: 1 as const, label: 'Dein Unternehmen' },
  { n: 2 as const, label: 'Deine Kontaktdaten' },
  { n: 3 as const, label: 'Bestätigung & Terminbuchung' },
];

type FormState = {
  firma: string;
  gewerk: string;
  plz: string;
  umkreis: string;
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
  plz: '',
  umkreis: '',
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
  const [showErrors, setShowErrors] = useState(false);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof FormState>(k: K, v: FormState[K]) {
    setData((d) => ({ ...d, [k]: v }));
  }

  const step1Errors = {
    firma: !data.firma,
    gewerk: !data.gewerk,
    plz: !data.plz || !/^\d{5}$/.test(data.plz),
    umkreis: !data.umkreis,
    mitarbeiter: !data.mitarbeiter,
  };
  const step2Errors = {
    vorname: !data.vorname,
    nachname: !data.nachname,
    email: !data.email || !/^\S+@\S+\.\S+$/.test(data.email),
    telefon: !data.telefon,
  };

  const step1Valid = !Object.values(step1Errors).some(Boolean);
  const step2Valid = !Object.values(step2Errors).some(Boolean);
  const step3Valid = data.consent;

  function next() {
    const valid = step === 1 ? step1Valid : step2Valid;
    if (!valid) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    setStep((s) => (s === 1 ? 2 : 3));
  }

  function back() {
    setShowErrors(false);
    setStep((s) => (s === 3 ? 2 : 1));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!step3Valid) {
      setShowErrors(true);
      return;
    }
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
      <div className="card text-center max-w-2xl mx-auto">
        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Vielen Dank, {data.vorname}!</h3>
        <p className="text-gray-600">
          Wir haben deine Anfrage erhalten und melden uns innerhalb eines Werktags telefonisch unter{' '}
          <span className="font-semibold text-gray-900">{data.telefon}</span>.
        </p>
        <p className="text-xs text-gray-400 mt-6">
          Bei dringenden Submissionen ruf uns gerne direkt an.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 sm:p-10 max-w-2xl mx-auto"
    >
      <StepIndicator step={step} />

      {step === 1 && (
        <div className="space-y-5">
          <Field
            label="Firma"
            required
            error={showErrors && step1Errors.firma ? 'Dieses Feld ist erforderlich' : null}
          >
            <input
              type="text"
              value={data.firma}
              onChange={(e) => update('firma', e.target.value)}
              className={inputClass(showErrors && step1Errors.firma)}
              placeholder="Firmenname"
            />
          </Field>

          <Field
            label="Branche/Gewerke"
            required
            error={showErrors && step1Errors.gewerk ? 'Dieses Feld ist erforderlich' : null}
          >
            <select
              value={data.gewerk}
              onChange={(e) => update('gewerk', e.target.value)}
              className={inputClass(showErrors && step1Errors.gewerk)}
            >
              <option value="">In welchem Gewerk bist du tätig?</option>
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
            error={
              showErrors && step1Errors.plz
                ? data.plz
                  ? 'Bitte gültige Postleitzahl (5 Stellen) eingeben'
                  : 'Dieses Feld ist erforderlich'
                : null
            }
          >
            <input
              type="text"
              inputMode="numeric"
              maxLength={5}
              value={data.plz}
              onChange={(e) => update('plz', e.target.value.replace(/\D/g, ''))}
              className={inputClass(showErrors && step1Errors.plz)}
              placeholder="PLZ deines Standorts"
            />
          </Field>

          <Field
            label="Umkreis"
            required
            error={showErrors && step1Errors.umkreis ? 'Dieses Feld ist erforderlich' : null}
          >
            <select
              value={data.umkreis}
              onChange={(e) => update('umkreis', e.target.value)}
              className={inputClass(showErrors && step1Errors.umkreis)}
            >
              <option value="">Einzugsgebiet in km</option>
              {RADIUS_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Mitarbeiterzahl"
            required
            error={showErrors && step1Errors.mitarbeiter ? 'Dieses Feld ist erforderlich' : null}
          >
            <select
              value={data.mitarbeiter}
              onChange={(e) => update('mitarbeiter', e.target.value)}
              className={inputClass(showErrors && step1Errors.mitarbeiter)}
            >
              <option value="">Wie viele Mitarbeiter?</option>
              {MA_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>

          <div className="flex justify-end pt-2">
            <button type="button" onClick={next} className="btn btn-primary">
              Nächste <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field
              label="Vorname"
              required
              error={showErrors && step2Errors.vorname ? 'Dieses Feld ist erforderlich' : null}
            >
              <input
                type="text"
                value={data.vorname}
                onChange={(e) => update('vorname', e.target.value)}
                className={inputClass(showErrors && step2Errors.vorname)}
                placeholder="Vorname"
              />
            </Field>
            <Field
              label="Nachname"
              required
              error={showErrors && step2Errors.nachname ? 'Dieses Feld ist erforderlich' : null}
            >
              <input
                type="text"
                value={data.nachname}
                onChange={(e) => update('nachname', e.target.value)}
                className={inputClass(showErrors && step2Errors.nachname)}
                placeholder="Nachname"
              />
            </Field>
          </div>

          <Field
            label="E-Mail"
            required
            error={
              showErrors && step2Errors.email
                ? data.email
                  ? 'Bitte gültige E-Mail-Adresse eingeben'
                  : 'Dieses Feld ist erforderlich'
                : null
            }
          >
            <input
              type="email"
              value={data.email}
              onChange={(e) => update('email', e.target.value)}
              className={inputClass(showErrors && step2Errors.email)}
              placeholder="name@firma.de"
            />
          </Field>

          <Field
            label="Telefonnummer"
            required
            error={showErrors && step2Errors.telefon ? 'Dieses Feld ist erforderlich' : null}
          >
            <input
              type="tel"
              value={data.telefon}
              onChange={(e) => update('telefon', e.target.value)}
              className={inputClass(showErrors && step2Errors.telefon)}
              placeholder="+49 ..."
            />
          </Field>

          <Field label="Kurze Anfrage">
            <textarea
              value={data.anfrage}
              onChange={(e) => update('anfrage', e.target.value)}
              className="input min-h-[96px]"
              placeholder="Worum geht's? Submissionstermin, Gewerke, was du dir konkret vorstellst …"
            />
          </Field>

          <p className="text-xs text-gray-500">
            Deine Daten dienen ausschließlich der Kommunikation zwischen dir und uns. Wir geben deine
            Daten an keine Dritten weiter.
          </p>

          <div className="flex justify-between pt-2">
            <button type="button" onClick={back} className="btn btn-ghost">
              <ArrowLeft className="w-4 h-4" /> Vorherige
            </button>
            <button type="button" onClick={next} className="btn btn-primary">
              Nächste <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-bold text-gray-900 mb-3">Deine Angaben im Überblick</h3>
            <div className="rounded-2xl bg-gray-50 border border-gray-100 p-5 text-sm space-y-2">
              <Row label="Firma" value={data.firma} />
              <Row label="Gewerk" value={data.gewerk} />
              <Row
                label="Einzugsgebiet"
                value={`${data.plz} · Umkreis ${data.umkreis}`}
              />
              <Row label="Mitarbeiter" value={data.mitarbeiter} />
              <Row
                label="Kontakt"
                value={`${data.vorname} ${data.nachname} · ${data.email} · ${data.telefon}`}
              />
            </div>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={data.consent}
              onChange={(e) => update('consent', e.target.checked)}
              className="mt-0.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4"
            />
            <span className="text-sm text-gray-700">
              Ich bin damit einverstanden, dass meine Angaben zur Bearbeitung meiner Anfrage
              gespeichert und verarbeitet werden. Die Datenschutzerklärung habe ich zur Kenntnis
              genommen.
            </span>
          </label>
          {showErrors && !data.consent && (
            <p className="-mt-3 inline-flex items-center gap-1 text-xs text-red-600">
              <AlertCircle className="w-3.5 h-3.5" />
              Bitte stimme der Datenverarbeitung zu, um fortzufahren.
            </p>
          )}

          <div className="flex justify-between pt-1">
            <button type="button" onClick={back} className="btn btn-ghost">
              <ArrowLeft className="w-4 h-4" /> Vorherige
            </button>
            <button type="submit" disabled={submitting} className="btn btn-success">
              <Send className="w-4 h-4" />
              {submitting ? 'Wird gesendet …' : 'Anfrage senden'}
            </button>
          </div>

          {/* Terminbuchung — Calendly direkt im letzten Schritt */}
          <div className="pt-2">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Lieber direkt einen Termin buchen?
                </h3>
                <p className="text-xs text-gray-500">
                  15-Minuten-Erstgespräch — wähle einen Slot, der dir passt.
                </p>
              </div>
            </div>
            <CalendlyEmbed minHeight="640px" />
          </div>
        </div>
      )}
    </form>
  );
}

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="mb-8 sm:mb-10">
      <div className="flex items-start">
        {STEPS.map((s, i) => {
          const isActive = step === s.n;
          const isDone = step > s.n;
          return (
            <div key={s.n} className="flex-1 flex items-start">
              <div className="flex flex-col items-center gap-2 flex-shrink-0 w-20 sm:w-28">
                <div
                  className={cn(
                    'w-9 h-9 rounded-md flex items-center justify-center font-semibold text-sm transition-colors',
                    isActive && 'bg-primary-500 text-white shadow-sm',
                    isDone && 'bg-primary-500 text-white',
                    !isActive && !isDone && 'bg-white border-2 border-gray-300 text-gray-500',
                  )}
                >
                  {isDone ? <Check className="w-4 h-4" /> : s.n}
                </div>
                <p
                  className={cn(
                    'text-[11px] sm:text-xs font-medium text-center leading-tight max-w-[110px]',
                    isActive ? 'text-primary-700' : isDone ? 'text-gray-700' : 'text-gray-500',
                  )}
                >
                  {s.label}
                </p>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-px mt-[18px] transition-colors',
                    step > s.n ? 'bg-primary-500' : 'bg-gray-300',
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
  error,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  error?: string | null;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-900 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
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
      <span className="font-medium text-gray-900">{value || '—'}</span>
    </p>
  );
}

function inputClass(hasError?: boolean) {
  return cn(
    'w-full px-4 py-3 rounded-xl bg-white transition-colors focus:ring-2 focus:outline-none',
    hasError
      ? 'border-2 border-red-400 focus:ring-red-200 focus:border-red-500'
      : 'border border-gray-300 focus:ring-primary-200 focus:border-primary-500',
  );
}

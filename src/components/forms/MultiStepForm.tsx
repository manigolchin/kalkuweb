import { useEffect, useId, useRef, useState } from 'react';
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

const ANREDE_OPTIONS = ['Frau', 'Herr', 'Keine Angabe'] as const;
const RADIUS_OPTIONS = ['25 km', '50 km', '75 km', '100 km', '150 km', '200 km', 'bundesweit'];
const MA_OPTIONS = ['1–3', '4–10', '11–25', '26–50', '51–100', '100+'];

const STEPS = [
  { n: 1 as const, label: 'Ihr Unternehmen' },
  { n: 2 as const, label: 'Ihre Kontaktdaten' },
  { n: 3 as const, label: 'Bestätigung & Terminbuchung' },
];

const DRAFT_KEY = 'kalku.formDraft';
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
const LAST_LEAD_KEY = 'kalku.lastLeadSubmit';
const MIN_SUBMIT_MS = 3000;

type FormState = {
  anrede: string;
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
  /** Honeypot — must remain empty for legit submissions. */
  website: string;
};

const INITIAL: FormState = {
  anrede: 'Keine Angabe',
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
  website: '',
};

// Validation patterns (gelockerte E-Mail; Telefon: mind. 7 Ziffern, "+" und Trenner erlaubt)
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PLZ_RE = /^\d{5}$/;
function isValidTelefon(v: string): boolean {
  const digits = v.replace(/\D/g, '');
  return digits.length >= 7;
}

type Props = {
  /** Optional pre-filled subject when form is opened from a specific page (e.g. Gewerk-LP). */
  defaultGewerk?: string;
};

export default function MultiStepForm({ defaultGewerk }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [data, setData] = useState<FormState>({ ...INITIAL, gewerk: defaultGewerk ?? '' });
  const [showErrors, setShowErrors] = useState(false);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mountedAtRef = useRef<number>(0);

  // Stable ids for label/aria-describedby binding
  const ids = {
    anrede: useId(),
    firma: useId(),
    gewerk: useId(),
    plz: useId(),
    umkreis: useId(),
    mitarbeiter: useId(),
    vorname: useId(),
    nachname: useId(),
    email: useId(),
    telefon: useId(),
    anfrage: useId(),
    consent: useId(),
    website: useId(),
  } as const;

  function update<K extends keyof FormState>(k: K, v: FormState[K]) {
    setData((d) => ({ ...d, [k]: v }));
  }

  // Restore draft on mount (TTL 24h)
  useEffect(() => {
    mountedAtRef.current = Date.now();
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { data?: Partial<FormState>; ts?: number };
      if (parsed && parsed.ts && Date.now() - parsed.ts < DRAFT_TTL_MS && parsed.data) {
        setData((d) => ({ ...d, ...parsed.data, website: '' }));
      } else {
        localStorage.removeItem(DRAFT_KEY);
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save draft (debounced 400ms)
  useEffect(() => {
    if (sent) return;
    const t = setTimeout(() => {
      try {
        // Never persist honeypot or consent boolean back to disk
        const { website: _w, consent: _c, ...persistable } = data;
        void _w;
        void _c;
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ data: persistable, ts: Date.now() }),
        );
      } catch {
        /* ignore quota / private-mode */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [data, sent]);

  function clearStoredDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
  }

  const step1Errors = {
    firma: !data.firma,
    gewerk: !data.gewerk,
    plz: !data.plz || !PLZ_RE.test(data.plz),
    umkreis: !data.umkreis,
    mitarbeiter: !data.mitarbeiter,
  };
  const step2Errors = {
    anrede: !data.anrede,
    vorname: !data.vorname,
    nachname: !data.nachname,
    email: !data.email || !EMAIL_RE.test(data.email),
    telefon: !data.telefon || !isValidTelefon(data.telefon),
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
    if (sending) return;
    if (!step3Valid) {
      setShowErrors(true);
      return;
    }

    // 3-Sekunden-Bot-Gate
    const elapsed = Date.now() - mountedAtRef.current;
    if (elapsed < MIN_SUBMIT_MS) {
      setError('Bitte warten Sie einen Moment und versuchen Sie es erneut.');
      return;
    }

    // Honeypot — silent success for bots
    if (data.website && data.website.length > 0) {
      setSent(true);
      return;
    }

    setSending(true);
    setError(null);

    // Backup the payload locally in case mailto fails
    try {
      localStorage.setItem(
        LAST_LEAD_KEY,
        JSON.stringify({ ...data, website: undefined, ts: Date.now() }),
      );
    } catch {
      /* ignore */
    }

    try {
      // Phase 4 backend — currently not deployed; fall through to mailto on any failure.
      try {
        const res = await fetch('/api/forms/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          setSent(true);
          clearStoredDraft();
          return;
        }
        throw new Error('backend-not-ready');
      } catch {
        // Mailto-Fallback
        const subject = encodeURIComponent(
          `Anfrage Kalkulation – ${data.firma || 'KALKU-Kontakt'}`,
        );
        const body = encodeURIComponent(
          `Anfrage über kalku.de\n\n` +
            `Anrede: ${data.anrede || ''}\n` +
            `Name: ${data.vorname} ${data.nachname}\n` +
            `Firma: ${data.firma}\n` +
            `Email: ${data.email}\n` +
            `Telefon: ${data.telefon}\n` +
            `Mitarbeiter: ${data.mitarbeiter || ''}\n` +
            `Gewerk: ${data.gewerk || ''}\n` +
            `PLZ: ${data.plz || ''}\n` +
            `Umkreis: ${data.umkreis || ''}\n\n` +
            `Nachricht:\n${data.anfrage || ''}\n`,
        );
        window.location.href = `mailto:it@kalku.de?subject=${subject}&body=${body}`;
        setSent(true);
        clearStoredDraft();
      }
    } catch {
      setError(
        'Anfrage konnte nicht gesendet werden. Bitte rufen Sie uns direkt an: +49 681 41096430',
      );
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div
        className="card text-center max-w-2xl mx-auto"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          Vielen Dank{data.vorname ? `, ${data.vorname}` : ''}!
        </h3>
        <p className="text-gray-600">
          Wir haben Ihre Anfrage erhalten und melden uns innerhalb eines Werktags telefonisch
          {data.telefon ? (
            <>
              {' '}
              unter <span className="font-semibold text-gray-900">{data.telefon}</span>
            </>
          ) : null}
          .
        </p>
        <p className="text-xs text-gray-400 mt-6">
          Bei dringenden Submissionen rufen Sie uns gerne direkt an.
        </p>

        {/* Optional: direkt einen Termin im Anschluss buchen */}
        <div className="mt-8 text-left">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h4 className="text-base font-bold text-gray-900">
                Direkt einen Termin reservieren?
              </h4>
              <p className="text-xs text-gray-500">
                15-Minuten-Erstgespräch — wählen Sie einen Slot, der Ihnen passt.
              </p>
            </div>
          </div>
          <CalendlyEmbed minHeight="640px" />
        </div>
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

      {/* Honeypot — versteckt, off-screen, nicht tabbar */}
      <div aria-hidden="true" className="absolute -left-[10000px] top-auto w-px h-px overflow-hidden">
        <label htmlFor={ids.website}>Website (bitte leer lassen)</label>
        <input
          id={ids.website}
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={data.website}
          onChange={(e) => update('website', e.target.value)}
          className="opacity-0 pointer-events-none"
        />
      </div>

      {step === 1 && (
        <div className="space-y-5">
          <Field
            id={ids.firma}
            label="Firma"
            required
            error={showErrors && step1Errors.firma ? 'Dieses Feld ist erforderlich' : null}
          >
            {({ id, errorId, hasError }) => (
              <input
                id={id}
                type="text"
                value={data.firma}
                onChange={(e) => update('firma', e.target.value)}
                className={inputClass(hasError)}
                placeholder="Firmenname"
                autoComplete="organization"
                aria-required={true}
                aria-invalid={hasError || undefined}
                aria-describedby={hasError ? errorId : undefined}
              />
            )}
          </Field>

          <Field
            id={ids.gewerk}
            label="Branche / Gewerke"
            required
            error={showErrors && step1Errors.gewerk ? 'Dieses Feld ist erforderlich' : null}
          >
            {({ id, errorId, hasError }) => (
              <select
                id={id}
                value={data.gewerk}
                onChange={(e) => update('gewerk', e.target.value)}
                className={inputClass(hasError)}
                aria-required={true}
                aria-invalid={hasError || undefined}
                aria-describedby={hasError ? errorId : undefined}
              >
                <option value="">In welchem Gewerk sind Sie tätig?</option>
                {GEWERKE.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field
            id={ids.plz}
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
            {({ id, errorId, hasError }) => (
              <input
                id={id}
                type="text"
                inputMode="numeric"
                pattern="[0-9]{5}"
                maxLength={5}
                value={data.plz}
                onChange={(e) => update('plz', e.target.value.replace(/\D/g, ''))}
                className={inputClass(hasError)}
                placeholder="PLZ Ihres Standorts"
                autoComplete="postal-code"
                aria-required={true}
                aria-invalid={hasError || undefined}
                aria-describedby={hasError ? errorId : undefined}
              />
            )}
          </Field>

          <Field
            id={ids.umkreis}
            label="Umkreis"
            required
            error={showErrors && step1Errors.umkreis ? 'Dieses Feld ist erforderlich' : null}
          >
            {({ id, errorId, hasError }) => (
              <select
                id={id}
                value={data.umkreis}
                onChange={(e) => update('umkreis', e.target.value)}
                className={inputClass(hasError)}
                aria-required={true}
                aria-invalid={hasError || undefined}
                aria-describedby={hasError ? errorId : undefined}
              >
                <option value="">Einzugsgebiet in km</option>
                {RADIUS_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field
            id={ids.mitarbeiter}
            label="Mitarbeiterzahl"
            required
            error={showErrors && step1Errors.mitarbeiter ? 'Dieses Feld ist erforderlich' : null}
          >
            {({ id, errorId, hasError }) => (
              <select
                id={id}
                value={data.mitarbeiter}
                onChange={(e) => update('mitarbeiter', e.target.value)}
                className={inputClass(hasError)}
                aria-required={true}
                aria-invalid={hasError || undefined}
                aria-describedby={hasError ? errorId : undefined}
              >
                <option value="">Wie viele Mitarbeiter?</option>
                {MA_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            )}
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
          <Field id={ids.anrede} label="Anrede">
            {({ id }) => (
              <select
                id={id}
                value={data.anrede}
                onChange={(e) => update('anrede', e.target.value)}
                className={inputClass(false)}
                autoComplete="honorific-prefix"
              >
                {ANREDE_OPTIONS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field
              id={ids.vorname}
              label="Vorname"
              required
              error={showErrors && step2Errors.vorname ? 'Dieses Feld ist erforderlich' : null}
            >
              {({ id, errorId, hasError }) => (
                <input
                  id={id}
                  type="text"
                  value={data.vorname}
                  onChange={(e) => update('vorname', e.target.value)}
                  className={inputClass(hasError)}
                  placeholder="Vorname"
                  autoComplete="given-name"
                  aria-required={true}
                  aria-invalid={hasError || undefined}
                  aria-describedby={hasError ? errorId : undefined}
                />
              )}
            </Field>
            <Field
              id={ids.nachname}
              label="Nachname"
              required
              error={showErrors && step2Errors.nachname ? 'Dieses Feld ist erforderlich' : null}
            >
              {({ id, errorId, hasError }) => (
                <input
                  id={id}
                  type="text"
                  value={data.nachname}
                  onChange={(e) => update('nachname', e.target.value)}
                  className={inputClass(hasError)}
                  placeholder="Nachname"
                  autoComplete="family-name"
                  aria-required={true}
                  aria-invalid={hasError || undefined}
                  aria-describedby={hasError ? errorId : undefined}
                />
              )}
            </Field>
          </div>

          <Field
            id={ids.email}
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
            {({ id, errorId, hasError }) => (
              <input
                id={id}
                type="email"
                inputMode="email"
                value={data.email}
                onChange={(e) => update('email', e.target.value)}
                className={inputClass(hasError)}
                placeholder="name@firma.de"
                autoComplete="email"
                aria-required={true}
                aria-invalid={hasError || undefined}
                aria-describedby={hasError ? errorId : undefined}
              />
            )}
          </Field>

          <Field
            id={ids.telefon}
            label="Telefonnummer"
            required
            error={
              showErrors && step2Errors.telefon
                ? data.telefon
                  ? 'Bitte gültige Telefonnummer (mind. 7 Ziffern) eingeben'
                  : 'Dieses Feld ist erforderlich'
                : null
            }
          >
            {({ id, errorId, hasError }) => (
              <input
                id={id}
                type="tel"
                inputMode="tel"
                value={data.telefon}
                onChange={(e) => update('telefon', e.target.value)}
                className={inputClass(hasError)}
                placeholder="+49 ..."
                autoComplete="tel"
                aria-required={true}
                aria-invalid={hasError || undefined}
                aria-describedby={hasError ? errorId : undefined}
              />
            )}
          </Field>

          <Field id={ids.anfrage} label="Kurze Anfrage">
            {({ id }) => (
              <textarea
                id={id}
                value={data.anfrage}
                onChange={(e) => update('anfrage', e.target.value)}
                className="input min-h-[96px]"
                placeholder="Worum geht's? Submissionstermin, Gewerke, was Sie sich konkret vorstellen …"
              />
            )}
          </Field>

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
            <h3 className="text-base font-bold text-gray-900 mb-3">Ihre Angaben im Überblick</h3>
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
                value={`${data.anrede !== 'Keine Angabe' ? data.anrede + ' ' : ''}${data.vorname} ${data.nachname} · ${data.email} · ${data.telefon}`}
              />
            </div>
          </div>

          <div>
            <label htmlFor={ids.consent} className="flex items-start gap-3 cursor-pointer">
              <input
                id={ids.consent}
                type="checkbox"
                checked={data.consent}
                onChange={(e) => update('consent', e.target.checked)}
                className="mt-0.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4"
                aria-required={true}
                aria-invalid={showErrors && !data.consent ? true : undefined}
                aria-describedby={showErrors && !data.consent ? `${ids.consent}-err` : undefined}
              />
              <span className="text-sm text-gray-700">
                Ihre Daten dienen ausschließlich der Kommunikation zwischen Ihnen und uns. Wir geben
                Ihre Daten nicht an Dritte weiter. Mit dem Absenden bestätigen Sie, die{' '}
                <a
                  href="/datenschutz/"
                  className="underline text-primary-700 hover:text-primary-800"
                >
                  Datenschutzerklärung
                </a>{' '}
                zur Kenntnis genommen zu haben.
              </span>
            </label>
            {showErrors && !data.consent && (
              <p
                id={`${ids.consent}-err`}
                role="alert"
                className="mt-2 inline-flex items-center gap-1 text-xs text-red-600"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                Bitte stimmen Sie der Datenverarbeitung zu, um fortzufahren.
              </p>
            )}
          </div>

          {error && (
            <p
              role="alert"
              className="inline-flex items-center gap-1 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </p>
          )}

          <div className="flex justify-between pt-1">
            <button type="button" onClick={back} className="btn btn-ghost">
              <ArrowLeft className="w-4 h-4" /> Vorherige
            </button>
            <button type="submit" disabled={sending} className="btn btn-success">
              <Send className="w-4 h-4" />
              {sending ? 'Wird gesendet …' : 'Anfrage senden'}
            </button>
          </div>

          {/* Alternative: direkt Termin buchen — bewusst nach dem Submit-Button und mit deutlicher Trennlinie */}
          <div className="pt-6 mt-2 border-t border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Alternativ direkt einen Termin buchen
                </h3>
                <p className="text-xs text-gray-500">
                  15-Minuten-Erstgespräch — wählen Sie einen Slot, der Ihnen passt. Sie können das
                  Formular dann überspringen.
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

type FieldRenderProps = {
  id: string;
  errorId: string;
  hasError: boolean;
};

function Field({
  id,
  label,
  required,
  children,
  error,
}: {
  id: string;
  label: string;
  required?: boolean;
  children: (p: FieldRenderProps) => React.ReactNode;
  error?: string | null;
}) {
  const errorId = `${id}-err`;
  const hasError = !!error;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-gray-900 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children({ id, errorId, hasError })}
      {error && (
        <p
          id={errorId}
          role="alert"
          aria-live="polite"
          className="mt-1.5 inline-flex items-center gap-1 text-xs text-red-600"
        >
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

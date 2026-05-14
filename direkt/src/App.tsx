import { useState } from 'react';
import {
  Phone,
  MessageCircle,
  Mail,
  Send,
  ArrowRight,
  ArrowLeft,
  Calculator,
  ShoppingCart,
  FileSignature,
  Search,
  CheckCircle2,
  XCircle,
  ChevronDown,
  FileText,
  Building2,
  Pickaxe,
  Trees,
  Zap,
  Wrench,
  PanelTop,
  AlertTriangle,
  ClipboardList,
  Banknote,
  Clock,
  TrendingUp,
  Calendar,
  ShieldCheck,
} from 'lucide-react';

const NAP = {
  phone: '+49 681 41096430',
  whatsapp: '+49 1516 7671877',
  email: 'info@kalku.de',
  street: 'Berliner Promenade 15',
  postalCode: '66111',
  city: 'Saarbrücken',
  vatId: 'DE334890692',
};

const GEWERKE = [
  { icon: Building2, label: 'Hochbau' },
  { icon: Pickaxe, label: 'Tiefbau' },
  { icon: ClipboardList, label: 'Straßenbau' },
  { icon: Trees, label: 'GaLa-Bau' },
  { icon: Wrench, label: 'HLS' },
  { icon: PanelTop, label: 'Innenausbau' },
  { icon: AlertTriangle, label: 'Erd-/Abbruch' },
  { icon: Zap, label: 'Elektro' },
  { icon: Send, label: 'alle Gewerke' },
];

const LEISTUNGEN = [
  {
    icon: Calculator,
    title: 'Kalkulation',
    desc: 'Jede Position einzeln auf Zeit, Geräte und Material kalkuliert. Reale Erfahrungswerte aus dem Handwerk — keine akademischen Ansätze.',
  },
  {
    icon: FileText,
    title: 'Formblätter & Urkalkulation',
    desc: 'Vollständige Erstellung aller geforderten Formblätter (221, 222, 223). Da jede Position mit Zeitwerten kalkuliert wird, sind alle Formulare logisch und nachvollziehbar.',
  },
  {
    icon: ShoppingCart,
    title: 'Materialpreise & Nachunternehmer',
    desc: 'Eigenes Einkaufsteam ermittelt aktuelle Materialpreise und Entsorgungskosten. Auf Wunsch Nachunternehmer-Anfragen im regionalen Umfeld.',
  },
  {
    icon: Search,
    title: 'Recherche nach Ausschreibungen',
    desc: 'Eigenes Rechercheteam durchsucht wöchentlich alle relevanten Plattformen — ohne Zusatzkosten im Rahmen der Monatspauschale.',
  },
  {
    icon: FileSignature,
    title: 'Fristgerechte Einreichung',
    desc: 'Vergabeteam reicht das Angebot im Namen deines Unternehmens ein — auch über Nacht oder am Wochenende. Nachverfolgung bis zum Vergabeergebnis.',
  },
];

const ABLAUF = [
  {
    n: 1,
    title: 'Erstgespräch',
    desc: 'Kurzes Telefonat. Wir besprechen Gewerke, Zielregion, Mittellohn, Verrechnungssätze und Zuschläge.',
  },
  {
    n: 2,
    title: 'Beauftragung & Vollmacht',
    desc: 'Vollmacht für Materialpreisanfragen und Einreichung im Namen deines Unternehmens. Wir treten nach außen als interne Kalkulationsabteilung auf.',
  },
  {
    n: 3,
    title: 'Kalkulation & Einsicht',
    desc: 'Du erhältst die fertige Kalkulation zur Einsicht. Personalaufwand und Gesamtkosten sichtbar. Änderungen werden eingearbeitet.',
  },
  {
    n: 4,
    title: 'Fristgerechte Einreichung',
    desc: 'Vergabeteam reicht das Angebot ein. Auch kurzfristige Abgaben werden eingehalten — wenn nötig über Nacht oder am Wochenende.',
  },
  {
    n: 5,
    title: 'Ergebnis & Nachbereitung',
    desc: 'Vergabeergebnis wird direkt weitergeleitet. Bei Zuschlag: Unterstützung bei Nachforderungen und Vergabegesprächen.',
  },
];

const VORTEILE = [
  {
    icon: Banknote,
    title: 'Sichere Zahlungsmoral',
    desc: 'Gemäß VOB: Abschlagsrechnungen spätestens nach 3 Wochen beglichen.',
  },
  {
    icon: TrendingUp,
    title: 'Planbarer Auftragseingang',
    desc: 'Öffentliche Auftraggeber schreiben regelmäßig und in großem Umfang aus.',
  },
  {
    icon: ShieldCheck,
    title: 'Transparenz statt Mauschelei',
    desc: 'Vergaberechtlich klare Verfahren. Faire Bedingungen für alle Bieter.',
  },
  {
    icon: CheckCircle2,
    title: 'Auch für jüngere Betriebe',
    desc: 'Keine Präqualifikation zwingend nötig. Eignung über eingereichte Unterlagen.',
  },
];

const TEAMS = [
  {
    icon: Calculator,
    title: 'Kalkulationsteam',
    desc: 'Handwerker und Bauingenieure — teilweise mit über 20 Jahren Kalkulationserfahrung. Praxiswissen + Ingenieurexpertise.',
  },
  {
    icon: ShoppingCart,
    title: 'Einkaufsteam',
    desc: 'Ermittelt parallel Materialpreise und Entsorgungskosten. Stellt bei Bedarf Anfragen an Nachunternehmer im regionalen Umfeld.',
  },
  {
    icon: FileSignature,
    title: 'Vergabeteam',
    desc: 'Spezialisiert auf Vergaberecht. Regelmäßige Fortbildungen. Feste Ansprechperson pro Kunde. Fehlerfreie Einreichung.',
  },
  {
    icon: Search,
    title: 'Rechercheteam',
    desc: 'Durchsucht wöchentlich alle relevanten Plattformen nach passenden Ausschreibungen. Kein Kunde verpasst eine Chance.',
  },
];

const IRRTUEMER = [
  {
    q: 'Wir brauchen eine Präqualifikation.',
    a: 'Nein. Eignung kann durch Umsatzzahlen, Referenzen und Bescheinigungen nachgewiesen werden.',
  },
  {
    q: 'Die Firma muss mindestens 3 Jahre bestehen.',
    a: 'Nein. Auch jüngere Unternehmen erhalten Zuschläge — teils nach unter 6 Monaten.',
  },
  {
    q: 'Öffentliche Auftraggeber zahlen schlecht.',
    a: 'Nein. VOB-Regelung: Abschlagsrechnungen innerhalb von 3 Wochen.',
  },
  {
    q: 'Man muss eine GmbH oder AG sein.',
    a: 'Nein. Auch Einzelunternehmer dürfen teilnehmen, sofern vergleichbare Referenzen vorliegen.',
  },
];

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

const FORM_INIT: FormState = {
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

const RADIUS = ['25 km', '50 km', '75 km', '100 km', '150 km', '200 km', 'bundesweit'];
const MA = ['1–3', '4–10', '11–25', '26–50', '51–100', '100+'];
const GEWERK_OPT = [
  'Hochbau', 'Tiefbau', 'Straßenbau', 'GaLa-Bau', 'Innenausbau', 'HLS',
  'Erd-/Abbrucharbeiten', 'Elektro', 'Sonstiges',
];

export default function App() {
  return (
    <div className="bg-white text-gray-900">
      <TopNav />
      <Hero />
      <ProcessQuick />
      <Gewerke />
      <Leistungen />
      <Ablauf />
      <Vorteile />
      <Teams />
      <Irrtuemer />
      <Eligibility />
      <FinalCta />
      <Footer />
    </div>
  );
}

function TopNav() {
  return (
    <nav className="border-b border-gray-100 bg-white sticky top-0 z-40">
      <div className="container-tight flex items-center justify-between h-14">
        <a href="#hero" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-primary-500 flex items-center justify-center">
            <Send className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900">Kalku</span>
        </a>
        <div className="hidden md:flex items-center gap-6 text-sm text-gray-700">
          <a href="#leistungen" className="hover:text-primary-700">Leistungen</a>
          <a href="#ablauf" className="hover:text-primary-700">Ablauf</a>
          <a href="#teams" className="hover:text-primary-700">Team</a>
          <a href="#fragen" className="hover:text-primary-700">Häufige Fragen</a>
        </div>
        <a href={`tel:${NAP.phone.replace(/\s/g, '')}`} className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700">
          <Phone className="w-4 h-4" /> {NAP.phone}
        </a>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section id="hero" className="bg-primary-50/30 border-b border-gray-100 py-12 sm:py-16">
      <div className="container-tight">
        <div className="grid lg:grid-cols-5 gap-8 lg:gap-12 items-start">
          <div className="lg:col-span-2 lg:pt-4">
            <p className="text-sm font-bold uppercase tracking-wider text-primary-700 mb-3">
              Unverbindliche Anfrage
            </p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 mb-5 leading-tight">
              Wir kalkulieren deine Ausschreibung.{' '}
              <span className="text-primary-500">Du unterschreibst.</span>
            </h1>
            <p className="text-base sm:text-lg text-gray-700 mb-6 leading-relaxed">
              Passen die Voraussetzungen, arbeiten wir auch für dich auf Erfolgsbasis.
              Kalkulation, Formblätter, Einreichung, Nachverfolgung — wir übernehmen den
              kompletten Prozess.
            </p>
            <div className="space-y-2 text-sm text-gray-700">
              <p className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-kalku-green" /> Festpreis ab 200 € pro LV</p>
              <p className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-kalku-green" /> Auch über Nacht oder am Wochenende</p>
              <p className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-kalku-green" /> 7 Gewerke aus einer Hand</p>
            </div>
          </div>

          <div className="lg:col-span-3">
            <MultiStep />
          </div>
        </div>
      </div>
    </section>
  );
}

function MultiStep() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [data, setData] = useState<FormState>(FORM_INIT);
  const [sent, setSent] = useState(false);

  function update<K extends keyof FormState>(k: K, v: FormState[K]) {
    setData((d) => ({ ...d, [k]: v }));
  }

  const step1Ok = data.firma && data.gewerk && data.einzugsgebiet && data.radius && data.mitarbeiter;
  const step2Ok = data.vorname && data.nachname && data.email.includes('@') && data.telefon;
  const step3Ok = data.consent;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!step3Ok) return;
    // TODO Pipedrive backend
    setSent(true);
  }

  if (sent) {
    return (
      <div className="bg-white border-2 border-emerald-300 rounded-md p-8 shadow-sm">
        <CheckCircle2 className="w-12 h-12 text-kalku-green mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">Danke, {data.vorname}!</h3>
        <p className="text-center text-gray-700">
          Wir melden uns innerhalb eines Werktags telefonisch unter{' '}
          <span className="font-semibold">{data.telefon}</span>.
        </p>
        <p className="text-xs text-gray-500 text-center mt-6">Bei dringenden Submissionen ruf uns gerne direkt an: {NAP.phone}.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="bg-white border-2 border-gray-200 rounded-md p-6 sm:p-7 shadow-md">
      {/* Tab nav */}
      <div className="flex border-b-2 border-gray-100 mb-6">
        {[
          { n: 1, label: 'Dein Unternehmen' },
          { n: 2, label: 'Deine Kontaktdaten' },
          { n: 3, label: 'Bestätigung' },
        ].map((s) => (
          <button
            key={s.n}
            type="button"
            onClick={() => {
              if (s.n === 1) setStep(1);
              if (s.n === 2 && step1Ok) setStep(2);
              if (s.n === 3 && step1Ok && step2Ok) setStep(3);
            }}
            className={`flex-1 px-2 py-3 text-xs sm:text-sm font-semibold border-b-2 -mb-0.5 transition-colors ${
              step === s.n
                ? 'border-primary-500 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="hidden sm:inline">{s.n}. </span>{s.label}
          </button>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <Field label="Firma">
            <input type="text" required value={data.firma} onChange={(e) => update('firma', e.target.value)}
              className="input" placeholder="Mustermann Bau GmbH" />
          </Field>
          <Field label="Branche / Gewerk">
            <select required value={data.gewerk} onChange={(e) => update('gewerk', e.target.value)} className="input">
              <option value="">Bitte wählen</option>
              {GEWERK_OPT.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </Field>
          <Field label="Einzugsgebiet">
            <input type="text" required value={data.einzugsgebiet} onChange={(e) => update('einzugsgebiet', e.target.value)}
              className="input" placeholder="z.B. Saarland + Rheinland-Pfalz" />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Umkreis">
              <select required value={data.radius} onChange={(e) => update('radius', e.target.value)} className="input">
                <option value="">Bitte wählen</option>
                {RADIUS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Mitarbeiterzahl">
              <select required value={data.mitarbeiter} onChange={(e) => update('mitarbeiter', e.target.value)} className="input">
                <option value="">Bitte wählen</option>
                {MA.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
          </div>
          <div className="flex justify-end pt-2">
            <button type="button" disabled={!step1Ok} onClick={() => setStep(2)} className="btn btn-cta">
              Weiter <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Vorname">
              <input type="text" required value={data.vorname} onChange={(e) => update('vorname', e.target.value)} className="input" />
            </Field>
            <Field label="Nachname">
              <input type="text" required value={data.nachname} onChange={(e) => update('nachname', e.target.value)} className="input" />
            </Field>
          </div>
          <Field label="E-Mail">
            <input type="email" required value={data.email} onChange={(e) => update('email', e.target.value)} className="input" />
          </Field>
          <Field label="Telefon">
            <input type="tel" required value={data.telefon} onChange={(e) => update('telefon', e.target.value)} className="input" placeholder="+49 ..." />
          </Field>
          <Field label="Kurze Anfrage (optional)">
            <textarea value={data.anfrage} onChange={(e) => update('anfrage', e.target.value)} className="input min-h-[80px]"
              placeholder="Worum geht's? Submissionstermin, Gewerk, was du dir vorstellst..." />
          </Field>
          <p className="text-xs text-gray-500">
            Deine Daten dienen ausschließlich der Kommunikation zwischen dir und uns. Keine Weitergabe an Dritte.
          </p>
          <div className="flex justify-between pt-2">
            <button type="button" onClick={() => setStep(1)} className="btn btn-ghost">
              <ArrowLeft className="w-4 h-4" /> Zurück
            </button>
            <button type="button" disabled={!step2Ok} onClick={() => setStep(3)} className="btn btn-cta">
              Weiter <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <div className="bg-gray-50 rounded-md p-4 text-sm space-y-1">
            <p><span className="text-gray-500">Firma:</span> <span className="font-medium">{data.firma}</span></p>
            <p><span className="text-gray-500">Gewerk:</span> <span className="font-medium">{data.gewerk}</span></p>
            <p><span className="text-gray-500">Region:</span> <span className="font-medium">{data.einzugsgebiet} ({data.radius})</span></p>
            <p><span className="text-gray-500">MA:</span> <span className="font-medium">{data.mitarbeiter}</span></p>
            <p><span className="text-gray-500">Kontakt:</span> <span className="font-medium">{data.vorname} {data.nachname} · {data.email} · {data.telefon}</span></p>
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={data.consent} onChange={(e) => update('consent', e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-2 border-gray-300 text-primary-600 focus:ring-primary-500" required />
            <span className="text-sm text-gray-700">
              Ich bin damit einverstanden, dass meine Angaben zur Bearbeitung meiner Anfrage gespeichert und
              verarbeitet werden. Die Datenschutzerklärung habe ich zur Kenntnis genommen.
            </span>
          </label>
          <div className="flex justify-between pt-2">
            <button type="button" onClick={() => setStep(2)} className="btn btn-ghost">
              <ArrowLeft className="w-4 h-4" /> Zurück
            </button>
            <button type="submit" disabled={!step3Ok} className="btn btn-cta">
              <Send className="w-4 h-4" /> Anfrage senden
            </button>
          </div>
        </div>
      )}
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function ProcessQuick() {
  const steps = [
    { n: 1, t: 'Anfrage abschicken', d: 'Über das Formular oben — wenige Felder, kein Verkaufsgespräch.' },
    { n: 2, t: 'Wir prüfen + rufen an', d: 'Innerhalb eines Werktags. Kostenlos, unverbindlich.' },
    { n: 3, t: 'Konditionen + Start', d: 'Bei Passung schicken wir Konditionen. Du entscheidest, wir legen los.' },
  ];
  return (
    <section className="py-12 sm:py-16 border-b border-gray-100">
      <div className="container-tight">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8">So funktioniert die unverbindliche Anfrage</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((s) => (
            <div key={s.n} className="flex gap-4">
              <span className="num-circle">{s.n}</span>
              <div>
                <h3 className="font-bold text-gray-900 mb-1">{s.t}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{s.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Gewerke() {
  return (
    <section className="py-12 sm:py-16 border-b border-gray-100">
      <div className="container-tight">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Für wen wir arbeiten</h2>
        <p className="text-gray-600 mb-8">Bauunternehmen ab 3 Mitarbeitern in folgenden Gewerken:</p>
        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-9 gap-3">
          {GEWERKE.map((g) => {
            const Icon = g.icon;
            return (
              <div key={g.label} className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-md hover:border-primary-300 transition-colors">
                <Icon className="w-7 h-7 text-primary-600" />
                <span className="text-xs font-semibold text-gray-700 text-center">{g.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Leistungen() {
  return (
    <section id="leistungen" className="py-12 sm:py-16 bg-gray-50 border-b border-gray-100">
      <div className="container-tight">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Was wir konkret übernehmen</h2>
        <p className="text-gray-600 mb-8">Fünf Leistungen — alles aus einer Hand.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {LEISTUNGEN.map((l) => {
            const Icon = l.icon;
            return (
              <div key={l.title} className="flex flex-col gap-3">
                <div className="w-12 h-12 rounded-md bg-primary-100 flex items-center justify-center">
                  <Icon className="w-6 h-6 text-primary-700" />
                </div>
                <h3 className="font-bold text-gray-900">{l.title}</h3>
                <p className="text-sm text-gray-700 leading-relaxed">{l.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Ablauf() {
  return (
    <section id="ablauf" className="py-12 sm:py-16 border-b border-gray-100">
      <div className="container-tight">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">So läuft die Zusammenarbeit ab</h2>
        <p className="text-gray-600 mb-10">Vom Erstgespräch bis zum Vergabeergebnis — fünf Schritte.</p>
        <div className="space-y-6">
          {ABLAUF.map((s, i) => (
            <div key={s.n} className="flex gap-5 sm:gap-6">
              <div className="flex flex-col items-center">
                <span className="num-circle">{s.n}</span>
                {i < ABLAUF.length - 1 && <span className="w-px flex-1 bg-gray-200 mt-2" aria-hidden />}
              </div>
              <div className="pb-6">
                <h3 className="font-bold text-gray-900 mb-1">{s.title}</h3>
                <p className="text-gray-700 leading-relaxed text-sm sm:text-base">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Vorteile() {
  return (
    <section className="py-12 sm:py-16 bg-gray-50 border-b border-gray-100">
      <div className="container-tight">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Warum öffentliche Ausschreibungen sich lohnen</h2>
        <p className="text-gray-600 mb-8">Vier Argumente, die uns Bauunternehmer am häufigsten überzeugen:</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {VORTEILE.map((v) => {
            const Icon = v.icon;
            return (
              <div key={v.title} className="flex flex-col gap-3">
                <Icon className="w-8 h-8 text-kalku-green" />
                <h3 className="font-bold text-gray-900">{v.title}</h3>
                <p className="text-sm text-gray-700">{v.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Teams() {
  return (
    <section id="teams" className="py-12 sm:py-16 border-b border-gray-100">
      <div className="container-tight">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Vier Teams — eine Kalkulationsabteilung</h2>
        <p className="text-gray-600 mb-8 max-w-3xl">
          Alle Teams sind am finanziellen Erfolg beteiligt. Das ist der Grund, warum auch
          kurzfristige Abgaben — nachts oder am Wochenende — zuverlässig eingehalten werden.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {TEAMS.map((t) => {
            const Icon = t.icon;
            return (
              <div key={t.title} className="border border-gray-200 rounded-md p-5">
                <Icon className="w-7 h-7 text-primary-600 mb-3" />
                <h3 className="font-bold text-gray-900 mb-2">{t.title}</h3>
                <p className="text-sm text-gray-700 leading-relaxed">{t.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Irrtuemer() {
  return (
    <section id="fragen" className="py-12 sm:py-16 bg-gray-50 border-b border-gray-100">
      <div className="container-tight">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">4 häufige Irrtümer</h2>
        <p className="text-gray-600 mb-8">Was Bauunternehmer fälschlich glauben — und warum sie nicht stimmen.</p>
        <div className="grid md:grid-cols-2 gap-4 max-w-4xl">
          {IRRTUEMER.map((i) => (
            <Accordion key={i.q} q={i.q} a={i.a} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Accordion({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-2 border-gray-200 rounded-md bg-white">
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-start justify-between gap-3 p-4 text-left">
        <span className="font-semibold text-gray-900">{q}</span>
        <ChevronDown className={`w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <p className="px-4 pb-4 text-gray-700 text-sm leading-relaxed">{a}</p>}
    </div>
  );
}

function Eligibility() {
  const items = [
    { ok: true, t: 'Mindestens 3 Mitarbeiter' },
    { ok: true, t: 'Mindestens 6 Monate am Markt' },
    { ok: true, t: '3 vergleichbare Referenzprojekte' },
    { ok: false, t: 'Präqualifikation NICHT zwingend nötig' },
    { ok: false, t: 'GmbH/AG NICHT zwingend nötig — auch Einzelunternehmer' },
  ];
  return (
    <section className="py-12 sm:py-16 border-b border-gray-100">
      <div className="container-tight">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Sehr wichtig: Deine Referenzen</h2>
        <p className="text-gray-700 mb-6 max-w-3xl">
          Wir kümmern uns um die Kalkulation — aber deine Eignung musst du selbst nachweisen.
          Das sind die Mindestvoraussetzungen für eine Zusammenarbeit:
        </p>
        <div className="grid sm:grid-cols-2 gap-3 max-w-3xl">
          {items.map((it) => (
            <div key={it.t} className="flex items-start gap-3 p-3 border border-gray-200 rounded-md">
              {it.ok ? (
                <CheckCircle2 className="w-5 h-5 text-kalku-green flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
              )}
              <span className="text-sm text-gray-800">{it.t}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="py-16 sm:py-20 bg-primary-500 text-white">
      <div className="container-tight text-center">
        <Clock className="w-10 h-10 mx-auto mb-5 opacity-90" />
        <h2 className="text-3xl sm:text-4xl font-bold mb-4">Du kalkulierst noch alles selbst?</h2>
        <p className="text-lg text-primary-50 mb-8 max-w-2xl mx-auto">
          Lass uns in 5 Minuten besprechen, wie wir deine Kalkulationsabteilung entlasten können.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <a href="#hero" className="btn btn-cta text-base">
            <Calendar className="w-4 h-4" /> Erstgespräch vereinbaren
          </a>
          <a href={`tel:${NAP.phone.replace(/\s/g, '')}`} className="btn bg-white/10 text-white hover:bg-white/20 border border-white/20">
            <Phone className="w-4 h-4" /> {NAP.phone}
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 py-10">
      <div className="container-tight">
        <div className="grid sm:grid-cols-3 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-md bg-primary-500 flex items-center justify-center">
                <Send className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-white">Kalku</span>
            </div>
            <p className="text-sm text-gray-400">
              Outsourced Baukalkulation für Bauunternehmer. Spezialisiert auf öffentliche
              Ausschreibungen.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-3 text-sm">Kontakt</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-500" />
                <a href={`tel:${NAP.phone.replace(/\s/g, '')}`} className="hover:text-white">{NAP.phone}</a>
              </li>
              <li className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-gray-500" />
                <a href={`https://wa.me/${NAP.whatsapp.replace(/[^\d]/g, '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                  WhatsApp
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-500" />
                <a href={`mailto:${NAP.email}`} className="hover:text-white">{NAP.email}</a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-3 text-sm">Standort</h3>
            <p className="text-sm text-gray-400">
              {NAP.street}<br />
              {NAP.postalCode} {NAP.city}<br />
              USt-ID: {NAP.vatId}
            </p>
            <div className="flex gap-4 mt-4 text-xs">
              <a href="/impressum" className="text-gray-400 hover:text-white">Impressum</a>
              <a href="/datenschutz" className="text-gray-400 hover:text-white">Datenschutz</a>
              <a href="/agb" className="text-gray-400 hover:text-white">AGB</a>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-4 text-xs text-gray-500 text-center">
          © {new Date().getFullYear()} Kalku Baukalkulationen — direkt
        </div>
      </div>
    </footer>
  );
}

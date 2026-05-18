import { useState, useMemo, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  Calendar,
  Clock,
  AlertCircle,
  Download,
  Shield,
  Info,
  XCircle,
  MapPin,
  Scale,
  CheckCircle2,
  Gavel,
} from 'lucide-react';
import { canonical } from '@/lib/seo';
import { softwareApplicationSchema } from '@/lib/toolSchema';
import AndereTools from '@/components/sections/AndereTools';
import { CrossCta } from './Mittellohn';

const BUNDESLAENDER = [
  { code: 'DE', name: 'Bundesweit (nur fed. Feiertage)' },
  { code: 'BW', name: 'Baden-Württemberg' },
  { code: 'BY', name: 'Bayern' },
  { code: 'BE', name: 'Berlin' },
  { code: 'BB', name: 'Brandenburg' },
  { code: 'HB', name: 'Bremen' },
  { code: 'HH', name: 'Hamburg' },
  { code: 'HE', name: 'Hessen' },
  { code: 'MV', name: 'Mecklenburg-Vorpommern' },
  { code: 'NI', name: 'Niedersachsen' },
  { code: 'NW', name: 'Nordrhein-Westfalen' },
  { code: 'RP', name: 'Rheinland-Pfalz' },
  { code: 'SL', name: 'Saarland' },
  { code: 'SN', name: 'Sachsen' },
  { code: 'ST', name: 'Sachsen-Anhalt' },
  { code: 'SH', name: 'Schleswig-Holstein' },
  { code: 'TH', name: 'Thüringen' },
] as const;

type LandCode = (typeof BUNDESLAENDER)[number]['code'];

/**
 * VOB/A § 12a (Unterschwellenwert) und § 10 / GWB-VgV (Oberschwelle) Mindestfristen.
 * Werte als Kalendertage zwischen Auftragsbekanntmachung und Angebotsfrist.
 */
type Verfahrensart = {
  key: string;
  label: string;
  paragraph: string;
  mindestKalenderTage: number;
  hint: string;
};

const VERFAHRENSARTEN: Verfahrensart[] = [
  {
    key: 'offen-uvgo',
    label: 'Öffentliche Ausschreibung (UVgO/VOB/A § 12 Abs. 1)',
    paragraph: 'VOB/A § 10 Abs. 1',
    mindestKalenderTage: 10,
    hint: 'Unterhalb EU-Schwellenwert. Bekanntmachungs- und Angebotsfrist „angemessen", in der Praxis min. 10 Werktage.',
  },
  {
    key: 'beschraenkt-uvgo',
    label: 'Beschränkte Ausschreibung mit Teilnahmewettbewerb',
    paragraph: 'VOB/A § 10 Abs. 1',
    mindestKalenderTage: 10,
    hint: 'Vorgeschalteter Teilnahmewettbewerb. Angemessene Frist analog UVgO.',
  },
  {
    key: 'beschraenkt-ohne',
    label: 'Beschränkte Ausschreibung ohne Teilnahmewettbewerb',
    paragraph: 'VOB/A § 10 Abs. 1',
    mindestKalenderTage: 10,
    hint: 'Direkte Bieterauswahl durch AG. Angemessene Frist.',
  },
  {
    key: 'verhandlungsvergabe',
    label: 'Verhandlungsvergabe',
    paragraph: 'VOB/A § 10',
    mindestKalenderTage: 7,
    hint: 'Ohne förmliches Verfahren; Frist „angemessen" nach Komplexität.',
  },
  {
    key: 'offen-eu',
    label: 'Offenes Verfahren (EU-weit, VgV § 15)',
    paragraph: 'VgV § 15 / GWB',
    mindestKalenderTage: 35,
    hint: 'Mindestens 35 Tage ab Absendung der Auftragsbekanntmachung. Bei elektronischer Übermittlung des Angebots: −5 Tage = 30 Tage.',
  },
  {
    key: 'nichtoffen-eu',
    label: 'Nicht-offenes Verfahren (EU-weit, VgV § 16)',
    paragraph: 'VgV § 16',
    mindestKalenderTage: 30,
    hint: 'Teilnahmewettbewerb 30 Tage + Angebotsfrist 30 Tage. Mit elektronischer Abgabe verkürzbar.',
  },
  {
    key: 'verhandlungsverfahren-eu',
    label: 'Verhandlungsverfahren EU-weit (VgV § 17)',
    paragraph: 'VgV § 17',
    mindestKalenderTage: 30,
    hint: 'Teilnahmefrist 30 Tage, anschließend Verhandlungsphase mit verkürzbaren Fristen.',
  },
];

const TITLE = 'Submissions-Frist-Rechner | KALKU';
const DESC =
  'Werktage bis Submissionstermin berechnen, deutsche Feiertage berücksichtigt, Bieterfragen-Frist nach VOB §17 Abs. 3, ICS-Kalender-Export. Kostenlos, im Browser.';

// German federal holidays (subset of universally recognized ones).
// Variable holidays computed from Easter via Anonymous Gregorian algorithm.
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

function getGermanHolidays(year: number, land: LandCode = 'DE'): Set<string> {
  const e = easterSunday(year);
  const list: Date[] = [
    new Date(year, 0, 1), // Neujahr
    new Date(year, 4, 1), // Tag der Arbeit
    new Date(year, 9, 3), // Tag der Deutschen Einheit
    new Date(year, 11, 25), // 1. Weihnachtstag
    new Date(year, 11, 26), // 2. Weihnachtstag
    addDays(e, -2), // Karfreitag
    addDays(e, 1), // Ostermontag
    addDays(e, 39), // Christi Himmelfahrt
    addDays(e, 50), // Pfingstmontag
  ];

  // Land-spezifische Feiertage
  if (['BW', 'BY', 'ST'].includes(land)) list.push(new Date(year, 0, 6)); // Heilige Drei Könige
  if (land === 'BE' && year >= 2019) list.push(new Date(year, 2, 8)); // Internat. Frauentag (BE seit 2019)
  if (land === 'MV' && year >= 2023) list.push(new Date(year, 2, 8));
  if (['BW', 'BY', 'HE', 'NW', 'RP', 'SL'].includes(land)) list.push(addDays(e, 60)); // Fronleichnam
  if (['BY', 'SL'].includes(land)) list.push(new Date(year, 7, 15)); // Mariä Himmelfahrt
  if (['BB', 'MV', 'SN', 'ST', 'TH', 'HB', 'HH', 'NI', 'SH'].includes(land)) list.push(new Date(year, 9, 31)); // Reformationstag
  if (['BW', 'BY', 'NW', 'RP', 'SL'].includes(land)) list.push(new Date(year, 10, 1)); // Allerheiligen
  if (land === 'SN') {
    // Buß- und Bettag — Mittwoch vor 23.11.
    const ref = new Date(year, 10, 23);
    const offset = (ref.getDay() + 4) % 7 || 7;
    list.push(addDays(ref, -offset));
  }

  return new Set(list.map((d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`));
}

function isHoliday(d: Date, holidays: Set<string>): boolean {
  return holidays.has(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
}

function isWorkday(d: Date, holidays: Set<string>): boolean {
  const wd = d.getDay();
  if (wd === 0 || wd === 6) return false;
  return !isHoliday(d, holidays);
}

function workdaysBetween(start: Date, end: Date, holidays: Set<string>): number {
  let count = 0;
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const target = new Date(end);
  target.setHours(0, 0, 0, 0);
  while (cur < target) {
    cur.setDate(cur.getDate() + 1);
    if (isWorkday(cur, holidays)) count++;
  }
  return count;
}

function previousWorkdays(end: Date, n: number, holidays: Set<string>): Date {
  const cur = new Date(end);
  cur.setHours(0, 0, 0, 0);
  let counted = 0;
  while (counted < n) {
    cur.setDate(cur.getDate() - 1);
    if (isWorkday(cur, holidays)) counted++;
  }
  return cur;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtTime(d: Date): string {
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function downloadIcs(events: { title: string; date: Date; description: string; type: string }[]) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//KALKU//Submissions-Frist//DE',
    'CALSCALE:GREGORIAN',
  ];
  events.forEach((ev) => {
    const dt = ev.date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const dateISO = ev.date.toISOString().slice(0, 10);
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${dateISO}-${ev.type}@kalku.de`);
    lines.push(`DTSTAMP:${dt}`);
    lines.push(`DTSTART:${dt}`);
    lines.push(`SUMMARY:${ev.title}`);
    lines.push(`DESCRIPTION:${ev.description.replace(/\n/g, '\\n')}`);
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'kalku-submissions-fristen.ics';
  a.click();
  URL.revokeObjectURL(url);
}

export default function FristRechner() {
  const initialToday = useMemo(() => new Date(), []);
  const tomorrow = addDays(initialToday, 14);
  tomorrow.setHours(11, 0, 0, 0);
  const [date, setDate] = useState(tomorrow.toISOString().slice(0, 10));
  const [time, setTime] = useState('11:00');
  const [versandTage, setVersandTage] = useState(2);
  const [land, setLand] = useState<LandCode>('SL');
  const [verfahrensart, setVerfahrensart] = useState<string>(''); // empty = nicht prüfen
  const [bekanntmachungsDatum, setBekanntmachungsDatum] = useState<string>('');
  const [bindefristTage, setBindefristTage] = useState<number>(30);
  const [showVobCheck, setShowVobCheck] = useState<boolean>(false);

  // Live ticker — re-render every second so countdown stays accurate
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const submissionsTermin = useMemo(() => {
    const [h, m] = time.split(':').map(Number);
    const d = new Date(date);
    d.setHours(h || 0, m || 0, 0, 0);
    return d;
  }, [date, time]);

  const dateValid = !isNaN(submissionsTermin.getTime());

  const result = useMemo(() => {
    const holidays = new Set<string>();
    const minYear = Math.min(now.getFullYear(), submissionsTermin.getFullYear());
    const maxYear = Math.max(now.getFullYear(), submissionsTermin.getFullYear());
    for (let y = minYear; y <= maxYear; y++) {
      getGermanHolidays(y, land).forEach((h) => holidays.add(h));
    }
    const isPast = submissionsTermin <= now;
    const workdaysLeft = isPast ? 0 : workdaysBetween(now, submissionsTermin, holidays);
    const calendarDaysLeft = isPast ? 0 : Math.ceil((submissionsTermin.getTime() - now.getTime()) / 86400000);
    const versandLatest = previousWorkdays(submissionsTermin, versandTage, holidays);
    const bieterfragenLatest = previousWorkdays(submissionsTermin, 6, holidays);
    const msLeft = Math.max(0, submissionsTermin.getTime() - now.getTime());
    const hoursLeft = Math.floor(msLeft / 3600000);
    const minutesLeft = Math.floor((msLeft % 3600000) / 60000);
    const secondsLeft = Math.floor((msLeft % 60000) / 1000);

    // VOB/A § 12a Mindestfrist-Prüfung (sofern Bekanntmachungsdatum + Verfahrensart gewählt)
    let vobCheck: {
      verfahren: Verfahrensart;
      tatsaechlicheTage: number;
      mindestTage: number;
      eingehalten: boolean;
      fehlteTage: number;
    } | null = null;
    if (verfahrensart && bekanntmachungsDatum) {
      const v = VERFAHRENSARTEN.find((x) => x.key === verfahrensart);
      if (v) {
        const bekDate = new Date(bekanntmachungsDatum);
        bekDate.setHours(0, 0, 0, 0);
        const subDate = new Date(submissionsTermin);
        subDate.setHours(0, 0, 0, 0);
        const tage = Math.max(0, Math.round((subDate.getTime() - bekDate.getTime()) / 86400000));
        vobCheck = {
          verfahren: v,
          tatsaechlicheTage: tage,
          mindestTage: v.mindestKalenderTage,
          eingehalten: tage >= v.mindestKalenderTage,
          fehlteTage: Math.max(0, v.mindestKalenderTage - tage),
        };
      }
    }

    // Bindefrist nach VOB/A § 10 Abs. 2 (Default 30 Kalendertage ab Submission)
    const bindefristEnde = addDays(submissionsTermin, bindefristTage);
    const bindefristWarnTermin = previousWorkdays(bindefristEnde, 3, holidays); // 3 Wt vor Ablauf

    return {
      isPast,
      workdaysLeft,
      calendarDaysLeft,
      versandLatest,
      bieterfragenLatest,
      hoursLeft,
      minutesLeft,
      secondsLeft,
      vobCheck,
      bindefristEnde,
      bindefristWarnTermin,
    };
  }, [submissionsTermin, now, versandTage, land, verfahrensart, bekanntmachungsDatum, bindefristTage]);

  function exportCalendar() {
    downloadIcs([
      {
        title: 'Submissionstermin',
        date: submissionsTermin,
        type: 'submission',
        description: `Submissions-Termin der Vergabestelle. Spätestens jetzt müssen alle Unterlagen vorliegen.`,
      },
      {
        title: 'Spätester Versand-Termin',
        date: result.versandLatest,
        type: 'versand',
        description: `Letzter empfohlener Versandtag (${versandTage} Werktage Vorlauf), damit Postweg sicher reicht.`,
      },
      {
        title: 'Bieterfragen-Frist (VOB)',
        date: result.bieterfragenLatest,
        type: 'bieterfragen',
        description: `Spätestens jetzt sollten Bieterfragen an die Vergabestelle gestellt sein (mindestens 6 Werktage vor Submission gem. VOB-Praxis).`,
      },
      {
        title: 'Bindefrist-Warnung (3 Wt vor Ablauf)',
        date: result.bindefristWarnTermin,
        type: 'bindefrist-warn',
        description: `In 3 Werktagen läuft die Bindefrist von ${bindefristTage} Tagen ab — Verlängerung anfordern oder Auftragsabschluss klären.`,
      },
      {
        title: 'Bindefrist-Ablauf',
        date: result.bindefristEnde,
        type: 'bindefrist-ende',
        description: `Bindefrist nach VOB/A § 10 Abs. 2 läuft heute ab. Danach ist das Angebot nicht mehr bindend.`,
      },
    ]);
  }

  const urgency =
    result.isPast ? 'past'
      : result.workdaysLeft <= 2 ? 'red'
      : result.workdaysLeft <= 5 ? 'orange'
      : result.workdaysLeft <= 10 ? 'amber'
      : 'green';
  const urgencyColors: Record<string, { bg: string; text: string; border: string }> = {
    past: { bg: 'bg-gray-200', text: 'text-gray-700', border: 'border-gray-300' },
    red: { bg: 'bg-rose-600', text: 'text-white', border: 'border-rose-700' },
    orange: { bg: 'bg-orange-500', text: 'text-white', border: 'border-orange-600' },
    amber: { bg: 'bg-amber-500', text: 'text-white', border: 'border-amber-600' },
    green: { bg: 'bg-emerald-600', text: 'text-white', border: 'border-emerald-700' },
  };
  const u = urgencyColors[urgency];

  return (
    <>
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESC} />
        <link rel="canonical" href={canonical('/tools/frist-rechner/')} />
        <script type="application/ld+json">
          {JSON.stringify(softwareApplicationSchema({
            name: 'Submissions-Frist-Rechner',
            description: DESC,
            path: '/tools/frist-rechner/',
            featureList: ['Werktage-Zähler', 'Bundesland-spezifische Feiertage', 'Bieterfragen-Frist VOB', 'VOB/A § 12a Mindestfrist-Prüfung', 'Bindefrist-Tracking VOB/A § 10 Abs. 2', 'ICS-Kalender-Export', 'Live-Countdown'],
          }))}
        </script>
      </Helmet>

      <section className="section-tight bg-gradient-to-br from-rose-50/40 to-white">
        <div className="container-page">
          <div className="text-center max-w-3xl mx-auto">
            <p className="text-xs uppercase tracking-[0.18em] text-rose-700 font-bold mb-3">
              Submissions-Frist-Rechner
            </p>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 mb-5 leading-tight">
              Wie viel Zeit bleibt bis zum Submissionstermin?
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Werktage zählen, deutsche Feiertage berücksichtigen, Bieterfragen-Frist nach
              VOB-Praxis ableiten, ICS-Kalender exportieren.
            </p>
            <div className="mt-7 inline-flex items-center gap-4 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-rose-600" /> 100 % lokal
              </span>
              <span className="text-gray-300" aria-hidden>·</span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-rose-600" /> Deutsche Feiertage 2026/27
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="section-tight">
        <div className="container-page">
          <div className="grid lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {/* Inputs */}
            <div className="card">
              <h2 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-rose-600" />
                Submissionstermin
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Datum</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
                </div>
                <div>
                  <label className="label">Uhrzeit</label>
                  <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="input" />
                </div>
              </div>

              <div className="mt-4">
                <label className="label inline-flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Bundesland (für korrekte Feiertage)
                </label>
                <select
                  value={land}
                  onChange={(e) => setLand(e.target.value as LandCode)}
                  className="input"
                >
                  {BUNDESLAENDER.map((b) => (
                    <option key={b.code} value={b.code}>{b.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1.5">
                  Allerheiligen (1.11.) ist nur in BW/BY/NW/RP/SL ein Werktag-frei,
                  Reformationstag (31.10.) in BB/MV/SN/ST/TH + (seit 2018) HB/HH/NI/SH.
                </p>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-100">
                <label className="label">Versand-Vorlauf in Werktagen</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    value={versandTage}
                    onChange={(e) => setVersandTage(parseInt(e.target.value))}
                    min={1}
                    max={5}
                    step={1}
                    className="flex-1 accent-rose-600"
                  />
                  <span className="font-bold text-rose-700 tabular-nums w-12 text-right">{versandTage} Wt</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Default: 2 Werktage Sicherheits-Puffer für Postweg / Kurier.
                </p>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-100">
                <label className="label inline-flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Bindefrist (Tage ab Submission)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    value={bindefristTage}
                    onChange={(e) => setBindefristTage(parseInt(e.target.value))}
                    min={14}
                    max={90}
                    step={1}
                    className="flex-1 accent-rose-600"
                  />
                  <span className="font-bold text-rose-700 tabular-nums w-14 text-right">{bindefristTage} T</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  VOB/A § 10 Abs. 2: 30 Tage Standard. Bei großen Bauvorhaben oft 60–90 Tage in Bekanntmachung gesetzt.
                </p>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowVobCheck((v) => !v)}
                  className="flex items-center gap-1.5 text-xs uppercase tracking-wider font-bold text-gray-500 hover:text-gray-700"
                >
                  <Scale className="w-3.5 h-3.5" />
                  VOB/A § 12a Mindestfrist-Prüfung
                  <span className="text-[10px] text-gray-400 font-normal normal-case tracking-normal">
                    {showVobCheck ? '— ausblenden' : '— prüfen'}
                  </span>
                </button>

                {showVobCheck && (
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="label text-xs">Verfahrensart</label>
                      <select
                        value={verfahrensart}
                        onChange={(e) => setVerfahrensart(e.target.value)}
                        className="input text-sm"
                      >
                        <option value="">— bitte wählen —</option>
                        {VERFAHRENSARTEN.map((v) => (
                          <option key={v.key} value={v.key}>{v.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label text-xs">Datum der Auftragsbekanntmachung</label>
                      <input
                        type="date"
                        value={bekanntmachungsDatum}
                        onChange={(e) => setBekanntmachungsDatum(e.target.value)}
                        className="input text-sm"
                      />
                      <p className="text-[11px] text-gray-500 mt-1">
                        Datum der Veröffentlichung der Auftragsbekanntmachung im e-Vergabe-Portal oder TED.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <button type="button" onClick={exportCalendar} className="btn btn-outline w-full mt-6">
                <Download className="w-4 h-4" /> ICS-Kalender exportieren (inkl. Bindefrist)
              </button>
            </div>

            {/* Result */}
            <div className="space-y-4">
              {!dateValid && (
                <div className="rounded-lg border-2 border-rose-300 bg-rose-50 p-5 text-rose-900">
                  <p className="font-bold mb-1 inline-flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" /> Ungültiges Datum
                  </p>
                  <p className="text-sm">Bitte geben Sie ein gültiges Datum und eine Uhrzeit für den Submissionstermin ein.</p>
                </div>
              )}
              {dateValid && (
              <>
              <div className={`rounded-lg p-6 border-2 ${u.border} ${u.bg} ${u.text}`}>
                <div className="flex items-center gap-2 mb-3">
                  {result.isPast ? <XCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  <p className="text-[11px] uppercase tracking-wider font-bold opacity-90">
                    {result.isPast ? 'Termin liegt in der Vergangenheit' : 'Verbleibende Zeit'}
                  </p>
                </div>
                {result.isPast ? (
                  <p className="text-2xl font-extrabold">Termin verstrichen</p>
                ) : (
                  <>
                    <p className="text-4xl font-extrabold tabular-nums">{result.workdaysLeft}</p>
                    <p className="text-sm opacity-90 mt-1">
                      Werktage bis Submission ({result.calendarDaysLeft} Kalendertage)
                    </p>
                    {result.calendarDaysLeft <= 1 && (
                      <p className="text-xs opacity-95 mt-3 tabular-nums font-mono bg-black/20 inline-block px-2 py-1 rounded">
                        Live: {String(result.hoursLeft).padStart(2, '0')}:{String(result.minutesLeft).padStart(2, '0')}:{String(result.secondsLeft).padStart(2, '0')}
                      </p>
                    )}
                  </>
                )}
              </div>

              <div className="card-flat">
                <p className="text-[11px] uppercase tracking-wider font-bold text-gray-500 mb-2">
                  Spätester Versand-Tag
                </p>
                <p className="font-bold text-gray-900">{fmtDate(result.versandLatest)}</p>
                <p className="text-xs text-gray-500 mt-1">{versandTage} Werktage Vorlauf</p>
              </div>

              <div className="card-flat">
                <p className="text-[11px] uppercase tracking-wider font-bold text-gray-500 mb-2">
                  Bieterfragen-Frist (VOB-Praxis)
                </p>
                <p className="font-bold text-gray-900">{fmtDate(result.bieterfragenLatest)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  6 Werktage vor Submission — danach typischerweise keine bindenden Antworten mehr
                </p>
                <div className="mt-4 rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
                  <strong>Hinweis:</strong> Diese 6-Werktage-Empfehlung folgt der gängigen Praxis nach VOB/A §12a (i.V.m. EU-RL 2014/24). Bei besonderer Dringlichkeit oder im Verhandlungsverfahren können kürzere Fristen gelten. Maßgeblich ist die Frist in der konkreten Vergabeunterlage.
                </div>
              </div>

              <div className="card-flat">
                <p className="text-[11px] uppercase tracking-wider font-bold text-gray-500 mb-2">
                  Submission-Termin
                </p>
                <p className="font-bold text-gray-900">{fmtDate(submissionsTermin)} um {fmtTime(submissionsTermin)} Uhr</p>
              </div>

              <div className="card-flat">
                <p className="text-[11px] uppercase tracking-wider font-bold text-gray-500 mb-2 inline-flex items-center gap-1.5">
                  <Gavel className="w-3.5 h-3.5" /> Bindefrist-Ablauf
                </p>
                <p className="font-bold text-gray-900">{fmtDate(result.bindefristEnde)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {bindefristTage} Kalendertage nach Submission · Erinnerung im ICS am {fmtDate(result.bindefristWarnTermin)}
                </p>
              </div>

              {result.vobCheck && (
                <div
                  className={`card-flat border-2 ${
                    result.vobCheck.eingehalten
                      ? 'border-emerald-200 bg-emerald-50'
                      : 'border-rose-300 bg-rose-50'
                  }`}
                >
                  <p
                    className={`text-[11px] uppercase tracking-wider font-bold mb-2 inline-flex items-center gap-1.5 ${
                      result.vobCheck.eingehalten ? 'text-emerald-800' : 'text-rose-800'
                    }`}
                  >
                    {result.vobCheck.eingehalten ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5" />
                    )}
                    VOB/A Mindestfrist · {result.vobCheck.verfahren.paragraph}
                  </p>
                  <p
                    className={`font-bold ${
                      result.vobCheck.eingehalten ? 'text-emerald-900' : 'text-rose-900'
                    }`}
                  >
                    {result.vobCheck.tatsaechlicheTage} Tage angesetzt · Mindestfrist {result.vobCheck.mindestTage} Tage
                  </p>
                  <p
                    className={`text-xs mt-1 ${
                      result.vobCheck.eingehalten ? 'text-emerald-800' : 'text-rose-800'
                    }`}
                  >
                    {result.vobCheck.eingehalten ? (
                      <>Mindestfrist eingehalten. Kein Rügegrund aus § 12a.</>
                    ) : (
                      <>
                        <strong>{result.vobCheck.fehlteTage} Tag(e) zu kurz!</strong> Möglicher Rügegrund nach VOB/A {result.vobCheck.verfahren.paragraph} —
                        Bieterrüge schriftlich an die Vergabestelle und Nachprüfungsantrag prüfen.
                      </>
                    )}
                  </p>
                </div>
              )}
              </>
              )}
            </div>
          </div>

          <div className="max-w-3xl mx-auto mt-10 bg-rose-50 border border-rose-200 rounded-lg p-5">
            <p className="text-xs uppercase tracking-wider font-bold text-rose-800 mb-2 inline-flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" /> Hinweis zur VOB
            </p>
            <p className="text-sm text-rose-900 leading-relaxed">
              Die genauen Bieterfragen-Fristen ergeben sich aus VOB/A § 12a sowie der konkreten
              Vergabebekanntmachung. Die hier gezeigten 6 Werktage sind ein Branchen-Anhalt — prüfen
              Sie immer die individuelle Bekanntmachung. Werktage sind Mo–Fr ohne deutsche
              gesetzliche Feiertage (Neujahr, Karfreitag, Ostermontag, Tag der Arbeit, Christi
              Himmelfahrt, Pfingstmontag, Tag der Deutschen Einheit, 1.+2. Weihnachtstag).
            </p>
          </div>

          {urgency === 'red' && !result.isPast && (
            <div className="max-w-3xl mx-auto mt-4 bg-rose-100 border border-rose-300 rounded-lg p-4 text-rose-900 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Knapp! Nur noch {result.workdaysLeft} Werktage.</p>
                <p>Wir helfen über Nacht oder am Wochenende — kein Aufpreis. Anrufen funktioniert schneller als das Formular: <a href="tel:+496814109643" className="font-semibold underline">+49 681 41096430</a></p>
              </div>
            </div>
          )}
        </div>
      </section>

      <AndereTools exclude="/tools/frist-rechner/" />
      <CrossCta />
    </>
  );
}

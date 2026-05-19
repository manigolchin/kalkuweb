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
  if (land === 'BE') list.push(new Date(year, 2, 8)); // Internat. Frauentag
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

function localDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fmtTime(d: Date): string {
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function downloadIcs(events: { title: string; date: Date; description: string }[]) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//KALKU//Submissions-Frist//DE',
    'CALSCALE:GREGORIAN',
  ];
  events.forEach((ev) => {
    const dt = ev.date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const slug = ev.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    lines.push('BEGIN:VEVENT');
    // Stable UID so re-imports dedupe in calendar apps instead of stacking up
    lines.push(`UID:${slug}-${dt}@kalku.de`);
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
  const defaultSubmission = addDays(initialToday, 14);
  const [date, setDate] = useState(localDateString(defaultSubmission));
  const [time, setTime] = useState('11:00');
  const [versandTage, setVersandTage] = useState(2);
  const [land, setLand] = useState<LandCode>('SL');

  // Live ticker — re-render every second so countdown stays accurate
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const submissionsTermin = useMemo(() => {
    const [h, m] = time.split(':').map(Number);
    const d = new Date(date);
    d.setHours(h, m, 0, 0);
    return d;
  }, [date, time]);

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
    return { isPast, workdaysLeft, calendarDaysLeft, versandLatest, bieterfragenLatest, hoursLeft, minutesLeft, secondsLeft };
  }, [submissionsTermin, now, versandTage, land]);

  function exportCalendar() {
    downloadIcs([
      {
        title: 'Submissionstermin',
        date: submissionsTermin,
        description: `Submissions-Termin der Vergabestelle. Spätestens jetzt müssen alle Unterlagen vorliegen.`,
      },
      {
        title: 'Spätester Versand-Termin',
        date: result.versandLatest,
        description: `Letzter empfohlener Versandtag (${versandTage} Werktage Vorlauf), damit Postweg sicher reicht.`,
      },
      {
        title: 'Bieterfragen-Frist (VOB)',
        date: result.bieterfragenLatest,
        description: `Spätestens jetzt sollten Bieterfragen an die Vergabestelle gestellt sein (mindestens 6 Werktage vor Submission gem. VOB-Praxis).`,
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
            featureList: ['Werktage-Zähler', 'Bundesland-spezifische Feiertage', 'Bieterfragen-Frist VOB', 'ICS-Kalender-Export', 'Live-Countdown'],
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

              <button type="button" onClick={exportCalendar} className="btn btn-outline w-full mt-6">
                <Download className="w-4 h-4" /> ICS-Kalender exportieren
              </button>
            </div>

            {/* Result */}
            <div className="space-y-4">
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
              </div>

              <div className="card-flat">
                <p className="text-[11px] uppercase tracking-wider font-bold text-gray-500 mb-2">
                  Submission-Termin
                </p>
                <p className="font-bold text-gray-900">{fmtDate(submissionsTermin)} um {fmtTime(submissionsTermin)} Uhr</p>
              </div>
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

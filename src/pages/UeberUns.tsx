import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Quote, MapPin, Phone, Mail, ArrowRight, Heart, Shield, Clock, Users, Linkedin, Target, Compass, Milestone } from 'lucide-react';
import { canonical } from '@/lib/seo';
import { NAP, SERVICES } from '@/lib/constants';
import { telHref } from '@/lib/utils';
import SectionHeader from '@/components/ui/SectionHeader';
import VierTeams from '@/components/sections/VierTeams';
import TechStack from '@/components/sections/TechStack';
import StatsBand from '@/components/sections/StatsBand';
import TeamPhoto from '@/components/ui/TeamPhoto';

const TITLE = 'Über uns — KALKU Baukalkulationen Saarbrücken';
const DESC =
  'Inhaber Alaatdin Coksari und das KALKU-Team aus Saarbrücken: Vier Teams (Kalkulation, Einkauf, Vergabe, Recherche), 20+ Jahre Erfahrung, bundesweit aktiv.';

const WERTE = [
  {
    icon: Heart,
    title: 'Loyalität',
    desc: 'Pro Ausschreibung arbeiten wir für genau einen Kunden — ohne Ausnahme.',
  },
  {
    icon: Shield,
    title: 'Vertraulichkeit',
    desc: 'Ihre Kalkulationsgrundlagen, Mittellöhne und Margen bleiben innerhalb unseres Teams.',
  },
  {
    icon: Clock,
    title: 'Verlässlichkeit',
    desc: 'Was wir zusagen, halten wir — auch wenn das Wochenendarbeit bedeutet.',
  },
  {
    icon: Users,
    title: 'Augenhöhe',
    desc: 'Wir sprechen Bauer-Sprache, nicht Berater-Sprache. Klar und ohne Geschwurbel.',
  },
];

// Firmengeschichte — wichtige Stationen. Daten ergänzen / korrigieren nach Bedarf.
const MILESTONES = [
  {
    year: '2019',
    title: 'Gründung in Saarbrücken',
    desc: 'Alaatdin Coksari startet KALKU als spezialisiertes Kalkulationsbüro für öffentliche Vergaben — nach 14 Jahren in Submission und Vergaberecht für Bauunternehmen im Saarland.',
  },
  {
    year: '2021',
    title: 'Leitender Kalkulator dazu',
    desc: 'Bülent Coksari steigt als leitender Kalkulator ein. GaLaBau-Praxis und Bauingenieur-Studium ergänzen das Submission-Know-how des Inhabers.',
  },
  {
    year: '2023',
    title: 'Online-Tools für Bauunternehmer',
    desc: 'GAEB-Konverter, Mittellohn-Rechner und Bürgschafts-Rechner gehen live — kostenlos, browser-only, ohne Datenupload. Werkzeuge, die wir intern täglich nutzen.',
  },
  {
    year: '2024',
    title: 'Monatspakete + Gebietsschutz',
    desc: 'PAKET M und PAKET L eingeführt — feste Monatspauschale plus Loyalitätsversprechen pro Gewerk + Einzugsgebiet. Mandanten erhalten exklusive Kalkulationskapazität.',
  },
  {
    year: '2026',
    title: 'Bundesweit · 10 Gewerke · API-Backend',
    desc: 'Aktive Mandate in 7 Bundesländern, Abdeckung aller 10 relevanten Bau-Gewerke. Eigene Formular-API mit Pipedrive-Integration, prüfbare Nachträge nach VOB/B § 2 und Schlussrechnungs-Support nach § 14.',
  },
];

export default function UeberUns() {
  return (
    <>
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESC} />
        <link rel="canonical" href={canonical('/ueber-uns/')} />
      </Helmet>

      {/* HERO */}
      <section className="section">
        <div className="container-page">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <p className="text-xs uppercase tracking-[0.18em] text-primary-700 font-bold mb-3">
              Inhabergeführt seit 2019
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 mb-5 leading-tight">
              Inhabergeführtes Kalkulationsbüro.
            </h1>
            <p className="text-lg text-gray-600">
              Kein GmbH-Konstrukt mit Gesellschafter-Statut, sondern persönliche Verantwortung —
              Sie sprechen direkt mit den Inhabern.
            </p>
          </div>

          {/* Origin story / Warum KALKU? */}
          <div className="max-w-3xl mx-auto mb-12 space-y-5 text-gray-700 leading-relaxed">
            <p className="text-xs uppercase tracking-[0.18em] font-bold text-primary-700 text-center mb-1">
              Warum KALKU?
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-7">
              Weil gute Bauunternehmer Aufträge verlieren — nicht wegen schlechter Arbeit, sondern wegen fehlender Zeit.
            </h2>
            <p>
              Geschäftsführer mittelständischer Bauunternehmen verbringen 30–40 Stunden mit jeder
              Submission. Oder sie verpassen die Frist. Festangestellte Kalkulatoren kosten
              vollkostengerechnet ~92.000 € im Jahr — und sind in Urlaub, Krankheit oder Elternzeit
              nicht verfügbar. Freelancer sind teuer, oft monatelang ausgebucht, und stehen nicht
              in der Loyalitätsstruktur Ihres Hauses.
            </p>
            <p>
              <strong>Alaatdin Coksari</strong> hat 14 Jahre lang Submissionen für Bauunternehmen
              im Saarland und in Rheinland-Pfalz bearbeitet — und immer wieder dasselbe Muster
              gesehen: solide mittelständische Bauunternehmer verlieren Aufträge, weil ihre
              Kalkulation den Preis verfehlt oder die Frist verpasst wird.
            </p>
            <p>
              2019 hat er <strong>KALKU</strong> gegründet, um diese Lücke systematisch zu schließen:
              eine externe Kalkulationsabteilung mit der Diskretion eines Inhouse-Teams, der
              Geschwindigkeit eines spezialisierten Dienstleisters und der Kosten-Flexibilität
              eines Auftragsmodells statt Festanstellung.
            </p>
          </div>

          {/* MISSION + VISION — bold pull cards */}
          <div className="grid md:grid-cols-2 gap-5 max-w-4xl mx-auto mb-14">
            <div className="card border-l-4 border-l-primary-500">
              <div className="flex items-center gap-2 mb-3 text-primary-700">
                <Target className="w-5 h-5" aria-hidden="true" />
                <p className="text-xs uppercase tracking-[0.18em] font-bold">Mission</p>
              </div>
              <p className="text-lg font-semibold text-gray-900 leading-snug">
                Kein mittelständischer Bauunternehmer verliert eine Submission,
                weil ihm Zeit oder Kalkulationskapazität fehlt.
              </p>
            </div>
            <div className="card border-l-4 border-l-emerald-500">
              <div className="flex items-center gap-2 mb-3 text-emerald-700">
                <Compass className="w-5 h-5" aria-hidden="true" />
                <p className="text-xs uppercase tracking-[0.18em] font-bold">Vision</p>
              </div>
              <p className="text-lg font-semibold text-gray-900 leading-snug">
                Das diskreteste Kalkulationsbüro für mittelständische Bauunternehmer
                in der DACH-Region — Verlängerung Ihrer Abteilung, nicht anonymer Anbieter.
              </p>
            </div>
          </div>

          {/* Inhaber */}
          <div className="grid lg:grid-cols-5 gap-10 lg:gap-14 items-center max-w-6xl mx-auto mb-16">
            <div className="lg:col-span-2">
              {/* Drop a portrait at public/team/alaatdin-coksari.webp and uncomment src below. */}
              <TeamPhoto
                /* src="/team/alaatdin-coksari.webp" */
                alt="Alaatdin Coksari, Inhaber und Geschäftsführer"
                initials="AC"
                accent="primary"
              />
            </div>
            <div className="lg:col-span-3">
              <p className="text-xs uppercase tracking-wider font-bold text-gray-500 mb-2">Inhaber & Geschäftsführer</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 mb-2">
                Alaatdin Coksari
              </h2>
              <p className="text-base text-gray-600 mb-6">
                Gründet 2019 KALKU als spezialisiertes Kalkulationsbüro für öffentliche Vergaben.
                14+ Jahre Erfahrung in Submission und Vergaberecht.
              </p>
              <Quote className="w-8 h-8 text-primary-200 mb-2" />
              <blockquote className="text-lg text-gray-700 italic leading-relaxed mb-6">
                „Unsere Kunden sind Geschäftsführer und Inhaber, die keine Zeit haben, jede
                Ausschreibung selbst durchzurechnen — aber auch kein Angebot verpassen wollen. Sie
                denken in Zahlen und Ergebnissen, nicht in Marketingversprechen."
              </blockquote>
              <div className="flex flex-wrap gap-2 text-sm">
                <a
                  href={SERVICES.linkedinAlaatdinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-primary-700 hover:text-primary-800 font-medium"
                >
                  <Linkedin className="w-4 h-4" /> LinkedIn
                </a>
                <span className="text-gray-300" aria-hidden>·</span>
                <a
                  href={telHref(NAP.phone)}
                  className="inline-flex items-center gap-1.5 text-primary-600 hover:text-primary-700"
                >
                  <Phone className="w-4 h-4" /> {NAP.phone}
                </a>
                <span className="text-gray-300">·</span>
                <a
                  href={`mailto:${NAP.email}`}
                  className="inline-flex items-center gap-1.5 text-primary-600 hover:text-primary-700"
                >
                  <Mail className="w-4 h-4" /> {NAP.email}
                </a>
                <span className="text-gray-300">·</span>
                <span className="inline-flex items-center gap-1.5 text-gray-500">
                  <MapPin className="w-4 h-4" /> {NAP.city}
                </span>
              </div>
            </div>
          </div>

          {/* Bülent — leitender Kalkulator */}
          <div className="grid lg:grid-cols-5 gap-10 lg:gap-14 items-center max-w-6xl mx-auto">
            <div className="lg:col-span-3 lg:order-1 order-2">
              <p className="text-xs uppercase tracking-wider font-bold text-gray-500 mb-2">Leitender Kalkulator</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 mb-2">
                Bülent Coksari
              </h2>
              <p className="text-base text-gray-600 mb-6">
                GaLaBau-Hintergrund mit eigener Praxis, Bauingenieur-Studium, parallel
                Geschäftsführer der ui medien UG (Filmproduktion). Bringt Praxis-Wissen
                von der Baustelle und Tech-Affinität in die Kalkulation.
              </p>
              <Quote className="w-7 h-7 text-emerald-200 mb-2" />
              <blockquote className="text-base text-gray-700 italic leading-relaxed mb-6">
                „Wer im GaLaBau selbst Pflastersteine geschleppt hat, weiß später am Schreibtisch,
                wie lange ein Quadratmeter Pflasterfläche realistisch dauert — das ist nicht
                Theorie."
              </blockquote>
              <div className="flex flex-wrap gap-2 text-sm">
                <a
                  href={SERVICES.linkedinBuelentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-primary-700 hover:text-primary-800 font-medium"
                >
                  <Linkedin className="w-4 h-4" /> LinkedIn
                </a>
                <span className="text-gray-300" aria-hidden>·</span>
                <a
                  href={`mailto:${NAP.email}`}
                  className="inline-flex items-center gap-1.5 text-primary-600 hover:text-primary-700"
                >
                  <Mail className="w-4 h-4" /> {NAP.email}
                </a>
              </div>
            </div>
            <div className="lg:col-span-2 lg:order-2 order-1">
              {/* Drop a portrait at public/team/buelent-coksari.webp and uncomment src below. */}
              <TeamPhoto
                /* src="/team/buelent-coksari.webp" */
                alt="Bülent Coksari, leitender Kalkulator"
                initials="BC"
                accent="emerald"
              />
            </div>
          </div>

          {/* Inhabergeführt-Banner */}
          <div className="max-w-3xl mx-auto mt-12 bg-primary-50/60 border border-primary-100 rounded-lg p-5 sm:p-6 text-center">
            <p className="text-sm text-primary-900 leading-relaxed">
              <strong>Inhabergeführtes Einzelunternehmen seit 2019.</strong> Kein Konzern, kein
              Gesellschafter-Statut — Sie sprechen direkt mit den Verantwortlichen, und die
              Verantwortung liegt persönlich. Das ist Old-School-Bauunternehmer-Logik.
            </p>
          </div>
        </div>
      </section>

      {/* STATS — credibility band */}
      <StatsBand />

      {/* VIER TEAMS — reused from Home */}
      <VierTeams />

      {/* FIRMENGESCHICHTE / Timeline */}
      <section className="section bg-gray-50">
        <div className="container-page">
          <SectionHeader
            eyebrow="Firmengeschichte"
            title="Sieben Jahre KALKU — die wichtigsten Stationen."
            subtitle="Vom Einzel-Submissionsbüro im Saarland zur bundesweiten Kalkulationsabteilung für mittelständische Bauunternehmer."
          />
          <ol className="relative max-w-3xl mx-auto pl-8 sm:pl-12 border-l-2 border-primary-200">
            {MILESTONES.map((m, i) => (
              <li key={m.year} className={i === MILESTONES.length - 1 ? '' : 'mb-10'}>
                <span className="absolute -left-[11px] flex w-5 h-5 items-center justify-center rounded-full bg-primary-600 ring-4 ring-gray-50">
                  <Milestone className="w-2.5 h-2.5 text-white" aria-hidden="true" />
                </span>
                <p className="text-xs uppercase tracking-[0.18em] font-bold text-primary-700 mb-1 tabular-nums">
                  {m.year}
                </p>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1.5">{m.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{m.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* WERTE */}
      <section className="section bg-gray-50">
        <div className="container-page">
          <SectionHeader
            eyebrow="Werte"
            title="Was uns wichtig ist."
            subtitle="Vier Werte, die jede Entscheidung im Tagesgeschäft prägen."
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {WERTE.map((w) => {
              const Icon = w.icon;
              return (
                <div key={w.title} className="card">
                  <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-primary-600" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{w.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{w.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* TECH STACK */}
      <TechStack />

      {/* STANDORT */}
      <section className="section">
        <div className="container-page">
          <div className="grid lg:grid-cols-2 gap-10 items-center max-w-5xl mx-auto">
            <div>
              <p className="eyebrow mb-3">Standort</p>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 mb-5">
                Saarbrücken — bundesweit tätig.
              </h2>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Unser Sitz ist in der Berliner Promenade 15, mitten in Saarbrücken. Wir arbeiten
                deutschlandweit für Bauunternehmen — Schwerpunkt Saarland, Rheinland-Pfalz und
                Hessen, aber auch in Bayern, NRW und den neuen Bundesländern.
              </p>
              <div className="card-flat space-y-2 text-sm">
                <p className="flex items-center gap-2 text-gray-700">
                  <MapPin className="w-4 h-4 text-primary-500" />
                  {NAP.street}, {NAP.postalCode} {NAP.city}
                </p>
                <p className="flex items-center gap-2 text-gray-700">
                  <Phone className="w-4 h-4 text-primary-500" />
                  <a href={telHref(NAP.phone)} className="hover:text-primary-600">
                    {NAP.phone}
                  </a>
                </p>
                <p className="flex items-center gap-2 text-gray-700">
                  <Mail className="w-4 h-4 text-primary-500" />
                  <a href={`mailto:${NAP.email}`} className="hover:text-primary-600">
                    {NAP.email}
                  </a>
                </p>
              </div>
            </div>
            <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-gray-200 bg-white">
              <iframe
                title="KALKU Standort Saarbrücken — Berliner Promenade 15"
                width="100%"
                height="100%"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${NAP.geo.lng - 0.005}%2C${NAP.geo.lat - 0.003}%2C${NAP.geo.lng + 0.005}%2C${NAP.geo.lat + 0.003}&layer=mapnik&marker=${NAP.geo.lat}%2C${NAP.geo.lng}`}
                className="w-full h-full"
              />
            </div>
            <a
              href={`https://www.openstreetmap.org/?mlat=${NAP.geo.lat}&mlon=${NAP.geo.lng}&zoom=17`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden aspect-[4/3] rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-primary-50 items-center justify-center border border-gray-100 hover:border-primary-200 transition-colors group"
            >
              <div className="text-center">
                <MapPin className="w-10 h-10 text-primary-400 mx-auto mb-3 group-hover:text-primary-600 transition-colors" />
                <p className="text-sm text-gray-700 font-medium">{NAP.city}</p>
                <p className="text-xs text-gray-500 mt-0.5">{NAP.geo.lat.toFixed(4)}° N · {NAP.geo.lng.toFixed(4)}° E</p>
                <p className="text-xs text-primary-600 mt-3">Auf OpenStreetMap öffnen →</p>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section bg-gray-50">
        <div className="container-page">
          <div className="card text-center max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Lernen Sie uns kennen.
            </h2>
            <p className="text-gray-600 mb-6">
              Erstgespräch in 5 Minuten. Wir prüfen kostenlos, ob die Voraussetzungen passen.
            </p>
            <Link to="/kontakt/" className="btn btn-success btn-lg">
              Erstgespräch vereinbaren <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

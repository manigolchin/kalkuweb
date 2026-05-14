import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Quote, MapPin, Phone, Mail, ArrowRight, Heart, Shield, Clock, Users } from 'lucide-react';
import { canonical } from '@/lib/seo';
import { NAP } from '@/lib/constants';
import { telHref } from '@/lib/utils';
import SectionHeader from '@/components/ui/SectionHeader';
import VierTeams from '@/components/sections/VierTeams';

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

export default function UeberUns() {
  return (
    <>
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESC} />
        <link rel="canonical" href={canonical('/ueber-uns/')} />
      </Helmet>

      {/* HERO — Inhaber */}
      <section className="section">
        <div className="container-page">
          <div className="grid lg:grid-cols-5 gap-10 lg:gap-14 items-center">
            <div className="lg:col-span-2">
              <div className="relative aspect-[4/5] rounded-3xl bg-gradient-to-br from-primary-100 via-primary-50 to-emerald-50 overflow-hidden flex items-center justify-center max-w-sm mx-auto lg:mx-0">
                <div className="text-center px-6">
                  <div className="w-24 h-24 rounded-full bg-primary-500/20 mx-auto mb-4 flex items-center justify-center">
                    <span className="text-4xl font-bold text-primary-700">AC</span>
                  </div>
                  <p className="text-sm text-primary-700 font-medium">Foto folgt</p>
                  <p className="text-xs text-primary-600 mt-1">Inhaber-Portrait wird ergänzt</p>
                </div>
              </div>
            </div>
            <div className="lg:col-span-3">
              <p className="eyebrow mb-3">Inhaber</p>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 mb-3">
                Alaatdin Coksari
              </h1>
              <p className="text-lg text-gray-500 mb-7">
                Gründer & Geschäftsführer · KALKU Baukalkulationen, Saarbrücken
              </p>
              <Quote className="w-8 h-8 text-primary-200 mb-2" />
              <blockquote className="text-xl text-gray-700 italic leading-relaxed mb-7">
                „Unsere Kunden sind Geschäftsführer und Inhaber, die keine Zeit haben, jede
                Ausschreibung selbst durchzurechnen — aber auch kein Angebot verpassen wollen. Sie
                denken in Zahlen und Ergebnissen, nicht in Marketingversprechen."
              </blockquote>
              <div className="flex flex-wrap gap-2 text-sm">
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
        </div>
      </section>

      {/* VIER TEAMS — reused from Home */}
      <VierTeams />

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
            <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-primary-50 flex items-center justify-center border border-gray-100">
              <p className="text-sm text-gray-400">Map-Embed folgt</p>
            </div>
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

import { Link } from 'react-router-dom';
import { Send, Mail, Phone, MapPin } from 'lucide-react';
import { NAP } from '@/lib/constants';
import { telHref } from '@/lib/utils';

const COL_LEISTUNGEN = [
  { to: '/leistungen/galabau/', label: 'GaLaBau' },
  { to: '/leistungen/tiefbau/', label: 'Tiefbau' },
  { to: '/leistungen/hochbau/', label: 'Hochbau' },
  { to: '/leistungen/elektro/', label: 'Elektro' },
  { to: '/leistungen/haustechnik/', label: 'Haustechnik' },
  { to: '/leistungen/fenster/', label: 'Fenster' },
  { to: '/leistungen/schadstoff/', label: 'Schadstoff' },
];

const COL_UNTERNEHMEN = [
  { to: '/ueber-uns/', label: 'Über uns' },
  { to: '/ablauf/', label: 'Ablauf' },
  { to: '/konditionen/', label: 'Konditionen' },
  { to: '/referenzen/', label: 'Referenzen' },
  { to: '/blog/', label: 'Blog' },
  { to: '/kontakt/', label: 'Kontakt' },
];

const COL_TOOLS = [
  { to: '/tools/gaeb-konverter/', label: 'GAEB-Konverter' },
  { to: '/tools/kalkulator/', label: 'Kalkulationstool' },
];

const COL_RECHTLICH = [
  { to: '/impressum/', label: 'Impressum' },
  { to: '/datenschutz/', label: 'Datenschutz' },
  { to: '/agb/', label: 'AGB' },
];

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="container-page py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-lg bg-primary-500 flex items-center justify-center">
                <Send className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-bold text-white">KALKU</span>
                <span className="text-xs text-gray-400">Baukalkulationen</span>
              </div>
            </Link>
            <p className="text-sm text-gray-400 mb-5 max-w-xs">
              Outsourced Baukalkulation für GU und Bauunternehmen. Spezialisiert auf öffentliche Ausschreibungen
              (VOB/A, VgV) in 7 Gewerken.
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" />
                <span>
                  {NAP.street}
                  <br />
                  {NAP.postalCode} {NAP.city}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 flex-shrink-0 text-gray-400" />
                <a href={telHref(NAP.phone)} className="hover:text-white">
                  {NAP.phone}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 flex-shrink-0 text-gray-400" />
                <a href={`mailto:${NAP.email}`} className="hover:text-white">
                  {NAP.email}
                </a>
              </li>
            </ul>
          </div>

          <FooterCol title="Leistungen" items={COL_LEISTUNGEN} />
          <FooterCol title="Unternehmen" items={COL_UNTERNEHMEN} />
          <div className="space-y-8">
            <FooterCol title="Tools" items={COL_TOOLS} />
            <FooterCol title="Rechtliches" items={COL_RECHTLICH} />
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs text-gray-500">
          <p>
            © {year} {NAP.legalName}. USt-ID {NAP.vatId}.
          </p>
          <p>Made with care in {NAP.city}.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, items }: { title: string; items: { to: string; label: string }[] }) {
  return (
    <div>
      <h3 className="font-semibold text-white mb-3 text-sm">{title}</h3>
      <ul className="space-y-2 text-sm">
        {items.map((item) => (
          <li key={item.to}>
            <Link to={item.to} className="hover:text-white transition-colors">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

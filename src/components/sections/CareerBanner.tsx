import { Briefcase, ArrowRight } from 'lucide-react';

export default function CareerBanner() {
  return (
    <section className="py-10 sm:py-14">
      <div className="container-page">
        <div className="max-w-4xl mx-auto bg-white border-2 border-dashed border-primary-200 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6">
          <div className="w-14 h-14 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
            <Briefcase className="w-7 h-7 text-primary-700" strokeWidth={1.8} />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <p className="text-xs uppercase tracking-wider font-bold text-primary-700 mb-1">
              Karriere
            </p>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
              Wir suchen Verstärkung — werden Sie Teil von KALKU.
            </h3>
            <p className="text-sm text-gray-600">
              Junior-Kalkulator/in · Tiefbau-Kalkulator/in · Vergabe-Spezialist/in (m/w/d)
            </p>
          </div>
          <a
            href="mailto:info@kalku.de?subject=Karriere%20bei%20KALKU"
            className="btn btn-outline shrink-0"
          >
            Initiativ-Bewerbung <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
}

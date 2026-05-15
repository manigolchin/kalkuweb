import { Quote } from 'lucide-react';

/**
 * Editorial pull-quote — gives the page a magazine break between content sections.
 */
export default function PullQuote() {
  return (
    <section className="section bg-white">
      <div className="container-page">
        <figure className="max-w-4xl mx-auto text-center">
          <Quote className="w-10 h-10 text-primary-200 mx-auto mb-7" strokeWidth={1.5} />
          <blockquote className="display-h2 text-gray-900">
            „Eine genaue, gründliche Preiskalkulation ist die{' '}
            <span className="text-primary-600 underline decoration-primary-200 decoration-4 underline-offset-8">
              Lebensader
            </span>{' '}
            Ihres Unternehmens."
          </blockquote>
          <figcaption className="mt-8 text-sm text-gray-500 uppercase tracking-[0.18em] font-bold">
            Alaatdin Coksari · Inhaber, KALKU
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

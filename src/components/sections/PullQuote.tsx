import { Quote } from 'lucide-react';

/**
 * Big editorial pull-quote between two content sections — gives the page
 * a magazine feel and breaks density.
 */
export default function PullQuote() {
  return (
    <section className="section bg-white">
      <div className="container-page">
        <figure className="max-w-4xl mx-auto text-center">
          <Quote className="w-10 h-10 text-primary-200 mx-auto mb-6" strokeWidth={1.5} />
          <blockquote className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-gray-900 leading-tight">
            „Eine genaue und gründliche Preiskalkulation ist die{' '}
            <span className="text-primary-600">Lebensader</span> Ihres Unternehmens."
          </blockquote>
          <figcaption className="mt-6 text-sm text-gray-500 uppercase tracking-wider font-semibold">
            Alaatdin Coksari · Inhaber
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

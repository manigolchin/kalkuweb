import { NAP, SERVICES } from './constants';

/** Build an absolute canonical URL for a given path. */
export function canonical(path: string): string {
  const base = NAP.url.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

/** Build the global Organization + LocalBusiness/ProfessionalService + WebSite @graph. */
export function organizationGraph() {
  const url = NAP.url;
  const sameAs = [
    SERVICES.facebookUrl,
    SERVICES.instagramUrl,
    SERVICES.tiktokUrl,
    SERVICES.linkedinCompanyUrl,
  ].filter(Boolean);

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${url}/#organization`,
        name: NAP.legalName,
        url,
        logo: `${url}/logo.png`,
        sameAs,
        contactPoint: [
          {
            '@type': 'ContactPoint',
            telephone: NAP.phone,
            contactType: 'customer service',
            areaServed: 'DE',
            availableLanguage: ['de'],
            email: NAP.email,
          },
        ],
        vatID: NAP.vatId,
      },
      {
        '@type': ['ProfessionalService', 'LocalBusiness'],
        '@id': `${url}/#service`,
        name: NAP.legalName,
        url,
        priceRange: '€€',
        address: {
          '@type': 'PostalAddress',
          streetAddress: NAP.street,
          postalCode: NAP.postalCode,
          addressLocality: NAP.city,
          addressCountry: NAP.country,
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: NAP.geo.lat,
          longitude: NAP.geo.lng,
        },
        areaServed: { '@type': 'Country', name: 'Deutschland' },
        telephone: NAP.phone,
        email: NAP.email,
        openingHoursSpecification: [
          {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            opens: '08:00',
            closes: '18:00',
          },
        ],
      },
      {
        '@type': 'WebSite',
        '@id': `${url}/#website`,
        url,
        name: NAP.brandName,
        publisher: { '@id': `${url}/#organization` },
        inLanguage: 'de-DE',
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${url}/?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };
}

/** FAQPage schema for a list of question/answer pairs. */
export function faqPageSchema(items: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}

/** BreadcrumbList schema for a list of crumbs (name + path). */
export function breadcrumbSchema(crumbs: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: canonical(c.path),
    })),
  };
}

/** HowTo schema for a sequence of steps. */
export function howToSchema(name: string, steps: { name: string; text: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    step: steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  };
}

/** Helper to render a JSON-LD object as a script tag string. */
export function jsonLd(obj: unknown): string {
  return JSON.stringify(obj, null, 0);
}

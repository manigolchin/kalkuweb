import { canonical } from './seo';
import { NAP } from './constants';

type ToolSchemaInput = {
  name: string;
  description: string;
  path: string;
  applicationCategory?: string;
  featureList?: string[];
};

/**
 * Build a SoftwareApplication JSON-LD object for a tool page —
 * helps Google show the tool with rich snippet (price = free, OS = Web).
 */
export function softwareApplicationSchema(t: ToolSchemaInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: t.name,
    description: t.description,
    url: canonical(t.path),
    applicationCategory: t.applicationCategory ?? 'BusinessApplication',
    operatingSystem: 'Any (Browser-based)',
    inLanguage: 'de-DE',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
    },
    publisher: {
      '@type': 'Organization',
      name: NAP.legalName,
      url: NAP.url,
    },
    ...(t.featureList ? { featureList: t.featureList } : {}),
  };
}

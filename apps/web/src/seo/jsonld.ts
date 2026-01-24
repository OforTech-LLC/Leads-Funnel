import type { Locale } from '@/i18n/routing';
import { getBaseUrl, getCanonicalUrl } from './metadata';
import { getKeywordsByLocale } from './keywords';

/**
 * JSON-LD structured data types
 */
interface Organization {
  '@type': 'Organization';
  '@id': string;
  name: string;
  url: string;
  logo?: string;
}

interface LocalBusiness {
  '@context': 'https://schema.org';
  '@type': 'ProfessionalService';
  '@id': string;
  name: string;
  description: string;
  url: string;
  logo?: string;
  image?: string;
  telephone?: string;
  email?: string;
  priceRange?: string;
  serviceType: string[];
  areaServed: {
    '@type': 'Country';
    name: string;
  }[];
  sameAs?: string[];
}

interface WebPage {
  '@context': 'https://schema.org';
  '@type': 'WebPage';
  '@id': string;
  url: string;
  name: string;
  description: string;
  inLanguage: string;
  isPartOf: {
    '@type': 'WebSite';
    '@id': string;
    name: string;
    url: string;
    publisher: Organization;
  };
  about: {
    '@type': 'Thing';
    name: string;
  };
  keywords: string;
}

/**
 * Generate LocalBusiness/ProfessionalService JSON-LD
 */
export function generateLocalBusinessJsonLd(locale: Locale): LocalBusiness {
  const baseUrl = getBaseUrl();
  const isSpanish = locale === 'es';

  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': `${baseUrl}/#organization`,
    name: 'Kanjona Lead Generation',
    description: isSpanish
      ? 'Servicios profesionales de generacion de leads y adquisicion de clientes para negocios.'
      : 'Professional lead generation and customer acquisition services for businesses.',
    url: baseUrl,
    logo: `${baseUrl}/logo.png`,
    image: `${baseUrl}/og-image.png`,
    priceRange: '$$',
    serviceType: isSpanish
      ? [
          'Generacion de Leads',
          'Marketing Digital',
          'Adquisicion de Clientes',
          'Optimizacion de Conversion',
        ]
      : [
          'Lead Generation',
          'Digital Marketing',
          'Customer Acquisition',
          'Conversion Optimization',
        ],
    areaServed: [
      { '@type': 'Country', name: 'United States' },
      { '@type': 'Country', name: 'Mexico' },
      { '@type': 'Country', name: 'Spain' },
    ],
  };
}

/**
 * Generate WebPage JSON-LD
 */
export function generateWebPageJsonLd(locale: Locale, path: string = ''): WebPage {
  const baseUrl = getBaseUrl();
  const canonicalUrl = getCanonicalUrl(locale, path);
  const keywords = getKeywordsByLocale(locale);
  const isSpanish = locale === 'es';

  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${canonicalUrl}/#webpage`,
    url: canonicalUrl,
    name: isSpanish
      ? 'Obtener Mas Prospectos Calificados | Generacion de Leads'
      : 'Get More Qualified Leads | Lead Generation',
    description: isSpanish
      ? 'Captura prospectos de ventas calificados y haz crecer tu negocio.'
      : 'Capture qualified sales leads and grow your business.',
    inLanguage: locale === 'es' ? 'es-ES' : 'en-US',
    isPartOf: {
      '@type': 'WebSite',
      '@id': `${baseUrl}/#website`,
      name: 'Kanjona',
      url: baseUrl,
      publisher: {
        '@type': 'Organization',
        '@id': `${baseUrl}/#organization`,
        name: 'Kanjona',
        url: baseUrl,
      },
    },
    about: {
      '@type': 'Thing',
      name: isSpanish ? 'Generacion de Leads' : 'Lead Generation',
    },
    keywords: keywords.join(', '),
  };
}

/**
 * Generate all JSON-LD scripts for a page
 */
export function generateAllJsonLd(locale: Locale, path: string = ''): string {
  const localBusiness = generateLocalBusinessJsonLd(locale);
  const webPage = generateWebPageJsonLd(locale, path);

  return JSON.stringify([localBusiness, webPage]);
}

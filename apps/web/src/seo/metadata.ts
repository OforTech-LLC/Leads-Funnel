import type { Metadata } from 'next';
import { routing, type Locale } from '@/i18n/routing';
import { getKeywordsByLocale } from './keywords';

/**
 * Base URL for the site
 */
export function getBaseUrl(): string {
  const domain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'kanjona.com';
  return `https://${domain}`;
}

/**
 * Get canonical URL for a given locale and path
 */
export function getCanonicalUrl(locale: Locale, path: string = ''): string {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/${locale}${path}`;
}

/**
 * Generate alternate language links for hreflang tags
 */
export function getAlternateLanguages(path: string = ''): Record<string, string> {
  const baseUrl = getBaseUrl();
  const alternates: Record<string, string> = {
    'x-default': `${baseUrl}/en${path}`,
  };

  routing.locales.forEach((locale) => {
    alternates[locale] = `${baseUrl}/${locale}${path}`;
  });

  return alternates;
}

/**
 * Localized metadata content
 */
const metadataContent: Record<Locale, { title: string; description: string }> = {
  en: {
    title: 'Get More Qualified Leads | Lead Generation & Customer Acquisition',
    description:
      'Boost your business growth with our lead generation funnel. Capture qualified sales leads, book appointments, and convert visitors into customers. Real estate leads, home service leads, and more.',
  },
  es: {
    title: 'Obtener Mas Prospectos Calificados | Generacion de Leads y Adquisicion de Clientes',
    description:
      'Impulsa el crecimiento de tu negocio con nuestro embudo de generacion de leads. Captura prospectos de ventas calificados, agenda citas y convierte visitantes en clientes.',
  },
};

/**
 * Generate complete metadata for a page
 */
export function generatePageMetadata(
  locale: Locale,
  path: string = '',
  overrides?: Partial<Metadata>
): Metadata {
  const content = metadataContent[locale];
  const canonicalUrl = getCanonicalUrl(locale, path);
  const alternates = getAlternateLanguages(path);
  const keywords = getKeywordsByLocale(locale);

  return {
    title: content.title,
    description: content.description,
    keywords: keywords.join(', '),
    authors: [{ name: 'Kanjona' }],
    creator: 'Kanjona',
    publisher: 'Kanjona',
    metadataBase: new URL(getBaseUrl()),
    alternates: {
      canonical: canonicalUrl,
      languages: alternates,
    },
    openGraph: {
      type: 'website',
      locale: locale === 'es' ? 'es_ES' : 'en_US',
      url: canonicalUrl,
      title: content.title,
      description: content.description,
      siteName: 'Kanjona Lead Generation',
      images: [
        {
          url: `${getBaseUrl()}/og-image.png`,
          width: 1200,
          height: 630,
          alt: content.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: content.title,
      description: content.description,
      images: [`${getBaseUrl()}/og-image.png`],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    ...overrides,
  };
}

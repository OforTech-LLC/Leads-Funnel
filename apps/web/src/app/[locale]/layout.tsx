import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { routing, type Locale } from '@/i18n/routing';
import { generatePageMetadata } from '@/seo/metadata';
import { generateAllJsonLd } from '@/seo/jsonld';
import { StoreProvider } from './StoreProvider';

/**
 * Generate static params for all supported locales
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * Generate metadata for the locale
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Validate locale
  if (!routing.locales.includes(locale as Locale)) {
    return {};
  }

  return generatePageMetadata(locale as Locale);
}

/**
 * Root layout for locale-specific pages
 */
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Validate locale
  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  // Get messages for the locale
  const messages = await getMessages();

  // Generate JSON-LD
  const jsonLd = generateAllJsonLd(locale as Locale);

  return (
    <html lang={locale}>
      <head>
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd }}
        />
      </head>
      <body style={bodyStyles}>
        <NextIntlClientProvider messages={messages}>
          <StoreProvider>
            {children}
          </StoreProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

/**
 * Minimal body styles
 */
const bodyStyles: React.CSSProperties = {
  margin: 0,
  padding: 0,
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  backgroundColor: '#f5f5f5',
  color: '#111',
  lineHeight: 1.6,
};

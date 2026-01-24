import { defineRouting } from 'next-intl/routing';

/**
 * Routing configuration for next-intl
 * Defines supported locales and default locale
 */
export const routing = defineRouting({
  // Supported locales
  locales: ['en', 'es'],

  // Default locale when no locale is specified
  defaultLocale: 'en',

  // Redirect root to default locale
  localePrefix: 'always',
});

// Type-safe locale type
export type Locale = (typeof routing.locales)[number];

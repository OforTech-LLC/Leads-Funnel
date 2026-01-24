import { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { getBaseUrl } from '@/seo/metadata';

// Required for static export
export const dynamic = 'force-static';

/**
 * Generate sitemap for all localized pages
 * Next.js automatically serves this at /sitemap.xml
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getBaseUrl();
  const lastModified = new Date();

  // Define all pages
  const pages = [
    '', // Home page
    // Add more pages here as they are created
    // '/about',
    // '/contact',
    // '/pricing',
  ];

  // Generate entries for all locale/page combinations
  const entries: MetadataRoute.Sitemap = [];

  pages.forEach((page) => {
    routing.locales.forEach((locale) => {
      entries.push({
        url: `${baseUrl}/${locale}${page}`,
        lastModified,
        changeFrequency: 'weekly',
        priority: page === '' ? 1.0 : 0.8,
        alternates: {
          languages: routing.locales.reduce(
            (acc, loc) => {
              acc[loc] = `${baseUrl}/${loc}${page}`;
              return acc;
            },
            {} as Record<string, string>
          ),
        },
      });
    });
  });

  return entries;
}

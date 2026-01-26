import { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { getBaseUrl } from '@/seo/metadata';

// Required for static export
export const dynamic = 'force-static';

/**
 * All 47 service funnels
 */
const funnels = [
  // Core Services (8)
  'real-estate',
  'life-insurance',
  'construction',
  'moving',
  'dentist',
  'plastic-surgeon',
  'roofing',
  'cleaning',
  // Home Services (19)
  'hvac',
  'plumbing',
  'electrician',
  'pest-control',
  'landscaping',
  'pool-service',
  'home-remodeling',
  'solar',
  'locksmith',
  'pressure-washing',
  'water-damage-restoration',
  'mold-remediation',
  'flooring',
  'painting',
  'windows-doors',
  'fencing',
  'concrete',
  'junk-removal',
  'appliance-repair',
  // Health & Beauty (7)
  'orthodontist',
  'dermatology',
  'medspa',
  'chiropractic',
  'physical-therapy',
  'hair-transplant',
  'cosmetic-dentistry',
  // Professional & Legal (5)
  'personal-injury-attorney',
  'immigration-attorney',
  'criminal-defense-attorney',
  'tax-accounting',
  'business-consulting',
  // Business Services (4)
  'commercial-cleaning',
  'security-systems',
  'it-services',
  'marketing-agency',
  // Auto Services (4)
  'auto-repair',
  'auto-detailing',
  'towing',
  'auto-glass',
];

/**
 * Generate sitemap for all localized pages
 * Next.js automatically serves this at /sitemap.xml
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getBaseUrl();
  const lastModified = new Date();
  const entries: MetadataRoute.Sitemap = [];

  // Homepage for each locale
  routing.locales.forEach((locale) => {
    entries.push({
      url: `${baseUrl}/${locale}`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1.0,
      alternates: {
        languages: routing.locales.reduce(
          (acc, loc) => {
            acc[loc] = `${baseUrl}/${loc}`;
            return acc;
          },
          {} as Record<string, string>
        ),
      },
    });
  });

  // All 47 funnel pages for each locale (94 total)
  funnels.forEach((funnelId) => {
    routing.locales.forEach((locale) => {
      entries.push({
        url: `${baseUrl}/${locale}/${funnelId}`,
        lastModified,
        changeFrequency: 'weekly',
        priority: 0.8,
        alternates: {
          languages: routing.locales.reduce(
            (acc, loc) => {
              acc[loc] = `${baseUrl}/${loc}/${funnelId}`;
              return acc;
            },
            {} as Record<string, string>
          ),
        },
      });
    });
  });

  // Static pages
  const staticPages = ['privacy', 'terms'];
  staticPages.forEach((page) => {
    routing.locales.forEach((locale) => {
      entries.push({
        url: `${baseUrl}/${locale}/${page}`,
        lastModified,
        changeFrequency: 'monthly',
        priority: 0.5,
        alternates: {
          languages: routing.locales.reduce(
            (acc, loc) => {
              acc[loc] = `${baseUrl}/${loc}/${page}`;
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

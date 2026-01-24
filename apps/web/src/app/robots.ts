import { MetadataRoute } from 'next';
import { getBaseUrl } from '@/seo/metadata';

/**
 * Generate robots.txt
 * Next.js automatically serves this at /robots.txt
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/_next/',
          '/private/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}

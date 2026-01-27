import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/**
 * Security headers for static assets (not covered by middleware)
 * Main security headers are applied via middleware for dynamic nonce support
 *
 * NOTE: CSP is handled by middleware with nonce support.
 * These headers provide fallback for static files and additional caching security.
 */
const securityHeaders = [
  // Prevent clickjacking
  { key: 'X-Frame-Options', value: 'DENY' },

  // Prevent MIME type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },

  // Control referrer information
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },

  // XSS protection (legacy browser support)
  { key: 'X-XSS-Protection', value: '1; mode=block' },

  // Permissions Policy - restrict browser features
  {
    key: 'Permissions-Policy',
    value:
      'camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(), usb=(), bluetooth=(), serial=()',
  },

  // HSTS - force HTTPS (1 year, include subdomains, preload)
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload',
  },

  // Cross-Origin policies for enhanced isolation
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },

  // Prevent DNS prefetching to external domains
  { key: 'X-DNS-Prefetch-Control', value: 'off' },

  // Prevent IE from executing downloads in site context
  { key: 'X-Download-Options', value: 'noopen' },

  // Disable content type sniffing for cross-domain policies
  { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
];

/**
 * Static CSP for paths not covered by middleware (e.g., _next/static)
 * This is more restrictive since these are static assets
 */
const staticCSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' https://fonts.gstatic.com",
  "connect-src 'self'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  'upgrade-insecure-requests',
].join('; ');

// Cache-Control headers for static assets
const cacheHeaders = [
  {
    // Images - cache for 1 year
    source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif)',
    headers: [
      {
        key: 'Cache-Control',
        value: 'public, max-age=31536000, immutable',
      },
    ],
  },
  {
    // Fonts - cache for 1 year
    source: '/:all*(woff|woff2|ttf|otf|eot)',
    headers: [
      {
        key: 'Cache-Control',
        value: 'public, max-age=31536000, immutable',
      },
    ],
  },
  {
    // JS and CSS bundles (Next.js already handles these with hashed filenames)
    source: '/_next/static/:path*',
    headers: [
      {
        key: 'Cache-Control',
        value: 'public, max-age=31536000, immutable',
      },
      // Add CSP for static assets
      {
        key: 'Content-Security-Policy',
        value: staticCSP,
      },
    ],
  },
  {
    // HTML pages - use stale-while-revalidate
    source: '/:path*',
    headers: [
      {
        key: 'Cache-Control',
        value: 'public, max-age=0, s-maxage=86400, stale-while-revalidate=31536000',
      },
    ],
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Note: 'output: export' removed - incompatible with next-intl middleware
  // For static export, use `next build` without middleware or configure i18n differently

  // Enable strict mode for React
  reactStrictMode: true,

  // Trailing slashes for cleaner URLs
  trailingSlash: true,

  // Image optimization settings - ENABLED for performance
  images: {
    // Allow images from these remote sources
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.kanjona.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.kanjona.com',
        pathname: '/**',
      },
    ],
    // Optimize images with modern formats
    formats: ['image/avif', 'image/webp'],
    // Device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    // Image sizes for thumbnails
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Minimize layout shift
    minimumCacheTTL: 31536000,
  },

  // Security and Cache headers
  async headers() {
    return [
      // Security headers for static assets (not covered by middleware)
      {
        source: '/_next/static/:path*',
        headers: securityHeaders,
      },
      // Security headers for public assets
      {
        source: '/favicon.ico',
        headers: securityHeaders,
      },
      {
        source: '/robots.txt',
        headers: securityHeaders,
      },
      {
        source: '/sitemap.xml',
        headers: securityHeaders,
      },
      // Cache headers for static assets
      ...cacheHeaders,
    ];
  },

  // ESLint configuration for build
  eslint: {
    // Allow builds with warnings (don't fail on warnings)
    ignoreDuringBuilds: false,
  },

  // Environment variables validation
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_ROOT_DOMAIN: process.env.NEXT_PUBLIC_ROOT_DOMAIN,
  },

  // Experimental features for enhanced security
  experimental: {
    // Enable server actions with stricter CSP
    serverActions: {
      bodySizeLimit: '1mb',
    },
  },
};

export default withNextIntl(nextConfig);

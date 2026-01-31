/**
 * API URL detection based on hostname
 *
 * This module infers the API base URL at RUNTIME from the browser's hostname.
 * This allows the same build to work on both dev and prod environments.
 *
 * Examples:
 *   admin.dev.kanjona.com  -> https://api-dev.kanjona.com
 *   admin.kanjona.com      -> https://api.kanjona.com
 *   localhost              -> http://localhost:8080
 */

function inferApiBaseUrlFromHost(host: string): string {
  const normalized = host.trim().toLowerCase();

  // Local development
  if (normalized === 'localhost' || normalized === '127.0.0.1') {
    return 'http://localhost:8080';
  }

  const parts = normalized.split('.').filter(Boolean);
  const devIndex = parts.indexOf('dev');
  const firstLabel = parts[0] || '';

  // Pattern: *.dev.domain.com -> api-dev.domain.com
  if (devIndex !== -1 && devIndex < parts.length - 1) {
    const rootDomain = parts.slice(devIndex + 1).join('.');
    return `https://api-dev.${rootDomain}`;
  }

  // Pattern: *-dev.domain.com or dev-*.domain.com -> api-dev.domain.com
  if (firstLabel.endsWith('-dev') || firstLabel.startsWith('dev-')) {
    const rootDomain = parts.slice(1).join('.');
    if (rootDomain) {
      return `https://api-dev.${rootDomain}`;
    }
  }

  // Production: *.domain.com -> api.domain.com
  if (parts.length >= 2) {
    const rootDomain = parts.slice(1).join('.');
    return `https://api.${rootDomain}`;
  }

  // Fallback to localhost for development
  return 'http://localhost:8080';
}

export function getApiBaseUrl(): string {
  // Always use runtime detection in the browser
  if (typeof window !== 'undefined') {
    return inferApiBaseUrlFromHost(window.location.hostname);
  }

  // SSR fallback - should rarely be used
  return 'https://api.kanjona.com';
}

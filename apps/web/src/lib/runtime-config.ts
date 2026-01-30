const LOCAL_API_FALLBACK = 'http://localhost:8080';

function normalizeHost(host: string): string {
  return host.trim().toLowerCase();
}

function inferApiBaseUrlFromHost(host: string): string {
  const normalized = normalizeHost(host);

  if (normalized === 'localhost' || normalized === '127.0.0.1') {
    return LOCAL_API_FALLBACK;
  }

  const parts = normalized.split('.').filter(Boolean);
  const devIndex = parts.indexOf('dev');

  if (devIndex !== -1 && devIndex < parts.length - 1) {
    const rootDomain = parts.slice(devIndex + 1).join('.');
    return `https://api-dev.${rootDomain}`;
  }

  if (parts.length >= 2) {
    const rootDomain = parts.slice(1).join('.');
    return `https://api.${rootDomain}`;
  }

  return LOCAL_API_FALLBACK;
}

export function getApiBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (explicit && explicit.trim().length > 0) {
    return explicit.trim();
  }

  if (typeof window === 'undefined') {
    return LOCAL_API_FALLBACK;
  }

  return inferApiBaseUrlFromHost(window.location.hostname);
}

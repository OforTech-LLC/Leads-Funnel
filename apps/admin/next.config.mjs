import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvFile(filename) {
  const filePath = path.join(__dirname, filename);
  if (!fs.existsSync(filePath)) return;
  const contents = fs.readFileSync(filePath, 'utf8');

  for (const line of contents.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;

    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

const appEnv = process.env.APP_ENV || process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || 'production';
const envFile = appEnv.startsWith('dev') ? '.env.development' : '.env.production';
loadEnvFile(envFile);
loadEnvFile('.env.local');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Auth and API routes have been moved to the Swift backend
  // Trailing slashes for cleaner URLs
  trailingSlash: true,

  // Disable image optimization for deployment parity
  images: {
    unoptimized: true,
  },

  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_COGNITO_DOMAIN: process.env.NEXT_PUBLIC_COGNITO_DOMAIN,
    NEXT_PUBLIC_COGNITO_CLIENT_ID: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
    NEXT_PUBLIC_COGNITO_REDIRECT_URI: process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI,
    NEXT_PUBLIC_COGNITO_LOGOUT_URI: process.env.NEXT_PUBLIC_COGNITO_LOGOUT_URI,
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
    ];
  },
};

export default nextConfig;

import { HTTP_HEADERS } from './constants.js';

export const BASE_SECURITY_HEADERS = {
  [HTTP_HEADERS.X_CONTENT_TYPE_OPTIONS]: 'nosniff',
  [HTTP_HEADERS.X_FRAME_OPTIONS]: 'DENY',
  [HTTP_HEADERS.CACHE_CONTROL]: 'no-store, no-cache, must-revalidate, private',
} as const;

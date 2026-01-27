/**
 * Shared cursor HMAC signing and verification.
 *
 * All paginated endpoints must use signCursor / verifyCursor to prevent
 * clients from forging or tampering with DynamoDB ExclusiveStartKey tokens.
 */

import { createHmac, timingSafeEqual } from 'crypto';

let _secret: string | null = null;

function getSecret(): string {
  if (!_secret) {
    const secret = process.env.CURSOR_SECRET || process.env.EMAIL_HASH_SALT;
    if (!secret) {
      throw new Error('CURSOR_SECRET or EMAIL_HASH_SALT environment variable must be set');
    }
    _secret = secret;
  }
  return _secret;
}

export function signCursor(data: Record<string, unknown>): string {
  const json = JSON.stringify(data);
  const hmac = createHmac('sha256', getSecret()).update(json).digest('hex');
  const payload = JSON.stringify({ d: data, s: hmac });
  return Buffer.from(payload).toString('base64url');
}

export function verifyCursor(cursor: string): Record<string, unknown> | null {
  try {
    const payload = JSON.parse(Buffer.from(cursor, 'base64url').toString());
    const json = JSON.stringify(payload.d);
    const expected = createHmac('sha256', getSecret()).update(json).digest();
    const actual = Buffer.from(payload.s, 'hex');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    return payload.d;
  } catch {
    return null;
  }
}

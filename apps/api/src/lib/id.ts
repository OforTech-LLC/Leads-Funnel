/**
 * ID Generation Utility
 *
 * Uses a ULID-like monotonic ID: timestamp prefix + random suffix.
 * Sortable by creation time. No external dependency.
 */

const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford Base32

function encodeTime(now: number, len: number): string {
  let str = '';
  for (let i = len; i > 0; i--) {
    const mod = now % 32;
    str = ENCODING[mod] + str;
    now = (now - mod) / 32;
  }
  return str;
}

function encodeRandom(len: number): string {
  let str = '';
  const bytes = new Uint8Array(len);
  // Use Node.js crypto for randomness
  const { randomFillSync } = require('crypto');
  randomFillSync(bytes);
  for (let i = 0; i < len; i++) {
    str += ENCODING[bytes[i] % 32];
  }
  return str;
}

/**
 * Generate a ULID (26 chars): 10 char timestamp + 16 char random.
 * Monotonically sortable, collision resistant.
 */
export function ulid(): string {
  const time = Date.now();
  return encodeTime(time, 10) + encodeRandom(16);
}

/**
 * Shared cursor HMAC signing and verification.
 *
 * All paginated endpoints must use signCursor / verifyCursor to prevent
 * clients from forging or tampering with DynamoDB ExclusiveStartKey tokens.
 *
 * Schema validation (Issue #7):
 *   - Decoded cursor data must be a non-null object with at least one key.
 *   - All values must be strings or numbers (DynamoDB key types).
 *   - Cursors exceeding 2 KB are rejected to prevent abuse.
 *   - Malformed / tampered cursors return null from verifyCursor, and
 *     callers should respond with 400 Bad Request.
 */
import { createHmac, timingSafeEqual } from 'crypto';
let _secret = null;
/** Maximum decoded cursor size in bytes (2 KB). */
const MAX_CURSOR_SIZE = 2048;
function getSecret() {
    if (!_secret) {
        const secret = process.env.CURSOR_SECRET || process.env.EMAIL_HASH_SALT;
        if (!secret) {
            throw new Error('CURSOR_SECRET or EMAIL_HASH_SALT environment variable must be set');
        }
        _secret = secret;
    }
    return _secret;
}
/**
 * Validate that the decoded cursor data conforms to the expected DynamoDB
 * ExclusiveStartKey shape:
 *   - Must be a non-null plain object.
 *   - Must have at least one key (pk, sk, GSI keys).
 *   - All values must be primitive DynamoDB key types (string | number).
 *   - Serialised JSON must not exceed MAX_CURSOR_SIZE bytes.
 */
function isValidCursorData(data, rawJson) {
    if (data === null || typeof data !== 'object' || Array.isArray(data))
        return false;
    const keys = Object.keys(data);
    if (keys.length === 0)
        return false;
    // Size guard: prevent oversized cursor abuse
    if (Buffer.byteLength(rawJson, 'utf8') > MAX_CURSOR_SIZE)
        return false;
    // All values must be strings or numbers (DynamoDB scalar key types)
    for (const key of keys) {
        const val = data[key];
        if (typeof val !== 'string' && typeof val !== 'number')
            return false;
    }
    return true;
}
export function signCursor(data) {
    const json = JSON.stringify(data);
    const hmac = createHmac('sha256', getSecret()).update(json).digest('hex');
    const payload = JSON.stringify({ d: data, s: hmac });
    return Buffer.from(payload).toString('base64url');
}
export function verifyCursor(cursor) {
    try {
        // Reject obviously oversized cursor tokens early (base64 expands ~33%)
        if (cursor.length > MAX_CURSOR_SIZE * 2)
            return null;
        const payload = JSON.parse(Buffer.from(cursor, 'base64url').toString());
        const json = JSON.stringify(payload.d);
        // Schema validation: reject malformed cursor data
        if (!isValidCursorData(payload.d, json))
            return null;
        const expected = createHmac('sha256', getSecret()).update(json).digest();
        const actual = Buffer.from(payload.s, 'hex');
        if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
            return null;
        return payload.d;
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=cursor.js.map
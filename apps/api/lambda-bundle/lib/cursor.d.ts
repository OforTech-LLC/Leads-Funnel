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
export declare function signCursor(data: Record<string, unknown>): string;
export declare function verifyCursor(cursor: string): Record<string, unknown> | null;

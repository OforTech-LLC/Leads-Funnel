/**
 * Admin API Lambda Handler (compat wrapper)
 *
 * Delegates to the unified admin handler in handlers/admin.ts.
 * This prevents drift between the admin module and the main API router.
 */
export { handler } from '../handlers/admin.js';
//# sourceMappingURL=handler.js.map
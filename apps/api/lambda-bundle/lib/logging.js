/**
 * Structured Logging
 *
 * Outputs newline-delimited JSON suitable for CloudWatch Logs Insights.
 * Every log line includes a timestamp, level, module, and optional
 * requestId for correlation.
 *
 * Usage:
 *   import { createLogger } from '../lib/logging.js';
 *   const log = createLogger('assignment-worker');
 *   log.info('Rule matched', { ruleId, leadId });
 */
// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const SAMPLING_RATE = parseFloat(process.env.LOG_SAMPLING_RATE || '1.0');
// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------
function emit(entry) {
    // Write as a single JSON line.  `console.log` adds its own newline and
    // CloudWatch treats each call as a separate event.
    console.log(JSON.stringify(entry));
}
function buildLogger(module, requestId) {
    function write(level, message, data) {
        // Sampling: Always log errors, or if forced, but sample info/warn based on rate
        const forceLog = data?.forceLog === true;
        if (level !== 'error' && !forceLog && Math.random() > SAMPLING_RATE) {
            return;
        }
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            module,
            message,
            ...(requestId ? { requestId } : {}),
            ...data,
        };
        emit(entry);
    }
    return {
        info: (msg, data) => write('info', msg, data),
        warn: (msg, data) => write('warn', msg, data),
        error: (msg, data) => write('error', msg, data),
        child: (rid) => buildLogger(module, rid),
    };
}
/**
 * Create a logger scoped to a specific module (e.g. handler name, worker name).
 *
 * @param module Identifier included on every log line for filtering.
 */
export function createLogger(module) {
    return buildLogger(module);
}
//# sourceMappingURL=logging.js.map
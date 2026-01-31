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
export type LogLevel = 'info' | 'warn' | 'error';
export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    module: string;
    message: string;
    requestId?: string;
    [key: string]: unknown;
}
export interface Logger {
    info(message: string, data?: Record<string, unknown>): void;
    warn(message: string, data?: Record<string, unknown>): void;
    error(message: string, data?: Record<string, unknown>): void;
    /** Return a child logger that includes a requestId on every line. */
    child(requestId: string): Logger;
}
/**
 * Create a logger scoped to a specific module (e.g. handler name, worker name).
 *
 * @param module Identifier included on every log line for filtering.
 */
export declare function createLogger(module: string): Logger;

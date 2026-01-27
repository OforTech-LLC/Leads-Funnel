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
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

function emit(entry: LogEntry): void {
  // Write as a single JSON line.  `console.log` adds its own newline and
  // CloudWatch treats each call as a separate event.
  console.log(JSON.stringify(entry));
}

function buildLogger(module: string, requestId?: string): Logger {
  function write(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    const entry: LogEntry = {
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
    child: (rid: string) => buildLogger(module, rid),
  };
}

/**
 * Create a logger scoped to a specific module (e.g. handler name, worker name).
 *
 * @param module Identifier included on every log line for filtering.
 */
export function createLogger(module: string): Logger {
  return buildLogger(module);
}

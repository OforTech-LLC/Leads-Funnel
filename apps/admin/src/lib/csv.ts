/**
 * CSV Utilities
 *
 * Provides safe CSV value escaping to prevent CSV injection attacks.
 * Any value starting with =, +, -, @, \t, or \r is prefixed with a
 * single-quote to neutralize formula execution in spreadsheet software.
 */

/**
 * Escape a CSV value to prevent formula injection.
 * Wraps in double quotes and escapes existing double quotes.
 * Prefixes dangerous leading characters with a single quote.
 */
export function escapeCsvValue(value: string): string {
  // Escape existing double quotes
  const escaped = value.replace(/"/g, '""');
  // Prevent CSV injection - prefix dangerous characters
  const dangerous = /^[=+\-@\t\r]/;
  const safe = dangerous.test(escaped) ? `'${escaped}` : escaped;
  return `"${safe}"`;
}

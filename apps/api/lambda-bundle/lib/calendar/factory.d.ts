/**
 * Calendar Provider Factory
 *
 * Returns the appropriate calendar provider instance based on type.
 */
import type { CalendarProviderInterface } from './provider.js';
import type { CalendarProvider, CalendarConfig } from './types.js';
/**
 * Create a calendar provider instance based on the config.
 *
 * @param config - Stored calendar configuration for a user
 * @returns Provider instance ready for API calls
 * @throws Error if provider type is unsupported
 */
export declare function createCalendarProvider(config: CalendarConfig): CalendarProviderInterface;
/**
 * Get the list of supported calendar providers.
 */
export declare function getSupportedProviders(): CalendarProvider[];

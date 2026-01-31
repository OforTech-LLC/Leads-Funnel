/**
 * Calendar Provider Factory
 *
 * Returns the appropriate calendar provider instance based on type.
 */
import { GoogleCalendarProvider } from './google.js';
import { OutlookCalendarProvider } from './outlook.js';
import { AppleCalendarProvider } from './apple.js';
import { CalDavProvider } from './caldav.js';
/**
 * Create a calendar provider instance based on the config.
 *
 * @param config - Stored calendar configuration for a user
 * @returns Provider instance ready for API calls
 * @throws Error if provider type is unsupported
 */
export function createCalendarProvider(config) {
    switch (config.provider) {
        case 'google':
            return new GoogleCalendarProvider(config.accessToken || '', config.calendarId || 'primary');
        case 'outlook':
            return new OutlookCalendarProvider(config.accessToken || '');
        case 'apple':
            return new AppleCalendarProvider(config.caldavUrl || 'https://caldav.icloud.com', '', // username would come from stored credentials
            '' // password would come from stored credentials
            );
        case 'caldav':
            return new CalDavProvider(config.caldavUrl || '', '', // username from stored credentials
            '' // password from stored credentials
            );
        default: {
            const _exhaustive = config.provider;
            throw new Error(`Unsupported calendar provider: ${config.provider}`);
        }
    }
}
/**
 * Get the list of supported calendar providers.
 */
export function getSupportedProviders() {
    return ['google', 'outlook', 'apple', 'caldav'];
}
//# sourceMappingURL=factory.js.map
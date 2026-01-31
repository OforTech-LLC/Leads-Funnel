/**
 * Apple Calendar Provider Stub (CalDAV-based)
 *
 * Apple Calendar uses CalDAV as its protocol. This stub
 * delegates to the generic CalDAV provider.
 */
import { CalDavProvider } from './caldav.js';
import { createLogger } from '../logging.js';
const log = createLogger('calendar-apple');
export class AppleCalendarProvider {
    caldav;
    constructor(caldavUrl, username, password) {
        // Apple Calendar uses CalDAV at caldav.icloud.com
        this.caldav = new CalDavProvider(caldavUrl || 'https://caldav.icloud.com', username, password);
    }
    async createEvent(event) {
        log.info('apple.calendar.createEvent.stub', { title: event.title });
        return this.caldav.createEvent(event);
    }
    async updateEvent(eventId, event) {
        log.info('apple.calendar.updateEvent.stub', { eventId });
        return this.caldav.updateEvent(eventId, event);
    }
    async deleteEvent(eventId) {
        log.info('apple.calendar.deleteEvent.stub', { eventId });
        return this.caldav.deleteEvent(eventId);
    }
    async getAvailability(start, end) {
        log.info('apple.calendar.getAvailability.stub', {
            start: start.toISOString(),
            end: end.toISOString(),
        });
        return this.caldav.getAvailability(start, end);
    }
}
//# sourceMappingURL=apple.js.map
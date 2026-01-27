/**
 * Apple Calendar Provider Stub (CalDAV-based)
 *
 * Apple Calendar uses CalDAV as its protocol. This stub
 * delegates to the generic CalDAV provider.
 */

import type { CalendarProviderInterface } from './provider.js';
import type { CalendarEvent, TimeSlot } from './types.js';
import { CalDavProvider } from './caldav.js';
import { createLogger } from '../logging.js';

const log = createLogger('calendar-apple');

export class AppleCalendarProvider implements CalendarProviderInterface {
  private caldav: CalDavProvider;

  constructor(caldavUrl: string, username: string, password: string) {
    // Apple Calendar uses CalDAV at caldav.icloud.com
    this.caldav = new CalDavProvider(caldavUrl || 'https://caldav.icloud.com', username, password);
  }

  async createEvent(event: CalendarEvent): Promise<string> {
    log.info('apple.calendar.createEvent.stub', { title: event.title });
    return this.caldav.createEvent(event);
  }

  async updateEvent(eventId: string, event: Partial<CalendarEvent>): Promise<void> {
    log.info('apple.calendar.updateEvent.stub', { eventId });
    return this.caldav.updateEvent(eventId, event);
  }

  async deleteEvent(eventId: string): Promise<void> {
    log.info('apple.calendar.deleteEvent.stub', { eventId });
    return this.caldav.deleteEvent(eventId);
  }

  async getAvailability(start: Date, end: Date): Promise<TimeSlot[]> {
    log.info('apple.calendar.getAvailability.stub', {
      start: start.toISOString(),
      end: end.toISOString(),
    });
    return this.caldav.getAvailability(start, end);
  }
}

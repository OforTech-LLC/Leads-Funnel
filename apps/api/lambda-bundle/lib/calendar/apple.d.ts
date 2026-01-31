/**
 * Apple Calendar Provider Stub (CalDAV-based)
 *
 * Apple Calendar uses CalDAV as its protocol. This stub
 * delegates to the generic CalDAV provider.
 */
import type { CalendarProviderInterface } from './provider.js';
import type { CalendarEvent, TimeSlot } from './types.js';
export declare class AppleCalendarProvider implements CalendarProviderInterface {
    private caldav;
    constructor(caldavUrl: string, username: string, password: string);
    createEvent(event: CalendarEvent): Promise<string>;
    updateEvent(eventId: string, event: Partial<CalendarEvent>): Promise<void>;
    deleteEvent(eventId: string): Promise<void>;
    getAvailability(start: Date, end: Date): Promise<TimeSlot[]>;
}

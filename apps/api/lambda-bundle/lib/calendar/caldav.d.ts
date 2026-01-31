/**
 * Generic CalDAV Calendar Provider Stub
 *
 * Covers any standard CalDAV-compatible calendar server.
 * Replace with actual CalDAV protocol implementation when ready.
 */
import type { CalendarProviderInterface } from './provider.js';
import type { CalendarEvent, TimeSlot } from './types.js';
export declare class CalDavProvider implements CalendarProviderInterface {
    private url;
    private username;
    private password;
    constructor(url: string, username: string, password: string);
    createEvent(event: CalendarEvent): Promise<string>;
    updateEvent(eventId: string, _event: Partial<CalendarEvent>): Promise<void>;
    deleteEvent(eventId: string): Promise<void>;
    getAvailability(start: Date, end: Date): Promise<TimeSlot[]>;
}

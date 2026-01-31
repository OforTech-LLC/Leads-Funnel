/**
 * Google Calendar Provider Stub
 *
 * Implements the CalendarProviderInterface with stub/mock behaviour.
 * Replace with actual Google Calendar API calls when ready.
 */
import type { CalendarProviderInterface } from './provider.js';
import type { CalendarEvent, TimeSlot } from './types.js';
export declare class GoogleCalendarProvider implements CalendarProviderInterface {
    private accessToken;
    private calendarId;
    constructor(accessToken: string, calendarId?: string);
    createEvent(event: CalendarEvent): Promise<string>;
    updateEvent(eventId: string, event: Partial<CalendarEvent>): Promise<void>;
    deleteEvent(eventId: string): Promise<void>;
    getAvailability(start: Date, end: Date): Promise<TimeSlot[]>;
}

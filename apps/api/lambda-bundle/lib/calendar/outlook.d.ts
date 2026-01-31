/**
 * Outlook/Microsoft Calendar Provider Stub
 *
 * Implements the CalendarProviderInterface with stub/mock behaviour.
 * Replace with actual Microsoft Graph API calls when ready.
 */
import type { CalendarProviderInterface } from './provider.js';
import type { CalendarEvent, TimeSlot } from './types.js';
export declare class OutlookCalendarProvider implements CalendarProviderInterface {
    private accessToken;
    constructor(accessToken: string);
    createEvent(event: CalendarEvent): Promise<string>;
    updateEvent(eventId: string, _event: Partial<CalendarEvent>): Promise<void>;
    deleteEvent(eventId: string): Promise<void>;
    getAvailability(start: Date, end: Date): Promise<TimeSlot[]>;
}

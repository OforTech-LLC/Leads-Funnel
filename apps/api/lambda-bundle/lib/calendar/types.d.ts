/**
 * Calendar Integration Types
 *
 * Behind feature flag: calendar_enabled (OFF by default)
 */
export type CalendarProvider = 'google' | 'outlook' | 'apple' | 'caldav';
export interface CalendarEvent {
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    location?: string;
    attendees?: CalendarAttendee[];
    reminders?: CalendarReminder[];
    metadata?: Record<string, string>;
}
export interface CalendarAttendee {
    email: string;
    name?: string;
    optional?: boolean;
}
export interface CalendarReminder {
    minutesBefore: number;
    method: 'email' | 'popup';
}
export interface TimeSlot {
    start: Date;
    end: Date;
    available: boolean;
}
export interface CalendarConfig {
    pk: string;
    sk: string;
    userId: string;
    orgId: string;
    provider: CalendarProvider;
    accessToken?: string;
    refreshToken?: string;
    calendarId?: string;
    caldavUrl?: string;
    connected: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface BookingInput {
    leadId: string;
    funnelId: string;
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    attendeeEmail?: string;
    attendeeName?: string;
}
export interface BookingResult {
    eventId: string;
    provider: CalendarProvider;
    startTime: string;
    endTime: string;
    title: string;
}

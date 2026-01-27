/**
 * Calendar Integration Types
 *
 * Behind feature flag: calendar_enabled (OFF by default)
 */

// ---------------------------------------------------------------------------
// Provider Types
// ---------------------------------------------------------------------------

export type CalendarProvider = 'google' | 'outlook' | 'apple' | 'caldav';

// ---------------------------------------------------------------------------
// Calendar Event
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Time Slots (Availability)
// ---------------------------------------------------------------------------

export interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
}

// ---------------------------------------------------------------------------
// Calendar Configuration (stored in DynamoDB)
// ---------------------------------------------------------------------------

export interface CalendarConfig {
  pk: string; // CALENDAR#<userId>
  sk: string; // CONFIG
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

// ---------------------------------------------------------------------------
// Booking
// ---------------------------------------------------------------------------

export interface BookingInput {
  leadId: string;
  funnelId: string;
  title: string;
  description?: string;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
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

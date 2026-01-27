export const CALENDAR_PROVIDERS = ['google', 'outlook', 'apple', 'caldav'] as const;
export type CalendarProvider = (typeof CALENDAR_PROVIDERS)[number];

export interface CalendarConfig {
  orgId: string;
  provider: CalendarProvider;
  connected: boolean;
  lastSync?: string;
  calendarId?: string;
}

export interface TimeSlot {
  start: string; // ISO
  end: string; // ISO
  available: boolean;
}

export interface CalendarEvent {
  id?: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  attendees?: string[];
  location?: string;
  leadId?: string;
}

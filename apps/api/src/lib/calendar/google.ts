/**
 * Google Calendar Provider Stub
 *
 * Implements the CalendarProviderInterface with stub/mock behaviour.
 * Replace with actual Google Calendar API calls when ready.
 */

import type { CalendarProviderInterface } from './provider.js';
import type { CalendarEvent, TimeSlot } from './types.js';
import { createLogger } from '../logging.js';

const log = createLogger('calendar-google');

export class GoogleCalendarProvider implements CalendarProviderInterface {
  private accessToken: string;
  private calendarId: string;

  constructor(accessToken: string, calendarId = 'primary') {
    this.accessToken = accessToken;
    this.calendarId = calendarId;
  }

  async createEvent(event: CalendarEvent): Promise<string> {
    log.info('google.calendar.createEvent.stub', {
      title: event.title,
      start: event.startTime.toISOString(),
    });

    // Stub: return a mock event ID
    return `gcal_evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  async updateEvent(eventId: string, event: Partial<CalendarEvent>): Promise<void> {
    log.info('google.calendar.updateEvent.stub', { eventId });
    // Stub: no-op
  }

  async deleteEvent(eventId: string): Promise<void> {
    log.info('google.calendar.deleteEvent.stub', { eventId });
    // Stub: no-op
  }

  async getAvailability(start: Date, end: Date): Promise<TimeSlot[]> {
    log.info('google.calendar.getAvailability.stub', {
      start: start.toISOString(),
      end: end.toISOString(),
    });

    // Stub: return working hours slots for each day in range
    const slots: TimeSlot[] = [];
    const current = new Date(start);

    while (current < end) {
      // Skip weekends
      const dayOfWeek = current.getUTCDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        // 9 AM - 5 PM slots in 30-minute increments
        for (let hour = 9; hour < 17; hour++) {
          for (let min = 0; min < 60; min += 30) {
            const slotStart = new Date(current);
            slotStart.setUTCHours(hour, min, 0, 0);
            const slotEnd = new Date(slotStart);
            slotEnd.setUTCMinutes(slotEnd.getUTCMinutes() + 30);

            if (slotStart >= start && slotEnd <= end) {
              slots.push({
                start: slotStart,
                end: slotEnd,
                available: true,
              });
            }
          }
        }
      }
      current.setUTCDate(current.getUTCDate() + 1);
      current.setUTCHours(0, 0, 0, 0);
    }

    return slots;
  }
}

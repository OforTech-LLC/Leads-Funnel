/**
 * Abstract Calendar Provider Interface
 *
 * All calendar integrations (Google, Outlook, Apple, CalDAV) implement
 * this interface. When calendar_enabled is off, stubs return mock data.
 */

import type { CalendarEvent, TimeSlot } from './types.js';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface CalendarProviderInterface {
  /**
   * Create a calendar event and return the external event ID.
   */
  createEvent(event: CalendarEvent): Promise<string>;

  /**
   * Update an existing calendar event.
   */
  updateEvent(eventId: string, event: Partial<CalendarEvent>): Promise<void>;

  /**
   * Delete a calendar event by its external ID.
   */
  deleteEvent(eventId: string): Promise<void>;

  /**
   * Get availability slots within a date range.
   */
  getAvailability(start: Date, end: Date): Promise<TimeSlot[]>;
}

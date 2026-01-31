/**
 * Outlook/Microsoft Calendar Provider Stub
 *
 * Implements the CalendarProviderInterface with stub/mock behaviour.
 * Replace with actual Microsoft Graph API calls when ready.
 */
import { createLogger } from '../logging.js';
const log = createLogger('calendar-outlook');
export class OutlookCalendarProvider {
    accessToken;
    constructor(accessToken) {
        this.accessToken = accessToken;
    }
    async createEvent(event) {
        log.info('outlook.calendar.createEvent.stub', {
            title: event.title,
            start: event.startTime.toISOString(),
        });
        return `outlook_evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }
    async updateEvent(eventId, _event) {
        log.info('outlook.calendar.updateEvent.stub', { eventId });
    }
    async deleteEvent(eventId) {
        log.info('outlook.calendar.deleteEvent.stub', { eventId });
    }
    async getAvailability(start, end) {
        log.info('outlook.calendar.getAvailability.stub', {
            start: start.toISOString(),
            end: end.toISOString(),
        });
        const slots = [];
        const current = new Date(start);
        while (current < end) {
            const dayOfWeek = current.getUTCDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                for (let hour = 9; hour < 17; hour++) {
                    for (let min = 0; min < 60; min += 30) {
                        const slotStart = new Date(current);
                        slotStart.setUTCHours(hour, min, 0, 0);
                        const slotEnd = new Date(slotStart);
                        slotEnd.setUTCMinutes(slotEnd.getUTCMinutes() + 30);
                        if (slotStart >= start && slotEnd <= end) {
                            slots.push({ start: slotStart, end: slotEnd, available: true });
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
//# sourceMappingURL=outlook.js.map
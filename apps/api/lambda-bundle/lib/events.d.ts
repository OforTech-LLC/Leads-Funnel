/**
 * EventBridge event publishing for lead events
 *
 * Publishes lead lifecycle events to EventBridge:
 * - lead.created: Published when a new lead is captured
 * - lead.assigned: Published when a lead is matched to an org/user
 * - lead.unassigned: Published when a lead cannot be matched
 *
 * Also dispatches webhook events when the webhooks_enabled flag is on.
 *
 * Performance: Uses the centralized EventBridge client from clients.ts
 * which has HTTP keep-alive enabled for connection reuse across requests.
 */
import type { EnvConfig, LeadRecord, SecurityAnalysis } from '../types.js';
import type { LeadAssignedEventDetail } from './types/events.js';
/**
 * Publish lead.created event to EventBridge
 */
export declare function publishLeadCreatedEvent(config: EnvConfig, lead: LeadRecord, security: SecurityAnalysis): Promise<void>;
/**
 * Publish lead.assigned event to EventBridge.
 *
 * Emitted when the assignment worker successfully matches a lead to an
 * organization (and optionally a specific user) via an assignment rule.
 *
 * @param region - AWS region
 * @param eventBusName - EventBridge bus name
 * @param detail - Assignment event detail including lead, org, and rule IDs
 */
export declare function emitLeadAssigned(region: string, eventBusName: string, detail: LeadAssignedEventDetail): Promise<void>;
/**
 * Publish lead.unassigned event to EventBridge.
 *
 * Emitted when the assignment worker cannot match a lead to any assignment
 * rule. Includes the reason for the failure (e.g., no matching rule,
 * all caps exceeded, no active targets).
 *
 * @param region - AWS region
 * @param eventBusName - EventBridge bus name
 * @param leadId - The unmatched lead ID
 * @param funnelId - The lead's funnel ID
 * @param zipCode - The lead's ZIP code (if available)
 * @param reason - Human-readable reason for non-assignment
 */
export declare function emitLeadUnassigned(region: string, eventBusName: string, leadId: string, funnelId: string, zipCode: string | undefined, reason: string): Promise<void>;
/**
 * Fire a webhook for lead status change events.
 * Called from admin/portal handlers when a lead status is updated.
 */
export declare function emitLeadStatusChanged(data: {
    leadId: string;
    funnelId: string;
    oldStatus: string;
    newStatus: string;
    changedBy: string;
}): Promise<void>;
/**
 * Fire a webhook for lead note added events.
 * Called from portal handler when a note is added to a lead.
 */
export declare function emitLeadNoteAdded(data: {
    leadId: string;
    funnelId: string;
    addedBy: string;
}): Promise<void>;

/**
 * Domain event types for the lead lifecycle event bus.
 * These events are published when leads are created, assigned, or unassigned.
 */

export interface LeadCreatedEvent {
  eventType: 'lead.created';
  leadId: string;
  funnelId: string;
  zipCode: string;
  emailHash: string;
  createdAt: string;
}

export interface LeadAssignedEvent {
  eventType: 'lead.assigned';
  leadId: string;
  funnelId: string;
  assignedOrgId: string;
  assignedUserId?: string;
  assignmentRuleId: string;
  assignedAt: string;
}

export interface LeadUnassignedEvent {
  eventType: 'lead.unassigned';
  leadId: string;
  funnelId: string;
  zipCode: string;
  reason: 'no_matching_rule' | 'all_targets_capped' | 'target_inactive';
  createdAt: string;
}

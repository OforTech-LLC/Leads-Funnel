/**
 * Organization types for the Kanjona 3-sided platform.
 * Organizations represent businesses (buyers) that receive leads.
 */

export type OrgType = 'INDIVIDUAL' | 'COMPANY' | 'GROUP';
export type OrgStatus = 'active' | 'inactive';
export type LeadVisibilityPolicy = 'assigned_only' | 'org_all';

export interface Org {
  orgId: string;
  orgType: OrgType;
  name: string;
  email?: string;
  phone?: string;
  status: OrgStatus;
  leadVisibilityPolicy: LeadVisibilityPolicy;
  createdAt: string;
  lastUpdatedAt: string;
  deletedAt?: string;
}

export interface CreateOrgInput {
  orgType: OrgType;
  name: string;
  email?: string;
  phone?: string;
  leadVisibilityPolicy?: LeadVisibilityPolicy;
}

export interface UpdateOrgInput {
  name?: string;
  email?: string;
  phone?: string;
  status?: OrgStatus;
  leadVisibilityPolicy?: LeadVisibilityPolicy;
}

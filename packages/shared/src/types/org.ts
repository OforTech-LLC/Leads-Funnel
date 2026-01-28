/**
 * Organization types for the Kanjona 3-sided platform.
 * Organizations represent businesses (buyers) that receive leads.
 */

/**
 * Const enum-like object for organization types.
 * Use `OrgTypeEnum.COMPANY` instead of hardcoding `'COMPANY'`.
 */
export const OrgTypeEnum = {
  INDIVIDUAL: 'INDIVIDUAL',
  COMPANY: 'COMPANY',
  GROUP: 'GROUP',
} as const;

export type OrgType = (typeof OrgTypeEnum)[keyof typeof OrgTypeEnum];

/**
 * Const enum-like object for organization statuses.
 * Use `OrgStatusEnum.ACTIVE` instead of hardcoding `'active'`.
 */
export const OrgStatusEnum = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;

export type OrgStatus = (typeof OrgStatusEnum)[keyof typeof OrgStatusEnum];

/**
 * Const enum-like object for lead visibility policies.
 * Use `LeadVisibilityPolicyEnum.ASSIGNED_ONLY` instead of hardcoding `'assigned_only'`.
 */
export const LeadVisibilityPolicyEnum = {
  ASSIGNED_ONLY: 'assigned_only',
  ORG_ALL: 'org_all',
} as const;

export type LeadVisibilityPolicy =
  (typeof LeadVisibilityPolicyEnum)[keyof typeof LeadVisibilityPolicyEnum];

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

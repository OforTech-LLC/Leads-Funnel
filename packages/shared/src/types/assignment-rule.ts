/**
 * Assignment rule types for routing leads to organizations or users
 * based on funnel, geography, and capacity constraints.
 */

export type TargetType = 'ORG' | 'USER';

export interface AssignmentRule {
  ruleId: string;
  name: string;
  active: boolean;
  priority: number;
  funnelIds: string[] | '*';
  zipPatterns: string[];
  states?: string[];
  cities?: string[];
  targetType: TargetType;
  targetId: string;
  dailyCap?: number;
  monthlyCap?: number;
  createdAt: string;
  lastUpdatedAt: string;
  deletedAt?: string;
}

export interface CreateRuleInput {
  name: string;
  priority: number;
  funnelIds: string[] | '*';
  zipPatterns: string[];
  states?: string[];
  cities?: string[];
  targetType: TargetType;
  targetId: string;
  dailyCap?: number;
  monthlyCap?: number;
}

export interface UpdateRuleInput {
  name?: string;
  active?: boolean;
  priority?: number;
  funnelIds?: string[] | '*';
  zipPatterns?: string[];
  states?: string[];
  cities?: string[];
  targetType?: TargetType;
  targetId?: string;
  dailyCap?: number;
  monthlyCap?: number;
}

export interface RuleTestInput {
  funnelId: string;
  zipCode: string;
}

export interface RuleTestResult {
  matched: boolean;
  rule?: AssignmentRule;
  targetType?: TargetType;
  targetId?: string;
  targetName?: string;
}

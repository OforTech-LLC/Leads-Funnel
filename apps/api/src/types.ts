/**
 * Internal types for the Lead Capture API Lambda
 * Request/response types are imported from @kanjona/shared
 */

import type { LeadInput, LeadUtm } from '@kanjona/shared';

// =============================================================================
// Environment Configuration
// =============================================================================

export interface EnvConfig {
  awsRegion: string;
  env: 'dev' | 'prod';
  ddbTableName: string;
  eventBusName: string;
  rateLimitMax: number;
  rateLimitWindowMin: number;
  idempotencyTtlHours: number;
  ipHashSalt: string;
}

// =============================================================================
// DynamoDB Record Types
// =============================================================================

/**
 * Lead META record in DynamoDB
 */
export interface LeadRecord {
  pk: string;
  sk: string;
  leadId: string;
  name: string;
  email: string;
  phone?: string;
  message?: string;
  createdAt: string;
  status: 'accepted' | 'quarantined';
  pageUrl?: string;
  referrer?: string;
  utm?: LeadUtm;
  userAgent?: string;
  ipHash: string;
  gsi1pk: string;
  gsi1sk: string;
  analysis?: LeadAnalysis;
}

/**
 * AI Analysis result
 */
export interface LeadAnalysis {
  urgency: 'high' | 'medium' | 'low';
  intent: 'info_gathering' | 'ready_to_buy' | 'complaint' | 'other';
  language: string;
  summary: string;
}

/**
 * Rate limit control record
 */
export interface RateLimitRecord {
  pk: string;
  sk: string;
  count: number;
  ttl: number;
}

/**
 * Idempotency record
 */
export interface IdempotencyRecord {
  pk: string;
  sk: string;
  leadId: string;
  status: 'accepted' | 'quarantined';
  ttl: number;
}

// =============================================================================
// Internal Processing Types
// =============================================================================

/**
 * Normalized and validated lead data
 */
export interface NormalizedLead {
  name: string;
  email: string;
  phone?: string;
  message?: string;
  pageUrl?: string;
  referrer?: string;
  utm?: LeadUtm;
}

/**
 * Security analysis result
 */
export interface SecurityAnalysis {
  suspicious: boolean;
  reasons: string[];
  ipHash: string;
  emailHash: string;
  idempotencyKey: string;
}

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  maxAllowed: number;
}

/**
 * Idempotency check result
 */
export interface IdempotencyResult {
  isDuplicate: boolean;
  existingLeadId?: string;
  existingStatus?: 'accepted' | 'quarantined';
}

/**
 * EventBridge event detail
 */
export interface LeadCreatedEventDetail {
  leadId: string;
  createdAt: string;
  status: 'accepted' | 'quarantined';
  suspicious: boolean;
  reasons: string[];
}

// =============================================================================
// HTTP Types
// =============================================================================

/**
 * Structured log entry
 */
export interface LogEntry {
  timestamp: string;
  requestId: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  leadId?: string;
  status?: string;
  suspicious?: boolean;
  reasons?: string[];
  latencyMs?: number;
  emailHash?: string;
  ipHash?: string;
  errorCode?: string;
}

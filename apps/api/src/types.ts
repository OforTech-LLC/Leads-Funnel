/**
 * Internal types for the Lead Capture API Lambda
 * Request/response types are imported from @kanjona/shared
 */

import type { LeadInput, LeadUtm } from '@kanjona/shared';
import type { EvidencePack } from './lib/types/evidence.js';

// =============================================================================
// Environment Configuration
// =============================================================================

export interface EnvConfig {
  awsRegion: string;
  env: 'dev' | 'prod';
  projectName: string;
  rateLimitsTableName: string;
  idempotencyTableName: string;
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
 * Extended to support all funnel types
 */
export interface LeadRecord {
  // DynamoDB keys
  pk: string;
  sk: string;
  gsi1pk: string;
  gsi1sk: string;

  // Core fields
  leadId: string;
  funnelId: string;
  name: string;
  email: string;
  phone?: string;
  message?: string;
  firstName?: string;
  lastName?: string;
  createdAt: string;
  status: 'accepted' | 'quarantined';

  // Tracking
  pageUrl?: string;
  referrer?: string;
  utm?: LeadUtm;
  userAgent?: string;
  ipHash: string;

  // Extended fields - stored as JSON
  address?: import('@kanjona/shared').LeadAddress;
  property?: import('@kanjona/shared').LeadProperty;
  vehicle?: import('@kanjona/shared').LeadVehicle;
  business?: import('@kanjona/shared').LeadBusiness;
  healthcare?: import('@kanjona/shared').LeadHealthcare;
  legal?: import('@kanjona/shared').LeadLegal;
  financial?: import('@kanjona/shared').LeadFinancial;
  project?: import('@kanjona/shared').LeadProject;
  contactPreferences?: import('@kanjona/shared').LeadContactPreferences;
  scheduling?: import('@kanjona/shared').LeadScheduling;
  customFields?: Record<string, string>;
  tags?: string[];

  // AI/scoring
  analysis?: LeadAnalysis;
  score?: number;
  evidencePack?: EvidencePack;
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
 * Extended to support all funnel types
 */
export interface NormalizedLead {
  // Core fields
  funnelId: string;
  name: string;
  email: string;
  phone?: string;
  message?: string;
  firstName?: string;
  lastName?: string;

  // Tracking
  pageUrl?: string;
  referrer?: string;
  utm?: LeadUtm;
  metadata?: import('@kanjona/shared').LeadMetadata;
  consent?: import('@kanjona/shared').LeadConsentInput;

  // Extended fields - stored as JSON in DynamoDB
  // These are imported from @kanjona/shared but kept optional for backward compatibility
  address?: import('@kanjona/shared').LeadAddress;
  property?: import('@kanjona/shared').LeadProperty;
  vehicle?: import('@kanjona/shared').LeadVehicle;
  business?: import('@kanjona/shared').LeadBusiness;
  healthcare?: import('@kanjona/shared').LeadHealthcare;
  legal?: import('@kanjona/shared').LeadLegal;
  financial?: import('@kanjona/shared').LeadFinancial;
  project?: import('@kanjona/shared').LeadProject;
  contactPreferences?: import('@kanjona/shared').LeadContactPreferences;
  scheduling?: import('@kanjona/shared').LeadScheduling;
  customFields?: Record<string, string>;
  tags?: string[];
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
  funnelId: string;
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

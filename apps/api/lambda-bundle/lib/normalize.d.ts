/**
 * Normalization utilities for lead data
 */
import type { LeadRequestPayload } from '@kanjona/shared';
import type { NormalizedLead } from '../types.js';
/**
 * Normalize the entire lead payload
 * Supports all extended fields for comprehensive funnel coverage
 */
export declare function normalizeLead(payload: LeadRequestPayload): NormalizedLead;

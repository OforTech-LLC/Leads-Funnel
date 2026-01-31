/**
 * AI Lead Analyzer
 *
 * Uses an LLM to analyze lead content for urgency, intent, and language.
 * Falls back to heuristic analysis if the LLM is disabled or unavailable.
 */
import type { LeadAnalysis } from '../../types';
/**
 * Analyze a lead's content to determine urgency and intent.
 *
 * @param text - The full text content of the lead (message, notes, etc.)
 * @returns Analysis result or null if feature is disabled or analysis fails
 */
export declare function analyzeLead(text: string): Promise<LeadAnalysis | null>;

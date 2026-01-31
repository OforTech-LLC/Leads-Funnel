/**
 * Lead Analyzer Worker
 *
 * Triggered by EventBridge 'Lead Created' events.
 * Performs AI analysis on the lead content and updates the lead record.
 */
import type { EventBridgeEvent } from 'aws-lambda';
import type { LeadCreatedEventDetail } from '../types.js';
export declare function handler(event: EventBridgeEvent<'Lead Created', LeadCreatedEventDetail>): Promise<void>;

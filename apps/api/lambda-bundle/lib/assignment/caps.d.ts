/**
 * Assignment Rule Cap Tracking
 *
 * Tracks daily and monthly assignment caps using DynamoDB atomic counters.
 * Each cap check atomically increments the counter and checks if the cap
 * has been exceeded in a single conditional update operation.
 *
 * Key schema:
 *   pk: RULE#{ruleId}#CAP#DAILY#2024-01-15    (daily cap counter)
 *   sk: COUNTER
 *   pk: RULE#{ruleId}#CAP#MONTHLY#2024-01     (monthly cap counter)
 *   sk: COUNTER
 *
 * TTL is set so expired counters are automatically cleaned up.
 */
import type { CapCheckResult } from '../types/events.js';
/**
 * Check and increment daily and monthly caps for an assignment rule.
 *
 * Both caps are checked atomically. If the daily cap is exceeded, the monthly
 * cap is not checked. If the monthly cap is exceeded after the daily cap passes,
 * the daily counter is rolled back.
 *
 * @param tableName - DynamoDB table name
 * @param region - AWS region
 * @param ruleId - The assignment rule ID
 * @param dailyCap - Maximum daily assignments (undefined = no limit)
 * @param monthlyCap - Maximum monthly assignments (undefined = no limit)
 * @returns Whether the assignment is allowed and optional rejection reason
 */
export declare function checkAndIncrementCap(tableName: string, region: string, ruleId: string, dailyCap?: number, monthlyCap?: number): Promise<CapCheckResult>;

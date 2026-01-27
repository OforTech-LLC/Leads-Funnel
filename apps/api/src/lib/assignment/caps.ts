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

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { CapCheckResult } from '../../workers/types.js';

// =============================================================================
// DynamoDB Client (reused across invocations)
// =============================================================================

let docClient: DynamoDBDocumentClient | null = null;

function getDocClient(region: string): DynamoDBDocumentClient {
  if (!docClient) {
    const client = new DynamoDBClient({ region });
    docClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: {
        removeUndefinedValues: true,
      },
    });
  }
  return docClient;
}

// =============================================================================
// Date Helpers
// =============================================================================

/**
 * Get today's date key in YYYY-MM-DD format (UTC)
 */
function getDailyKey(): string {
  const now = new Date();
  return now.toISOString().slice(0, 10); // "2024-01-15"
}

/**
 * Get current month key in YYYY-MM format (UTC)
 */
function getMonthlyKey(): string {
  const now = new Date();
  return now.toISOString().slice(0, 7); // "2024-01"
}

/**
 * Get TTL for daily cap counter (expires at end of next day UTC)
 */
function getDailyTtl(): number {
  const now = new Date();
  const tomorrow = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 2, // day after tomorrow for safety buffer
      0,
      0,
      0
    )
  );
  return Math.floor(tomorrow.getTime() / 1000);
}

/**
 * Get TTL for monthly cap counter (expires at end of next month)
 */
function getMonthlyTtl(): number {
  const now = new Date();
  // First day of two months from now
  const futureMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 2, 1, 0, 0, 0));
  return Math.floor(futureMonth.getTime() / 1000);
}

// =============================================================================
// Cap Checking with Atomic Increment
// =============================================================================

/**
 * Atomically check and increment a cap counter.
 *
 * Uses a conditional UpdateItem that increments the counter only if
 * the new value does not exceed the cap. If the condition fails,
 * the cap has been reached.
 *
 * @param tableName - DynamoDB table name
 * @param region - AWS region
 * @param pk - Partition key for the counter record
 * @param cap - Maximum allowed value
 * @param ttl - TTL epoch seconds for cleanup
 * @returns Whether the increment was allowed
 */
async function atomicCapCheck(
  tableName: string,
  region: string,
  pk: string,
  cap: number,
  ttl: number
): Promise<boolean> {
  const client = getDocClient(region);
  const sk = 'COUNTER';

  try {
    // Atomic increment with conditional check:
    // - Initializes count to 0 if not exists
    // - Increments by 1
    // - Condition ensures new count does not exceed cap
    await client.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { pk, sk },
        UpdateExpression: 'SET #count = if_not_exists(#count, :zero) + :inc, #ttl = :ttl',
        ConditionExpression: 'attribute_not_exists(#count) OR #count < :cap',
        ExpressionAttributeNames: {
          '#count': 'count',
          '#ttl': 'ttl',
        },
        ExpressionAttributeValues: {
          ':zero': 0,
          ':inc': 1,
          ':cap': cap,
          ':ttl': ttl,
        },
      })
    );

    // Update succeeded - cap not exceeded
    return true;
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'name' in error &&
      error.name === 'ConditionalCheckFailedException'
    ) {
      // Cap has been reached
      return false;
    }
    // Re-throw unexpected errors
    throw error;
  }
}

/**
 * Decrement a cap counter (rollback on assignment failure).
 *
 * This is a best-effort operation - if it fails, the counter will be
 * slightly over-counted but will auto-correct when the TTL expires.
 *
 * @param tableName - DynamoDB table name
 * @param region - AWS region
 * @param pk - Partition key for the counter record
 */
async function decrementCap(tableName: string, region: string, pk: string): Promise<void> {
  const client = getDocClient(region);
  const sk = 'COUNTER';

  try {
    await client.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { pk, sk },
        UpdateExpression: 'SET #count = #count - :dec',
        ConditionExpression: 'attribute_exists(#count) AND #count > :zero',
        ExpressionAttributeNames: {
          '#count': 'count',
        },
        ExpressionAttributeValues: {
          ':dec': 1,
          ':zero': 0,
        },
      })
    );
  } catch {
    // Best-effort rollback - log but do not throw
    console.log(
      JSON.stringify({
        level: 'warn',
        message: 'Cap decrement failed (best-effort rollback)',
        pk,
      })
    );
  }
}

// =============================================================================
// Public API
// =============================================================================

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
export async function checkAndIncrementCap(
  tableName: string,
  region: string,
  ruleId: string,
  dailyCap?: number,
  monthlyCap?: number
): Promise<CapCheckResult> {
  // No caps configured - always allowed
  if (dailyCap === undefined && monthlyCap === undefined) {
    return { allowed: true };
  }

  const dailyKey = getDailyKey();
  const monthlyKey = getMonthlyKey();

  // Check daily cap first (most likely to be hit)
  if (dailyCap !== undefined && dailyCap > 0) {
    const dailyPk = `RULE#${ruleId}#CAP#DAILY#${dailyKey}`;
    const dailyAllowed = await atomicCapCheck(tableName, region, dailyPk, dailyCap, getDailyTtl());

    if (!dailyAllowed) {
      return {
        allowed: false,
        reason: `daily_cap_exceeded:${dailyCap}`,
      };
    }

    // Daily cap passed - now check monthly cap
    if (monthlyCap !== undefined && monthlyCap > 0) {
      const monthlyPk = `RULE#${ruleId}#CAP#MONTHLY#${monthlyKey}`;
      const monthlyAllowed = await atomicCapCheck(
        tableName,
        region,
        monthlyPk,
        monthlyCap,
        getMonthlyTtl()
      );

      if (!monthlyAllowed) {
        // Rollback daily increment since monthly cap is exceeded
        await decrementCap(tableName, region, dailyPk);
        return {
          allowed: false,
          reason: `monthly_cap_exceeded:${monthlyCap}`,
        };
      }
    }

    return { allowed: true };
  }

  // Only monthly cap configured
  if (monthlyCap !== undefined && monthlyCap > 0) {
    const monthlyPk = `RULE#${ruleId}#CAP#MONTHLY#${monthlyKey}`;
    const monthlyAllowed = await atomicCapCheck(
      tableName,
      region,
      monthlyPk,
      monthlyCap,
      getMonthlyTtl()
    );

    if (!monthlyAllowed) {
      return {
        allowed: false,
        reason: `monthly_cap_exceeded:${monthlyCap}`,
      };
    }
  }

  return { allowed: true };
}

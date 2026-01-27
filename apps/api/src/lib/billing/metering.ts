/**
 * Billing Metering - Track lead consumption per org
 *
 * DynamoDB access patterns:
 *   PK = BILLING#<orgId>   SK = USAGE#<YYYY-MM>
 *
 * Uses atomic increment for concurrent-safe counters.
 */

import { UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { getDocClient, tableName } from '../db/client.js';
import { createLogger } from '../logging.js';
import type { UsageRecord, SubscriptionTier, BillingAccount } from './types.js';
import { TIER_LIMITS } from './types.js';

const log = createLogger('billing-metering');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Get the current year-month key in YYYY-MM format (UTC).
 */
function getCurrentYearMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

/**
 * Get TTL for usage records (keep for 13 months for billing queries).
 */
function getUsageTtl(): number {
  return Math.floor(Date.now() / 1000) + 400 * 86400; // ~13 months
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

/**
 * Atomically increment the lead counter for an org in the current month.
 *
 * @param orgId - Organization ID
 * @param field - Which counter to increment
 */
export async function incrementUsage(
  orgId: string,
  field: 'leadsReceived' | 'leadsAccepted' | 'leadsRejected'
): Promise<void> {
  const doc = getDocClient();
  const yearMonth = getCurrentYearMonth();
  const now = new Date().toISOString();
  const ttl = getUsageTtl();

  try {
    await doc.send(
      new UpdateCommand({
        TableName: tableName(),
        Key: {
          pk: `BILLING#${orgId}`,
          sk: `USAGE#${yearMonth}`,
        },
        UpdateExpression: `SET #field = if_not_exists(#field, :zero) + :inc,
          orgId = :orgId, yearMonth = :ym, #updatedAt = :now, #ttl = :ttl`,
        ExpressionAttributeNames: {
          '#field': field,
          '#updatedAt': 'updatedAt',
          '#ttl': 'ttl',
        },
        ExpressionAttributeValues: {
          ':zero': 0,
          ':inc': 1,
          ':orgId': orgId,
          ':ym': yearMonth,
          ':now': now,
          ':ttl': ttl,
        },
      })
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    log.error('billing.metering.incrementFailed', { orgId, field, error: msg });
    // Non-critical: do not throw - metering failure should not block lead flow
  }
}

/**
 * Get the current month's usage for an org.
 */
export async function getCurrentUsage(orgId: string): Promise<UsageRecord | null> {
  const doc = getDocClient();
  const yearMonth = getCurrentYearMonth();

  const result = await doc.send(
    new GetCommand({
      TableName: tableName(),
      Key: {
        pk: `BILLING#${orgId}`,
        sk: `USAGE#${yearMonth}`,
      },
    })
  );

  return (result.Item as UsageRecord | undefined) || null;
}

/**
 * Check if an org is over its lead limit for the current billing period.
 *
 * @param orgId - Organization ID
 * @returns true if org is OVER limit and should be skipped
 */
export async function isOverLimit(orgId: string): Promise<boolean> {
  const doc = getDocClient();

  // Load billing account to get tier
  const accountResult = await doc.send(
    new GetCommand({
      TableName: tableName(),
      Key: {
        pk: `BILLING#${orgId}`,
        sk: 'ACCOUNT',
      },
    })
  );

  const account = accountResult.Item as BillingAccount | undefined;

  // If no billing account, treat as free tier
  const tier: SubscriptionTier = account?.tier || 'free';
  const limit = TIER_LIMITS[tier];

  // Enterprise = unlimited
  if (!Number.isFinite(limit)) {
    return false;
  }

  // Get current usage
  const usage = await getCurrentUsage(orgId);
  const accepted = usage?.leadsAccepted || 0;

  return accepted >= limit;
}

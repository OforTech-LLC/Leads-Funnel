/**
 * Billing Account CRUD
 *
 * DynamoDB access patterns:
 *   PK = BILLING#<orgId>   SK = ACCOUNT
 */
import { PutCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { getDocClient, tableName } from '../db/client.js';
import { createLogger } from '../logging.js';
import { TIER_LIMITS } from './types.js';
const log = createLogger('billing-accounts');
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/**
 * Get the current period boundaries (first/last of current month).
 */
function getCurrentPeriodBoundaries() {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59));
    return {
        start: start.toISOString(),
        end: end.toISOString(),
    };
}
// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------
/**
 * Create a billing account for an org.
 */
export async function createBillingAccount(input) {
    const doc = getDocClient();
    const now = new Date().toISOString();
    const period = getCurrentPeriodBoundaries();
    const tier = input.tier || 'free';
    const account = {
        pk: `BILLING#${input.orgId}`,
        sk: 'ACCOUNT',
        orgId: input.orgId,
        tier,
        status: 'active',
        currentPeriodStart: period.start,
        currentPeriodEnd: period.end,
        createdAt: now,
        updatedAt: now,
    };
    await doc.send(new PutCommand({
        TableName: tableName(),
        Item: account,
    }));
    log.info('billing.account.created', { orgId: input.orgId, tier });
    return account;
}
/**
 * Get the billing account for an org. Creates a free account if none exists.
 */
export async function getBillingAccount(orgId) {
    const doc = getDocClient();
    const result = await doc.send(new GetCommand({
        TableName: tableName(),
        Key: {
            pk: `BILLING#${orgId}`,
            sk: 'ACCOUNT',
        },
    }));
    if (result.Item) {
        return result.Item;
    }
    // Auto-create free tier account
    return createBillingAccount({ orgId, tier: 'free' });
}
/**
 * Upgrade (or downgrade) the subscription tier for an org.
 */
export async function changePlan(orgId, newTier) {
    const doc = getDocClient();
    const now = new Date().toISOString();
    const period = getCurrentPeriodBoundaries();
    const result = await doc.send(new UpdateCommand({
        TableName: tableName(),
        Key: {
            pk: `BILLING#${orgId}`,
            sk: 'ACCOUNT',
        },
        UpdateExpression: `SET tier = :tier, #updatedAt = :now,
        currentPeriodStart = :start, currentPeriodEnd = :end`,
        ExpressionAttributeNames: {
            '#updatedAt': 'updatedAt',
        },
        ExpressionAttributeValues: {
            ':tier': newTier,
            ':now': now,
            ':start': period.start,
            ':end': period.end,
        },
        ReturnValues: 'ALL_NEW',
    }));
    log.info('billing.plan.changed', { orgId, newTier });
    return result.Attributes;
}
/**
 * Get plan details including the lead limit for a given tier.
 */
export function getPlanDetails(tier) {
    const limit = TIER_LIMITS[tier];
    return {
        tier,
        leadLimit: Number.isFinite(limit) ? limit : 0,
        unlimited: !Number.isFinite(limit),
    };
}
//# sourceMappingURL=accounts.js.map
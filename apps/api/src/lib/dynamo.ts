/**
 * DynamoDB operations for lead storage, rate limiting, and idempotency
 */

import { PutCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type {
  LeadRecord,
  RateLimitRecord,
  IdempotencyRecord,
  NormalizedLead,
  SecurityAnalysis,
  RateLimitResult,
  IdempotencyResult,
  EnvConfig,
  LeadAnalysis,
} from '../types.js';
import { getIsoTimestamp, getRateLimitTtl, getIdempotencyTtl, getWindowBucket } from './time.js';
import { getDocClient } from './clients.js';
import { v4 as uuidv4 } from 'uuid';
import { DB_PREFIXES, DB_SORT_KEYS, GSI_KEYS, SK_PREFIXES } from './constants.js';

// =============================================================================
// Rate Limiting
// =============================================================================

// Hyperscale Sharding: Distribute hot keys (e.g. shared IPs) across 10 partitions.
// We enforce (Limit / 10) on each shard. Statistically approximates the global limit.
const RATE_LIMIT_SHARDS = 10;

/**
 * Check and increment rate limit for an IP hash
 * Uses atomic counter increment with TTL and Probabilistic Sharding
 */
export async function checkRateLimit(config: EnvConfig, ipHash: string): Promise<RateLimitResult> {
  const client = getDocClient(config.awsRegion);
  const windowBucket = getWindowBucket(config.rateLimitWindowMin);
  const ttl = getRateLimitTtl(config.rateLimitWindowMin);

  // Select a random shard (0-9) to distribute write heat
  const shardId = Math.floor(Math.random() * RATE_LIMIT_SHARDS);
  const pk = `${DB_PREFIXES.IP}${ipHash}#${shardId}`;
  const sk = `${SK_PREFIXES.WINDOW}${windowBucket}`;

  // Scale the limit down per shard
  const shardedLimit = Math.ceil(config.rateLimitMax / RATE_LIMIT_SHARDS);

  try {
    // Atomic increment using UpdateItem with ADD
    const result = await client.send(
      new UpdateCommand({
        TableName: config.rateLimitsTableName,
        Key: { pk, sk },
        UpdateExpression: 'SET #count = if_not_exists(#count, :zero) + :inc, #ttl = :ttl',
        ExpressionAttributeNames: {
          '#count': 'count',
          '#ttl': 'ttl',
        },
        ExpressionAttributeValues: {
          ':zero': 0,
          ':inc': 1,
          ':ttl': ttl,
        },
        ReturnValues: 'UPDATED_NEW',
      })
    );

    const currentCount = (result.Attributes?.count as number) || 1;

    // Check against the sharded limit
    // Return the *projected* global count for the API response
    return {
      allowed: currentCount <= shardedLimit,
      currentCount: currentCount * RATE_LIMIT_SHARDS, // Projected total
      maxAllowed: config.rateLimitMax,
    };
  } catch (error) {
    // Fail-closed: if rate limit check fails, reject the request
    // This is more secure than fail-open which could allow DDoS during DB issues
    throw error;
  }
}

// =============================================================================
// Idempotency
// =============================================================================

/**
 * Check idempotency and create record if not exists
 * Returns existing lead info if duplicate request
 */
export async function checkIdempotency(
  config: EnvConfig,
  idempotencyKey: string,
  leadId: string,
  status: 'accepted' | 'quarantined'
): Promise<IdempotencyResult> {
  const client = getDocClient(config.awsRegion);
  const ttl = getIdempotencyTtl(config.idempotencyTtlHours);

  const pk = `${DB_PREFIXES.IDEMPOTENCY}${idempotencyKey}`;
  const sk = DB_SORT_KEYS.META;

  try {
    // Try conditional write - only succeeds if item doesn't exist
    await client.send(
      new PutCommand({
        TableName: config.idempotencyTableName,
        Item: {
          pk,
          sk,
          leadId,
          status,
          ttl,
        },
        ConditionExpression: 'attribute_not_exists(pk)',
      })
    );

    // Write succeeded - this is a new request
    return {
      isDuplicate: false,
    };
  } catch (error: unknown) {
    // Check if it's a conditional check failure (duplicate request)
    if (
      error &&
      typeof error === 'object' &&
      'name' in error &&
      error.name === 'ConditionalCheckFailedException'
    ) {
      // Fetch the existing record
      const existing = await client.send(
        new GetCommand({
          TableName: config.idempotencyTableName,
          Key: { pk, sk },
          // Only fetch needed attributes
          ProjectionExpression: 'leadId, #status',
          ExpressionAttributeNames: {
            '#status': 'status',
          },
        })
      );

      if (existing.Item) {
        const record = existing.Item as IdempotencyRecord;
        return {
          isDuplicate: true,
          existingLeadId: record.leadId,
          existingStatus: record.status,
        };
      }
    }

    // Re-throw other errors
    throw error;
  }
}

// =============================================================================
// Lead Storage
// =============================================================================

/**
 * Store a new lead record
 *
 * @param config - Environment configuration
 * @param tableName - The funnel-specific DynamoDB table name
 * @param lead - Normalized lead data
 * @param security - Security analysis results
 * @param userAgent - Client user agent string
 * @param score - Optional lead score (0-100) from the scoring engine
 */
export async function storeLead(
  config: EnvConfig,
  tableName: string,
  lead: NormalizedLead,
  security: SecurityAnalysis,
  userAgent: string | undefined,
  score?: number,
  options?: {
    leadId?: string;
    status?: 'accepted' | 'quarantined';
    createdAt?: string;
    evidencePack?: import('./types/evidence.js').EvidencePack;
  }
): Promise<LeadRecord> {
  const client = getDocClient(config.awsRegion);
  const leadId = options?.leadId || uuidv4();
  const createdAt = options?.createdAt || getIsoTimestamp();
  const status = options?.status || (security.suspicious ? 'quarantined' : 'accepted');

  const record: LeadRecord = {
    // DynamoDB keys
    pk: `${DB_PREFIXES.LEAD}${leadId}`,
    sk: DB_SORT_KEYS.META,
    gsi1pk: `${GSI_KEYS.EMAIL}${lead.email}`,
    gsi1sk: `${GSI_KEYS.CREATED}${createdAt}`,

    // Core fields
    leadId,
    funnelId: lead.funnelId,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    message: lead.message,
    firstName: lead.firstName,
    lastName: lead.lastName,
    createdAt,
    status,

    // Tracking
    pageUrl: lead.pageUrl,
    referrer: lead.referrer,
    utm: lead.utm,
    userAgent,
    ipHash: security.ipHash,

    // Extended fields
    address: lead.address,
    property: lead.property,
    vehicle: lead.vehicle,
    business: lead.business,
    healthcare: lead.healthcare,
    legal: lead.legal,
    financial: lead.financial,
    project: lead.project,
    contactPreferences: lead.contactPreferences,
    scheduling: lead.scheduling,
    customFields: lead.customFields,
    tags: lead.tags,
    evidencePack: options?.evidencePack,
  };

  // Build the DynamoDB item, optionally including score from scoring engine
  const item: Record<string, unknown> = { ...record };
  if (score !== undefined) {
    item.score = score;
  }
  if (options?.evidencePack) {
    item.evidencePack = options.evidencePack;
  }

  await client.send(
    new PutCommand({
      TableName: tableName,
      Item: item,
    })
  );

  return record;
}

/**
 * Update lead with AI analysis results
 */
export async function updateLeadAnalysis(
  config: EnvConfig,
  tableName: string,
  leadId: string,
  analysis: LeadAnalysis
): Promise<void> {
  const client = getDocClient(config.awsRegion);
  const pk = `${DB_PREFIXES.LEAD}${leadId}`;
  const sk = DB_SORT_KEYS.META;

  await client.send(
    new UpdateCommand({
      TableName: tableName,
      Key: { pk, sk },
      UpdateExpression: 'SET analysis = :analysis, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':analysis': analysis,
        ':updatedAt': new Date().toISOString(),
      },
    })
  );
}

/**
 * Get a lead by ID
 */
export async function getLead(
  config: EnvConfig,
  tableName: string,
  leadId: string
): Promise<LeadRecord | null> {
  const client = getDocClient(config.awsRegion);
  const pk = `${DB_PREFIXES.LEAD}${leadId}`;
  const sk = DB_SORT_KEYS.META;

  const result = await client.send(
    new GetCommand({
      TableName: tableName,
      Key: { pk, sk },
    })
  );

  return (result.Item as LeadRecord) || null;
}

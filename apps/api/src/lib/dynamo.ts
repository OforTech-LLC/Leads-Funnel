/**
 * DynamoDB operations for lead storage, rate limiting, and idempotency
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import type {
  LeadRecord,
  RateLimitRecord,
  IdempotencyRecord,
  NormalizedLead,
  SecurityAnalysis,
  RateLimitResult,
  IdempotencyResult,
  EnvConfig,
} from '../types.js';
import { getIsoTimestamp, getRateLimitTtl, getIdempotencyTtl, getWindowBucket } from './time.js';
import { v4 as uuidv4 } from 'uuid';

// =============================================================================
// DynamoDB Client Initialization
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
// Rate Limiting
// =============================================================================

/**
 * Check and increment rate limit for an IP hash
 * Uses atomic counter increment with TTL
 */
export async function checkRateLimit(config: EnvConfig, ipHash: string): Promise<RateLimitResult> {
  const client = getDocClient(config.awsRegion);
  const windowBucket = getWindowBucket(config.rateLimitWindowMin);
  const ttl = getRateLimitTtl(config.rateLimitWindowMin);

  const pk = `IP#${ipHash}`;
  const sk = `WINDOW#${windowBucket}`;

  try {
    // Atomic increment using UpdateItem with ADD
    const result = await client.send(
      new UpdateCommand({
        TableName: config.ddbTableName,
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

    return {
      allowed: currentCount <= config.rateLimitMax,
      currentCount,
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

  const pk = `IDEMPOTENCY#${idempotencyKey}`;
  const sk = 'META';

  try {
    // Try conditional write - only succeeds if item doesn't exist
    await client.send(
      new PutCommand({
        TableName: config.ddbTableName,
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
          TableName: config.ddbTableName,
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
 */
export async function storeLead(
  config: EnvConfig,
  lead: NormalizedLead,
  security: SecurityAnalysis,
  userAgent: string | undefined
): Promise<LeadRecord> {
  const client = getDocClient(config.awsRegion);
  const leadId = uuidv4();
  const createdAt = getIsoTimestamp();
  const status = security.suspicious ? 'quarantined' : 'accepted';

  const record: LeadRecord = {
    pk: `LEAD#${leadId}`,
    sk: 'META',
    leadId,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    message: lead.message,
    createdAt,
    status,
    pageUrl: lead.pageUrl,
    referrer: lead.referrer,
    utm: lead.utm,
    userAgent,
    ipHash: security.ipHash,
    gsi1pk: `EMAIL#${lead.email}`,
    gsi1sk: `CREATED#${createdAt}`,
  };

  await client.send(
    new PutCommand({
      TableName: config.ddbTableName,
      Item: record,
    })
  );

  return record;
}

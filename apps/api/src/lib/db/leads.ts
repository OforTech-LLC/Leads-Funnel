/**
 * DynamoDB operations for Leads (platform-wide)
 *
 * Single-table access patterns:
 *   PK = LEAD#<funnelId>#<leadId>   SK = META
 *   GSI1PK = FUNNEL#<funnelId>      GSI1SK = CREATED#<iso>  (leads by funnel)
 *   GSI2PK = ORG#<orgId>            GSI2SK = CREATED#<iso>  (leads by org)
 *   GSI3PK = STATUS#<funnelId>#<s>  GSI3SK = CREATED#<iso>  (leads by status)
 */

import { GetCommand, UpdateCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { getDocClient, tableName } from './client.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LeadStatus =
  | 'new'
  | 'assigned'
  | 'contacted'
  | 'qualified'
  | 'converted'
  | 'lost'
  | 'dnc'
  | 'quarantined'
  | 'unassigned';

export interface PlatformLead {
  pk: string;
  sk: string;
  leadId: string;
  funnelId: string;
  orgId?: string;
  assignedUserId?: string;
  ruleId?: string;
  name: string;
  email: string;
  phone?: string;
  zipCode?: string;
  message?: string;
  status: LeadStatus;
  notes: string[];
  tags: string[];
  pageUrl?: string;
  referrer?: string;
  utm?: Record<string, string>;
  ipHash: string;
  userAgent?: string;
  assignedAt?: string;
  notifiedAt?: string;
  createdAt: string;
  updatedAt: string;
  gsi1pk: string;
  gsi1sk: string;
  gsi2pk?: string;
  gsi2sk?: string;
  gsi3pk: string;
  gsi3sk: string;
}

export interface UpdateLeadInput {
  funnelId: string;
  leadId: string;
  status?: LeadStatus;
  orgId?: string;
  assignedUserId?: string;
  ruleId?: string;
  notes?: string[];
  tags?: string[];
  assignedAt?: string;
  notifiedAt?: string;
}

export interface QueryLeadsInput {
  funnelId?: string;
  orgId?: string;
  status?: LeadStatus;
  startDate?: string;
  endDate?: string;
  cursor?: string;
  limit?: number;
}

export interface PaginatedLeads {
  items: PlatformLead[];
  nextCursor?: string;
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

export async function getLead(funnelId: string, leadId: string): Promise<PlatformLead | null> {
  const doc = getDocClient();
  const result = await doc.send(
    new GetCommand({
      TableName: tableName(),
      Key: { pk: `LEAD#${funnelId}#${leadId}`, sk: 'META' },
    })
  );
  return (result.Item as PlatformLead | undefined) || null;
}

export async function updateLead(input: UpdateLeadInput): Promise<PlatformLead> {
  const doc = getDocClient();
  const now = new Date().toISOString();

  const parts: string[] = ['#updatedAt = :updatedAt'];
  const names: Record<string, string> = { '#updatedAt': 'updatedAt' };
  const values: Record<string, unknown> = { ':updatedAt': now };

  if (input.status !== undefined) {
    parts.push('#status = :status');
    names['#status'] = 'status';
    values[':status'] = input.status;
    // Update status GSI
    parts.push('gsi3pk = :gsi3pk');
    values[':gsi3pk'] = `STATUS#${input.funnelId}#${input.status}`;
  }
  if (input.orgId !== undefined) {
    parts.push('orgId = :orgId');
    values[':orgId'] = input.orgId;
    // Update org GSI
    parts.push('gsi2pk = :gsi2pk, gsi2sk = :gsi2sk');
    values[':gsi2pk'] = `ORG#${input.orgId}`;
    values[':gsi2sk'] = `CREATED#${now}`;
  }
  if (input.assignedUserId !== undefined) {
    parts.push('assignedUserId = :assignedUserId');
    values[':assignedUserId'] = input.assignedUserId;
  }
  if (input.ruleId !== undefined) {
    parts.push('ruleId = :ruleId');
    values[':ruleId'] = input.ruleId;
  }
  if (input.notes !== undefined) {
    parts.push('notes = :notes');
    values[':notes'] = input.notes;
  }
  if (input.tags !== undefined) {
    parts.push('tags = :tags');
    values[':tags'] = input.tags;
  }
  if (input.assignedAt !== undefined) {
    parts.push('assignedAt = :assignedAt');
    values[':assignedAt'] = input.assignedAt;
  }
  if (input.notifiedAt !== undefined) {
    parts.push('notifiedAt = :notifiedAt');
    values[':notifiedAt'] = input.notifiedAt;
  }

  const result = await doc.send(
    new UpdateCommand({
      TableName: tableName(),
      Key: { pk: `LEAD#${input.funnelId}#${input.leadId}`, sk: 'META' },
      UpdateExpression: `SET ${parts.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ConditionExpression: 'attribute_exists(pk)',
      ReturnValues: 'ALL_NEW',
    })
  );

  return result.Attributes as PlatformLead;
}

/**
 * Conditionally assign a lead (idempotent).
 * Only succeeds if lead status is still 'new'.
 */
export async function assignLead(
  funnelId: string,
  leadId: string,
  orgId: string,
  ruleId: string
): Promise<PlatformLead | null> {
  const doc = getDocClient();
  const now = new Date().toISOString();

  try {
    const result = await doc.send(
      new UpdateCommand({
        TableName: tableName(),
        Key: { pk: `LEAD#${funnelId}#${leadId}`, sk: 'META' },
        UpdateExpression: `SET #status = :assigned, orgId = :orgId, ruleId = :ruleId,
          assignedAt = :now, #updatedAt = :now,
          gsi2pk = :gsi2pk, gsi2sk = :gsi2sk,
          gsi3pk = :gsi3pk`,
        ExpressionAttributeNames: {
          '#status': 'status',
          '#updatedAt': 'updatedAt',
        },
        ExpressionAttributeValues: {
          ':assigned': 'assigned',
          ':orgId': orgId,
          ':ruleId': ruleId,
          ':now': now,
          ':gsi2pk': `ORG#${orgId}`,
          ':gsi2sk': `CREATED#${now}`,
          ':gsi3pk': `STATUS#${funnelId}#assigned`,
          ':new': 'new',
        },
        ConditionExpression: 'attribute_exists(pk) AND #status = :new',
        ReturnValues: 'ALL_NEW',
      })
    );
    return result.Attributes as PlatformLead;
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'name' in error &&
      error.name === 'ConditionalCheckFailedException'
    ) {
      // Lead already assigned or does not exist -- idempotent
      return null;
    }
    throw error;
  }
}

/**
 * Mark a lead as unassigned (no matching rule).
 */
export async function markUnassigned(
  funnelId: string,
  leadId: string
): Promise<PlatformLead | null> {
  const doc = getDocClient();
  const now = new Date().toISOString();

  try {
    const result = await doc.send(
      new UpdateCommand({
        TableName: tableName(),
        Key: { pk: `LEAD#${funnelId}#${leadId}`, sk: 'META' },
        UpdateExpression: `SET #status = :unassigned, #updatedAt = :now,
          gsi3pk = :gsi3pk`,
        ExpressionAttributeNames: {
          '#status': 'status',
          '#updatedAt': 'updatedAt',
        },
        ExpressionAttributeValues: {
          ':unassigned': 'unassigned',
          ':now': now,
          ':gsi3pk': `STATUS#${funnelId}#unassigned`,
          ':new': 'new',
        },
        ConditionExpression: 'attribute_exists(pk) AND #status = :new',
        ReturnValues: 'ALL_NEW',
      })
    );
    return result.Attributes as PlatformLead;
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'name' in error &&
      error.name === 'ConditionalCheckFailedException'
    ) {
      return null;
    }
    throw error;
  }
}

/**
 * Reassign a lead to a different org.
 */
export async function reassignLead(
  funnelId: string,
  leadId: string,
  newOrgId: string,
  newRuleId?: string
): Promise<PlatformLead> {
  const doc = getDocClient();
  const now = new Date().toISOString();

  const result = await doc.send(
    new UpdateCommand({
      TableName: tableName(),
      Key: { pk: `LEAD#${funnelId}#${leadId}`, sk: 'META' },
      UpdateExpression: `SET orgId = :orgId, ruleId = :ruleId, assignedAt = :now,
        #status = :assigned, #updatedAt = :now,
        gsi2pk = :gsi2pk, gsi2sk = :gsi2sk,
        gsi3pk = :gsi3pk`,
      ExpressionAttributeNames: {
        '#status': 'status',
        '#updatedAt': 'updatedAt',
      },
      ExpressionAttributeValues: {
        ':orgId': newOrgId,
        ':ruleId': newRuleId || null,
        ':assigned': 'assigned',
        ':now': now,
        ':gsi2pk': `ORG#${newOrgId}`,
        ':gsi2sk': `CREATED#${now}`,
        ':gsi3pk': `STATUS#${funnelId}#assigned`,
      },
      ConditionExpression: 'attribute_exists(pk)',
      ReturnValues: 'ALL_NEW',
    })
  );

  return result.Attributes as PlatformLead;
}

/**
 * Query leads across funnels / orgs with cursor pagination.
 */
export async function queryLeads(input: QueryLeadsInput): Promise<PaginatedLeads> {
  const doc = getDocClient();
  const limit = Math.min(input.limit || 25, 100);

  let exclusiveStartKey: Record<string, unknown> | undefined;
  if (input.cursor) {
    try {
      exclusiveStartKey = JSON.parse(Buffer.from(input.cursor, 'base64url').toString());
    } catch {
      // invalid cursor
    }
  }

  // Choose the best access pattern
  if (input.orgId) {
    // Query by org
    let keyCondition = 'gsi2pk = :pk';
    const exprValues: Record<string, unknown> = { ':pk': `ORG#${input.orgId}` };

    if (input.startDate && input.endDate) {
      keyCondition += ' AND gsi2sk BETWEEN :start AND :end';
      exprValues[':start'] = `CREATED#${input.startDate}`;
      exprValues[':end'] = `CREATED#${input.endDate}`;
    }

    const result = await doc.send(
      new QueryCommand({
        TableName: tableName(),
        IndexName: 'GSI2',
        KeyConditionExpression: keyCondition,
        ExpressionAttributeValues: exprValues,
        Limit: limit,
        ScanIndexForward: false,
        ExclusiveStartKey: exclusiveStartKey,
      })
    );

    return buildPaginatedResult(result);
  }

  if (input.funnelId && input.status) {
    // Query by funnel + status
    let keyCondition = 'gsi3pk = :pk';
    const exprValues: Record<string, unknown> = {
      ':pk': `STATUS#${input.funnelId}#${input.status}`,
    };

    if (input.startDate && input.endDate) {
      keyCondition += ' AND gsi3sk BETWEEN :start AND :end';
      exprValues[':start'] = `CREATED#${input.startDate}`;
      exprValues[':end'] = `CREATED#${input.endDate}`;
    }

    const result = await doc.send(
      new QueryCommand({
        TableName: tableName(),
        IndexName: 'GSI3',
        KeyConditionExpression: keyCondition,
        ExpressionAttributeValues: exprValues,
        Limit: limit,
        ScanIndexForward: false,
        ExclusiveStartKey: exclusiveStartKey,
      })
    );

    return buildPaginatedResult(result);
  }

  if (input.funnelId) {
    // Query by funnel
    let keyCondition = 'gsi1pk = :pk';
    const exprValues: Record<string, unknown> = { ':pk': `FUNNEL#${input.funnelId}` };

    if (input.startDate && input.endDate) {
      keyCondition += ' AND gsi1sk BETWEEN :start AND :end';
      exprValues[':start'] = `CREATED#${input.startDate}`;
      exprValues[':end'] = `CREATED#${input.endDate}`;
    }

    const result = await doc.send(
      new QueryCommand({
        TableName: tableName(),
        IndexName: 'GSI1',
        KeyConditionExpression: keyCondition,
        ExpressionAttributeValues: exprValues,
        Limit: limit,
        ScanIndexForward: false,
        ExclusiveStartKey: exclusiveStartKey,
      })
    );

    return buildPaginatedResult(result);
  }

  // Fallback: scan (should be avoided in production)
  const result = await doc.send(
    new ScanCommand({
      TableName: tableName(),
      FilterExpression: 'begins_with(pk, :prefix) AND sk = :meta',
      ExpressionAttributeValues: { ':prefix': 'LEAD#', ':meta': 'META' },
      Limit: limit,
      ExclusiveStartKey: exclusiveStartKey,
    })
  );

  return buildPaginatedResult(result);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildPaginatedResult(result: {
  Items?: unknown[];
  LastEvaluatedKey?: Record<string, unknown>;
}): PaginatedLeads {
  const items = (result.Items || []) as unknown as PlatformLead[];
  let nextCursor: string | undefined;
  if (result.LastEvaluatedKey) {
    nextCursor = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64url');
  }
  return { items, nextCursor };
}

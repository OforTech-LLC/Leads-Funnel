/**
 * DynamoDB operations for Leads (platform-wide)
 *
 * Single-table access patterns:
 *   PK = LEAD#<funnelId>#<leadId>   SK = META
 *   GSI1PK = FUNNEL#<funnelId>      GSI1SK = CREATED#<iso>  (leads by funnel)
 *   GSI2PK = ORG#<orgId>            GSI2SK = CREATED#<iso>  (leads by org)
 *   GSI3PK = STATUS#<funnelId>#<s>  GSI3SK = CREATED#<iso>  (leads by status)
 */

import { GetCommand, PutCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { getDocClient, tableName } from './client.js';
import { signCursor, verifyCursor } from '../cursor.js';
import { ValidationError } from '../errors.js';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'node:crypto';
import { DB_PREFIXES, DB_SORT_KEYS, GSI_KEYS, GSI_INDEX_NAMES } from '../constants.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LeadStatus =
  | 'new'
  | 'assigned'
  | 'unassigned'
  | 'contacted'
  | 'qualified'
  | 'booked'
  | 'converted'
  | 'won'
  | 'lost'
  | 'dnc'
  | 'quarantined';

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

export interface CreateLeadInput {
  funnelId: string;
  email: string;
  name?: string;
  phone?: string;
  zipCode?: string;
  message?: string;
  source?: string;
  pageUrl?: string;
  referrer?: string;
  utm?: Record<string, string>;
  status?: LeadStatus;
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
  /**
   * When true, skips status transition validation.
   * Use for admin overrides only.
   */
  force?: boolean;
}

export interface QueryLeadsInput {
  funnelId?: string;
  orgId?: string;
  status?: LeadStatus;
  startDate?: string;
  endDate?: string;
  cursor?: string;
  limit?: number;
  assignedUserId?: string;
}

export interface PaginatedLeads {
  items: PlatformLead[];
  nextCursor?: string;
}

// ---------------------------------------------------------------------------
// Lead Status State Machine
// ---------------------------------------------------------------------------

/**
 * Valid status transitions for leads.
 *
 * Each key is the current status; its value is the list of statuses it
 * can transition to.  Any transition not listed here is rejected (unless
 * the caller passes `force: true` for admin overrides).
 *
 * Terminal states:
 *   - `dnc` (Do Not Contact) -- no outgoing transitions
 *
 * Reversible states:
 *   - `converted` -> `lost` (mistake correction)
 *   - `lost` -> `contacted`, `qualified` (re-open)
 *   - `quarantined` -> `new` (admin unquarantine)
 */
const VALID_TRANSITIONS: Readonly<Record<LeadStatus, readonly LeadStatus[]>> = {
  new: ['assigned', 'quarantined', 'unassigned'],
  unassigned: ['assigned', 'quarantined'],
  assigned: ['contacted', 'qualified', 'converted', 'lost', 'dnc', 'quarantined', 'booked'],
  contacted: ['qualified', 'converted', 'lost', 'dnc', 'booked'],
  qualified: ['converted', 'lost', 'dnc', 'booked'],
  booked: ['converted', 'won', 'lost', 'dnc'],
  converted: ['won', 'lost'], // can reverse if mistake
  won: [], // terminal - deal closed successfully
  lost: ['contacted', 'qualified'], // can reopen
  dnc: [], // terminal
  quarantined: ['new'], // admin can unquarantine
} as const;

/**
 * Validate that a status transition is allowed by the state machine.
 *
 * @param from - Current lead status
 * @param to   - Desired new status
 * @returns true if the transition is valid
 */
export function validateStatusTransition(from: LeadStatus, to: LeadStatus): boolean {
  if (from === to) {
    // No-op transition is always valid (idempotent)
    return true;
  }
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed) {
    return false;
  }
  return allowed.includes(to);
}

/**
 * Return a human-readable description of allowed transitions.
 * Used in error messages.
 */
function describeAllowed(from: LeadStatus): string {
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed || allowed.length === 0) {
    return `"${from}" is a terminal status with no allowed transitions`;
  }
  return `Allowed transitions from "${from}": ${allowed.join(', ')}`;
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

/**
 * Create a new lead record in DynamoDB.
 *
 * Used by the admin bulk-import feature. Generates a UUID for the leadId,
 * hashes the email for the ipHash field, and sets up all GSI projections.
 *
 * @param input - Lead creation input
 * @returns The created PlatformLead record
 */
export async function createLead(input: CreateLeadInput): Promise<PlatformLead> {
  const doc = getDocClient();
  const leadId = uuidv4();
  const now = new Date().toISOString();
  const status: LeadStatus = input.status || 'new';

  // Hash email for privacy (ipHash field doubles as identifier hash)
  const emailHash = createHash('sha256').update(input.email.toLowerCase().trim()).digest('hex');

  const lead: PlatformLead = {
    pk: `${DB_PREFIXES.LEAD}${input.funnelId}#${leadId}`,
    sk: DB_SORT_KEYS.META,
    leadId,
    funnelId: input.funnelId,
    name: input.name || '',
    email: input.email,
    phone: input.phone,
    zipCode: input.zipCode,
    message: input.message,
    status,
    notes: [],
    tags: input.source ? [`source:${input.source}`] : [],
    pageUrl: input.pageUrl,
    referrer: input.referrer,
    utm: input.utm,
    ipHash: emailHash,
    createdAt: now,
    updatedAt: now,
    // GSI projections
    gsi1pk: `${GSI_KEYS.FUNNEL}${input.funnelId}`,
    gsi1sk: `${GSI_KEYS.CREATED}${now}`,
    gsi3pk: `${GSI_KEYS.STATUS}${input.funnelId}#${status}`,
    gsi3sk: `${GSI_KEYS.CREATED}${now}`,
  };

  await doc.send(
    new PutCommand({
      TableName: tableName(),
      Item: lead,
    })
  );

  return lead;
}

export async function getLead(funnelId: string, leadId: string): Promise<PlatformLead | null> {
  const doc = getDocClient();
  const result = await doc.send(
    new GetCommand({
      TableName: tableName(),
      Key: { pk: `${DB_PREFIXES.LEAD}${funnelId}#${leadId}`, sk: DB_SORT_KEYS.META },
    })
  );
  return (result.Item as PlatformLead | undefined) || null;
}

export async function updateLead(input: UpdateLeadInput): Promise<PlatformLead> {
  const doc = getDocClient();
  const now = new Date().toISOString();

  // --- Status transition validation ---
  if (input.status !== undefined && !input.force) {
    // Fetch the current lead to know the current status
    const current = await getLead(input.funnelId, input.leadId);
    if (!current) {
      throw new ValidationError('Lead not found', {
        funnelId: input.funnelId,
        leadId: input.leadId,
      });
    }

    if (!validateStatusTransition(current.status, input.status)) {
      throw new ValidationError(
        `Invalid status transition from "${current.status}" to "${input.status}". ${describeAllowed(current.status)}`,
        {
          currentStatus: current.status,
          requestedStatus: input.status,
          allowedTransitions: [...(VALID_TRANSITIONS[current.status] ?? [])],
        }
      );
    }
  }

  const parts: string[] = ['#updatedAt = :updatedAt'];
  const names: Record<string, string> = { '#updatedAt': 'updatedAt' };
  const values: Record<string, unknown> = { ':updatedAt': now };

  if (input.status !== undefined) {
    parts.push('#status = :status');
    names['#status'] = 'status';
    values[':status'] = input.status;
    // Update status GSI
    parts.push('gsi3pk = :gsi3pk');
    values[':gsi3pk'] = `${GSI_KEYS.STATUS}${input.funnelId}#${input.status}`;
  }
  if (input.orgId !== undefined) {
    parts.push('orgId = :orgId');
    values[':orgId'] = input.orgId;
    // Update org GSI
    parts.push('gsi2pk = :gsi2pk, gsi2sk = :gsi2sk');
    values[':gsi2pk'] = `${GSI_KEYS.ORG}${input.orgId}`;
    values[':gsi2sk'] = `${GSI_KEYS.CREATED}${now}`;
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
      Key: { pk: `${DB_PREFIXES.LEAD}${input.funnelId}#${input.leadId}`, sk: DB_SORT_KEYS.META },
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
        Key: { pk: `${DB_PREFIXES.LEAD}${funnelId}#${leadId}`, sk: DB_SORT_KEYS.META },
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
          ':gsi2pk': `${GSI_KEYS.ORG}${orgId}`,
          ':gsi2sk': `${GSI_KEYS.CREATED}${now}`,
          ':gsi3pk': `${GSI_KEYS.STATUS}${funnelId}#assigned`,
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
        Key: { pk: `${DB_PREFIXES.LEAD}${funnelId}#${leadId}`, sk: DB_SORT_KEYS.META },
        UpdateExpression: `SET #status = :unassigned, #updatedAt = :now,
          gsi3pk = :gsi3pk`,
        ExpressionAttributeNames: {
          '#status': 'status',
          '#updatedAt': 'updatedAt',
        },
        ExpressionAttributeValues: {
          ':unassigned': 'unassigned',
          ':now': now,
          ':gsi3pk': `${GSI_KEYS.STATUS}${funnelId}#unassigned`,
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
      Key: { pk: `${DB_PREFIXES.LEAD}${funnelId}#${leadId}`, sk: DB_SORT_KEYS.META },
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
        ':gsi2pk': `${GSI_KEYS.ORG}${newOrgId}`,
        ':gsi2sk': `${GSI_KEYS.CREATED}${now}`,
        ':gsi3pk': `${GSI_KEYS.STATUS}${funnelId}#assigned`,
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
    const verified = verifyCursor(input.cursor);
    if (!verified) {
      // Invalid or tampered cursor - return empty result
      return { items: [] };
    }
    exclusiveStartKey = verified;
  }

  // Build optional FilterExpression for assignedUserId
  let filterExpression: string | undefined;
  let filterExprNames: Record<string, string> | undefined;
  let filterExprValues: Record<string, unknown> | undefined;
  if (input.assignedUserId) {
    filterExpression = '#assignedUserId = :assignedUserId';
    filterExprNames = { '#assignedUserId': 'assignedUserId' };
    filterExprValues = { ':assignedUserId': input.assignedUserId };
  }

  // Choose the best access pattern
  if (input.orgId) {
    // Query by org
    let keyCondition = 'gsi2pk = :pk';
    const exprValues: Record<string, unknown> = { ':pk': `${GSI_KEYS.ORG}${input.orgId}` };

    if (input.startDate && input.endDate) {
      keyCondition += ' AND gsi2sk BETWEEN :start AND :end';
      exprValues[':start'] = `${GSI_KEYS.CREATED}${input.startDate}`;
      exprValues[':end'] = `${GSI_KEYS.CREATED}${input.endDate}`;
    }

    if (filterExprValues) {
      Object.assign(exprValues, filterExprValues);
    }

    const result = await doc.send(
      new QueryCommand({
        TableName: tableName(),
        IndexName: GSI_INDEX_NAMES.GSI2,
        KeyConditionExpression: keyCondition,
        ExpressionAttributeValues: exprValues,
        ...(filterExpression ? { FilterExpression: filterExpression } : {}),
        ...(filterExprNames ? { ExpressionAttributeNames: filterExprNames } : {}),
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
      ':pk': `${GSI_KEYS.STATUS}${input.funnelId}#${input.status}`,
    };

    if (input.startDate && input.endDate) {
      keyCondition += ' AND gsi3sk BETWEEN :start AND :end';
      exprValues[':start'] = `${GSI_KEYS.CREATED}${input.startDate}`;
      exprValues[':end'] = `${GSI_KEYS.CREATED}${input.endDate}`;
    }

    if (filterExprValues) {
      Object.assign(exprValues, filterExprValues);
    }

    const result = await doc.send(
      new QueryCommand({
        TableName: tableName(),
        IndexName: GSI_INDEX_NAMES.GSI3,
        KeyConditionExpression: keyCondition,
        ExpressionAttributeValues: exprValues,
        ...(filterExpression ? { FilterExpression: filterExpression } : {}),
        ...(filterExprNames ? { ExpressionAttributeNames: filterExprNames } : {}),
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
    const exprValues: Record<string, unknown> = { ':pk': `${GSI_KEYS.FUNNEL}${input.funnelId}` };

    if (input.startDate && input.endDate) {
      keyCondition += ' AND gsi1sk BETWEEN :start AND :end';
      exprValues[':start'] = `${GSI_KEYS.CREATED}${input.startDate}`;
      exprValues[':end'] = `${GSI_KEYS.CREATED}${input.endDate}`;
    }

    if (filterExprValues) {
      Object.assign(exprValues, filterExprValues);
    }

    const result = await doc.send(
      new QueryCommand({
        TableName: tableName(),
        IndexName: GSI_INDEX_NAMES.GSI1,
        KeyConditionExpression: keyCondition,
        ExpressionAttributeValues: exprValues,
        ...(filterExpression ? { FilterExpression: filterExpression } : {}),
        ...(filterExprNames ? { ExpressionAttributeNames: filterExprNames } : {}),
        Limit: limit,
        ScanIndexForward: false,
        ExclusiveStartKey: exclusiveStartKey,
      })
    );

    return buildPaginatedResult(result);
  }

  // No filter provided - reject unbounded scans
  throw new Error('At least one filter (funnelId, orgId, or status) is required for lead queries');
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
    nextCursor = signCursor(result.LastEvaluatedKey);
  }
  return { items, nextCursor };
}

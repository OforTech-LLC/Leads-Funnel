/**
 * DynamoDB operations for Assignment Rules
 *
 * Single-table access patterns:
 *   PK = RULE#<ruleId>      SK = META
 *   GSI1PK = FUNNEL#<funnelId>  GSI1SK = PRIORITY#<nn>  (rules by funnel)
 *   GSI2PK = ORG#<orgId>       GSI2SK = RULE#<ruleId>   (rules by org)
 */

import { PutCommand, GetCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { getDocClient, tableName } from './client.js';
import { ulid } from '../../lib/id.js';
import { signCursor, verifyCursor } from '../cursor.js';
import { DB_PREFIXES, DB_SORT_KEYS, GSI_KEYS, GSI_INDEX_NAMES } from '../constants.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AssignmentRule {
  pk: string;
  sk: string;
  ruleId: string;
  funnelId: string;
  orgId: string;
  name: string;
  priority: number;
  zipPatterns: string[];
  dailyCap: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  gsi1pk: string;
  gsi1sk: string;
  gsi2pk: string;
  gsi2sk: string;
}

export interface CreateRuleInput {
  funnelId: string;
  orgId: string;
  name: string;
  priority: number;
  zipPatterns: string[];
  dailyCap: number;
  isActive?: boolean;
}

export interface UpdateRuleInput {
  ruleId: string;
  name?: string;
  priority?: number;
  zipPatterns?: string[];
  dailyCap?: number;
  isActive?: boolean;
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

export async function createRule(input: CreateRuleInput): Promise<AssignmentRule> {
  const doc = getDocClient();
  const ruleId = ulid();
  const now = new Date().toISOString();
  const priorityPad = String(input.priority).padStart(4, '0');

  const rule: AssignmentRule = {
    pk: `${DB_PREFIXES.RULE}${ruleId}`,
    sk: DB_SORT_KEYS.META,
    ruleId,
    funnelId: input.funnelId,
    orgId: input.orgId,
    name: input.name,
    priority: input.priority,
    zipPatterns: input.zipPatterns,
    dailyCap: input.dailyCap,
    isActive: input.isActive ?? true,
    createdAt: now,
    updatedAt: now,
    gsi1pk: `${GSI_KEYS.FUNNEL}${input.funnelId}`,
    gsi1sk: `${GSI_KEYS.PRIORITY}${priorityPad}`,
    gsi2pk: `${GSI_KEYS.ORG}${input.orgId}`,
    gsi2sk: `${DB_PREFIXES.RULE}${ruleId}`,
  };

  await doc.send(
    new PutCommand({
      TableName: tableName(),
      Item: rule,
      ConditionExpression: 'attribute_not_exists(pk)',
    })
  );

  console.log(
    JSON.stringify({ level: 'info', message: 'rule.created', ruleId, funnelId: input.funnelId })
  );

  return rule;
}

export async function getRule(ruleId: string): Promise<AssignmentRule | null> {
  const doc = getDocClient();
  const result = await doc.send(
    new GetCommand({
      TableName: tableName(),
      Key: { pk: `${DB_PREFIXES.RULE}${ruleId}`, sk: DB_SORT_KEYS.META },
    })
  );
  const item = result.Item as AssignmentRule | undefined;
  if (!item || item.deletedAt) return null;
  return item;
}

export async function updateRule(input: UpdateRuleInput): Promise<AssignmentRule> {
  const doc = getDocClient();
  const now = new Date().toISOString();

  const parts: string[] = ['#updatedAt = :updatedAt'];
  const names: Record<string, string> = { '#updatedAt': 'updatedAt' };
  const values: Record<string, unknown> = { ':updatedAt': now };

  if (input.name !== undefined) {
    parts.push('#name = :name');
    names['#name'] = 'name';
    values[':name'] = input.name;
  }
  if (input.priority !== undefined) {
    parts.push('priority = :priority');
    values[':priority'] = input.priority;
    const priorityPad = String(input.priority).padStart(4, '0');
    parts.push('gsi1sk = :gsi1sk');
    values[':gsi1sk'] = `${GSI_KEYS.PRIORITY}${priorityPad}`;
  }
  if (input.zipPatterns !== undefined) {
    parts.push('zipPatterns = :zp');
    values[':zp'] = input.zipPatterns;
  }
  if (input.dailyCap !== undefined) {
    parts.push('dailyCap = :dc');
    values[':dc'] = input.dailyCap;
  }
  if (input.isActive !== undefined) {
    parts.push('isActive = :active');
    values[':active'] = input.isActive;
  }

  const result = await doc.send(
    new UpdateCommand({
      TableName: tableName(),
      Key: { pk: `${DB_PREFIXES.RULE}${input.ruleId}`, sk: DB_SORT_KEYS.META },
      UpdateExpression: `SET ${parts.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ConditionExpression: 'attribute_exists(pk) AND attribute_not_exists(deletedAt)',
      ReturnValues: 'ALL_NEW',
    })
  );

  return result.Attributes as AssignmentRule;
}

export async function softDeleteRule(ruleId: string): Promise<void> {
  const doc = getDocClient();
  const now = new Date().toISOString();

  await doc.send(
    new UpdateCommand({
      TableName: tableName(),
      Key: { pk: `${DB_PREFIXES.RULE}${ruleId}`, sk: DB_SORT_KEYS.META },
      UpdateExpression: 'SET deletedAt = :d, #updatedAt = :u, isActive = :f',
      ExpressionAttributeNames: { '#updatedAt': 'updatedAt' },
      ExpressionAttributeValues: { ':d': now, ':u': now, ':f': false },
      ConditionExpression: 'attribute_exists(pk) AND attribute_not_exists(deletedAt)',
    })
  );
}

export interface PaginatedRules {
  items: AssignmentRule[];
  nextCursor?: string;
}

export async function listRules(
  funnelId?: string,
  cursor?: string,
  limit = 50
): Promise<PaginatedRules> {
  const doc = getDocClient();

  let exclusiveStartKey: Record<string, unknown> | undefined;
  if (cursor) {
    const verified = verifyCursor(cursor);
    if (verified) {
      exclusiveStartKey = verified;
    }
    // If verifyCursor returns null (invalid/tampered), skip setting ExclusiveStartKey
  }

  if (funnelId) {
    const result = await doc.send(
      new QueryCommand({
        TableName: tableName(),
        IndexName: GSI_INDEX_NAMES.GSI1,
        KeyConditionExpression: 'gsi1pk = :pk',
        FilterExpression: 'attribute_not_exists(deletedAt)',
        ExpressionAttributeValues: { ':pk': `${GSI_KEYS.FUNNEL}${funnelId}` },
        Limit: limit,
        ScanIndexForward: true, // ascending priority
        ExclusiveStartKey: exclusiveStartKey,
      })
    );

    const items = (result.Items || []) as AssignmentRule[];
    let nextCursor: string | undefined;
    if (result.LastEvaluatedKey) {
      nextCursor = signCursor(result.LastEvaluatedKey as Record<string, unknown>);
    }
    return { items, nextCursor };
  }

  // No funnelId - list all rules (less common, use scan)
  const { ScanCommand } = await import('@aws-sdk/lib-dynamodb');
  const result = await doc.send(
    new ScanCommand({
      TableName: tableName(),
      FilterExpression:
        'begins_with(pk, :prefix) AND sk = :meta AND attribute_not_exists(deletedAt)',
      ExpressionAttributeValues: { ':prefix': DB_PREFIXES.RULE, ':meta': DB_SORT_KEYS.META },
      Limit: limit,
      ExclusiveStartKey: exclusiveStartKey,
    })
  );

  const items = (result.Items || []) as AssignmentRule[];
  let nextCursor: string | undefined;
  if (result.LastEvaluatedKey) {
    nextCursor = signCursor(result.LastEvaluatedKey as Record<string, unknown>);
  }
  return { items, nextCursor };
}

/**
 * Get all active rules for a funnel, sorted by priority ascending.
 * Used by assignment matcher.
 */
export async function getRulesByFunnel(funnelId: string): Promise<AssignmentRule[]> {
  const doc = getDocClient();
  const rules: AssignmentRule[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const result = await doc.send(
      new QueryCommand({
        TableName: tableName(),
        IndexName: GSI_INDEX_NAMES.GSI1,
        KeyConditionExpression: 'gsi1pk = :pk',
        FilterExpression: 'isActive = :yes AND attribute_not_exists(deletedAt)',
        ExpressionAttributeValues: {
          ':pk': `${GSI_KEYS.FUNNEL}${funnelId}`,
          ':yes': true,
        },
        ScanIndexForward: true,
        ExclusiveStartKey: lastKey,
      })
    );

    rules.push(...((result.Items || []) as AssignmentRule[]));
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return rules;
}

/**
 * DynamoDB operations for Organisations
 *
 * Single-table access patterns:
 *   PK = ORG#<orgId>   SK = META
 *   GSI1PK = ORGS      GSI1SK = CREATED#<iso>  (for paginated list)
 */

import { PutCommand, GetCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { getDocClient, tableName } from './client.js';
import { ulid } from '../../lib/id.js';
import { sha256 } from '../hash.js';
import { signCursor, verifyCursor } from '../cursor.js';
import { DB_PREFIXES, DB_SORT_KEYS, GSI_KEYS, GSI_INDEX_NAMES } from '../constants.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Org {
  pk: string;
  sk: string;
  orgId: string;
  name: string;
  nameLower?: string;
  slug: string;
  contactEmail: string;
  phone?: string;
  timezone: string;
  notifyEmails: string[];
  notifySms: string[];
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  gsi1pk: string;
  gsi1sk: string;
}

export interface CreateOrgInput {
  name: string;
  slug: string;
  contactEmail: string;
  phone?: string;
  timezone?: string;
  notifyEmails?: string[];
  notifySms?: string[];
  settings?: Record<string, unknown>;
}

export interface UpdateOrgInput {
  orgId: string;
  name?: string;
  slug?: string;
  contactEmail?: string;
  phone?: string;
  timezone?: string;
  notifyEmails?: string[];
  notifySms?: string[];
  settings?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

function normalizeNameLower(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

export async function createOrg(input: CreateOrgInput): Promise<Org> {
  const doc = getDocClient();
  const orgId = ulid();
  const now = new Date().toISOString();

  const org: Org = {
    pk: `${DB_PREFIXES.ORG}${orgId}`,
    sk: DB_SORT_KEYS.META,
    orgId,
    name: input.name,
    nameLower: normalizeNameLower(input.name),
    slug: input.slug,
    contactEmail: input.contactEmail,
    phone: input.phone,
    timezone: input.timezone || 'America/New_York',
    notifyEmails: input.notifyEmails || [],
    notifySms: input.notifySms || [],
    settings: input.settings || {},
    createdAt: now,
    updatedAt: now,
    gsi1pk: GSI_KEYS.ORGS_LIST,
    gsi1sk: `${GSI_KEYS.CREATED}${now}`,
  };

  await doc.send(
    new PutCommand({
      TableName: tableName(),
      Item: org,
      ConditionExpression: 'attribute_not_exists(pk)',
    })
  );

  console.log(
    JSON.stringify({
      level: 'info',
      message: 'org.created',
      orgId,
      nameHash: sha256(input.name),
    })
  );

  return org;
}

export async function getOrg(orgId: string): Promise<Org | null> {
  const doc = getDocClient();
  const result = await doc.send(
    new GetCommand({
      TableName: tableName(),
      Key: { pk: `${DB_PREFIXES.ORG}${orgId}`, sk: DB_SORT_KEYS.META },
    })
  );
  const item = result.Item as Org | undefined;
  if (!item || item.deletedAt) return null;
  return item;
}

export async function updateOrg(input: UpdateOrgInput): Promise<Org> {
  const doc = getDocClient();
  const now = new Date().toISOString();

  const parts: string[] = ['#updatedAt = :updatedAt'];
  const names: Record<string, string> = { '#updatedAt': 'updatedAt' };
  const values: Record<string, unknown> = { ':updatedAt': now };

  if (input.name !== undefined) {
    parts.push('#name = :name');
    names['#name'] = 'name';
    values[':name'] = input.name;
    parts.push('#nameLower = :nameLower');
    names['#nameLower'] = 'nameLower';
    values[':nameLower'] = normalizeNameLower(input.name);
  }
  if (input.slug !== undefined) {
    parts.push('slug = :slug');
    values[':slug'] = input.slug;
  }
  if (input.contactEmail !== undefined) {
    parts.push('contactEmail = :contactEmail');
    values[':contactEmail'] = input.contactEmail;
  }
  if (input.phone !== undefined) {
    parts.push('phone = :phone');
    values[':phone'] = input.phone;
  }
  if (input.timezone !== undefined) {
    parts.push('timezone = :tz');
    values[':tz'] = input.timezone;
  }
  if (input.notifyEmails !== undefined) {
    parts.push('notifyEmails = :ne');
    values[':ne'] = input.notifyEmails;
  }
  if (input.notifySms !== undefined) {
    parts.push('notifySms = :ns');
    values[':ns'] = input.notifySms;
  }
  if (input.settings !== undefined) {
    parts.push('settings = :settings');
    values[':settings'] = input.settings;
  }

  const result = await doc.send(
    new UpdateCommand({
      TableName: tableName(),
      Key: { pk: `${DB_PREFIXES.ORG}${input.orgId}`, sk: DB_SORT_KEYS.META },
      UpdateExpression: `SET ${parts.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ConditionExpression: 'attribute_exists(pk) AND attribute_not_exists(deletedAt)',
      ReturnValues: 'ALL_NEW',
    })
  );

  return result.Attributes as Org;
}

export async function softDeleteOrg(orgId: string): Promise<void> {
  const doc = getDocClient();
  const now = new Date().toISOString();

  await doc.send(
    new UpdateCommand({
      TableName: tableName(),
      Key: { pk: `${DB_PREFIXES.ORG}${orgId}`, sk: DB_SORT_KEYS.META },
      UpdateExpression: 'SET deletedAt = :d, #updatedAt = :u',
      ExpressionAttributeNames: { '#updatedAt': 'updatedAt' },
      ExpressionAttributeValues: { ':d': now, ':u': now },
      ConditionExpression: 'attribute_exists(pk) AND attribute_not_exists(deletedAt)',
    })
  );
}

export interface PaginatedOrgs {
  items: Org[];
  nextCursor?: string;
}

export async function listOrgs(
  cursor?: string,
  limit = 25,
  search?: string
): Promise<PaginatedOrgs> {
  const doc = getDocClient();

  let exclusiveStartKey: Record<string, unknown> | undefined;
  if (cursor) {
    const verified = verifyCursor(cursor);
    if (verified) {
      exclusiveStartKey = verified;
    }
    // If verifyCursor returns null (invalid/tampered), skip setting ExclusiveStartKey
  }

  const filterExpressions: string[] = ['attribute_not_exists(deletedAt)'];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, unknown> = {
    ':pk': GSI_KEYS.ORGS_LIST,
  };

  if (search) {
    const normalized = search.trim().toLowerCase();
    if (normalized) {
      filterExpressions.push(
        '(contains(#nameLower, :search) OR contains(#slug, :search) OR contains(#orgId, :search))'
      );
      expressionAttributeNames['#nameLower'] = 'nameLower';
      expressionAttributeNames['#slug'] = 'slug';
      expressionAttributeNames['#orgId'] = 'orgId';
      expressionAttributeValues[':search'] = normalized;
    }
  }

  const result = await doc.send(
    new QueryCommand({
      TableName: tableName(),
      IndexName: GSI_INDEX_NAMES.GSI1,
      KeyConditionExpression: 'gsi1pk = :pk',
      FilterExpression: filterExpressions.join(' AND '),
      ExpressionAttributeNames:
        Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
      ExpressionAttributeValues: expressionAttributeValues,
      Limit: limit,
      ScanIndexForward: false,
      ExclusiveStartKey: exclusiveStartKey,
    })
  );

  const items = (result.Items || []) as Org[];
  let nextCursor: string | undefined;
  if (result.LastEvaluatedKey) {
    nextCursor = signCursor(result.LastEvaluatedKey as Record<string, unknown>);
  }

  return { items, nextCursor };
}

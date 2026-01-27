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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Org {
  pk: string;
  sk: string;
  orgId: string;
  name: string;
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

export async function createOrg(input: CreateOrgInput): Promise<Org> {
  const doc = getDocClient();
  const orgId = ulid();
  const now = new Date().toISOString();

  const org: Org = {
    pk: `ORG#${orgId}`,
    sk: 'META',
    orgId,
    name: input.name,
    slug: input.slug,
    contactEmail: input.contactEmail,
    phone: input.phone,
    timezone: input.timezone || 'America/New_York',
    notifyEmails: input.notifyEmails || [],
    notifySms: input.notifySms || [],
    settings: input.settings || {},
    createdAt: now,
    updatedAt: now,
    gsi1pk: 'ORGS',
    gsi1sk: `CREATED#${now}`,
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
      Key: { pk: `ORG#${orgId}`, sk: 'META' },
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
      Key: { pk: `ORG#${input.orgId}`, sk: 'META' },
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
      Key: { pk: `ORG#${orgId}`, sk: 'META' },
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

export async function listOrgs(cursor?: string, limit = 25): Promise<PaginatedOrgs> {
  const doc = getDocClient();

  let exclusiveStartKey: Record<string, unknown> | undefined;
  if (cursor) {
    try {
      exclusiveStartKey = JSON.parse(Buffer.from(cursor, 'base64url').toString());
    } catch {
      // invalid cursor, start from beginning
    }
  }

  const result = await doc.send(
    new QueryCommand({
      TableName: tableName(),
      IndexName: 'GSI1',
      KeyConditionExpression: 'gsi1pk = :pk',
      FilterExpression: 'attribute_not_exists(deletedAt)',
      ExpressionAttributeValues: { ':pk': 'ORGS' },
      Limit: limit,
      ScanIndexForward: false,
      ExclusiveStartKey: exclusiveStartKey,
    })
  );

  const items = (result.Items || []) as Org[];
  let nextCursor: string | undefined;
  if (result.LastEvaluatedKey) {
    nextCursor = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64url');
  }

  return { items, nextCursor };
}

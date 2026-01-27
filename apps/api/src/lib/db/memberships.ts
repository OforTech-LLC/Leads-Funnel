/**
 * DynamoDB operations for Org Memberships
 *
 * Single-table access patterns:
 *   PK = ORG#<orgId>     SK = MEMBER#<userId>   (org members)
 *   GSI1PK = USER#<userId>  GSI1SK = ORG#<orgId>  (user orgs)
 */

import {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { getDocClient, tableName } from './client.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MembershipRole = 'ORG_OWNER' | 'MANAGER' | 'AGENT' | 'VIEWER';

export interface Membership {
  pk: string;
  sk: string;
  orgId: string;
  userId: string;
  role: MembershipRole;
  notifyEmail: boolean;
  notifySms: boolean;
  joinedAt: string;
  updatedAt: string;
  gsi1pk: string;
  gsi1sk: string;
}

export interface AddMemberInput {
  orgId: string;
  userId: string;
  role: MembershipRole;
  notifyEmail?: boolean;
  notifySms?: boolean;
}

export interface UpdateMemberInput {
  orgId: string;
  userId: string;
  role?: MembershipRole;
  notifyEmail?: boolean;
  notifySms?: boolean;
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

export async function addMember(input: AddMemberInput): Promise<Membership> {
  const doc = getDocClient();
  const now = new Date().toISOString();

  const membership: Membership = {
    pk: `ORG#${input.orgId}`,
    sk: `MEMBER#${input.userId}`,
    orgId: input.orgId,
    userId: input.userId,
    role: input.role,
    notifyEmail: input.notifyEmail ?? true,
    notifySms: input.notifySms ?? false,
    joinedAt: now,
    updatedAt: now,
    gsi1pk: `USER#${input.userId}`,
    gsi1sk: `ORG#${input.orgId}`,
  };

  await doc.send(
    new PutCommand({
      TableName: tableName(),
      Item: membership,
      ConditionExpression: 'attribute_not_exists(pk) OR attribute_not_exists(sk)',
    })
  );

  return membership;
}

export async function getMember(orgId: string, userId: string): Promise<Membership | null> {
  const doc = getDocClient();
  const result = await doc.send(
    new GetCommand({
      TableName: tableName(),
      Key: { pk: `ORG#${orgId}`, sk: `MEMBER#${userId}` },
    })
  );
  return (result.Item as Membership) || null;
}

export async function updateMember(input: UpdateMemberInput): Promise<Membership> {
  const doc = getDocClient();
  const now = new Date().toISOString();

  const parts: string[] = ['#updatedAt = :updatedAt'];
  const names: Record<string, string> = { '#updatedAt': 'updatedAt' };
  const values: Record<string, unknown> = { ':updatedAt': now };

  if (input.role !== undefined) {
    parts.push('#role = :role');
    names['#role'] = 'role';
    values[':role'] = input.role;
  }
  if (input.notifyEmail !== undefined) {
    parts.push('notifyEmail = :ne');
    values[':ne'] = input.notifyEmail;
  }
  if (input.notifySms !== undefined) {
    parts.push('notifySms = :ns');
    values[':ns'] = input.notifySms;
  }

  const result = await doc.send(
    new UpdateCommand({
      TableName: tableName(),
      Key: { pk: `ORG#${input.orgId}`, sk: `MEMBER#${input.userId}` },
      UpdateExpression: `SET ${parts.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ConditionExpression: 'attribute_exists(pk)',
      ReturnValues: 'ALL_NEW',
    })
  );

  return result.Attributes as Membership;
}

export async function removeMember(orgId: string, userId: string): Promise<void> {
  const doc = getDocClient();
  await doc.send(
    new DeleteCommand({
      TableName: tableName(),
      Key: { pk: `ORG#${orgId}`, sk: `MEMBER#${userId}` },
      ConditionExpression: 'attribute_exists(pk)',
    })
  );
}

export interface PaginatedMemberships {
  items: Membership[];
  nextCursor?: string;
}

export async function listOrgMembers(
  orgId: string,
  cursor?: string,
  limit = 50
): Promise<PaginatedMemberships> {
  const doc = getDocClient();

  let exclusiveStartKey: Record<string, unknown> | undefined;
  if (cursor) {
    try {
      exclusiveStartKey = JSON.parse(Buffer.from(cursor, 'base64url').toString());
    } catch {
      // invalid cursor
    }
  }

  const result = await doc.send(
    new QueryCommand({
      TableName: tableName(),
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': `ORG#${orgId}`,
        ':skPrefix': 'MEMBER#',
      },
      Limit: limit,
      ExclusiveStartKey: exclusiveStartKey,
    })
  );

  const items = (result.Items || []) as Membership[];
  let nextCursor: string | undefined;
  if (result.LastEvaluatedKey) {
    nextCursor = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64url');
  }

  return { items, nextCursor };
}

export async function listUserOrgs(
  userId: string,
  cursor?: string,
  limit = 50
): Promise<PaginatedMemberships> {
  const doc = getDocClient();

  let exclusiveStartKey: Record<string, unknown> | undefined;
  if (cursor) {
    try {
      exclusiveStartKey = JSON.parse(Buffer.from(cursor, 'base64url').toString());
    } catch {
      // invalid cursor
    }
  }

  const result = await doc.send(
    new QueryCommand({
      TableName: tableName(),
      IndexName: 'GSI1',
      KeyConditionExpression: 'gsi1pk = :pk AND begins_with(gsi1sk, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':skPrefix': 'ORG#',
      },
      Limit: limit,
      ExclusiveStartKey: exclusiveStartKey,
    })
  );

  const items = (result.Items || []) as Membership[];
  let nextCursor: string | undefined;
  if (result.LastEvaluatedKey) {
    nextCursor = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64url');
  }

  return { items, nextCursor };
}

/**
 * Get all members of an org who should receive notifications.
 */
export async function getOrgNotifyRecipients(orgId: string): Promise<Membership[]> {
  const doc = getDocClient();
  const recipients: Membership[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const result = await doc.send(
      new QueryCommand({
        TableName: tableName(),
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :skPrefix)',
        FilterExpression: 'notifyEmail = :yes OR notifySms = :yes',
        ExpressionAttributeValues: {
          ':pk': `ORG#${orgId}`,
          ':skPrefix': 'MEMBER#',
          ':yes': true,
        },
        ExclusiveStartKey: lastKey,
      })
    );

    recipients.push(...((result.Items || []) as Membership[]));
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return recipients;
}

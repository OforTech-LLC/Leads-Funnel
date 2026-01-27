/**
 * DynamoDB operations for Users
 *
 * Single-table access patterns:
 *   PK = USER#<userId>   SK = META
 *   GSI1PK = EMAIL#<email>  GSI1SK = META       (lookup by email)
 *   GSI2PK = COGNITOSUB#<sub> GSI2SK = META     (lookup by Cognito sub)
 *   GSI3PK = USERS        GSI3SK = CREATED#<iso> (paginated list)
 */

import { PutCommand, GetCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { getDocClient, tableName } from './client.js';
import { ulid } from '../../lib/id.js';
import { sha256 } from '../hash.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface User {
  pk: string;
  sk: string;
  userId: string;
  cognitoSub?: string;
  email: string;
  name: string;
  phone?: string;
  avatarUrl?: string;
  preferences: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  gsi1pk: string;
  gsi1sk: string;
  gsi2pk?: string;
  gsi2sk?: string;
  gsi3pk: string;
  gsi3sk: string;
}

export interface CreateUserInput {
  email: string;
  name: string;
  cognitoSub?: string;
  phone?: string;
  avatarUrl?: string;
  preferences?: Record<string, unknown>;
}

export interface UpdateUserInput {
  userId: string;
  email?: string;
  name?: string;
  cognitoSub?: string;
  phone?: string;
  avatarUrl?: string;
  preferences?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

export async function createUser(input: CreateUserInput): Promise<User> {
  const doc = getDocClient();
  const userId = ulid();
  const now = new Date().toISOString();
  const emailLower = input.email.toLowerCase().trim();

  const user: User = {
    pk: `USER#${userId}`,
    sk: 'META',
    userId,
    cognitoSub: input.cognitoSub,
    email: emailLower,
    name: input.name,
    phone: input.phone,
    avatarUrl: input.avatarUrl,
    preferences: input.preferences || {},
    createdAt: now,
    updatedAt: now,
    gsi1pk: `EMAIL#${emailLower}`,
    gsi1sk: 'META',
    gsi2pk: input.cognitoSub ? `COGNITOSUB#${input.cognitoSub}` : undefined,
    gsi2sk: input.cognitoSub ? 'META' : undefined,
    gsi3pk: 'USERS',
    gsi3sk: `CREATED#${now}`,
  };

  await doc.send(
    new PutCommand({
      TableName: tableName(),
      Item: user,
      ConditionExpression: 'attribute_not_exists(pk)',
    })
  );

  console.log(
    JSON.stringify({
      level: 'info',
      message: 'user.created',
      userId,
      emailHash: sha256(emailLower),
    })
  );

  return user;
}

export async function getUser(userId: string): Promise<User | null> {
  const doc = getDocClient();
  const result = await doc.send(
    new GetCommand({
      TableName: tableName(),
      Key: { pk: `USER#${userId}`, sk: 'META' },
    })
  );
  const item = result.Item as User | undefined;
  if (!item || item.deletedAt) return null;
  return item;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const doc = getDocClient();
  const emailLower = email.toLowerCase().trim();

  const result = await doc.send(
    new QueryCommand({
      TableName: tableName(),
      IndexName: 'GSI1',
      KeyConditionExpression: 'gsi1pk = :pk AND gsi1sk = :sk',
      FilterExpression: 'attribute_not_exists(deletedAt)',
      ExpressionAttributeValues: {
        ':pk': `EMAIL#${emailLower}`,
        ':sk': 'META',
      },
      Limit: 1,
    })
  );

  const items = result.Items || [];
  return items.length > 0 ? (items[0] as User) : null;
}

export async function getUserByCognitoSub(cognitoSub: string): Promise<User | null> {
  const doc = getDocClient();

  const result = await doc.send(
    new QueryCommand({
      TableName: tableName(),
      IndexName: 'GSI2',
      KeyConditionExpression: 'gsi2pk = :pk AND gsi2sk = :sk',
      FilterExpression: 'attribute_not_exists(deletedAt)',
      ExpressionAttributeValues: {
        ':pk': `COGNITOSUB#${cognitoSub}`,
        ':sk': 'META',
      },
      Limit: 1,
    })
  );

  const items = result.Items || [];
  return items.length > 0 ? (items[0] as User) : null;
}

export async function updateUser(input: UpdateUserInput): Promise<User> {
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
  if (input.email !== undefined) {
    const emailLower = input.email.toLowerCase().trim();
    parts.push('email = :email, gsi1pk = :gsi1pk');
    values[':email'] = emailLower;
    values[':gsi1pk'] = `EMAIL#${emailLower}`;
  }
  if (input.cognitoSub !== undefined) {
    parts.push('cognitoSub = :sub, gsi2pk = :gsi2pk, gsi2sk = :gsi2sk');
    values[':sub'] = input.cognitoSub;
    values[':gsi2pk'] = `COGNITOSUB#${input.cognitoSub}`;
    values[':gsi2sk'] = 'META';
  }
  if (input.phone !== undefined) {
    parts.push('phone = :phone');
    values[':phone'] = input.phone;
  }
  if (input.avatarUrl !== undefined) {
    parts.push('avatarUrl = :avatar');
    values[':avatar'] = input.avatarUrl;
  }
  if (input.preferences !== undefined) {
    parts.push('preferences = :prefs');
    values[':prefs'] = input.preferences;
  }

  const result = await doc.send(
    new UpdateCommand({
      TableName: tableName(),
      Key: { pk: `USER#${input.userId}`, sk: 'META' },
      UpdateExpression: `SET ${parts.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ConditionExpression: 'attribute_exists(pk) AND attribute_not_exists(deletedAt)',
      ReturnValues: 'ALL_NEW',
    })
  );

  return result.Attributes as User;
}

export async function softDeleteUser(userId: string): Promise<void> {
  const doc = getDocClient();
  const now = new Date().toISOString();

  await doc.send(
    new UpdateCommand({
      TableName: tableName(),
      Key: { pk: `USER#${userId}`, sk: 'META' },
      UpdateExpression: 'SET deletedAt = :d, #updatedAt = :u',
      ExpressionAttributeNames: { '#updatedAt': 'updatedAt' },
      ExpressionAttributeValues: { ':d': now, ':u': now },
      ConditionExpression: 'attribute_exists(pk) AND attribute_not_exists(deletedAt)',
    })
  );
}

export interface PaginatedUsers {
  items: User[];
  nextCursor?: string;
}

export async function listUsers(cursor?: string, limit = 25): Promise<PaginatedUsers> {
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
      IndexName: 'GSI3',
      KeyConditionExpression: 'gsi3pk = :pk',
      FilterExpression: 'attribute_not_exists(deletedAt)',
      ExpressionAttributeValues: { ':pk': 'USERS' },
      Limit: limit,
      ScanIndexForward: false,
      ExclusiveStartKey: exclusiveStartKey,
    })
  );

  const items = (result.Items || []) as User[];
  let nextCursor: string | undefined;
  if (result.LastEvaluatedKey) {
    nextCursor = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64url');
  }

  return { items, nextCursor };
}

/**
 * DynamoDB operations for Org Memberships
 *
 * Single-table access patterns:
 *   PK = ORG#<orgId>     SK = MEMBER#<userId>   (org members)
 *   GSI1PK = USER#<userId>  GSI1SK = ORG#<orgId>  (user orgs)
 */
import { PutCommand, GetCommand, UpdateCommand, DeleteCommand, QueryCommand, } from '@aws-sdk/lib-dynamodb';
import { getDocClient } from './client.js';
import { getMembershipsTableName } from './table-names.js';
import { signCursor, verifyCursor } from '../cursor.js';
import { DB_PREFIXES, GSI_KEYS, GSI_INDEX_NAMES } from '../constants.js';
import { ulid } from '../../lib/id.js';
// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------
export async function addMember(input) {
    const doc = getDocClient();
    const now = new Date().toISOString();
    const membership = {
        pk: `${DB_PREFIXES.ORG}${input.orgId}`,
        sk: `${GSI_KEYS.MEMBER}${input.userId}`,
        orgId: input.orgId,
        userId: input.userId,
        role: input.role,
        notifyEmail: input.notifyEmail ?? true,
        notifySms: input.notifySms ?? false,
        joinedAt: now,
        updatedAt: now,
        gsi1pk: `${DB_PREFIXES.USER}${input.userId}`,
        gsi1sk: `${DB_PREFIXES.ORG}${input.orgId}`,
    };
    await doc.send(new PutCommand({
        TableName: getMembershipsTableName(),
        Item: membership,
        ConditionExpression: 'attribute_not_exists(pk) OR attribute_not_exists(sk)',
    }));
    return membership;
}
export async function getMember(orgId, userId) {
    const doc = getDocClient();
    const result = await doc.send(new GetCommand({
        TableName: getMembershipsTableName(),
        Key: { pk: `${DB_PREFIXES.ORG}${orgId}`, sk: `${GSI_KEYS.MEMBER}${userId}` },
    }));
    return result.Item || null;
}
export async function updateMember(input) {
    const doc = getDocClient();
    const now = new Date().toISOString();
    const parts = ['#updatedAt = :updatedAt'];
    const names = { '#updatedAt': 'updatedAt' };
    const values = { ':updatedAt': now };
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
    const result = await doc.send(new UpdateCommand({
        TableName: getMembershipsTableName(),
        Key: { pk: `${DB_PREFIXES.ORG}${input.orgId}`, sk: `${GSI_KEYS.MEMBER}${input.userId}` },
        UpdateExpression: `SET ${parts.join(', ')}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ConditionExpression: 'attribute_exists(pk)',
        ReturnValues: 'ALL_NEW',
    }));
    return result.Attributes;
}
export async function removeMember(orgId, userId) {
    const doc = getDocClient();
    await doc.send(new DeleteCommand({
        TableName: getMembershipsTableName(),
        Key: { pk: `${DB_PREFIXES.ORG}${orgId}`, sk: `${GSI_KEYS.MEMBER}${userId}` },
        ConditionExpression: 'attribute_exists(pk)',
    }));
}
export async function listOrgMembers(orgId, cursor, limit = 50) {
    const doc = getDocClient();
    let exclusiveStartKey;
    if (cursor) {
        const verified = verifyCursor(cursor);
        if (verified) {
            exclusiveStartKey = verified;
        }
        // If verifyCursor returns null (invalid/tampered), skip setting ExclusiveStartKey
    }
    const result = await doc.send(new QueryCommand({
        TableName: getMembershipsTableName(),
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :skPrefix)',
        ExpressionAttributeValues: {
            ':pk': `${DB_PREFIXES.ORG}${orgId}`,
            ':skPrefix': GSI_KEYS.MEMBER,
        },
        Limit: limit,
        ExclusiveStartKey: exclusiveStartKey,
    }));
    const items = (result.Items || []);
    let nextCursor;
    if (result.LastEvaluatedKey) {
        nextCursor = signCursor(result.LastEvaluatedKey);
    }
    return { items, nextCursor };
}
export async function listUserOrgs(userId, cursor, limit = 50) {
    const doc = getDocClient();
    let exclusiveStartKey;
    if (cursor) {
        const verified = verifyCursor(cursor);
        if (verified) {
            exclusiveStartKey = verified;
        }
        // If verifyCursor returns null (invalid/tampered), skip setting ExclusiveStartKey
    }
    const result = await doc.send(new QueryCommand({
        TableName: getMembershipsTableName(),
        IndexName: GSI_INDEX_NAMES.GSI1,
        KeyConditionExpression: 'gsi1pk = :pk AND begins_with(gsi1sk, :skPrefix)',
        ExpressionAttributeValues: {
            ':pk': `${DB_PREFIXES.USER}${userId}`,
            ':skPrefix': DB_PREFIXES.ORG,
        },
        Limit: limit,
        ExclusiveStartKey: exclusiveStartKey,
    }));
    const items = (result.Items || []);
    let nextCursor;
    if (result.LastEvaluatedKey) {
        nextCursor = signCursor(result.LastEvaluatedKey);
    }
    return { items, nextCursor };
}
// ---------------------------------------------------------------------------
// Invites
// ---------------------------------------------------------------------------
const INVITE_TTL_DAYS = 7;
export async function createInvite(input) {
    const doc = getDocClient();
    const now = new Date();
    const nowIso = now.toISOString();
    const expiresAt = new Date(now.getTime() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const ttl = Math.floor(now.getTime() / 1000) + INVITE_TTL_DAYS * 24 * 60 * 60;
    const inviteId = ulid();
    const emailLower = input.email.toLowerCase().trim();
    const invite = {
        pk: `${DB_PREFIXES.ORG}${input.orgId}`,
        sk: `${GSI_KEYS.INVITE}${emailLower}`,
        orgId: input.orgId,
        inviteId,
        email: emailLower,
        role: input.role,
        status: 'pending',
        invitedBy: input.invitedBy,
        invitedByName: input.invitedByName,
        createdAt: nowIso,
        expiresAt,
        ttl,
    };
    await doc.send(new PutCommand({
        TableName: getMembershipsTableName(),
        Item: invite,
        ConditionExpression: 'attribute_not_exists(pk) OR attribute_not_exists(sk)',
    }));
    return invite;
}
export async function listInvites(orgId, cursor, limit = 50) {
    const doc = getDocClient();
    let exclusiveStartKey;
    if (cursor) {
        const verified = verifyCursor(cursor);
        if (verified) {
            exclusiveStartKey = verified;
        }
    }
    const result = await doc.send(new QueryCommand({
        TableName: getMembershipsTableName(),
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :skPrefix)',
        ExpressionAttributeValues: {
            ':pk': `${DB_PREFIXES.ORG}${orgId}`,
            ':skPrefix': GSI_KEYS.INVITE,
        },
        Limit: limit,
        ExclusiveStartKey: exclusiveStartKey,
    }));
    const items = (result.Items || []);
    let nextCursor;
    if (result.LastEvaluatedKey) {
        nextCursor = signCursor(result.LastEvaluatedKey);
    }
    return { items, nextCursor };
}
/**
 * Get all members of an org who should receive notifications.
 */
export async function getOrgNotifyRecipients(orgId) {
    const doc = getDocClient();
    const recipients = [];
    let lastKey;
    do {
        const result = await doc.send(new QueryCommand({
            TableName: getMembershipsTableName(),
            KeyConditionExpression: 'pk = :pk AND begins_with(sk, :skPrefix)',
            FilterExpression: 'notifyEmail = :yes OR notifySms = :yes',
            ExpressionAttributeValues: {
                ':pk': `${DB_PREFIXES.ORG}${orgId}`,
                ':skPrefix': GSI_KEYS.MEMBER,
                ':yes': true,
            },
            ExclusiveStartKey: lastKey,
        }));
        recipients.push(...(result.Items || []));
        lastKey = result.LastEvaluatedKey;
    } while (lastKey);
    return recipients;
}
//# sourceMappingURL=memberships.js.map
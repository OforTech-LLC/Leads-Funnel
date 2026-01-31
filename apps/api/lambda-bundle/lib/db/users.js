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
import { getDocClient } from './client.js';
import { getUsersTableName } from './table-names.js';
import { ulid } from '../../lib/id.js';
import { sha256 } from '../hash.js';
import { signCursor, verifyCursor } from '../cursor.js';
import { DB_PREFIXES, DB_SORT_KEYS, GSI_KEYS, GSI_INDEX_NAMES } from '../constants.js';
function normalizeNameLower(name) {
    return name.trim().replace(/\s+/g, ' ').toLowerCase();
}
// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------
export async function createUser(input) {
    const doc = getDocClient();
    const userId = ulid();
    const now = new Date().toISOString();
    const emailLower = input.email.toLowerCase().trim();
    const user = {
        pk: `${DB_PREFIXES.USER}${userId}`,
        sk: DB_SORT_KEYS.META,
        userId,
        cognitoSub: input.cognitoSub,
        email: emailLower,
        name: input.name,
        nameLower: normalizeNameLower(input.name),
        status: input.status || 'active',
        phone: input.phone,
        avatarUrl: input.avatarUrl,
        preferences: input.preferences || {},
        createdAt: now,
        updatedAt: now,
        gsi1pk: `${GSI_KEYS.EMAIL}${emailLower}`,
        gsi1sk: DB_SORT_KEYS.META,
        gsi2pk: input.cognitoSub ? `${GSI_KEYS.COGNITOSUB}${input.cognitoSub}` : undefined,
        gsi2sk: input.cognitoSub ? DB_SORT_KEYS.META : undefined,
        gsi3pk: GSI_KEYS.USERS_LIST,
        gsi3sk: `${GSI_KEYS.CREATED}${now}`,
    };
    await doc.send(new PutCommand({
        TableName: getUsersTableName(),
        Item: user,
        ConditionExpression: 'attribute_not_exists(pk)',
    }));
    console.log(JSON.stringify({
        level: 'info',
        message: 'user.created',
        userId,
        emailHash: sha256(emailLower),
    }));
    return user;
}
export async function getUser(userId) {
    const doc = getDocClient();
    const result = await doc.send(new GetCommand({
        TableName: getUsersTableName(),
        Key: { pk: `${DB_PREFIXES.USER}${userId}`, sk: DB_SORT_KEYS.META },
    }));
    const item = result.Item;
    if (!item || item.deletedAt)
        return null;
    return item;
}
export async function getUserByEmail(email) {
    const doc = getDocClient();
    const emailLower = email.toLowerCase().trim();
    const result = await doc.send(new QueryCommand({
        TableName: getUsersTableName(),
        IndexName: GSI_INDEX_NAMES.GSI1,
        KeyConditionExpression: 'gsi1pk = :pk AND gsi1sk = :sk',
        FilterExpression: 'attribute_not_exists(deletedAt)',
        ExpressionAttributeValues: {
            ':pk': `${GSI_KEYS.EMAIL}${emailLower}`,
            ':sk': DB_SORT_KEYS.META,
        },
        Limit: 1,
    }));
    const items = result.Items || [];
    return items.length > 0 ? items[0] : null;
}
export async function getUserByCognitoSub(cognitoSub) {
    const doc = getDocClient();
    const result = await doc.send(new QueryCommand({
        TableName: getUsersTableName(),
        IndexName: GSI_INDEX_NAMES.GSI2,
        KeyConditionExpression: 'gsi2pk = :pk AND gsi2sk = :sk',
        FilterExpression: 'attribute_not_exists(deletedAt)',
        ExpressionAttributeValues: {
            ':pk': `${GSI_KEYS.COGNITOSUB}${cognitoSub}`,
            ':sk': DB_SORT_KEYS.META,
        },
        Limit: 1,
    }));
    const items = result.Items || [];
    return items.length > 0 ? items[0] : null;
}
export async function updateUser(input) {
    const doc = getDocClient();
    const now = new Date().toISOString();
    const parts = ['#updatedAt = :updatedAt'];
    const names = { '#updatedAt': 'updatedAt' };
    const values = { ':updatedAt': now };
    if (input.name !== undefined) {
        parts.push('#name = :name');
        names['#name'] = 'name';
        values[':name'] = input.name;
        parts.push('nameLower = :nameLower');
        values[':nameLower'] = normalizeNameLower(input.name);
    }
    if (input.email !== undefined) {
        const emailLower = input.email.toLowerCase().trim();
        parts.push('email = :email, gsi1pk = :gsi1pk');
        values[':email'] = emailLower;
        values[':gsi1pk'] = `${GSI_KEYS.EMAIL}${emailLower}`;
    }
    if (input.cognitoSub !== undefined) {
        parts.push('cognitoSub = :sub, gsi2pk = :gsi2pk, gsi2sk = :gsi2sk');
        values[':sub'] = input.cognitoSub;
        values[':gsi2pk'] = `${GSI_KEYS.COGNITOSUB}${input.cognitoSub}`;
        values[':gsi2sk'] = DB_SORT_KEYS.META;
    }
    if (input.status !== undefined) {
        parts.push('status = :status');
        values[':status'] = input.status;
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
    const result = await doc.send(new UpdateCommand({
        TableName: getUsersTableName(),
        Key: { pk: `${DB_PREFIXES.USER}${input.userId}`, sk: DB_SORT_KEYS.META },
        UpdateExpression: `SET ${parts.join(', ')}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ConditionExpression: 'attribute_exists(pk) AND attribute_not_exists(deletedAt)',
        ReturnValues: 'ALL_NEW',
    }));
    return result.Attributes;
}
export async function softDeleteUser(userId) {
    const doc = getDocClient();
    const now = new Date().toISOString();
    await doc.send(new UpdateCommand({
        TableName: getUsersTableName(),
        Key: { pk: `${DB_PREFIXES.USER}${userId}`, sk: DB_SORT_KEYS.META },
        UpdateExpression: 'SET deletedAt = :d, #updatedAt = :u',
        ExpressionAttributeNames: { '#updatedAt': 'updatedAt' },
        ExpressionAttributeValues: { ':d': now, ':u': now },
        ConditionExpression: 'attribute_exists(pk) AND attribute_not_exists(deletedAt)',
    }));
}
export async function listUsers(input = {}) {
    const doc = getDocClient();
    const limit = input.limit ?? 25;
    let exclusiveStartKey;
    if (input.cursor) {
        const verified = verifyCursor(input.cursor);
        if (verified) {
            exclusiveStartKey = verified;
        }
        // If verifyCursor returns null (invalid/tampered), skip setting ExclusiveStartKey
    }
    const filterExpressions = ['attribute_not_exists(deletedAt)'];
    const expressionNames = {};
    const expressionValues = { ':pk': GSI_KEYS.USERS_LIST };
    if (input.status) {
        expressionNames['#status'] = 'status';
        expressionValues[':status'] = input.status;
        filterExpressions.push('#status = :status');
    }
    if (input.search) {
        const searchRaw = input.search.trim();
        if (searchRaw.length > 0) {
            const searchLower = searchRaw.toLowerCase();
            expressionNames['#nameLower'] = 'nameLower';
            expressionNames['#name'] = 'name';
            expressionValues[':search'] = searchLower;
            expressionValues[':searchRaw'] = searchRaw;
            filterExpressions.push('(contains(email, :search) OR contains(#nameLower, :search) OR contains(#name, :searchRaw))');
        }
    }
    const result = await doc.send(new QueryCommand({
        TableName: getUsersTableName(),
        IndexName: GSI_INDEX_NAMES.GSI3,
        KeyConditionExpression: 'gsi3pk = :pk',
        FilterExpression: filterExpressions.join(' AND '),
        ExpressionAttributeNames: Object.keys(expressionNames).length > 0 ? expressionNames : undefined,
        ExpressionAttributeValues: expressionValues,
        Limit: limit,
        ScanIndexForward: false,
        ExclusiveStartKey: exclusiveStartKey,
    }));
    const items = (result.Items || []);
    let nextCursor;
    if (result.LastEvaluatedKey) {
        nextCursor = signCursor(result.LastEvaluatedKey);
    }
    return { items, nextCursor };
}
//# sourceMappingURL=users.js.map
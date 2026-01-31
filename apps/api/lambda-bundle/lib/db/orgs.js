/**
 * DynamoDB operations for Organisations
 *
 * Single-table access patterns:
 *   PK = ORG#<orgId>   SK = META
 *   GSI1PK = ORGS      GSI1SK = CREATED#<iso>  (for paginated list)
 */
import { PutCommand, GetCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { getDocClient } from './client.js';
import { getOrgsTableName } from './table-names.js';
import { ulid } from '../../lib/id.js';
import { sha256 } from '../hash.js';
import { signCursor, verifyCursor } from '../cursor.js';
import { DB_PREFIXES, DB_SORT_KEYS, GSI_KEYS, GSI_INDEX_NAMES } from '../constants.js';
// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------
function normalizeNameLower(name) {
    return name.trim().replace(/\s+/g, ' ').toLowerCase();
}
export async function createOrg(input) {
    const doc = getDocClient();
    const orgId = ulid();
    const now = new Date().toISOString();
    const org = {
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
    await doc.send(new PutCommand({
        TableName: getOrgsTableName(),
        Item: org,
        ConditionExpression: 'attribute_not_exists(pk)',
    }));
    console.log(JSON.stringify({
        level: 'info',
        message: 'org.created',
        orgId,
        nameHash: sha256(input.name),
    }));
    return org;
}
export async function getOrg(orgId) {
    const doc = getDocClient();
    const result = await doc.send(new GetCommand({
        TableName: getOrgsTableName(),
        Key: { pk: `${DB_PREFIXES.ORG}${orgId}`, sk: DB_SORT_KEYS.META },
    }));
    const item = result.Item;
    if (!item || item.deletedAt)
        return null;
    return item;
}
export async function updateOrg(input) {
    const doc = getDocClient();
    const now = new Date().toISOString();
    const parts = ['#updatedAt = :updatedAt'];
    const names = { '#updatedAt': 'updatedAt' };
    const values = { ':updatedAt': now };
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
    const result = await doc.send(new UpdateCommand({
        TableName: getOrgsTableName(),
        Key: { pk: `${DB_PREFIXES.ORG}${input.orgId}`, sk: DB_SORT_KEYS.META },
        UpdateExpression: `SET ${parts.join(', ')}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ConditionExpression: 'attribute_exists(pk) AND attribute_not_exists(deletedAt)',
        ReturnValues: 'ALL_NEW',
    }));
    return result.Attributes;
}
export async function softDeleteOrg(orgId) {
    const doc = getDocClient();
    const now = new Date().toISOString();
    await doc.send(new UpdateCommand({
        TableName: getOrgsTableName(),
        Key: { pk: `${DB_PREFIXES.ORG}${orgId}`, sk: DB_SORT_KEYS.META },
        UpdateExpression: 'SET deletedAt = :d, #updatedAt = :u',
        ExpressionAttributeNames: { '#updatedAt': 'updatedAt' },
        ExpressionAttributeValues: { ':d': now, ':u': now },
        ConditionExpression: 'attribute_exists(pk) AND attribute_not_exists(deletedAt)',
    }));
}
export async function listOrgs(cursor, limit = 25, search) {
    const doc = getDocClient();
    let exclusiveStartKey;
    if (cursor) {
        const verified = verifyCursor(cursor);
        if (verified) {
            exclusiveStartKey = verified;
        }
        // If verifyCursor returns null (invalid/tampered), skip setting ExclusiveStartKey
    }
    const filterExpressions = ['attribute_not_exists(deletedAt)'];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {
        ':pk': GSI_KEYS.ORGS_LIST,
    };
    if (search) {
        const normalized = search.trim().toLowerCase();
        if (normalized) {
            filterExpressions.push('(contains(#nameLower, :search) OR contains(#slug, :search) OR contains(#orgId, :search))');
            expressionAttributeNames['#nameLower'] = 'nameLower';
            expressionAttributeNames['#slug'] = 'slug';
            expressionAttributeNames['#orgId'] = 'orgId';
            expressionAttributeValues[':search'] = normalized;
        }
    }
    const result = await doc.send(new QueryCommand({
        TableName: getOrgsTableName(),
        IndexName: GSI_INDEX_NAMES.GSI1,
        KeyConditionExpression: 'gsi1pk = :pk',
        FilterExpression: filterExpressions.join(' AND '),
        ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
        ExpressionAttributeValues: expressionAttributeValues,
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
//# sourceMappingURL=orgs.js.map
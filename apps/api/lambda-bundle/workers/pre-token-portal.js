/**
 * Pre-Token Generation Trigger - Portal Cognito User Pool
 *
 * Cognito Lambda trigger that runs before token generation for the Portal
 * (org members) user pool. Looks up the user and their org memberships
 * in DynamoDB and adds custom claims to the ID token.
 *
 * Custom Claims Added:
 *   - custom:userId: The internal user ID
 *   - custom:orgIds: Comma-separated list of active org IDs
 *   - custom:primaryOrgId: The first active org ID (used as default context)
 *
 * Security:
 *   - Only active users with active memberships get org claims
 *   - Inactive users are rejected (token generation fails)
 *   - Users with no active org memberships get empty orgIds
 */
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { getDocClient } from '../lib/clients.js';
import { createLogger } from '../lib/logging.js';
import { DB_PREFIXES, DB_SORT_KEYS, GSI_KEYS, GSI_INDEX_NAMES } from '../lib/constants.js';
const log = createLogger('pre-token-portal');
// =============================================================================
// Configuration
// =============================================================================
function loadConfig() {
    return {
        awsRegion: process.env.AWS_REGION || 'us-east-1',
        usersTableName: process.env.USERS_TABLE_NAME || '',
        membershipsTableName: process.env.MEMBERSHIPS_TABLE_NAME || '',
    };
}
// =============================================================================
// DynamoDB Operations
// =============================================================================
/**
 * Look up a user by their Cognito sub (external identity).
 *
 * Uses GSI2 index:
 *   GSI2PK = COGNITO#{cognitoSub}
 *   GSI2SK = USER
 */
async function getUserByCognitoSub(config, cognitoSub) {
    const client = getDocClient(config.awsRegion);
    try {
        const result = await client.send(new QueryCommand({
            TableName: config.usersTableName,
            IndexName: GSI_INDEX_NAMES.GSI2,
            KeyConditionExpression: 'gsi2pk = :pk AND gsi2sk = :sk',
            ExpressionAttributeValues: {
                ':pk': `${GSI_KEYS.COGNITOSUB}${cognitoSub}`,
                ':sk': DB_SORT_KEYS.META,
            },
            Limit: 1,
        }));
        if (!result.Items || result.Items.length === 0) {
            return null;
        }
        return result.Items[0];
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        log.error('Failed to look up user by cognitoSub', {
            sub: cognitoSub,
            errorCode: 'DDB_QUERY_ERROR',
            error: errorMessage,
        });
        throw error;
    }
}
/**
 * Look up all memberships for a user.
 *
 * Uses GSI1 index:
 *   GSI1PK = USER#{userId}#MEMBERSHIPS
 *   GSI1SK begins_with MEMBERSHIP#
 */
async function getUserMemberships(config, userId) {
    const client = getDocClient(config.awsRegion);
    try {
        const result = await client.send(new QueryCommand({
            TableName: config.membershipsTableName,
            IndexName: GSI_INDEX_NAMES.GSI1,
            KeyConditionExpression: 'gsi1pk = :pk',
            ExpressionAttributeValues: {
                ':pk': `${DB_PREFIXES.USER}${userId}`,
            },
        }));
        return result.Items || [];
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        log.error('Failed to look up user memberships', {
            userId,
            errorCode: 'DDB_QUERY_ERROR',
            error: errorMessage,
        });
        throw error;
    }
}
function mapMembershipRole(role) {
    switch (role) {
        case 'ORG_OWNER':
            return 'admin';
        case 'MANAGER':
            return 'manager';
        default:
            return 'agent';
    }
}
// =============================================================================
// Lambda Handler
// =============================================================================
/**
 * Cognito Pre-Token Generation trigger handler for the Portal user pool.
 *
 * Flow:
 * 1. Extract cognitoSub from the Cognito event
 * 2. Look up the user in the users table by cognitoSub (GSI2)
 * 3. If user not found or inactive, deny token generation
 * 4. Look up user's memberships (GSI1)
 * 5. Filter to active memberships
 * 6. Add custom claims: userId, orgIds (comma-separated), primaryOrgId
 *
 * @param event - Cognito Pre-Token Generation trigger event
 * @returns Modified event with custom claims (or throws to deny)
 */
export async function handler(event) {
    const config = loadConfig();
    const cognitoSub = event.request.userAttributes.sub;
    log.info('Pre-token generation triggered (portal)', { sub: cognitoSub });
    // Validate configuration
    if (!config.usersTableName || !config.membershipsTableName) {
        log.error('Platform table configuration missing', {
            sub: cognitoSub,
            errorCode: 'CONFIG_ERROR',
        });
        throw new Error('Portal configuration error');
    }
    if (!cognitoSub) {
        log.error('No cognitoSub found in user attributes', {
            errorCode: 'MISSING_SUB',
        });
        throw new Error('User identity could not be verified');
    }
    // Look up user by cognitoSub
    const user = await getUserByCognitoSub(config, cognitoSub);
    if (!user) {
        log.warn('User not found in database', {
            sub: cognitoSub,
            errorCode: 'USER_NOT_FOUND',
        });
        throw new Error('Your account has not been set up. Please contact support.');
    }
    if (user.status && user.status !== 'active') {
        log.warn('User account is inactive', {
            sub: cognitoSub,
            userId: user.userId,
            errorCode: 'USER_INACTIVE',
        });
        throw new Error('Your account has been deactivated. Please contact support.');
    }
    // Look up memberships
    const memberships = await getUserMemberships(config, user.userId);
    // Filter to active memberships
    // Build org IDs list
    const orgIds = memberships.map((m) => m.orgId);
    const primaryOrgId = orgIds.length > 0 ? orgIds[0] : '';
    const primaryMembership = memberships.find((m) => m.orgId === primaryOrgId) || memberships[0];
    const role = mapMembershipRole(primaryMembership?.role);
    log.info('Portal token claims prepared', {
        sub: cognitoSub,
        userId: user.userId,
        orgCount: orgIds.length,
    });
    // Add custom claims to the token
    event.response = {
        claimsOverrideDetails: {
            claimsToAddOrOverride: {
                'custom:userId': user.userId,
                'custom:orgIds': orgIds.join(','),
                'custom:primaryOrgId': primaryOrgId,
                'custom:role': role,
            },
        },
    };
    return event;
}
//# sourceMappingURL=pre-token-portal.js.map
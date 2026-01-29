/**
 * Pre-Token Generation Trigger - Portal Cognito User Pool
 *
 * Cognito Lambda trigger that runs before token generation for the Portal
 * user pool. Looks up the user in the platform database by cognitoSub and
 * injects custom claims into the JWT.
 *
 * Custom Claims Added:
 *   - custom:userId:      Platform user ID
 *   - custom:orgIds:      Comma-separated list of org IDs user belongs to
 *   - custom:primaryOrgId: The first/primary org ID
 *
 * Security:
 *   - User must exist in the platform database
 *   - User must not be soft-deleted
 *   - No raw PII is logged
 */

import type { PreTokenGenerationTriggerEvent } from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { getDocClient } from '../lib/clients.js';
import { createLogger } from '../lib/logging.js';
import { DB_PREFIXES, DB_SORT_KEYS, GSI_KEYS, GSI_INDEX_NAMES } from '../lib/constants.js';

const log = createLogger('pre-token-portal-handler');

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function handler(
  event: PreTokenGenerationTriggerEvent
): Promise<PreTokenGenerationTriggerEvent> {
  const cognitoSub = event.request.userAttributes.sub;
  const usersTable = process.env.USERS_TABLE_NAME || '';
  const membershipsTable = process.env.MEMBERSHIPS_TABLE_NAME || '';

  log.info('Pre-token generation triggered (portal)', { sub: cognitoSub });

  if (!usersTable || !membershipsTable) {
    log.error('Platform table configuration missing');
    throw new Error('Portal authentication configuration error');
  }

  // Look up user by cognitoSub using GSI2
  const doc = getDocClient();
  const userResult = await doc.send(
    new QueryCommand({
      TableName: usersTable,
      IndexName: GSI_INDEX_NAMES.GSI2,
      KeyConditionExpression: 'gsi2pk = :pk AND gsi2sk = :sk',
      FilterExpression: 'attribute_not_exists(deletedAt)',
      ExpressionAttributeValues: {
        ':pk': `${GSI_KEYS.COGNITOSUB}${cognitoSub}`,
        ':sk': DB_SORT_KEYS.META,
      },
      Limit: 1,
    })
  );

  const userItems = userResult.Items || [];
  if (userItems.length === 0) {
    log.warn('User not found in platform database', { sub: cognitoSub });
    throw new Error('User account not found. Contact support.');
  }

  const user = userItems[0] as { userId: string };
  const userId = user.userId;

  // Look up org memberships using GSI1 (USER#<userId> -> ORG#<orgId>)
  const membResult = await doc.send(
    new QueryCommand({
      TableName: membershipsTable,
      IndexName: GSI_INDEX_NAMES.GSI1,
      KeyConditionExpression: 'gsi1pk = :pk',
      ExpressionAttributeValues: {
        ':pk': `${DB_PREFIXES.USER}${userId}`,
      },
    })
  );

  const memberships = (membResult.Items || []) as Array<{ orgId: string }>;
  const orgIds = memberships.map((m) => m.orgId);
  const primaryOrgId = orgIds[0] || '';

  log.info('Portal claims populated', {
    userId,
    orgCount: orgIds.length,
  });

  // Add custom claims to the token
  event.response = {
    claimsOverrideDetails: {
      claimsToAddOrOverride: {
        'custom:userId': userId,
        'custom:orgIds': orgIds.join(','),
        'custom:primaryOrgId': primaryOrgId,
      },
    },
  };

  return event;
}

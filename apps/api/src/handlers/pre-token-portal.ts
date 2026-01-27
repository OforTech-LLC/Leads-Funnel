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
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

let _doc: DynamoDBDocumentClient | null = null;

function getDocClient(): DynamoDBDocumentClient {
  if (!_doc) {
    const raw = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
    _doc = DynamoDBDocumentClient.from(raw, {
      marshallOptions: { removeUndefinedValues: true },
    });
  }
  return _doc;
}

function tableName(): string {
  return process.env.DDB_TABLE_NAME || '';
}

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

function log(level: string, message: string, extra?: Record<string, unknown>): void {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      service: 'pre-token-portal',
      level,
      message,
      ...extra,
    })
  );
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function handler(
  event: PreTokenGenerationTriggerEvent
): Promise<PreTokenGenerationTriggerEvent> {
  const cognitoSub = event.request.userAttributes.sub;

  log('info', 'Pre-token generation triggered (portal)', { sub: cognitoSub });

  if (!tableName()) {
    log('error', 'DDB_TABLE_NAME not configured');
    throw new Error('Portal authentication configuration error');
  }

  // Look up user by cognitoSub using GSI2
  const doc = getDocClient();
  const userResult = await doc.send(
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

  const userItems = userResult.Items || [];
  if (userItems.length === 0) {
    log('warn', 'User not found in platform database', { sub: cognitoSub });
    throw new Error('User account not found. Contact support.');
  }

  const user = userItems[0] as { userId: string };
  const userId = user.userId;

  // Look up org memberships using GSI1 (USER#<userId> -> ORG#<orgId>)
  const membResult = await doc.send(
    new QueryCommand({
      TableName: tableName(),
      IndexName: 'GSI1',
      KeyConditionExpression: 'gsi1pk = :pk AND begins_with(gsi1sk, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':skPrefix': 'ORG#',
      },
    })
  );

  const memberships = (membResult.Items || []) as Array<{ orgId: string }>;
  const orgIds = memberships.map((m) => m.orgId);
  const primaryOrgId = orgIds[0] || '';

  log('info', 'Portal claims populated', {
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

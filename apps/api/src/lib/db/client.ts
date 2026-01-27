/**
 * Shared DynamoDB Document Client
 *
 * Singleton client used by all DB modules. Initialised once per Lambda
 * cold start and reused across invocations.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

let _doc: DynamoDBDocumentClient | null = null;

/**
 * Return (or create) the shared DynamoDB Document Client.
 */
export function getDocClient(): DynamoDBDocumentClient {
  if (!_doc) {
    const raw = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
    _doc = DynamoDBDocumentClient.from(raw, {
      marshallOptions: { removeUndefinedValues: true },
    });
  }
  return _doc;
}

/**
 * Primary single-table name loaded from environment.
 */
export function tableName(): string {
  return process.env.DDB_TABLE_NAME || '';
}

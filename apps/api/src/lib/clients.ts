/**
 * Centralized AWS Client Singletons
 *
 * All AWS SDK clients are created once and reused across Lambda invocations.
 * This avoids duplicate client instances that waste memory and connection
 * pool resources.
 *
 * Usage:
 *   import { getDocClient, getSsmClient, getS3Client } from '../lib/clients.js';
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { SSMClient } from '@aws-sdk/client-ssm';
import { S3Client } from '@aws-sdk/client-s3';

// ---------------------------------------------------------------------------
// DynamoDB Document Client
// ---------------------------------------------------------------------------

let _docClient: DynamoDBDocumentClient | null = null;

/**
 * Return (or create) the shared DynamoDB Document Client.
 *
 * The region defaults to the AWS_REGION environment variable, which is
 * always set in Lambda. Falls back to 'us-east-1' for local development.
 *
 * @param region - Optional override; defaults to AWS_REGION env var
 */
export function getDocClient(region?: string): DynamoDBDocumentClient {
  if (!_docClient) {
    const raw = new DynamoDBClient({
      region: region || process.env.AWS_REGION || 'us-east-1',
    });
    _docClient = DynamoDBDocumentClient.from(raw, {
      marshallOptions: { removeUndefinedValues: true },
    });
  }
  return _docClient;
}

// ---------------------------------------------------------------------------
// SSM Client
// ---------------------------------------------------------------------------

let _ssmClient: SSMClient | null = null;

/**
 * Return (or create) the shared SSM Client.
 *
 * @param region - Optional override; defaults to AWS_REGION env var
 */
export function getSsmClient(region?: string): SSMClient {
  if (!_ssmClient) {
    _ssmClient = new SSMClient({
      region: region || process.env.AWS_REGION || 'us-east-1',
    });
  }
  return _ssmClient;
}

// ---------------------------------------------------------------------------
// S3 Client
// ---------------------------------------------------------------------------

let _s3Client: S3Client | null = null;

/**
 * Return (or create) the shared S3 Client.
 *
 * @param region - Optional override; defaults to AWS_REGION env var
 */
export function getS3Client(region?: string): S3Client {
  if (!_s3Client) {
    _s3Client = new S3Client({
      region: region || process.env.AWS_REGION || 'us-east-1',
    });
  }
  return _s3Client;
}

// ---------------------------------------------------------------------------
// Table Name Helper
// ---------------------------------------------------------------------------

/**
 * Primary single-table name loaded from environment.
 */
export function tableName(): string {
  return process.env.DDB_TABLE_NAME || '';
}

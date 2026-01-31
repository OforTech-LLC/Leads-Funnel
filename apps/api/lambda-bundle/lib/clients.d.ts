/**
 * Centralized AWS Client Singletons with HTTP Keep-Alive
 *
 * All AWS SDK clients are created once and reused across Lambda invocations.
 * This avoids duplicate client instances that waste memory and connection
 * pool resources.
 *
 * Performance optimizations:
 *   - HTTP keep-alive enabled on all clients (connection reuse across requests)
 *   - maxSockets capped at 50 to prevent exhaustion while allowing concurrency
 *   - 5-second connection timeout and 3-second request timeout for fast failures
 *   - Module-level singletons survive Lambda warm starts
 *
 * At 1B req/day (~11,500 req/s), connection reuse is critical.  Without
 * keep-alive, every DynamoDB call would incur a fresh TCP + TLS handshake
 * (~50-100ms).  With keep-alive the amortised overhead drops to ~1ms.
 *
 * Usage:
 *   import { getDocClient, getSsmClient, getS3Client } from '../lib/clients.js';
 */
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { SSMClient } from '@aws-sdk/client-ssm';
import { S3Client } from '@aws-sdk/client-s3';
import { EventBridgeClient } from '@aws-sdk/client-eventbridge';
import { SESClient } from '@aws-sdk/client-ses';
import { SNSClient } from '@aws-sdk/client-sns';
import { SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
/**
 * Return (or create) the shared DynamoDB Document Client.
 *
 * The region defaults to the AWS_REGION environment variable, which is
 * always set in Lambda. Falls back to 'us-east-1' for local development.
 *
 * @param region - Optional override; defaults to AWS_REGION env var
 */
export declare function getDocClient(region?: string): DynamoDBDocumentClient;
/**
 * Return (or create) the shared Cognito Identity Provider Client.
 *
 * @param region - Optional override; defaults to AWS_REGION env var
 */
export declare function getCognitoClient(region?: string): CognitoIdentityProviderClient;
/**
 * Return (or create) the shared SSM Client.
 *
 * @param region - Optional override; defaults to AWS_REGION env var
 */
export declare function getSsmClient(region?: string): SSMClient;
/**
 * Return (or create) the shared S3 Client.
 *
 * Uses the standard (longer) timeout handler since S3 operations like
 * multipart uploads or large downloads can take more time.
 *
 * @param region - Optional override; defaults to AWS_REGION env var
 */
export declare function getS3Client(region?: string): S3Client;
/**
 * Return (or create) the shared EventBridge Client.
 *
 * @param region - Optional override; defaults to AWS_REGION env var
 */
export declare function getEventBridgeClient(region?: string): EventBridgeClient;
/**
 * Return (or create) the shared SES Client.
 *
 * @param region - Optional override; defaults to AWS_REGION env var
 */
export declare function getSesClient(region?: string): SESClient;
/**
 * Return (or create) the shared SNS Client.
 *
 * @param region - Optional override; defaults to AWS_REGION env var
 */
export declare function getSnsClient(region?: string): SNSClient;
/**
 * Return (or create) the shared Secrets Manager Client.
 *
 * @param region - Optional override; defaults to AWS_REGION env var
 */
export declare function getSecretsManagerClient(region?: string): SecretsManagerClient;
/**
 * Fetch a secret value from Secrets Manager by ARN.
 * Results are cached to avoid repeated API calls.
 *
 * @param secretArn - The ARN of the secret to fetch
 * @param region - Optional region override
 * @returns The secret value as a string
 */
export declare function getSecretValue(secretArn: string, region?: string): Promise<string>;
/**
 * Get primary DynamoDB table name from environment.
 * Used by admin/portal handlers that have their own table name configuration.
 *
 * @deprecated Use specific table name environment variables instead:
 * - RATE_LIMITS_TABLE_NAME for rate limiting
 * - IDEMPOTENCY_TABLE_NAME for idempotency
 * - Funnel-specific tables for leads
 */
export declare function tableName(): string;

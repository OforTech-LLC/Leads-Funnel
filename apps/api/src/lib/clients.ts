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

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { SSMClient } from '@aws-sdk/client-ssm';
import { S3Client } from '@aws-sdk/client-s3';
import { EventBridgeClient } from '@aws-sdk/client-eventbridge';
import { SESClient } from '@aws-sdk/client-ses';
import { SNSClient } from '@aws-sdk/client-sns';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import https from 'node:https';
import http from 'node:http';

// ---------------------------------------------------------------------------
// Shared HTTP Agent with Keep-Alive
// ---------------------------------------------------------------------------

/**
 * HTTPS agent shared across all AWS SDK clients.
 *
 * key settings:
 *   keepAlive:       reuse TCP connections (avoids TLS handshake per request)
 *   maxSockets:      50 concurrent connections per host (DynamoDB endpoint)
 *   keepAliveMsecs:  send TCP keep-alive probes every 1s
 *
 * Lambda freezes the execution environment between invocations but the
 * Node.js event loop is preserved, so keep-alive connections survive the
 * freeze and are immediately usable on the next invocation.
 */
const keepAliveHttpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  keepAliveMsecs: 1000,
});

const keepAliveHttpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 50,
  keepAliveMsecs: 1000,
});

/**
 * Shared NodeHttpHandler with keep-alive and timeouts.
 *
 * - connectionTimeout: 5 seconds to establish a connection
 * - requestTimeout: 30 seconds for the full request lifecycle
 *   (some operations like S3 exports may take longer)
 */
function createRequestHandler(): NodeHttpHandler {
  return new NodeHttpHandler({
    httpsAgent: keepAliveHttpsAgent,
    httpAgent: keepAliveHttpAgent,
    connectionTimeout: 5000,
    requestTimeout: 30000,
  });
}

/**
 * Request handler with shorter timeout for latency-sensitive paths.
 * Used by DynamoDB and EventBridge where we want fast failures.
 */
function createFastRequestHandler(): NodeHttpHandler {
  return new NodeHttpHandler({
    httpsAgent: keepAliveHttpsAgent,
    httpAgent: keepAliveHttpAgent,
    connectionTimeout: 3000,
    requestTimeout: 10000,
  });
}

// ---------------------------------------------------------------------------
// Helper: resolve region
// ---------------------------------------------------------------------------

function resolveRegion(region?: string): string {
  return region || process.env.AWS_REGION || 'us-east-1';
}

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
      region: resolveRegion(region),
      requestHandler: createFastRequestHandler(),
    });
    _docClient = DynamoDBDocumentClient.from(raw, {
      marshallOptions: { removeUndefinedValues: true },
    });
  }
  return _docClient;
}

// ---------------------------------------------------------------------------
// Cognito Identity Provider Client
// ---------------------------------------------------------------------------

let _cognitoClient: CognitoIdentityProviderClient | null = null;

/**
 * Return (or create) the shared Cognito Identity Provider Client.
 *
 * @param region - Optional override; defaults to AWS_REGION env var
 */
export function getCognitoClient(region?: string): CognitoIdentityProviderClient {
  if (!_cognitoClient) {
    _cognitoClient = new CognitoIdentityProviderClient({
      region: resolveRegion(region),
      requestHandler: createRequestHandler(),
    });
  }
  return _cognitoClient;
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
      region: resolveRegion(region),
      requestHandler: createRequestHandler(),
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
 * Uses the standard (longer) timeout handler since S3 operations like
 * multipart uploads or large downloads can take more time.
 *
 * @param region - Optional override; defaults to AWS_REGION env var
 */
export function getS3Client(region?: string): S3Client {
  if (!_s3Client) {
    _s3Client = new S3Client({
      region: resolveRegion(region),
      requestHandler: createRequestHandler(),
    });
  }
  return _s3Client;
}

// ---------------------------------------------------------------------------
// EventBridge Client
// ---------------------------------------------------------------------------

let _eventBridgeClient: EventBridgeClient | null = null;

/**
 * Return (or create) the shared EventBridge Client.
 *
 * @param region - Optional override; defaults to AWS_REGION env var
 */
export function getEventBridgeClient(region?: string): EventBridgeClient {
  if (!_eventBridgeClient) {
    _eventBridgeClient = new EventBridgeClient({
      region: resolveRegion(region),
      requestHandler: createFastRequestHandler(),
    });
  }
  return _eventBridgeClient;
}

// ---------------------------------------------------------------------------
// SES Client
// ---------------------------------------------------------------------------

let _sesClient: SESClient | null = null;

/**
 * Return (or create) the shared SES Client.
 *
 * @param region - Optional override; defaults to AWS_REGION env var
 */
export function getSesClient(region?: string): SESClient {
  if (!_sesClient) {
    _sesClient = new SESClient({
      region: resolveRegion(region),
      requestHandler: createRequestHandler(),
    });
  }
  return _sesClient;
}

// ---------------------------------------------------------------------------
// SNS Client
// ---------------------------------------------------------------------------

let _snsClient: SNSClient | null = null;

/**
 * Return (or create) the shared SNS Client.
 *
 * @param region - Optional override; defaults to AWS_REGION env var
 */
export function getSnsClient(region?: string): SNSClient {
  if (!_snsClient) {
    _snsClient = new SNSClient({
      region: resolveRegion(region),
      requestHandler: createRequestHandler(),
    });
  }
  return _snsClient;
}

// ---------------------------------------------------------------------------
// Secrets Manager Client
// ---------------------------------------------------------------------------

let _secretsManagerClient: SecretsManagerClient | null = null;

/**
 * Return (or create) the shared Secrets Manager Client.
 *
 * @param region - Optional override; defaults to AWS_REGION env var
 */
export function getSecretsManagerClient(region?: string): SecretsManagerClient {
  if (!_secretsManagerClient) {
    _secretsManagerClient = new SecretsManagerClient({
      region: resolveRegion(region),
      requestHandler: createRequestHandler(),
    });
  }
  return _secretsManagerClient;
}

// ---------------------------------------------------------------------------
// Secrets Manager Helper
// ---------------------------------------------------------------------------

/**
 * Cache for secrets to avoid repeated API calls during Lambda invocation.
 * Secrets are cached for the lifetime of the Lambda container.
 */
const secretsCache = new Map<string, string>();

/**
 * Fetch a secret value from Secrets Manager by ARN.
 * Results are cached to avoid repeated API calls.
 *
 * @param secretArn - The ARN of the secret to fetch
 * @param region - Optional region override
 * @returns The secret value as a string
 */
export async function getSecretValue(secretArn: string, region?: string): Promise<string> {
  // Check cache first
  const cached = secretsCache.get(secretArn);
  if (cached) {
    return cached;
  }

  const client = getSecretsManagerClient(region);
  const response = await client.send(
    new GetSecretValueCommand({
      SecretId: secretArn,
    })
  );

  const secretValue = response.SecretString || '';

  // Cache the result
  secretsCache.set(secretArn, secretValue);

  return secretValue;
}

// ---------------------------------------------------------------------------
// Table Name Helpers
// ---------------------------------------------------------------------------

/**
 * Get primary DynamoDB table name from environment.
 * Used by admin/portal handlers that have their own table name configuration.
 *
 * @deprecated Use specific table name environment variables instead:
 * - RATE_LIMITS_TABLE_NAME for rate limiting
 * - IDEMPOTENCY_TABLE_NAME for idempotency
 * - Funnel-specific tables for leads
 */
export function tableName(): string {
  return process.env.DDB_TABLE_NAME || '';
}

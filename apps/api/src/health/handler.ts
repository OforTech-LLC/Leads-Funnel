/**
 * Health Check Handler
 *
 * Provides health check endpoint for monitoring system health,
 * including DynamoDB connectivity and service status.
 *
 * Note: The health check intentionally creates a fresh DynamoDB client
 * for each call to accurately test connectivity. This is different from
 * the singleton pattern used in lib/clients.ts, which caches the client
 * for performance in normal request processing.
 */

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { DynamoDBClient, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { createLogger } from '../lib/logging.js';
import { getCorsOrigin } from '../lib/response.js';

const log = createLogger('health');

// =============================================================================
// Types
// =============================================================================

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  timestamp: string;
  dependencies: {
    dynamodb: DependencyStatus;
  };
}

interface DependencyStatus {
  status: 'healthy' | 'unhealthy';
  latencyMs?: number;
  error?: string;
}

// =============================================================================
// Configuration
// =============================================================================

const VERSION = process.env.APP_VERSION || '1.0.0';
const START_TIME = Date.now();

/**
 * Get DynamoDB client for health check.
 *
 * Uses a fresh client to truly test connectivity rather than
 * returning a cached singleton.
 */
function getDynamoClient(): DynamoDBClient {
  return new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
  });
}

// =============================================================================
// Health Checks
// =============================================================================

/**
 * Check DynamoDB connectivity
 */
async function checkDynamoDB(): Promise<DependencyStatus> {
  const tableName = process.env.DDB_TABLE_NAME;

  if (!tableName) {
    return {
      status: 'unhealthy',
      error: 'DDB_TABLE_NAME not configured',
    };
  }

  const startTime = Date.now();
  const client = getDynamoClient();

  try {
    await client.send(
      new DescribeTableCommand({
        TableName: tableName,
      })
    );

    return {
      status: 'healthy',
      latencyMs: Date.now() - startTime,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error('DynamoDB check failed', { error: errorMessage });

    return {
      status: 'unhealthy',
      latencyMs: Date.now() - startTime,
      error: 'Connection failed',
    };
  }
}

// =============================================================================
// Response Builders
// =============================================================================

// Fix 11: Use getCorsOrigin instead of hardcoded '*'
function buildCorsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': getCorsOrigin(),
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  };
}

function buildResponse(statusCode: number, body: HealthStatus): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: buildCorsHeaders(),
    body: JSON.stringify(body),
  };
}

// =============================================================================
// Lambda Handler
// =============================================================================

export async function handler(
  event: APIGatewayProxyEventV2,
  context: Context
): Promise<APIGatewayProxyResultV2> {
  const corsHeaders = buildCorsHeaders();

  // Handle OPTIONS preflight
  if (event.requestContext.http.method === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: '',
    };
  }

  // Only allow GET
  if (event.requestContext.http.method !== 'GET') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({
        ok: false,
        error: {
          code: 'METHOD_NOT_ALLOWED',
          message: 'Only GET method is allowed',
        },
      }),
    };
  }

  try {
    // Check dependencies
    const dynamoStatus = await checkDynamoDB();

    // Determine overall status
    const allHealthy = dynamoStatus.status === 'healthy';
    const overallStatus: HealthStatus['status'] = allHealthy ? 'healthy' : 'unhealthy';

    const healthStatus: HealthStatus = {
      status: overallStatus,
      version: VERSION,
      uptime: Math.floor((Date.now() - START_TIME) / 1000),
      timestamp: new Date().toISOString(),
      dependencies: {
        dynamodb: dynamoStatus,
      },
    };

    // Return 200 for healthy, 503 for unhealthy
    const statusCode = overallStatus === 'healthy' ? 200 : 503;

    log.info('Health check completed', {
      status: overallStatus,
      dynamodb: dynamoStatus.status,
    });

    return buildResponse(statusCode, healthStatus);
  } catch (error) {
    // Unexpected error during health check
    log.error('Unexpected health check error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    const healthStatus: HealthStatus = {
      status: 'unhealthy',
      version: VERSION,
      uptime: Math.floor((Date.now() - START_TIME) / 1000),
      timestamp: new Date().toISOString(),
      dependencies: {
        dynamodb: {
          status: 'unhealthy',
          error: 'Health check failed',
        },
      },
    };

    return buildResponse(503, healthStatus);
  }
}

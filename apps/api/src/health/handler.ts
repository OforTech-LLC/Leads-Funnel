/**
 * Health Check Handler
 *
 * Provides health check endpoint for monitoring system health,
 * including DynamoDB connectivity and service status.
 */

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { DynamoDBClient, DescribeTableCommand } from '@aws-sdk/client-dynamodb';

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
 * Get DynamoDB client
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
    console.error('[Health] DynamoDB check failed:', errorMessage);

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

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
} as const;

function buildResponse(statusCode: number, body: HealthStatus): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: CORS_HEADERS,
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
  // Handle OPTIONS preflight
  if (event.requestContext.http.method === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: '',
    };
  }

  // Only allow GET
  if (event.requestContext.http.method !== 'GET') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
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

    console.log('[Health] Check completed:', {
      status: overallStatus,
      dynamodb: dynamoStatus.status,
    });

    return buildResponse(statusCode, healthStatus);
  } catch (error) {
    // Unexpected error during health check
    console.error(
      '[Health] Unexpected error:',
      error instanceof Error ? error.message : 'Unknown error'
    );

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

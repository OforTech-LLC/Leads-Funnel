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
import { DynamoDBClient, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { createLogger } from '../lib/logging.js';
import { getPlatformLeadsTableName } from '../lib/db/table-names.js';
import { getCorsOrigin } from '../lib/response.js';
import { HTTP_STATUS, HTTP_HEADERS, CONTENT_TYPES } from '../lib/constants.js';
const log = createLogger('health');
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
function getDynamoClient() {
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
async function checkDynamoDB() {
    const tableName = getPlatformLeadsTableName();
    if (!tableName) {
        return {
            status: 'unhealthy',
            error: 'DynamoDB table not configured',
        };
    }
    const startTime = Date.now();
    const client = getDynamoClient();
    try {
        await client.send(new DescribeTableCommand({
            TableName: tableName,
        }));
        return {
            status: 'healthy',
            latencyMs: Date.now() - startTime,
        };
    }
    catch (error) {
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
function buildCorsHeaders() {
    return {
        [HTTP_HEADERS.ACCESS_CONTROL_ALLOW_ORIGIN]: getCorsOrigin(),
        [HTTP_HEADERS.ACCESS_CONTROL_ALLOW_HEADERS]: 'content-type',
        [HTTP_HEADERS.ACCESS_CONTROL_ALLOW_METHODS]: 'GET,OPTIONS',
        [HTTP_HEADERS.CONTENT_TYPE]: CONTENT_TYPES.JSON,
        [HTTP_HEADERS.CACHE_CONTROL]: 'no-cache, no-store, must-revalidate',
    };
}
function buildResponse(statusCode, body) {
    return {
        statusCode,
        headers: buildCorsHeaders(),
        body: JSON.stringify(body),
    };
}
// =============================================================================
// Lambda Handler
// =============================================================================
export async function handler(event, context) {
    const corsHeaders = buildCorsHeaders();
    // Handle OPTIONS preflight
    if (event.requestContext.http.method === 'OPTIONS') {
        return {
            statusCode: HTTP_STATUS.NO_CONTENT,
            headers: corsHeaders,
            body: '',
        };
    }
    // Only allow GET
    if (event.requestContext.http.method !== 'GET') {
        return {
            statusCode: HTTP_STATUS.METHOD_NOT_ALLOWED,
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
        const overallStatus = allHealthy ? 'healthy' : 'unhealthy';
        const healthStatus = {
            status: overallStatus,
            version: VERSION,
            uptime: Math.floor((Date.now() - START_TIME) / 1000),
            timestamp: new Date().toISOString(),
            dependencies: {
                dynamodb: dynamoStatus,
            },
        };
        // Return 200 for healthy, 503 for unhealthy
        const statusCode = overallStatus === 'healthy' ? HTTP_STATUS.OK : HTTP_STATUS.SERVICE_UNAVAILABLE;
        log.info('Health check completed', {
            status: overallStatus,
            dynamodb: dynamoStatus.status,
        });
        return buildResponse(statusCode, healthStatus);
    }
    catch (error) {
        // Unexpected error during health check
        log.error('Unexpected health check error', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        const healthStatus = {
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
        return buildResponse(HTTP_STATUS.SERVICE_UNAVAILABLE, healthStatus);
    }
}
//# sourceMappingURL=handler.js.map
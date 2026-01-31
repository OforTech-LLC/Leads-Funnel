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
export declare function handler(event: APIGatewayProxyEventV2, context: Context): Promise<APIGatewayProxyResultV2>;

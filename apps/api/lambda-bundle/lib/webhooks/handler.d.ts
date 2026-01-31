/**
 * Webhook API Endpoints
 *
 * Admin-only endpoints for managing webhook registrations:
 *   POST   /admin/webhooks              - Register webhook
 *   GET    /admin/webhooks              - List webhooks for org
 *   PUT    /admin/webhooks/{id}         - Update webhook
 *   DELETE /admin/webhooks/{id}         - Delete webhook
 *   GET    /admin/webhooks/{id}/deliveries - Recent deliveries
 *   POST   /admin/webhooks/{id}/test    - Send test payload
 */
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
/**
 * Handle all /admin/webhooks/* routes.
 *
 * @param event - API Gateway event
 * @param subpath - Path after /admin (e.g. /webhooks, /webhooks/abc123)
 * @param method - HTTP method
 * @param canWrite - Whether the admin has write permissions
 * @returns API Gateway response or null if the path does not match
 */
export declare function handleWebhookRoutes(event: APIGatewayProxyEventV2, subpath: string, method: string, canWrite: boolean, requestOrigin?: string): Promise<APIGatewayProxyResultV2 | null>;

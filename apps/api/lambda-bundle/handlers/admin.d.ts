/**
 * Admin API Handler
 *
 * Handles all /admin/* endpoints. Requires admin JWT authentication
 * and checks the enable_admin_console feature flag.
 *
 * Performance:
 *   - X-Request-Id header injected on every response for distributed tracing
 *   - All DynamoDB/S3/SSM calls use centralized clients with HTTP keep-alive
 *   - 1 MB body size limit enforced before JSON parsing (Issue #1)
 *
 * Endpoints:
 *   POST/GET/PUT/DELETE /admin/orgs
 *   POST/GET/PUT/DELETE /admin/users
 *   POST/PUT/DELETE/GET /admin/orgs/:orgId/members
 *   POST/GET/PUT/DELETE /admin/rules
 *   POST /admin/rules/test
 *   POST /admin/rules/bulk-create
 *   POST /admin/leads/query
 *   GET/PUT /admin/leads/:funnelId/:leadId
 *   POST /admin/leads/:funnelId/:leadId/reassign
 *   POST /admin/leads/bulk-update
 *   POST /admin/leads/bulk-import
 *   GET /admin/notifications
 *   POST/GET /admin/exports
 *   GET /admin/exports/:exportId/download
 *   POST/GET/PUT/DELETE /admin/webhooks
 *   GET /admin/webhooks/:id/deliveries
 *   POST /admin/webhooks/:id/test
 *   GET /admin/analytics/overview
 *   GET /admin/analytics/funnels
 *   GET /admin/analytics/orgs
 *   GET /admin/analytics/trends
 *   GET /admin/analytics/lead-sources
 *   POST /admin/gdpr/erasure
 *   GET /admin/gdpr/export/:emailHash
 */
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
export declare function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2>;

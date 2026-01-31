/**
 * Portal API Handler
 *
 * Handles all /portal/* endpoints for organization agents/owners.
 * Requires portal JWT authentication and checks the enable_portal flag.
 *
 * Performance:
 *   - X-Request-Id header injected on every response for distributed tracing
 *   - All DynamoDB/S3/SSM calls use centralized clients with HTTP keep-alive
 *   - 1 MB body size limit enforced before JSON parsing (Issue #1)
 *
 * Endpoints:
 *   GET  /portal/me                              - Current user profile
 *   POST /portal/me/avatar                       - Generate avatar upload URL
 *   GET  /portal/org                             - User's primary org details
 *   GET  /portal/leads                           - List leads for user's org(s)
 *   GET  /portal/leads/:funnelId/:leadId         - Get single lead
 *   PUT  /portal/leads/:funnelId/:leadId/status  - Update lead status
 *   POST /portal/leads/:funnelId/:leadId/notes   - Add note to lead
 *   PUT  /portal/settings                        - Update user preferences
 *
 * Feature-flagged endpoints:
 *   GET  /portal/billing                          - Current plan and usage
 *   GET  /portal/billing/invoices                 - Invoice history
 *   POST /portal/billing/upgrade                  - Change plan (stub)
 *   POST /portal/calendar/connect                 - Connect calendar provider
 *   GET  /portal/calendar/availability            - Get available slots
 *   POST /portal/calendar/book                    - Book appointment for lead
 *   DELETE /portal/calendar/disconnect            - Disconnect calendar
 *   POST /portal/integrations/slack               - Configure Slack webhook
 *   POST /portal/integrations/teams               - Configure Teams webhook
 *   DELETE /portal/integrations/:provider         - Remove integration
 *   POST /portal/integrations/:provider/test      - Test notification
 */
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
export declare function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2>;

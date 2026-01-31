/**
 * Auth Handler
 *
 * Handles /auth/admin and /auth/portal endpoints for:
 * - POST: Store tokens in httpOnly cookie after OAuth code exchange
 * - GET: Check authentication status and return user info
 * - DELETE: Clear auth cookie (logout)
 */
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
export declare function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2>;

/**
 * API Router
 *
 * Routes incoming requests to appropriate handlers based on path.
 * Provides a unified entry point for all API endpoints.
 *
 * Routes:
 *   /health       -> Health check handler
 *   /lead         -> Public lead capture handler
 *   /admin/*      -> Admin console handler (feature-flagged)
 *   /portal/*     -> Agent portal handler (feature-flagged)
 */
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
/**
 * Main router that dispatches requests to appropriate handlers.
 *
 * Feature-flagged routes return 404 when their flag is disabled,
 * making the endpoints invisible to external scanners.
 */
export declare function router(event: APIGatewayProxyEventV2, context: Context): Promise<APIGatewayProxyResultV2>;
export { router as handler };

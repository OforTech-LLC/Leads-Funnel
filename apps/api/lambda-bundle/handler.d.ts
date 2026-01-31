/**
 * Lead Capture API Lambda Handler
 * POST /lead endpoint for capturing leads from the website
 */
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
export declare function handler(event: APIGatewayProxyEventV2, context: Context): Promise<APIGatewayProxyResultV2>;

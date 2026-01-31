/**
 * Pre-Token Generation Trigger - Portal Cognito User Pool
 *
 * Cognito Lambda trigger that runs before token generation for the Portal
 * user pool. Looks up the user in the platform database by cognitoSub and
 * injects custom claims into the JWT.
 *
 * Custom Claims Added:
 *   - custom:userId:      Platform user ID
 *   - custom:orgIds:      Comma-separated list of org IDs user belongs to
 *   - custom:primaryOrgId: The first/primary org ID
 *
 * Security:
 *   - User must exist in the platform database
 *   - User must not be soft-deleted
 *   - No raw PII is logged
 */
import type { PreTokenGenerationTriggerEvent } from 'aws-lambda';
export declare function handler(event: PreTokenGenerationTriggerEvent): Promise<PreTokenGenerationTriggerEvent>;

/**
 * Pre-Token Generation Trigger - Portal Cognito User Pool
 *
 * Cognito Lambda trigger that runs before token generation for the Portal
 * (org members) user pool. Looks up the user and their org memberships
 * in DynamoDB and adds custom claims to the ID token.
 *
 * Custom Claims Added:
 *   - custom:userId: The internal user ID
 *   - custom:orgIds: Comma-separated list of active org IDs
 *   - custom:primaryOrgId: The first active org ID (used as default context)
 *
 * Security:
 *   - Only active users with active memberships get org claims
 *   - Inactive users are rejected (token generation fails)
 *   - Users with no active org memberships get empty orgIds
 */
import type { PreTokenGenerationTriggerEvent } from 'aws-lambda';
/**
 * Cognito Pre-Token Generation trigger handler for the Portal user pool.
 *
 * Flow:
 * 1. Extract cognitoSub from the Cognito event
 * 2. Look up the user in the users table by cognitoSub (GSI2)
 * 3. If user not found or inactive, deny token generation
 * 4. Look up user's memberships (GSI1)
 * 5. Filter to active memberships
 * 6. Add custom claims: userId, orgIds (comma-separated), primaryOrgId
 *
 * @param event - Cognito Pre-Token Generation trigger event
 * @returns Modified event with custom claims (or throws to deny)
 */
export declare function handler(event: PreTokenGenerationTriggerEvent): Promise<PreTokenGenerationTriggerEvent>;

/**
 * Pre-Token Generation Trigger - Admin Cognito User Pool
 *
 * Cognito Lambda trigger that runs before token generation for the Admin
 * user pool. Validates the user against an allowlist of admin emails
 * stored in SSM Parameter Store and adds custom claims to the token.
 *
 * Custom Claims Added:
 *   - custom:role: "ADMIN" if user is in the allowlist
 *
 * Security:
 *   - Only emails in the allowlist receive the ADMIN role
 *   - Non-allowlisted users are rejected (token generation fails)
 *   - Allowlist is cached for 60 seconds to reduce SSM calls
 */
import type { PreTokenGenerationTriggerEvent } from 'aws-lambda';
/**
 * Cognito Pre-Token Generation trigger handler for the Admin user pool.
 *
 * Flow:
 * 1. Extract user email from the Cognito event
 * 2. Load the admin allowed emails from SSM
 * 3. If the email is in the allowlist, add custom:role = "ADMIN"
 * 4. If not in the allowlist, throw an error to deny token generation
 *
 * @param event - Cognito Pre-Token Generation trigger event
 * @returns Modified event with custom claims (or throws to deny)
 */
export declare function handler(event: PreTokenGenerationTriggerEvent): Promise<PreTokenGenerationTriggerEvent>;

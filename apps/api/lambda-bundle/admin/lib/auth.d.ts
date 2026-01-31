/**
 * Admin Authentication & Authorization
 *
 * Provides secure authentication and authorization for the admin console.
 * This module handles:
 * - JWT token verification using Cognito's JWKS (cryptographic verification)
 * - Email allowlist validation for additional access control
 * - IP allowlist validation (optional, for enhanced security)
 * - Role-Based Access Control (RBAC) based on Cognito groups
 *
 * Security Architecture:
 * - Tokens are verified against Cognito's public keys (JWKS)
 * - Configuration is stored in AWS SSM Parameter Store with encryption
 * - IP allowlists can be enabled for zero-trust environments
 * - Email allowlists provide fine-grained user access control
 */
import type { AdminConfig, AdminUser, AuthResult } from '../types.js';
/**
 * Checks if the admin console feature is enabled.
 *
 * Security: Feature flag allows quick disable of admin console
 * in case of security incident without redeploying.
 *
 * @param config - Admin configuration containing SSM parameter paths
 * @returns True if the feature flag is set to 'true'
 */
export declare function isFeatureEnabled(config: AdminConfig): Promise<boolean>;
/**
 * Extracts the real client IP address from request headers.
 *
 * Security: When behind CloudFront/ALB, the original client IP is in
 * X-Forwarded-For header. We take the FIRST IP in the chain as it
 * represents the original client (subsequent IPs are intermediary proxies).
 *
 * Warning: X-Forwarded-For can be spoofed by clients. Only trust it when
 * your infrastructure (CloudFront/ALB) is configured to overwrite/validate it.
 *
 * @param headers - Request headers object
 * @param sourceIp - Fallback source IP from request context
 * @returns The extracted client IP address
 */
export declare function extractClientIp(headers: Record<string, string | undefined>, sourceIp?: string): string;
/**
 * Authenticates and authorizes an admin user.
 *
 * This is the main entry point for admin authentication. It implements
 * defense-in-depth with multiple validation layers:
 *
 * Authentication Flow:
 * 1. Feature flag check - ensures admin console is enabled
 * 2. JWT verification - cryptographically verifies token with Cognito JWKS
 * 3. Email allowlist - validates user email is explicitly allowed
 * 4. IP allowlist - validates client IP (if enabled in SSM)
 * 5. Group membership - ensures user has required Cognito group
 * 6. Role assignment - determines permissions from group membership
 *
 * Security: Each layer can independently block access. Failure at any
 * layer returns immediately without proceeding to subsequent checks.
 *
 * @param authHeader - The Authorization header from the request
 * @param clientIp - The client's IP address
 * @param config - Admin configuration containing all required settings
 * @returns AuthResult with success status and either user info or error details
 */
export declare function authenticateAdmin(authHeader: string | undefined, clientIp: string, config: AdminConfig): Promise<AuthResult>;
/**
 * Checks if a user has permission to perform a specific action.
 *
 * RBAC Permission Matrix:
 * | Action | Admin | Viewer |
 * |--------|-------|--------|
 * | read   |   Y   |   Y    |
 * | write  |   Y   |   N    |
 * | export |   Y   |   Y    |
 *
 * Security: Implements principle of least privilege - Viewers can read
 * and export but cannot modify data. Only Admins can write.
 *
 * @param user - The authenticated admin user
 * @param action - The action to check permission for
 * @returns True if the user has permission for the action
 */
export declare function hasPermission(user: AdminUser, action: 'read' | 'write' | 'export'): boolean;

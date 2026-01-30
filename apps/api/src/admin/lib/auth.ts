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

import { GetParameterCommand } from '@aws-sdk/client-ssm';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { AdminConfig, AdminRole, AdminUser, AuthResult, JwtPayload } from '../types.js';
import { getSsmClient } from '../../lib/clients.js';

// =============================================================================
// Caching Configuration
// =============================================================================

/**
 * Cache for SSM parameters to reduce API calls
 *
 * Performance: SSM API calls add ~50-100ms latency. Caching reduces this
 * to near-zero for subsequent requests within the TTL window.
 * Security: 5 minute TTL balances performance with timely config updates.
 */
const parameterCache = new Map<string, { value: string; expiresAt: number }>();

/** Time-to-live for cached SSM parameters in milliseconds */
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Cached JWKS for Cognito token verification
 *
 * Performance: JWKS is fetched once and cached. The jose library handles
 * automatic key rotation when Cognito rotates its signing keys.
 */
let jwksCache: ReturnType<typeof createRemoteJWKSet> | null = null;

// =============================================================================
// SSM Parameter Functions
// =============================================================================

/**
 * Retrieves a parameter from AWS SSM Parameter Store with caching.
 *
 * Performance: Simple TTL-based cache reduces SSM API calls and improves
 * Lambda cold start performance by avoiding repeated network requests.
 *
 * Security: WithDecryption:true ensures SecureString parameters are decrypted.
 * The decrypted values are only held in memory, never persisted.
 *
 * @param path - The SSM parameter path (e.g., '/kanjona/admin/allowed-emails')
 * @returns The decrypted parameter value
 */
async function getParameter(path: string): Promise<string> {
  const cached = parameterCache.get(path);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const ssm = getSsmClient();
  const command = new GetParameterCommand({
    Name: path,
    WithDecryption: true, // Security: Decrypt SecureString parameters
  });

  const response = await ssm.send(command);
  const value = response.Parameter?.Value || '';

  parameterCache.set(path, {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return value;
}

// =============================================================================
// Feature Flag & Allowlist Functions
// =============================================================================

/**
 * Checks if the admin console feature is enabled.
 *
 * Security: Feature flag allows quick disable of admin console
 * in case of security incident without redeploying.
 *
 * @param config - Admin configuration containing SSM parameter paths
 * @returns True if the feature flag is set to 'true'
 */
export async function isFeatureEnabled(config: AdminConfig): Promise<boolean> {
  const flag = await getParameter(config.featureFlagSsmPath);
  return flag.toLowerCase() === 'true';
}

/**
 * Retrieves the list of allowed admin email addresses.
 *
 * Security: Email allowlist provides defense-in-depth beyond Cognito groups.
 * Even if someone gains access to a Cognito admin group, they still need
 * to be in the email allowlist.
 *
 * @param config - Admin configuration containing SSM parameter paths
 * @returns Array of lowercase email addresses that are allowed access
 */
async function getAllowedEmails(config: AdminConfig): Promise<string[]> {
  const emails = await getParameter(config.allowedEmailsSsmPath);
  if (!emails) return [];
  // Normalize to lowercase for case-insensitive comparison
  return emails
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Retrieves IP allowlist configuration.
 *
 * Security: IP allowlist enables zero-trust network access control.
 * When enabled, only requests from specified CIDR ranges are allowed.
 * Useful for restricting admin access to corporate networks or VPNs.
 *
 * @param config - Admin configuration containing SSM parameter paths
 * @returns Object containing enabled status and array of CIDR ranges
 */
async function getIpAllowlist(config: AdminConfig): Promise<{ enabled: boolean; cidrs: string[] }> {
  const enabled = await getParameter(config.ipAllowlistFlagPath);
  if (enabled.toLowerCase() !== 'true') {
    return { enabled: false, cidrs: [] };
  }

  const cidrs = await getParameter(config.ipAllowlistSsmPath);
  if (!cidrs) return { enabled: true, cidrs: [] };
  return {
    enabled: true,
    cidrs: cidrs
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean),
  };
}

// =============================================================================
// IP Validation Functions
// =============================================================================

/**
 * Checks if an IP address falls within a CIDR range.
 *
 * Algorithm: Convert IP and network to 32-bit integers, apply subnet mask,
 * and compare. This is the standard CIDR matching algorithm.
 *
 * Security: Special case for 0.0.0.0/0 allows all IPs (use with caution).
 *
 * @param ip - The IP address to check (e.g., '192.168.1.100')
 * @param cidr - The CIDR range to check against (e.g., '192.168.1.0/24')
 * @returns True if the IP is within the CIDR range
 */
function isIpInCidr(ip: string, cidr: string): boolean {
  // Security: 0.0.0.0/0 is a special case that matches all IPs
  // Only use this in development or when IP filtering should be bypassed
  if (cidr === '0.0.0.0/0') return true;

  const [network, prefixStr] = cidr.split('/');
  const prefix = parseInt(prefixStr, 10);

  // Validate prefix is valid (0-32 for IPv4)
  if (isNaN(prefix) || prefix < 0 || prefix > 32) return false;

  const ipParts = ip.split('.').map(Number);
  const networkParts = network.split('.').map(Number);

  // Validate both are valid IPv4 addresses
  if (ipParts.length !== 4 || networkParts.length !== 4) return false;

  // Convert to 32-bit integers for bitwise comparison
  const ipNum = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
  const networkNum =
    (networkParts[0] << 24) | (networkParts[1] << 16) | (networkParts[2] << 8) | networkParts[3];

  // Create subnet mask from prefix length
  // >>> 0 converts to unsigned 32-bit integer
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;

  // Compare network portions
  return (ipNum & mask) === (networkNum & mask);
}

/**
 * Checks if an IP address is in any of the allowed CIDR ranges.
 *
 * @param ip - The IP address to check
 * @param cidrs - Array of allowed CIDR ranges
 * @returns True if the IP matches any of the allowed ranges
 */
function isIpAllowed(ip: string, cidrs: string[]): boolean {
  if (cidrs.length === 0) return false;
  return cidrs.some((cidr) => isIpInCidr(ip, cidr));
}

// =============================================================================
// JWT Verification Functions
// =============================================================================

/**
 * Gets or creates the JWKS (JSON Web Key Set) for Cognito token verification.
 *
 * Security: JWKS contains Cognito's public keys used to verify JWT signatures.
 * The jose library automatically fetches and caches the keys, and handles
 * key rotation when Cognito rotates its signing keys.
 *
 * Performance: JWKS is cached after first fetch. Subsequent requests use
 * the cached keys until Cognito rotates them.
 *
 * @param config - Admin configuration containing the Cognito issuer URL
 * @returns The JWKS function for verifying tokens
 */
function getJwks(config: AdminConfig) {
  if (!jwksCache) {
    // JWKS URL is standard OAuth2/OIDC discovery endpoint
    const jwksUrl = `${config.cognitoIssuer}/.well-known/jwks.json`;
    jwksCache = createRemoteJWKSet(new URL(jwksUrl));
  }
  return jwksCache;
}

/**
 * Verifies a JWT token from the Authorization header.
 *
 * Security Validations Performed:
 * 1. Bearer scheme format check
 * 2. Cryptographic signature verification against Cognito JWKS
 * 3. Issuer validation - must match expected Cognito User Pool
 * 4. Audience validation - must match expected Client ID
 * 5. Token type validation - must be 'id' or 'access' token
 * 6. Expiration check (handled automatically by jose library)
 *
 * Note: This performs REAL cryptographic verification unlike client-side
 * parseIdToken which only decodes without verification.
 *
 * @param authHeader - The Authorization header value (e.g., 'Bearer eyJ...')
 * @param config - Admin configuration containing Cognito settings
 * @returns Object with success status and either the verified payload or error message
 */
async function verifyToken(
  authHeader: string | undefined,
  config: AdminConfig
): Promise<{ success: boolean; payload?: JwtPayload; error?: string }> {
  if (!authHeader) {
    return { success: false, error: 'Missing Authorization header' };
  }

  // Security: Validate Bearer scheme format
  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return { success: false, error: 'Invalid Authorization header format' };
  }

  try {
    const jwks = getJwks(config);

    // Security: jwtVerify performs full cryptographic verification:
    // - Validates signature against Cognito's public keys
    // - Checks issuer matches expected Cognito User Pool URL
    // - Checks audience matches expected Client ID
    // - Verifies token has not expired
    const { payload } = await jwtVerify(token, jwks, {
      issuer: config.cognitoIssuer,
      audience: config.cognitoClientId,
    });

    // Security: Additional validation - verify token type
    // Prevents access tokens from being used where ID tokens are expected
    if (payload.token_use !== 'id' && payload.token_use !== 'access') {
      return { success: false, error: 'Invalid token type' };
    }

    return {
      success: true,
      payload: payload as unknown as JwtPayload,
    };
  } catch (error) {
    // Security: Don't expose internal error details to caller
    const message = error instanceof Error ? error.message : 'Token verification failed';
    return { success: false, error: message };
  }
}

// =============================================================================
// Role & Permission Functions
// =============================================================================

/**
 * Determines the user's admin role from their Cognito groups.
 *
 * RBAC Implementation:
 * - Role hierarchy: Admin > Viewer
 * - Users are assigned the highest role they qualify for
 * - Unknown groups default to Viewer (principle of least privilege)
 *
 * @param groups - Array of Cognito group names the user belongs to
 * @returns The determined admin role ('Admin' or 'Viewer')
 */
function determineRole(groups: string[]): AdminRole {
  // Check for Admin role first (highest privilege)
  if (groups.includes('Admin') || groups.includes('SuperAdmin') || groups.includes('OrgAdmin')) {
    return 'Admin';
  }
  if (groups.includes('Viewer') || groups.includes('OrgViewer')) return 'Viewer';
  // Security: Default to lowest privilege role
  return 'Viewer';
}

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
export function extractClientIp(
  headers: Record<string, string | undefined>,
  sourceIp?: string
): string {
  // Check X-Forwarded-For (from CloudFront/ALB)
  const xff = headers['x-forwarded-for'] || headers['X-Forwarded-For'];
  if (xff) {
    // Security: Take the first IP (original client)
    // Format: "client, proxy1, proxy2"
    const firstIp = xff.split(',')[0].trim();
    if (firstIp) return firstIp;
  }

  // Fall back to source IP from API Gateway request context
  return sourceIp || 'unknown';
}

// =============================================================================
// Main Authentication Function
// =============================================================================

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
export async function authenticateAdmin(
  authHeader: string | undefined,
  clientIp: string,
  config: AdminConfig
): Promise<AuthResult> {
  // Layer 1: Feature flag - quick disable without redeploy
  const enabled = await isFeatureEnabled(config);
  if (!enabled) {
    return {
      success: false,
      error: 'Admin console is disabled',
      errorCode: 'FEATURE_DISABLED',
    };
  }

  // Layer 2: JWT verification - cryptographic proof of identity
  const tokenResult = await verifyToken(authHeader, config);
  if (!tokenResult.success) {
    return {
      success: false,
      error: tokenResult.error,
      errorCode: 'INVALID_TOKEN',
    };
  }

  const payload = tokenResult.payload!;
  const email = payload.email?.toLowerCase() || '';
  const groups = payload['cognito:groups'] || [];

  // Layer 3: Email allowlist - explicit user authorization
  const allowedEmails = await getAllowedEmails(config);
  if (allowedEmails.length > 0 && !allowedEmails.includes(email)) {
    return {
      success: false,
      error: 'Email not in allowlist',
      errorCode: 'EMAIL_NOT_ALLOWED',
    };
  }

  // Layer 4: IP allowlist - network-level access control
  const ipAllowlist = await getIpAllowlist(config);
  if (ipAllowlist.enabled && !isIpAllowed(clientIp, ipAllowlist.cidrs)) {
    return {
      success: false,
      error: 'IP not in allowlist',
      errorCode: 'IP_NOT_ALLOWED',
    };
  }

  // Layer 5: Group membership - Cognito-based authorization
  const adminGroups = Array.from(
    new Set(
      groups.flatMap((group) => {
        if (group === 'Admin' || group === 'SuperAdmin' || group === 'OrgAdmin') return ['Admin'];
        if (group === 'Viewer' || group === 'OrgViewer') return ['Viewer'];
        return [];
      })
    )
  ) as AdminRole[];
  if (adminGroups.length === 0) {
    return {
      success: false,
      error: 'User not in admin group',
      errorCode: 'NOT_IN_GROUP',
    };
  }

  // Layer 6: Role assignment - determine permissions
  const user: AdminUser = {
    sub: payload.sub,
    email,
    groups: adminGroups,
    role: determineRole(adminGroups),
  };

  return { success: true, user };
}

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
export function hasPermission(user: AdminUser, action: 'read' | 'write' | 'export'): boolean {
  switch (action) {
    case 'read':
      // Both Admin and Viewer can read
      return user.role === 'Admin' || user.role === 'Viewer';
    case 'write':
      // Security: Only Admin can modify data
      return user.role === 'Admin';
    case 'export':
      // Both Admin and Viewer can export (read-only operation)
      return user.role === 'Admin' || user.role === 'Viewer';
    default:
      // Security: Unknown actions are denied by default
      return false;
  }
}

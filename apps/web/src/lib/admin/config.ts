/**
 * Admin Console Configuration
 *
 * Configuration for Cognito authentication and API endpoints.
 * These values should come from environment variables.
 */

export interface AdminConfig {
  cognitoUserPoolId: string;
  cognitoClientId: string;
  cognitoDomain: string;
  apiBaseUrl: string;
  redirectUri: string;
  logoutUri: string;
}

export function getAdminConfig(): AdminConfig {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  return {
    cognitoUserPoolId: process.env.NEXT_PUBLIC_ADMIN_COGNITO_USER_POOL_ID || '',
    cognitoClientId: process.env.NEXT_PUBLIC_ADMIN_COGNITO_CLIENT_ID || '',
    cognitoDomain: process.env.NEXT_PUBLIC_ADMIN_COGNITO_DOMAIN || '',
    apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || '',
    redirectUri: `${baseUrl}/admin/callback`,
    logoutUri: `${baseUrl}/admin`,
  };
}

/**
 * Build Cognito Hosted UI login URL
 */
export function buildLoginUrl(config: AdminConfig, state?: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.cognitoClientId,
    redirect_uri: config.redirectUri,
    scope: 'openid email profile',
    ...(state && { state }),
  });

  return `${config.cognitoDomain}/login?${params.toString()}`;
}

/**
 * Build Cognito Hosted UI logout URL
 */
export function buildLogoutUrl(config: AdminConfig): string {
  const params = new URLSearchParams({
    client_id: config.cognitoClientId,
    logout_uri: config.logoutUri,
  });

  return `${config.cognitoDomain}/logout?${params.toString()}`;
}

/**
 * Build token exchange URL
 */
export function buildTokenUrl(config: AdminConfig): string {
  return `${config.cognitoDomain}/oauth2/token`;
}

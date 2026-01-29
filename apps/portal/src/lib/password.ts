// ──────────────────────────────────────────────
// Cognito password reset helpers (portal)
//
// Uses Cognito's public ForgotPassword / ConfirmForgotPassword APIs.
// Requires only clientId + username (email).
// ──────────────────────────────────────────────

const COGNITO_DOMAIN = process.env.NEXT_PUBLIC_COGNITO_DOMAIN || '';
const CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '';
const REGION_FALLBACK = process.env.NEXT_PUBLIC_COGNITO_REGION || 'us-east-1';

function getCognitoRegion(): string {
  const normalized = COGNITO_DOMAIN.replace(/^https?:\/\//, '');
  const match = normalized.match(/\.auth\.([a-z0-9-]+)\.amazoncognito\.com/i);
  return match?.[1] || REGION_FALLBACK;
}

function getCognitoEndpoint(): string {
  const region = getCognitoRegion();
  return `https://cognito-idp.${region}.amazonaws.com/`;
}

async function cognitoRequest<T>(target: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(getCognitoEndpoint(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': target,
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      (payload && typeof payload.message === 'string' && payload.message) ||
      'Password reset failed';
    throw new Error(message);
  }

  return payload as T;
}

export async function requestPasswordReset(email: string): Promise<void> {
  if (!CLIENT_ID) {
    throw new Error('Portal Cognito client is not configured');
  }
  await cognitoRequest('AWSCognitoIdentityProviderService.ForgotPassword', {
    ClientId: CLIENT_ID,
    Username: email,
  });
}

export async function confirmPasswordReset(
  email: string,
  code: string,
  newPassword: string
): Promise<void> {
  if (!CLIENT_ID) {
    throw new Error('Portal Cognito client is not configured');
  }
  await cognitoRequest('AWSCognitoIdentityProviderService.ConfirmForgotPassword', {
    ClientId: CLIENT_ID,
    Username: email,
    ConfirmationCode: code,
    Password: newPassword,
  });
}

export const cognitoRegionForTest = getCognitoRegion;

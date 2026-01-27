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
import { GetParameterCommand } from '@aws-sdk/client-ssm';
import type { PreTokenAdminConfig } from './types.js';
import { getSsmClient } from '../lib/clients.js';
import { createLogger } from '../lib/logging.js';

const log = createLogger('pre-token-admin');

// =============================================================================
// Configuration
// =============================================================================

function loadConfig(): PreTokenAdminConfig {
  return {
    awsRegion: process.env.AWS_REGION || 'us-east-1',
    allowedEmailsSsmPath: process.env.ALLOWED_EMAILS_SSM_PATH || '',
  };
}

// =============================================================================
// Allowed Emails Cache
// =============================================================================

let cachedAllowedEmails: Set<string> | null = null;
let allowedEmailsCacheExpiry = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

/**
 * Load admin allowed emails from SSM Parameter Store.
 *
 * Expected SSM parameter value format (comma-separated):
 * "admin1@kanjona.com,admin2@kanjona.com,superadmin@kanjona.com"
 */
async function loadAllowedEmails(config: PreTokenAdminConfig): Promise<Set<string>> {
  const now = Date.now();

  if (cachedAllowedEmails && now < allowedEmailsCacheExpiry) {
    return cachedAllowedEmails;
  }

  if (!config.allowedEmailsSsmPath) {
    log.error('Allowed emails SSM path not configured', {
      errorCode: 'CONFIG_ERROR',
    });
    return new Set();
  }

  try {
    const client = getSsmClient(config.awsRegion);
    const result = await client.send(
      new GetParameterCommand({
        Name: config.allowedEmailsSsmPath,
        WithDecryption: true,
      })
    );

    if (!result.Parameter?.Value) {
      log.warn('Allowed emails parameter is empty');
      return new Set();
    }

    const emails = result.Parameter.Value.split(',')
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0);

    const emailSet = new Set(emails);
    cachedAllowedEmails = emailSet;
    allowedEmailsCacheExpiry = now + CACHE_TTL_MS;

    log.info('Admin allowed emails loaded', { count: emailSet.size });

    return emailSet;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error('Failed to load allowed emails from SSM', {
      errorCode: 'SSM_LOAD_ERROR',
      error: errorMessage,
    });

    // Return cached value if available
    if (cachedAllowedEmails) {
      return cachedAllowedEmails;
    }

    return new Set();
  }
}

// =============================================================================
// Lambda Handler
// =============================================================================

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
export async function handler(
  event: PreTokenGenerationTriggerEvent
): Promise<PreTokenGenerationTriggerEvent> {
  const config = loadConfig();

  const cognitoSub = event.request.userAttributes.sub;
  const email = (event.request.userAttributes.email || '').toLowerCase().trim();

  log.info('Pre-token generation triggered (admin)', { sub: cognitoSub });

  if (!email) {
    log.error('No email found in user attributes', {
      sub: cognitoSub,
      errorCode: 'MISSING_EMAIL',
    });
    throw new Error('User email is required for admin access');
  }

  // Load allowed emails
  const allowedEmails = await loadAllowedEmails(config);

  if (allowedEmails.size === 0) {
    log.error('No allowed emails configured - denying all access', {
      sub: cognitoSub,
      errorCode: 'NO_ALLOWLIST',
    });
    throw new Error('Admin access configuration error');
  }

  // Check if user is in the allowlist
  if (!allowedEmails.has(email)) {
    log.warn('User not in admin allowlist - access denied', {
      sub: cognitoSub,
      errorCode: 'NOT_ALLOWLISTED',
    });
    throw new Error('You are not authorized to access the admin console');
  }

  // User is allowlisted - add custom claims
  log.info('Admin access granted', { sub: cognitoSub });

  // Add custom:role claim to the token
  event.response = {
    claimsOverrideDetails: {
      claimsToAddOrOverride: {
        'custom:role': 'ADMIN',
      },
    },
  };

  return event;
}

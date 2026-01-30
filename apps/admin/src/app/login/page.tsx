'use client';

/**
 * Login Page
 *
 * Simple login page with Cognito Hosted UI redirect.
 * Uses an allowlist of error codes to prevent reflecting arbitrary input.
 */

import { getLoginUrl, isAuthConfigured } from '@/lib/auth';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const ERROR_MESSAGES: Record<string, string> = {
  auth_failed: 'Authentication failed. Please try again.',
  invalid_state: 'Invalid session state. Please try logging in again.',
  no_code: 'No authorization code received.',
  token_exchange_failed: 'Token exchange failed. Please try again.',
  unknown: 'An unexpected error occurred. Please try again.',
};

function LoginContent() {
  const searchParams = useSearchParams();
  const errorKey = searchParams.get('error');
  const errorMessage = errorKey ? ERROR_MESSAGES[errorKey] || ERROR_MESSAGES['unknown'] : null;
  const expired = searchParams.get('expired');

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
      <div className="w-full max-w-sm mx-4">
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg shadow-sm p-8">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">Admin Console</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">Leads Funnel Administration</p>
          </div>

          {/* Error messages */}
          {errorMessage && (
            <div className="mb-6 p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-300">{errorMessage}</p>
            </div>
          )}

          {expired && (
            <div className="mb-6 p-3 rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Your session has expired. Please sign in again.
              </p>
            </div>
          )}

          {/* Login Button */}
          <button
            type="button"
            onClick={() => {
              if (!isAuthConfigured()) return;
              window.location.href = getLoginUrl();
            }}
            disabled={!isAuthConfigured()}
            className="flex items-center justify-center w-full px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            Sign in with SSO
          </button>
          {!isAuthConfigured() && (
            <p className="mt-3 text-xs text-red-600">
              Admin auth is not configured. Check Cognito domain and client ID.
            </p>
          )}

          <p className="text-xs text-center text-[var(--text-tertiary)] mt-6">
            Access restricted to authorized administrators.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
          <p className="text-[var(--text-secondary)]">Loading...</p>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

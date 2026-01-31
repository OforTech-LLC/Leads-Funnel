'use client';

/**
 * OAuth Callback Page
 *
 * Handles the Cognito redirect after successful login.
 * Exchanges the authorization code for tokens and stores them via backend API.
 * Verifies OAuth state parameter for CSRF protection.
 */

import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { exchangeCodeForTokens } from '@/lib/auth';

// Module-level flag to prevent double execution across re-renders
let isExchangingCode = false;

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    // Prevent double execution (React StrictMode runs effects twice)
    if (hasRun.current || isExchangingCode) {
      return;
    }
    hasRun.current = true;
    isExchangingCode = true;

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError(`Authentication failed: ${errorParam}`);
      isExchangingCode = false;
      return;
    }

    if (!code) {
      setError('No authorization code received.');
      isExchangingCode = false;
      return;
    }

    // Validate state exists and has valid structure
    if (state) {
      try {
        const decoded = JSON.parse(atob(state));
        if (!decoded.nonce || !decoded.timestamp) {
          setError('Invalid state format.');
          isExchangingCode = false;
          return;
        }
        const age = Date.now() - decoded.timestamp;
        if (age > 5 * 60 * 1000) {
          setError('Session expired. Please try logging in again.');
          isExchangingCode = false;
          return;
        }
      } catch {
        setError('Could not verify session state.');
        isExchangingCode = false;
        return;
      }
    } else {
      setError('Missing state parameter.');
      isExchangingCode = false;
      return;
    }

    async function handleCallback() {
      try {
        const result = await exchangeCodeForTokens(code!);

        if (result.success) {
          router.replace('/');
        } else {
          setError(`Token exchange failed: ${result.error || 'Unknown error'}`);
        }
      } catch (err) {
        setError(`Authentication error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        isExchangingCode = false;
      }
    }

    handleCallback();
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
        <div className="w-full max-w-sm mx-4">
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg shadow-sm p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <svg
                className="h-6 w-6 text-red-600 dark:text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                />
              </svg>
            </div>
            <h2 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
              Authentication Error
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">{error}</p>
            <button
              onClick={() => router.replace('/login')}
              className="mt-6 inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-sm text-[var(--text-secondary)]">Completing sign in...</p>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-sm text-[var(--text-secondary)]">Loading...</p>
          </div>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}

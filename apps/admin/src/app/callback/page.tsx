'use client';

/**
 * OAuth Callback Page
 *
 * Handles the Cognito redirect after successful login.
 * Exchanges the authorization code for tokens and stores them via backend API.
 * Verifies OAuth state parameter for CSRF protection.
 */

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { exchangeCodeForTokens, verifyState } from '@/lib/auth';

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setStatus('error');
      setErrorMessage('Authentication failed. Please try again.');
      return;
    }

    if (!code) {
      setStatus('error');
      setErrorMessage('No authorization code received.');
      return;
    }

    if (!state || !verifyState(state)) {
      setStatus('error');
      setErrorMessage('Invalid session state. Please try logging in again.');
      return;
    }

    // Exchange code for tokens
    exchangeCodeForTokens(code).then((success) => {
      if (success) {
        setStatus('success');
        router.replace('/');
      } else {
        setStatus('error');
        setErrorMessage('Failed to complete authentication. Please try again.');
      }
    });
  }, [searchParams, router]);

  if (status === 'error') {
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
            <p className="mt-2 text-sm text-[var(--text-secondary)]">{errorMessage}</p>
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
        <p className="mt-4 text-sm text-[var(--text-secondary)]">
          {status === 'success' ? 'Redirecting...' : 'Completing sign in...'}
        </p>
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

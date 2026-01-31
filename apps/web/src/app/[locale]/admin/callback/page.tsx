'use client';

/**
 * OAuth Callback Page
 *
 * Handles the redirect from Cognito Hosted UI after authentication.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { exchangeCodeForTokens, verifyState } from '@/lib/admin/auth';

export default function AdminCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const processedRef = useRef(false);

  const handleCallback = useCallback(async () => {
    if (processedRef.current) return;
    processedRef.current = true;

    // Get authorization code and state from URL
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle error from Cognito
    if (errorParam) {
      setError(errorDescription || errorParam);
      return;
    }

    // Validate required parameters
    if (!code) {
      setError('Missing authorization code');
      return;
    }

    // Security: State parameter is mandatory for CSRF protection
    if (!state || !verifyState(state)) {
      setError('Invalid or missing state parameter. Please try logging in again.');
      return;
    }

    try {
      // Exchange code for tokens
      await exchangeCodeForTokens(code);

      // Redirect to admin dashboard
      router.replace('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    }
  }, [router, searchParams]);

  useEffect(() => {
    handleCallback();
  }, [handleCallback]);

  return (
    <div className="callback-page">
      {error ? (
        <div className="callback-error">
          <h1>Authentication Error</h1>
          <p>{error}</p>
          <Link href="/admin" className="callback-link">
            Try Again
          </Link>
        </div>
      ) : (
        <div className="callback-loading">
          <div className="callback-spinner" />
          <p>Completing authentication...</p>
        </div>
      )}
    </div>
  );
}

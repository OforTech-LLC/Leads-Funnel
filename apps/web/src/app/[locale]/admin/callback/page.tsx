'use client';

/**
 * OAuth Callback Page
 *
 * Handles the redirect from Cognito Hosted UI after authentication.
 */

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { exchangeCodeForTokens, verifyState } from '@/lib/admin/auth';

export default function AdminCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    handleCallback();
  }, []);

  async function handleCallback() {
    // Get authorization code and state from URL
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle error from Cognito
    if (errorParam) {
      setError(errorDescription || errorParam);
      setLoading(false);
      return;
    }

    // Validate required parameters
    if (!code) {
      setError('Missing authorization code');
      setLoading(false);
      return;
    }

    // Security: State parameter is mandatory for CSRF protection
    if (!state || !verifyState(state)) {
      setError('Invalid or missing state parameter. Please try logging in again.');
      setLoading(false);
      return;
    }

    try {
      // Exchange code for tokens
      await exchangeCodeForTokens(code);

      // Redirect to admin dashboard
      router.replace('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
      setLoading(false);
    }
  }

  return (
    <div className="callback-page">
      {error ? (
        <div className="callback-error">
          <h1>Authentication Error</h1>
          <p>{error}</p>
          <a href="/admin" className="callback-link">
            Try Again
          </a>
        </div>
      ) : (
        <div className="callback-loading">
          <div className="callback-spinner" />
          <p>Completing authentication...</p>
        </div>
      )}

      <style jsx>{`
        .callback-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%);
          color: #fff;
          font-family:
            system-ui,
            -apple-system,
            sans-serif;
        }

        .callback-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .callback-spinner {
          width: 48px;
          height: 48px;
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .callback-error {
          text-align: center;
          max-width: 400px;
          padding: 32px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
        }

        .callback-error h1 {
          font-size: 24px;
          margin: 0 0 12px;
          color: #ef4444;
        }

        .callback-error p {
          color: rgba(255, 255, 255, 0.7);
          margin: 0 0 24px;
        }

        .callback-link {
          display: inline-block;
          padding: 12px 24px;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          border-radius: 8px;
          color: #fff;
          text-decoration: none;
          font-weight: 500;
          transition: opacity 0.2s;
        }

        .callback-link:hover {
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
}

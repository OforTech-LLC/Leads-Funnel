'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { exchangeCodeForTokens, verifyState } from '@/lib/auth';
import LoadingSpinner from '@/components/LoadingSpinner';

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const processedRef = useRef(false);

  useEffect(() => {
    // Prevent double execution
    if (processedRef.current) {
      return;
    }
    processedRef.current = true;

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError(`Authentication failed: ${errorParam}`);
      return;
    }

    if (!code) {
      setError('No authorization code received');
      return;
    }

    // Security: Verify OAuth state parameter to prevent CSRF
    if (!state || !verifyState(state)) {
      setError('Invalid session state. Please try logging in again.');
      return;
    }

    async function handleCallback() {
      const result = await exchangeCodeForTokens(code!);

      if (result.success) {
        // Check for stored returnTo path
        const returnTo = sessionStorage.getItem('portal_returnTo') || '/';
        sessionStorage.removeItem('portal_returnTo');
        // Security: Validate returnTo is a relative path, not absolute URL or protocol-relative
        const safeReturnTo =
          returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/';
        router.replace(safeReturnTo);
      } else {
        setError(`Failed to complete authentication: ${result.error || 'Unknown error'}`);
      }
    }

    handleCallback();
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            <svg
              className="h-6 w-6 text-red-500"
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
          <h2 className="mt-4 text-lg font-semibold text-gray-900">Authentication Error</h2>
          <p className="mt-2 text-sm text-gray-500">{error}</p>
          <button
            onClick={() => router.replace('/login')}
            className="mt-6 inline-flex min-h-[44px] items-center rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-sm text-gray-500">Completing sign in...</p>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-sm text-gray-500">Loading...</p>
          </div>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}

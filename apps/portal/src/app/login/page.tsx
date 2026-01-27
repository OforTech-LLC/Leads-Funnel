'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getLoginUrl } from '@/lib/auth';
import LoadingSpinner from '@/components/LoadingSpinner';

function LoginContent() {
  const searchParams = useSearchParams();
  const expired = searchParams.get('expired') === '1';
  const returnTo = searchParams.get('returnTo');

  function handleSignIn() {
    // Store returnTo for redirect after callback
    if (returnTo) {
      sessionStorage.setItem('portal_returnTo', returnTo);
    }
    window.location.href = getLoginUrl();
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 shadow-lg shadow-brand-200">
            <svg
              className="h-8 w-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
              />
            </svg>
          </div>
          <h1 className="mt-5 text-2xl font-bold text-gray-900">Agent Portal</h1>
          <p className="mt-2 text-sm text-gray-500">Manage your leads and track your pipeline</p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          {expired && (
            <div className="mb-4 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-700">
              Your session has expired. Please sign in again.
            </div>
          )}

          <button
            onClick={handleSignIn}
            className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 active:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            Sign in with your account
          </button>

          <p className="mt-4 text-center text-xs text-gray-400">
            Access is restricted to authorized team members
          </p>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-gray-400">Leads Funnel Portal</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

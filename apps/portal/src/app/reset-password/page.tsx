'use client';

import { useState } from 'react';
import Link from 'next/link';
import { requestPasswordReset, confirmPasswordReset } from '@/lib/password';

export default function ResetPasswordPage() {
  const [step, setStep] = useState<'request' | 'confirm'>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim()) {
      setError('Email is required.');
      return;
    }

    setLoading(true);
    try {
      await requestPasswordReset(email.trim());
      setStep('confirm');
      setSuccess('Check your email for the verification code.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start reset.');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim()) {
      setError('Email is required.');
      return;
    }
    if (!code.trim()) {
      setError('Verification code is required.');
      return;
    }
    if (!password) {
      setError('New password is required.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await confirmPasswordReset(email.trim(), code.trim(), password);
      setSuccess('Password reset successful. You can now sign in.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
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
          <h1 className="mt-5 text-2xl font-bold text-gray-900">Reset password</h1>
          <p className="mt-2 text-sm text-gray-500">
            {step === 'request'
              ? 'We will email you a verification code.'
              : 'Enter the code from your email and set a new password.'}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}
          {success && (
            <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{success}</div>
          )}

          {step === 'request' ? (
            <form onSubmit={handleRequest} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  placeholder="you@company.com"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60"
              >
                {loading ? 'Sending code...' : 'Send reset code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleConfirm} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  placeholder="you@company.com"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Verification code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  placeholder="123456"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">New password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  placeholder="••••••••"
                  required
                />
                <p className="mt-1 text-xs text-gray-400">
                  Use at least 8 characters with a mix of letters, numbers, and symbols.
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Confirm password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  placeholder="••••••••"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60"
              >
                {loading ? 'Resetting...' : 'Reset password'}
              </button>
            </form>
          )}

          <div className="mt-4 text-center text-xs text-gray-400">
            <Link href="/login" className="text-brand-600 hover:text-brand-700">
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

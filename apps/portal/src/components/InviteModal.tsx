'use client';

import { useState, useRef, useEffect } from 'react';

interface InviteModalProps {
  open: boolean;
  onClose: () => void;
  onInvite: (email: string, role: 'admin' | 'agent') => void;
  isLoading?: boolean;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function InviteModal({
  open,
  onClose,
  onInvite,
  isLoading = false,
}: InviteModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'agent'>('agent');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens, reset state
  useEffect(() => {
    if (open) {
      setEmail('');
      setRole('agent');
      setError('');
      // Small delay for animation
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();

    if (!trimmed) {
      setError('Email address is required');
      return;
    }

    if (!isValidEmail(trimmed)) {
      setError('Please enter a valid email address');
      return;
    }

    setError('');
    onInvite(trimmed, role);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape' && !isLoading) {
      onClose();
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-modal-title"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 transition-opacity"
        onClick={() => !isLoading && onClose()}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div
        className="relative w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-xl"
        style={{ animation: 'dialog-enter 0.2s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 id="invite-modal-title" className="text-lg font-semibold text-gray-900">
            Invite Team Member
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
            aria-label="Close"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div>
            <label
              htmlFor="invite-email"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Email address
            </label>
            <input
              ref={inputRef}
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError('');
              }}
              placeholder="colleague@company.com"
              disabled={isLoading}
              className={`h-11 w-full rounded-xl border bg-white px-4 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50 ${
                error
                  ? 'border-red-300 focus:border-red-500'
                  : 'border-gray-200 focus:border-brand-500'
              }`}
              aria-invalid={!!error}
              aria-describedby={error ? 'invite-email-error' : undefined}
            />
            {error && (
              <p id="invite-email-error" className="mt-1.5 text-xs text-red-500" role="alert">
                {error}
              </p>
            )}
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRole('agent')}
                disabled={isLoading}
                className={`flex flex-1 min-h-[44px] items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                  role === 'agent'
                    ? 'border-brand-200 bg-brand-50 text-brand-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <svg
                  className="mr-2 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                  />
                </svg>
                Agent
              </button>
              <button
                type="button"
                onClick={() => setRole('admin')}
                disabled={isLoading}
                className={`flex flex-1 min-h-[44px] items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                  role === 'admin'
                    ? 'border-purple-200 bg-purple-50 text-purple-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <svg
                  className="mr-2 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                  />
                </svg>
                Admin
              </button>
            </div>
            <p className="mt-1.5 text-xs text-gray-400">
              {role === 'admin'
                ? 'Admins can manage team members and organization settings'
                : 'Agents can view and manage leads assigned to them'}
            </p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full min-h-[48px] items-center justify-center rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 active:bg-brand-800 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Sending Invitation...
              </>
            ) : (
              'Send Invitation'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

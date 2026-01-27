'use client';

import { useEffect, useState, useCallback, type ReactNode } from 'react';
import {
  subscribe,
  getToasts,
  removeToast,
  type Toast as ToastType,
  type ToastVariant,
} from '@/lib/toast';

// ── Variant config ───────────────────────────

const VARIANT_STYLES: Record<ToastVariant, { bg: string; icon: ReactNode }> = {
  success: {
    bg: 'bg-green-50 border-green-200 text-green-800',
    icon: (
      <svg
        className="h-5 w-5 text-green-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  error: {
    bg: 'bg-red-50 border-red-200 text-red-800',
    icon: (
      <svg
        className="h-5 w-5 text-red-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
        />
      </svg>
    ),
  },
  warning: {
    bg: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    icon: (
      <svg
        className="h-5 w-5 text-yellow-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
        />
      </svg>
    ),
  },
  info: {
    bg: 'bg-blue-50 border-blue-200 text-blue-800',
    icon: (
      <svg
        className="h-5 w-5 text-blue-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
        />
      </svg>
    ),
  },
};

// ── Single toast item ────────────────────────

function ToastItem({ toast, onDismiss }: { toast: ToastType; onDismiss: (id: string) => void }) {
  const [isExiting, setIsExiting] = useState(false);
  const config = VARIANT_STYLES[toast.variant];

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => onDismiss(toast.id), 200);
  }, [toast.id, onDismiss]);

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg transition-all duration-200 ${config.bg} ${
        isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'
      }`}
      style={{ animation: isExiting ? undefined : 'toast-enter 0.3s ease-out' }}
    >
      <span className="mt-0.5 flex-shrink-0">{config.icon}</span>
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        type="button"
        onClick={handleDismiss}
        className="flex-shrink-0 rounded-lg p-1 transition-colors hover:bg-black/5"
        aria-label="Dismiss notification"
      >
        <svg
          className="h-4 w-4 opacity-60"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ── Toast container (renders all active toasts) ──

function ToastContainer() {
  const [toasts, setToasts] = useState<ToastType[]>(getToasts);

  useEffect(() => {
    return subscribe(setToasts);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="fixed right-4 top-4 z-[100] flex w-80 flex-col gap-2 sm:right-6 sm:top-6"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={removeToast} />
      ))}
    </div>
  );
}

// ── Provider wrapping the app ────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <ToastContainer />
    </>
  );
}

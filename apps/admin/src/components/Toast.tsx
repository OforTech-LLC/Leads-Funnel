'use client';

/**
 * Toast Notification Components
 *
 * ToastProvider wraps the app and provides the useToast hook.
 * Toasts appear in the top-right, stack vertically, auto-dismiss
 * after 5 seconds with a progress bar, and cap at 3 visible.
 */

import { createContext, useContext, useCallback, useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { createToastId, TOAST_DURATION_MS, MAX_VISIBLE_TOASTS } from '@/lib/toast';
import type { ToastMessage, ToastVariant } from '@/lib/toast';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  success: () => {},
  error: () => {},
  warning: () => {},
  info: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

// ---------------------------------------------------------------------------
// Variant Config
// ---------------------------------------------------------------------------

const VARIANT_STYLES: Record<
  ToastVariant,
  { bg: string; border: string; icon: string; progress: string }
> = {
  success: {
    bg: 'bg-green-50 dark:bg-green-900/30',
    border: 'border-green-200 dark:border-green-800',
    icon: 'text-green-600 dark:text-green-400',
    progress: 'bg-green-500',
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-900/30',
    border: 'border-red-200 dark:border-red-800',
    icon: 'text-red-600 dark:text-red-400',
    progress: 'bg-red-500',
  },
  warning: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/30',
    border: 'border-yellow-200 dark:border-yellow-800',
    icon: 'text-yellow-600 dark:text-yellow-400',
    progress: 'bg-yellow-500',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/30',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'text-blue-600 dark:text-blue-400',
    progress: 'bg-blue-500',
  },
};

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function SuccessIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z"
      />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

const VARIANT_ICONS: Record<ToastVariant, React.ComponentType> = {
  success: SuccessIcon,
  error: ErrorIcon,
  warning: WarningIcon,
  info: InfoIcon,
};

// ---------------------------------------------------------------------------
// Single Toast Item
// ---------------------------------------------------------------------------

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }) {
  const [exiting, setExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const styles = VARIANT_STYLES[toast.variant];
  const Icon = VARIANT_ICONS[toast.variant];

  useEffect(() => {
    const startTime = Date.now();
    const duration = toast.duration;

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (remaining <= 0) {
        clearInterval(timerRef.current);
        setExiting(true);
        setTimeout(() => onDismiss(toast.id), 300);
      }
    }, 50);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [toast.id, toast.duration, onDismiss]);

  const handleDismiss = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setExiting(true);
    setTimeout(() => onDismiss(toast.id), 300);
  }, [toast.id, onDismiss]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'w-80 rounded-lg border shadow-lg overflow-hidden transition-all duration-300',
        styles.bg,
        styles.border,
        exiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
      )}
      style={{
        animation: exiting ? undefined : 'toast-slide-in 0.3s ease-out',
      }}
    >
      <div className="flex items-start gap-3 p-4">
        <span className={cn('shrink-0 mt-0.5', styles.icon)}>
          <Icon />
        </span>
        <p className="flex-1 text-sm text-[var(--text-primary)] leading-5">{toast.message}</p>
        <button
          onClick={handleDismiss}
          className="shrink-0 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          aria-label="Dismiss notification"
        >
          <svg
            className="w-4 h-4 text-[var(--text-tertiary)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
      {/* Progress bar */}
      <div className="h-1 bg-black/5 dark:bg-white/5">
        <div
          className={cn('h-full transition-none', styles.progress)}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toast Provider
// ---------------------------------------------------------------------------

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((variant: ToastVariant, message: string) => {
    const toast: ToastMessage = {
      id: createToastId(),
      variant,
      message,
      duration: TOAST_DURATION_MS,
      createdAt: Date.now(),
    };
    setToasts((prev) => [...prev, toast]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((message: string) => addToast('success', message), [addToast]);
  const error = useCallback((message: string) => addToast('error', message), [addToast]);
  const warning = useCallback((message: string) => addToast('warning', message), [addToast]);
  const info = useCallback((message: string) => addToast('info', message), [addToast]);

  // Only show the latest MAX_VISIBLE_TOASTS
  const visibleToasts = toasts.slice(-MAX_VISIBLE_TOASTS);

  return (
    <ToastContext.Provider value={{ success, error, warning, info }}>
      {children}

      {/* Toast Container */}
      <div
        className="fixed top-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none"
        aria-label="Notifications"
      >
        {visibleToasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onDismiss={dismissToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

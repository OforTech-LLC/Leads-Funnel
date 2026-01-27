'use client';

/**
 * Error Alert Display
 *
 * Shows an error message with optional retry action.
 */

interface ErrorAlertProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export default function ErrorAlert({ message, onRetry, className = '' }: ErrorAlertProps) {
  return (
    <div
      className={`rounded-md border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4 ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <svg
          className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
        <div className="flex-1">
          <p className="text-sm text-red-800 dark:text-red-200">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 text-sm font-medium text-red-700 dark:text-red-300 hover:underline"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

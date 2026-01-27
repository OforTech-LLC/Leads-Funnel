'use client';

import { useEffect, useRef, useCallback } from 'react';

export type ConfirmDialogVariant = 'danger' | 'warning' | 'info';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const VARIANT_STYLES: Record<
  ConfirmDialogVariant,
  { icon: string; iconBg: string; btnBg: string }
> = {
  danger: {
    icon: 'text-red-500',
    iconBg: 'bg-red-50',
    btnBg: 'bg-red-600 hover:bg-red-700 active:bg-red-800 focus:ring-red-500',
  },
  warning: {
    icon: 'text-yellow-500',
    iconBg: 'bg-yellow-50',
    btnBg: 'bg-yellow-600 hover:bg-yellow-700 active:bg-yellow-800 focus:ring-yellow-500',
  },
  info: {
    icon: 'text-brand-500',
    iconBg: 'bg-brand-50',
    btnBg: 'bg-brand-600 hover:bg-brand-700 active:bg-brand-800 focus:ring-brand-500',
  },
};

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const config = VARIANT_STYLES[variant];

  // Focus trap: focus the cancel button when dialog opens
  useEffect(() => {
    if (open) {
      cancelBtnRef.current?.focus();
    }
  }, [open]);

  // Keyboard handler: Escape to cancel, trap Tab within dialog
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (!isLoading) onCancel();
        return;
      }

      // Focus trap
      if (e.key === 'Tab') {
        const focusable =
          dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled])');
        if (!focusable || focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [isLoading, onCancel]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 transition-opacity"
        onClick={() => !isLoading && onCancel()}
        aria-hidden="true"
      />

      {/* Dialog panel */}
      <div
        ref={dialogRef}
        className="relative w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-6 shadow-xl"
        style={{ animation: 'dialog-enter 0.2s ease-out' }}
      >
        {/* Icon */}
        <div
          className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${config.iconBg}`}
        >
          <svg
            className={`h-6 w-6 ${config.icon}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>

        {/* Content */}
        <h3
          id="confirm-dialog-title"
          className="mt-4 text-center text-base font-semibold text-gray-900"
        >
          {title}
        </h3>
        <p id="confirm-dialog-message" className="mt-2 text-center text-sm text-gray-500">
          {message}
        </p>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex flex-1 min-h-[44px] items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex flex-1 min-h-[44px] items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${config.btnBg}`}
          >
            {isLoading ? (
              <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
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
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

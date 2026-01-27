'use client';

/**
 * Reusable Modal Dialog
 *
 * Renders a centered dialog with backdrop, title, and close button.
 */

import { useEffect, useCallback } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: 'sm' | 'md' | 'lg' | 'xl';
}

const WIDTH_CLASSES: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

export default function Modal({ open, onClose, title, children, width = 'md' }: ModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Dialog */}
      <div
        className={`relative bg-[var(--card-bg)] rounded-lg shadow-xl w-full ${WIDTH_CLASSES[width]} mx-4 max-h-[90vh] overflow-y-auto`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)]">
          <h2 id="modal-title" className="text-lg font-semibold text-[var(--text-primary)]">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--bg-tertiary)] transition-colors"
            aria-label="Close dialog"
          >
            <svg
              className="w-5 h-5 text-[var(--text-secondary)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

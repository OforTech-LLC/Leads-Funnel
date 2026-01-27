'use client';

/**
 * Confirm Action Dialog
 *
 * Modal dialog for confirming destructive or important actions.
 */

import Modal from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmVariant?: 'danger' | 'primary';
  loading?: boolean;
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  confirmVariant = 'primary',
  loading = false,
}: ConfirmDialogProps) {
  const buttonClass =
    confirmVariant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 text-white'
      : 'bg-blue-600 hover:bg-blue-700 text-white';

  return (
    <Modal open={open} onClose={onClose} title={title} width="sm">
      <p className="text-sm text-[var(--text-secondary)] mb-6">{message}</p>
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2 text-sm border border-[var(--border-color)] rounded-md hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-primary)]"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={`px-4 py-2 text-sm rounded-md transition-colors disabled:opacity-50 ${buttonClass}`}
        >
          {loading ? 'Processing...' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

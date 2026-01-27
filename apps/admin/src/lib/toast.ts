/**
 * Toast Notification System
 *
 * Provides a lightweight, type-safe toast notification API.
 * Works with the ToastProvider context for rendering.
 */

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  variant: ToastVariant;
  message: string;
  duration: number;
  createdAt: number;
}

let toastCounter = 0;

export function createToastId(): string {
  toastCounter += 1;
  return `toast-${Date.now()}-${toastCounter}`;
}

export const TOAST_DURATION_MS = 5000;
export const MAX_VISIBLE_TOASTS = 3;

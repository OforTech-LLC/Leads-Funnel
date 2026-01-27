// ──────────────────────────────────────────────
// Toast notification store
//
// Lightweight store for managing toast notifications.
// Uses a simple pub/sub pattern with React state
// managed in the ToastProvider component.
// ──────────────────────────────────────────────

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

type ToastListener = (toasts: Toast[]) => void;

let toasts: Toast[] = [];
let listeners: ToastListener[] = [];
let nextId = 0;

function emit() {
  listeners.forEach((listener) => listener([...toasts]));
}

export function addToast(
  message: string,
  variant: ToastVariant = 'info',
  duration: number = 5000
): string {
  const id = `toast-${++nextId}`;
  const toast: Toast = { id, message, variant, duration };
  toasts = [...toasts, toast];
  emit();

  if (duration > 0) {
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }

  return id;
}

export function removeToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function subscribe(listener: ToastListener): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function getToasts(): Toast[] {
  return [...toasts];
}

// ── Convenience helpers ──────────────────────

export const toast = {
  success: (message: string, duration?: number) => addToast(message, 'success', duration),
  error: (message: string, duration?: number) => addToast(message, 'error', duration),
  warning: (message: string, duration?: number) => addToast(message, 'warning', duration),
  info: (message: string, duration?: number) => addToast(message, 'info', duration),
};

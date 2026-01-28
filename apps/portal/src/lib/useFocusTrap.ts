import { useEffect, type RefObject } from 'react';

/**
 * Traps focus inside a modal or dialog container when it is open.
 *
 * On open:
 * - Focuses the first focusable element inside the container.
 * - Listens for Tab keydown and wraps focus within the container.
 *
 * On close:
 * - Cleans up the event listener.
 */
export function useFocusTrap(containerRef: RefObject<HTMLElement | null>, isOpen: boolean): void {
  useEffect(() => {
    if (!isOpen) return;

    const container = containerRef.current;
    if (!container) return;

    const focusableSelector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const focusableElements = container.querySelectorAll<HTMLElement>(focusableSelector);
    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];

    // Focus the first element on open
    first?.focus();

    function handleTab(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;

      const currentFocusable = container!.querySelectorAll<HTMLElement>(focusableSelector);
      const firstEl = currentFocusable[0];
      const lastEl = currentFocusable[currentFocusable.length - 1];

      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl?.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl?.focus();
      }
    }

    container.addEventListener('keydown', handleTab);
    return () => container.removeEventListener('keydown', handleTab);
  }, [isOpen, containerRef]);
}

/**
 * VisuallyHidden Component
 *
 * Renders content that is hidden visually but remains accessible
 * to screen readers and other assistive technologies.
 *
 * Uses the Tailwind `sr-only` class which applies:
 * - position: absolute
 * - width: 1px / height: 1px
 * - overflow: hidden
 * - clip / clip-path
 * - white-space: nowrap
 * - border: 0
 * - padding: 0 / margin: -1px
 */

interface VisuallyHiddenProps {
  children: React.ReactNode;
  /** Render as a different HTML element (default: span) */
  as?: 'span' | 'div' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

export function VisuallyHidden({ children, as: Tag = 'span' }: VisuallyHiddenProps) {
  return <Tag className="sr-only">{children}</Tag>;
}

export default VisuallyHidden;

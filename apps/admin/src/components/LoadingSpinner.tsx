/**
 * Loading Spinner
 *
 * SVG-based loading indicator with multiple size options.
 * Includes accessible role="status" and sr-only label.
 */

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-3',
};

export default function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  return (
    <div className={`flex items-center justify-center ${className}`} role="status">
      <div
        className={`animate-spin rounded-full border-[var(--border-color)] border-t-blue-600 ${SIZE_CLASSES[size]}`}
      />
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/** Full-page loading spinner */
export function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-sm text-[var(--text-secondary)]">Loading...</p>
      </div>
    </div>
  );
}

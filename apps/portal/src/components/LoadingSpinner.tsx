'use client';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3',
  };

  return (
    <div className={`flex items-center justify-center ${className}`} role="status">
      <div
        className={`animate-spin rounded-full border-brand-200 border-t-brand-600 ${sizeClasses[size]}`}
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
        <p className="mt-4 text-sm text-gray-500">Loading...</p>
      </div>
    </div>
  );
}

/** Skeleton card for loading states */
export function LeadCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="skeleton h-5 w-32 mb-2" />
          <div className="skeleton h-4 w-48 mb-1" />
          <div className="skeleton h-4 w-24" />
        </div>
        <div className="skeleton h-6 w-16 rounded-full" />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="skeleton h-9 w-20 rounded-lg" />
        <div className="skeleton h-9 w-20 rounded-lg" />
        <div className="skeleton h-9 w-28 rounded-lg" />
      </div>
    </div>
  );
}

/** Skeleton list for loading states */
export function LeadListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <LeadCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Dashboard metric card skeleton */
export function MetricCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="skeleton h-4 w-24 mb-2" />
      <div className="skeleton h-8 w-16" />
    </div>
  );
}

'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface InfiniteScrollProps {
  children: ReactNode;
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  /** Distance from bottom in pixels to trigger load */
  threshold?: number;
}

export default function InfiniteScroll({
  children,
  hasMore,
  isLoading,
  onLoadMore,
  threshold = 300,
}: InfiniteScrollProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: `0px 0px ${threshold}px 0px` }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoading, onLoadMore, threshold]);

  return (
    <div>
      {children}

      {/* Sentinel element for intersection observer */}
      <div ref={sentinelRef} aria-hidden="true" />

      {/* Loading indicator */}
      {isLoading && hasMore && (
        <div className="py-6">
          <LoadingSpinner size="sm" />
        </div>
      )}

      {/* End of list */}
      {!hasMore && !isLoading && (
        <p className="py-6 text-center text-xs text-gray-400">No more leads to load</p>
      )}
    </div>
  );
}

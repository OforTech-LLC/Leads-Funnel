'use client';

import { useRef, useState, useCallback, useEffect, type ReactNode } from 'react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
}

const THRESHOLD = 80;
const MAX_PULL = 120;

export default function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (isRefreshing) return;
      const scrollTop = containerRef.current?.scrollTop ?? window.scrollY;
      if (scrollTop === 0) {
        startYRef.current = e.touches[0].clientY;
      }
    },
    [isRefreshing]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (isRefreshing || !startYRef.current) return;
      const scrollTop = containerRef.current?.scrollTop ?? window.scrollY;
      if (scrollTop > 0) {
        startYRef.current = 0;
        setPullDistance(0);
        return;
      }

      const currentY = e.touches[0].clientY;
      const diff = currentY - startYRef.current;

      if (diff > 0) {
        // Apply resistance
        const distance = Math.min(diff * 0.5, MAX_PULL);
        setPullDistance(distance);
      }
    },
    [isRefreshing]
  );

  const handleTouchEnd = useCallback(async () => {
    if (isRefreshing) return;

    if (pullDistance >= THRESHOLD) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }

    startYRef.current = 0;
    setPullDistance(0);
  }, [pullDistance, isRefreshing, onRefresh]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: true });
    el.addEventListener('touchend', handleTouchEnd);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const showIndicator = pullDistance > 10 || isRefreshing;
  const progress = Math.min(pullDistance / THRESHOLD, 1);

  return (
    <div ref={containerRef} className="relative">
      {/* Pull indicator */}
      <div
        className="pull-indicator flex items-center justify-center overflow-hidden transition-all"
        style={{
          height: isRefreshing ? 48 : Math.max(0, pullDistance),
          opacity: showIndicator ? 1 : 0,
        }}
      >
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 ${
            isRefreshing ? 'animate-spin' : ''
          }`}
          style={{
            transform: isRefreshing ? undefined : `rotate(${progress * 360}deg)`,
          }}
        >
          <svg
            className="h-4 w-4 text-brand-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
            />
          </svg>
        </div>
      </div>

      {children}
    </div>
  );
}

// ──────────────────────────────────────────────
// React Query hooks for notifications
//
// Smart polling strategy:
// - 15s refetch when tab is focused
// - 60s refetch when tab is in background
// - Lightweight count endpoint polled at 10s
// ──────────────────────────────────────────────

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import type { PaginatedResponse } from '@/lib/types';

// ── Types ────────────────────────────────────

export type NotificationType =
  | 'lead_received'
  | 'lead_assigned'
  | 'lead_status_changed'
  | 'team_member_joined'
  | 'system_announcement';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
  actionUrl?: string;
}

export interface NotificationCount {
  unread: number;
}

// ── Query keys ───────────────────────────────

export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (filters?: { type?: NotificationType; read?: boolean }) =>
    [...notificationKeys.lists(), filters] as const,
  count: () => [...notificationKeys.all, 'count'] as const,
};

// ── Focus-aware polling interval ─────────────

function useFocusAwareInterval(focusedMs: number, blurredMs: number): number {
  const [isFocused, setIsFocused] = useState(
    typeof document !== 'undefined' ? document.hasFocus() : true
  );

  useEffect(() => {
    function handleFocus() {
      setIsFocused(true);
    }
    function handleBlur() {
      setIsFocused(false);
    }

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  return isFocused ? focusedMs : blurredMs;
}

// ── Notification count (lightweight) ─────────

export function useNotificationCount() {
  const refetchInterval = useFocusAwareInterval(10_000, 60_000);

  return useQuery<NotificationCount>({
    queryKey: notificationKeys.count(),
    queryFn: () => api.get<NotificationCount>('/api/v1/portal/notifications/count'),
    refetchInterval,
    refetchOnWindowFocus: true,
    staleTime: 5_000,
  });
}

// ── Recent notifications (dropdown) ──────────

export function useNotifications() {
  const refetchInterval = useFocusAwareInterval(15_000, 60_000);

  return useQuery<Notification[]>({
    queryKey: notificationKeys.list(),
    queryFn: async () => {
      const result = await api.get<{ data: Notification[] }>(
        '/api/v1/portal/notifications?limit=20'
      );
      return result.data;
    },
    refetchInterval,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  });
}

// ── Full notifications list (infinite scroll) ─

export function useInfiniteNotifications(filters?: { type?: NotificationType; read?: boolean }) {
  return useInfiniteQuery<PaginatedResponse<Notification>>({
    queryKey: notificationKeys.list(filters),
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      params.set('limit', '25');
      if (pageParam) params.set('cursor', pageParam as string);
      if (filters?.type) params.set('type', filters.type);
      if (filters?.read !== undefined) params.set('read', String(filters.read));

      return api.get<PaginatedResponse<Notification>>(
        `/api/v1/portal/notifications?${params.toString()}`
      );
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    staleTime: 15_000,
  });
}

// ── Mark single notification as read ─────────

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      return api.put<void>(`/api/v1/portal/notifications/${notificationId}/read`);
    },
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });

      // Optimistically update the notifications list
      const previousList = queryClient.getQueryData<Notification[]>(notificationKeys.list());
      if (previousList) {
        queryClient.setQueryData<Notification[]>(
          notificationKeys.list(),
          previousList.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
        );
      }

      // Optimistically update count
      const previousCount = queryClient.getQueryData<NotificationCount>(notificationKeys.count());
      if (previousCount && previousCount.unread > 0) {
        queryClient.setQueryData<NotificationCount>(notificationKeys.count(), {
          unread: previousCount.unread - 1,
        });
      }

      return { previousList, previousCount };
    },
    onError: (_err, _id, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(notificationKeys.list(), context.previousList);
      }
      if (context?.previousCount) {
        queryClient.setQueryData(notificationKeys.count(), context.previousCount);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

// ── Mark all notifications as read ───────────

export function useMarkAllRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return api.post<void>('/api/v1/portal/notifications/mark-all-read');
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });

      const previousList = queryClient.getQueryData<Notification[]>(notificationKeys.list());
      if (previousList) {
        queryClient.setQueryData<Notification[]>(
          notificationKeys.list(),
          previousList.map((n) => ({ ...n, read: true }))
        );
      }

      const previousCount = queryClient.getQueryData<NotificationCount>(notificationKeys.count());
      queryClient.setQueryData<NotificationCount>(notificationKeys.count(), {
        unread: 0,
      });

      return { previousList, previousCount };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(notificationKeys.list(), context.previousList);
      }
      if (context?.previousCount) {
        queryClient.setQueryData(notificationKeys.count(), context.previousCount);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

// ── Helpers ──────────────────────────────────

const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  lead_received: 'inbox',
  lead_assigned: 'user-plus',
  lead_status_changed: 'refresh',
  team_member_joined: 'users',
  system_announcement: 'megaphone',
};

export function getNotificationIcon(type: NotificationType): string {
  return NOTIFICATION_ICONS[type] || 'bell';
}

/**
 * Hook to detect when a new notification arrives by comparing
 * the previous unread count with the current one.
 */
export function useNewNotificationAlert(): boolean {
  const { data } = useNotificationCount();
  const [previousCount, setPreviousCount] = useState<number | null>(null);
  const [hasNew, setHasNew] = useState(false);

  const currentCount = data?.unread ?? 0;

  const checkForNew = useCallback(() => {
    if (previousCount !== null && currentCount > previousCount) {
      setHasNew(true);
      // Reset after animation duration
      setTimeout(() => setHasNew(false), 2000);
    }
    setPreviousCount(currentCount);
  }, [currentCount, previousCount]);

  useEffect(() => {
    checkForNew();
  }, [checkForNew]);

  return hasNew;
}

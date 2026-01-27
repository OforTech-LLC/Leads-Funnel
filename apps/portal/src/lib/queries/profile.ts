// ──────────────────────────────────────────────
// React Query hooks for user profile and org
// ──────────────────────────────────────────────

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { UserProfile, Organization, NotificationPreferences } from '@/lib/types';

// ── Query keys ───────────────────────────────

export const profileKeys = {
  all: ['profile'] as const,
  user: () => [...profileKeys.all, 'user'] as const,
  org: (orgId: string) => [...profileKeys.all, 'org', orgId] as const,
};

// ── User profile ─────────────────────────────

export function useProfile() {
  return useQuery<UserProfile>({
    queryKey: profileKeys.user(),
    queryFn: () => api.get<UserProfile>('/api/v1/portal/profile'),
    staleTime: 5 * 60_000,
  });
}

// ── Organization ─────────────────────────────

export function useOrg(orgId: string) {
  return useQuery<Organization>({
    queryKey: profileKeys.org(orgId),
    queryFn: () => api.get<Organization>(`/api/v1/portal/orgs/${orgId}`),
    staleTime: 5 * 60_000,
    enabled: !!orgId,
  });
}

// ── Update notification settings ─────────────

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (preferences: NotificationPreferences) => {
      return api.put<UserProfile>('/api/v1/portal/profile/notifications', preferences);
    },
    onMutate: async (preferences) => {
      await queryClient.cancelQueries({ queryKey: profileKeys.user() });
      const previous = queryClient.getQueryData<UserProfile>(profileKeys.user());

      if (previous) {
        queryClient.setQueryData<UserProfile>(profileKeys.user(), {
          ...previous,
          notificationPreferences: preferences,
        });
      }

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(profileKeys.user(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.user() });
    },
  });
}

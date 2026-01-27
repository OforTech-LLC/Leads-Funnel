// ──────────────────────────────────────────────
// React Query hooks for user profile and org
// ──────────────────────────────────────────────

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  UserProfile,
  Organization,
  NotificationPreferences,
  GranularNotificationPreferences,
  ServicePreferences,
} from '@/lib/types';

// ── Query keys ───────────────────────────────

export const profileKeys = {
  all: ['profile'] as const,
  user: () => [...profileKeys.all, 'user'] as const,
  org: (orgId: string) => [...profileKeys.all, 'org', orgId] as const,
  servicePrefs: () => [...profileKeys.all, 'servicePrefs'] as const,
  granularNotifs: () => [...profileKeys.all, 'granularNotifs'] as const,
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

// ── Update profile (name) ────────────────────

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ firstName, lastName }: { firstName: string; lastName: string }) => {
      return api.put<UserProfile>('/api/v1/portal/profile', { firstName, lastName });
    },
    onMutate: async ({ firstName, lastName }) => {
      await queryClient.cancelQueries({ queryKey: profileKeys.user() });
      const previous = queryClient.getQueryData<UserProfile>(profileKeys.user());

      if (previous) {
        queryClient.setQueryData<UserProfile>(profileKeys.user(), {
          ...previous,
          firstName,
          lastName,
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

// ── Update organization name ─────────────────

export function useUpdateOrg() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orgId, name }: { orgId: string; name: string }) => {
      return api.put<Organization>(`/api/v1/portal/orgs/${orgId}`, { name });
    },
    onSuccess: (_data, { orgId }) => {
      queryClient.invalidateQueries({ queryKey: profileKeys.org(orgId) });
    },
  });
}

// ── Service preferences ──────────────────────

export function useServicePreferences() {
  return useQuery<ServicePreferences>({
    queryKey: profileKeys.servicePrefs(),
    queryFn: () => api.get<ServicePreferences>('/api/v1/portal/profile/service-preferences'),
    staleTime: 5 * 60_000,
  });
}

export function useUpdateServicePreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (prefs: Partial<ServicePreferences>) => {
      return api.put<ServicePreferences>('/api/v1/portal/profile/service-preferences', prefs);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.servicePrefs() });
    },
  });
}

// ── Granular notification preferences ────────

export function useGranularNotifications() {
  return useQuery<GranularNotificationPreferences>({
    queryKey: profileKeys.granularNotifs(),
    queryFn: () =>
      api.get<GranularNotificationPreferences>('/api/v1/portal/profile/notification-preferences'),
    staleTime: 5 * 60_000,
  });
}

export function useUpdateGranularNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (prefs: Partial<GranularNotificationPreferences>) => {
      return api.put<GranularNotificationPreferences>(
        '/api/v1/portal/profile/notification-preferences',
        prefs
      );
    },
    onMutate: async (prefs) => {
      await queryClient.cancelQueries({ queryKey: profileKeys.granularNotifs() });
      const previous = queryClient.getQueryData<GranularNotificationPreferences>(
        profileKeys.granularNotifs()
      );

      if (previous) {
        queryClient.setQueryData<GranularNotificationPreferences>(profileKeys.granularNotifs(), {
          ...previous,
          ...prefs,
        });
      }

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(profileKeys.granularNotifs(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.granularNotifs() });
    },
  });
}

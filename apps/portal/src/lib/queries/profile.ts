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
import { API_ENDPOINTS } from '@/lib/constants';

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
    queryFn: () => api.get<UserProfile>(API_ENDPOINTS.PROFILE),
    staleTime: 5 * 60_000,
  });
}

// ── Organization ─────────────────────────────

export function useOrg(orgId: string) {
  return useQuery<Organization>({
    queryKey: profileKeys.org(orgId),
    queryFn: () => api.get<Organization>(API_ENDPOINTS.ORG(orgId)),
    staleTime: 5 * 60_000,
    enabled: !!orgId,
  });
}

// ── Update notification settings ─────────────

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (preferences: NotificationPreferences) => {
      return api.put<UserProfile>(API_ENDPOINTS.PROFILE_NOTIFICATIONS, preferences);
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
      return api.put<UserProfile>(API_ENDPOINTS.PROFILE, { firstName, lastName });
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
      return api.put<Organization>(API_ENDPOINTS.ORG(orgId), { name });
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
    queryFn: () => api.get<ServicePreferences>(API_ENDPOINTS.PROFILE_SERVICE_PREFERENCES),
    staleTime: 5 * 60_000,
  });
}

export function useUpdateServicePreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (prefs: Partial<ServicePreferences>) => {
      return api.put<ServicePreferences>(API_ENDPOINTS.PROFILE_SERVICE_PREFERENCES, prefs);
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
      api.get<GranularNotificationPreferences>(API_ENDPOINTS.PROFILE_NOTIFICATION_PREFERENCES),
    staleTime: 5 * 60_000,
  });
}

export function useUpdateGranularNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (prefs: Partial<GranularNotificationPreferences>) => {
      return api.put<GranularNotificationPreferences>(
        API_ENDPOINTS.PROFILE_NOTIFICATION_PREFERENCES,
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

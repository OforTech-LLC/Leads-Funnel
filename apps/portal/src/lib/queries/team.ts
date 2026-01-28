// ──────────────────────────────────────────────
// React Query hooks for team member management
// ──────────────────────────────────────────────

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { TeamMember, TeamInvite } from '@/lib/types';
import { API_ENDPOINTS } from '@/lib/constants';

// ── Query keys ───────────────────────────────

export const teamKeys = {
  all: ['team'] as const,
  members: () => [...teamKeys.all, 'members'] as const,
  invites: () => [...teamKeys.all, 'invites'] as const,
};

// ── Fetch team members ───────────────────────

export function useTeamMembers() {
  return useQuery<TeamMember[]>({
    queryKey: teamKeys.members(),
    queryFn: () => api.get<TeamMember[]>(API_ENDPOINTS.TEAM_MEMBERS),
    staleTime: 60_000,
  });
}

// ── Fetch pending invitations ────────────────

export function useTeamInvites() {
  return useQuery<TeamInvite[]>({
    queryKey: teamKeys.invites(),
    queryFn: () => api.get<TeamInvite[]>(API_ENDPOINTS.TEAM_INVITES),
    staleTime: 60_000,
  });
}

// ── Invite a new member ──────────────────────

export function useInviteMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: 'admin' | 'agent' }) => {
      return api.post<TeamInvite>(API_ENDPOINTS.TEAM_INVITE, { email, role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
    },
  });
}

// ── Remove a team member ─────────────────────

export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      return api.delete<void>(API_ENDPOINTS.TEAM_MEMBER(userId));
    },
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: teamKeys.members() });
      const previous = queryClient.getQueryData<TeamMember[]>(teamKeys.members());

      if (previous) {
        queryClient.setQueryData<TeamMember[]>(
          teamKeys.members(),
          previous.filter((m) => m.userId !== userId)
        );
      }

      return { previous };
    },
    onError: (_err, _userId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(teamKeys.members(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
    },
  });
}

// ── Update member role ───────────────────────

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'agent' }) => {
      return api.put<TeamMember>(API_ENDPOINTS.TEAM_MEMBER_ROLE(userId), { role });
    },
    onMutate: async ({ userId, role }) => {
      await queryClient.cancelQueries({ queryKey: teamKeys.members() });
      const previous = queryClient.getQueryData<TeamMember[]>(teamKeys.members());

      if (previous) {
        queryClient.setQueryData<TeamMember[]>(
          teamKeys.members(),
          previous.map((m) => (m.userId === userId ? { ...m, role } : m))
        );
      }

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(teamKeys.members(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
    },
  });
}

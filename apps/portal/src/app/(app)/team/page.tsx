'use client';

import { useState, useMemo } from 'react';
import { useTeamMembers, useRemoveMember, useUpdateMemberRole } from '@/lib/queries/team';
import { useProfile } from '@/lib/queries/profile';
import TeamMemberCard from '@/components/TeamMemberCard';
import EmptyState from '@/components/EmptyState';
import { MetricCardSkeleton } from '@/components/LoadingSpinner';
import { toast } from '@/lib/toast';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '@/lib/constants';

export default function TeamPage() {
  const [search, setSearch] = useState('');

  const { data: profile } = useProfile();
  const { data: members, isLoading: membersLoading } = useTeamMembers();

  const removeMember = useRemoveMember();
  const updateRole = useUpdateMemberRole();

  // Filter members by search query
  const filteredMembers = useMemo(() => {
    if (!members) return [];
    if (!search.trim()) return members;
    const q = search.toLowerCase();
    return members.filter(
      (m) =>
        `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q)
    );
  }, [members, search]);

  function handleRemove(userId: string) {
    removeMember.mutate(userId, {
      onSuccess: () => toast.success(SUCCESS_MESSAGES.MEMBER_REMOVED),
      onError: () => toast.error(ERROR_MESSAGES.REMOVE_MEMBER_FAILED),
    });
  }

  function handleRoleChange(userId: string, role: 'admin' | 'agent') {
    updateRole.mutate(
      { userId, role },
      {
        onSuccess: () => toast.success(SUCCESS_MESSAGES.ROLE_UPDATED),
        onError: () => toast.error(ERROR_MESSAGES.UPDATE_ROLE_FAILED),
      }
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Team</h1>
          <p className="mt-1 text-sm text-gray-500">
            {members
              ? `${members.length} member${members.length === 1 ? '' : 's'}`
              : 'Manage your team'}
          </p>
        </div>
      </div>

      <div className="mb-5 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-xs text-gray-600">
        Team access is managed by administrators in the admin console. Contact your admin to add or
        remove members.
      </div>

      {/* Search */}
      {members && members.length > 0 && (
        <div className="mb-4">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <input
              type="search"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              aria-label="Search team members"
            />
          </div>
        </div>
      )}

      {/* Members list */}
      {membersLoading ? (
        <div className="space-y-3">
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </div>
      ) : filteredMembers.length === 0 && !search ? (
        <EmptyState
          title="No team members yet"
          description="Team access is managed by administrators. Contact your admin to add members."
        />
      ) : filteredMembers.length === 0 && search ? (
        <EmptyState
          title="No members found"
          description="Try adjusting your search query"
          action={{
            label: 'Clear search',
            onClick: () => setSearch(''),
          }}
        />
      ) : (
        <div className="space-y-3">
          {filteredMembers.map((member) => (
            <TeamMemberCard
              key={member.userId}
              member={member}
              onRoleChange={handleRoleChange}
              onRemove={handleRemove}
              isUpdatingRole={
                updateRole.isPending && updateRole.variables?.userId === member.userId
              }
              isRemoving={removeMember.isPending && removeMember.variables === member.userId}
              isSelf={member.userId === profile?.id}
            />
          ))}
        </div>
      )}

      {/* Pending Invitations */}
    </div>
  );
}

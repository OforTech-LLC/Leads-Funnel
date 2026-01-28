'use client';

import { useState, useMemo } from 'react';
import {
  useTeamMembers,
  useTeamInvites,
  useInviteMember,
  useRemoveMember,
  useUpdateMemberRole,
} from '@/lib/queries/team';
import { useProfile } from '@/lib/queries/profile';
import TeamMemberCard from '@/components/TeamMemberCard';
import InviteModal from '@/components/InviteModal';
import EmptyState from '@/components/EmptyState';
import { MetricCardSkeleton } from '@/components/LoadingSpinner';
import { toast } from '@/lib/toast';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '@/lib/constants';

export default function TeamPage() {
  const [showInvite, setShowInvite] = useState(false);
  const [search, setSearch] = useState('');

  const { data: profile } = useProfile();
  const { data: members, isLoading: membersLoading } = useTeamMembers();
  const { data: invites, isLoading: invitesLoading } = useTeamInvites();

  const inviteMember = useInviteMember();
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

  // Separate pending invitations
  const pendingInvites = useMemo(
    () => (invites ?? []).filter((i) => i.status === 'pending'),
    [invites]
  );

  function handleInvite(email: string, role: 'admin' | 'agent') {
    inviteMember.mutate(
      { email, role },
      {
        onSuccess: () => {
          toast.success(SUCCESS_MESSAGES.INVITE_SENT(email));
          setShowInvite(false);
        },
        onError: () => {
          toast.error(ERROR_MESSAGES.INVITE_FAILED);
        },
      }
    );
  }

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
        <button
          type="button"
          onClick={() => setShowInvite(true)}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 active:bg-brand-800"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Invite Member
        </button>
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
          description="Invite your first team member to start collaborating on leads"
          action={{
            label: 'Invite Member',
            onClick: () => setShowInvite(true),
          }}
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
      {!invitesLoading && pendingInvites.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">
            Pending Invitations ({pendingInvites.length})
          </h2>
          <div className="space-y-2">
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-700">{invite.email}</p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    Invited by {invite.invitedByName} --{' '}
                    {new Date(invite.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-yellow-50 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
                    Pending
                  </span>
                  <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium capitalize text-gray-600">
                    {invite.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Invite Modal */}
      <InviteModal
        open={showInvite}
        onClose={() => setShowInvite(false)}
        onInvite={handleInvite}
        isLoading={inviteMember.isPending}
      />
    </div>
  );
}

'use client';

import { useState } from 'react';
import type { TeamMember } from '@/lib/types';
import ConfirmDialog from './ConfirmDialog';

interface TeamMemberCardProps {
  member: TeamMember;
  onRoleChange: (userId: string, role: 'admin' | 'agent') => void;
  onRemove: (userId: string) => void;
  isUpdatingRole?: boolean;
  isRemoving?: boolean;
  isSelf?: boolean;
}

export default function TeamMemberCard({
  member,
  onRoleChange,
  onRemove,
  isUpdatingRole = false,
  isRemoving = false,
  isSelf = false,
}: TeamMemberCardProps) {
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const fullName = `${member.firstName} ${member.lastName}`.trim();
  const initials = `${member.firstName.charAt(0)}${member.lastName.charAt(0)}`.toUpperCase();

  // Determine online status based on last activity (within 5 minutes = online)
  const isOnline =
    member.lastActiveAt && Date.now() - new Date(member.lastActiveAt).getTime() < 5 * 60 * 1000;

  return (
    <>
      <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
        {/* Avatar with online indicator */}
        <div className="relative flex-shrink-0">
          {member.avatarUrl ? (
            <img
              src={member.avatarUrl}
              alt={fullName}
              className="h-11 w-11 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
              {initials}
            </div>
          )}
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${
              isOnline ? 'bg-green-400' : 'bg-gray-300'
            }`}
            title={isOnline ? 'Online' : 'Offline'}
          />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-gray-900">{fullName}</p>
            {isSelf && (
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                You
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-gray-500">{member.email}</p>
        </div>

        {/* Role selector */}
        <div className="flex items-center gap-2">
          <select
            value={member.role}
            onChange={(e) => onRoleChange(member.userId, e.target.value as 'admin' | 'agent')}
            disabled={isUpdatingRole || isSelf}
            className={`h-9 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-medium text-gray-700 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50 ${
              member.role === 'admin' ? 'text-purple-700' : 'text-gray-700'
            }`}
            aria-label={`Change role for ${fullName}`}
          >
            <option value="admin">Admin</option>
            <option value="agent">Agent</option>
          </select>

          {/* Remove button */}
          {!isSelf && (
            <button
              type="button"
              onClick={() => setShowRemoveConfirm(true)}
              disabled={isRemoving}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
              aria-label={`Remove ${fullName}`}
              title={`Remove ${fullName}`}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Remove confirmation dialog */}
      <ConfirmDialog
        open={showRemoveConfirm}
        title="Remove team member"
        message={`Are you sure you want to remove ${fullName} from the team? They will lose access to all leads and data.`}
        confirmLabel="Remove"
        cancelLabel="Keep Member"
        variant="danger"
        onConfirm={() => {
          onRemove(member.userId);
          setShowRemoveConfirm(false);
        }}
        onCancel={() => setShowRemoveConfirm(false)}
        isLoading={isRemoving}
      />
    </>
  );
}

'use client';

import { useProfile, useOrg } from '@/lib/queries/profile';
import NotificationBell from '@/components/NotificationBell';

export default function Header() {
  const { data: profile } = useProfile();
  const { data: org } = useOrg(profile?.primaryOrgId || '');

  const initials = profile
    ? `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase()
    : '';
  const avatarUrl = profile?.avatarUrl?.trim();

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        {/* Org name / logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold text-white">
            {org?.name?.charAt(0)?.toUpperCase() || 'P'}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold text-gray-900">
              {org?.name || 'Portal'}
            </h1>
          </div>
        </div>

        {/* Right side - notifications + avatar */}
        <div className="flex items-center gap-2">
          {/* Notification bell (functional) */}
          <NotificationBell />

          {/* User avatar */}
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={profile ? `${profile.firstName} ${profile.lastName}` : 'User'}
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700"
              title={profile ? `${profile.firstName} ${profile.lastName}` : 'User'}
            >
              {initials || 'U'}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

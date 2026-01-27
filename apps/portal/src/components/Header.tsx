'use client';

import { useProfile, useOrg } from '@/lib/queries/profile';

export default function Header() {
  const { data: profile } = useProfile();
  const { data: org } = useOrg(profile?.primaryOrgId || '');

  const initials = profile
    ? `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase()
    : '';

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

        {/* Right side - avatar */}
        <div className="flex items-center gap-3">
          {/* Notification bell */}
          <button
            type="button"
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 active:bg-gray-200"
            aria-label="Notifications"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
              />
            </svg>
          </button>

          {/* User avatar */}
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700"
            title={profile ? `${profile.firstName} ${profile.lastName}` : 'User'}
          >
            {initials || 'U'}
          </div>
        </div>
      </div>
    </header>
  );
}

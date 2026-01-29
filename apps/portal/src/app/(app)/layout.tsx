'use client';

import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import DesktopSidebar from '@/components/DesktopSidebar';
import NotificationBell from '@/components/NotificationBell';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useProfile } from '@/lib/queries/profile';

function DesktopTopBar() {
  const { data: profile } = useProfile();

  const initials = profile
    ? `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase()
    : '';
  const avatarUrl = profile?.avatarUrl?.trim();

  return (
    <div className="hidden lg:flex h-14 items-center justify-end gap-3 border-b border-gray-200 bg-white px-6">
      <NotificationBell />
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
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop sidebar (hidden on mobile) */}
      <DesktopSidebar />

      {/* Main content area */}
      <div className="lg:pl-64">
        {/* Mobile header (hidden on desktop where sidebar has branding) */}
        <div className="lg:hidden">
          <Header />
        </div>

        {/* Desktop top bar with notifications (hidden on mobile) */}
        <DesktopTopBar />

        {/* Page content wrapped in ErrorBoundary */}
        <main className="pb-20 lg:pb-0">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>

        {/* Mobile bottom nav */}
        <BottomNav />
      </div>
    </div>
  );
}

'use client';

import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import DesktopSidebar from '@/components/DesktopSidebar';

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

        {/* Page content */}
        <main className="pb-20 lg:pb-0">{children}</main>

        {/* Mobile bottom nav */}
        <BottomNav />
      </div>
    </div>
  );
}

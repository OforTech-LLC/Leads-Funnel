'use client';

/**
 * Dashboard Layout
 *
 * Authenticated layout with sidebar and header.
 * Wraps all dashboard pages.
 * Responsive: sidebar collapses on mobile with hamburger menu.
 */

import Sidebar, { SidebarProvider } from '@/components/Sidebar';
import Header from '@/components/Header';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen">
        <Sidebar />
        <div className="lg:ml-64 flex flex-col min-h-screen">
          <Header />
          <main className="flex-1 p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}

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
import { ErrorBoundary } from '@/components/ErrorBoundary';
import AuthGate from '@/components/AuthGate';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <SidebarProvider>
        <div className="min-h-screen">
          <Sidebar />
          <div className="lg:ml-64 flex flex-col min-h-screen">
            <Header />
            <main className="flex-1 p-4 lg:p-6">
              <ErrorBoundary>{children}</ErrorBoundary>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </AuthGate>
  );
}

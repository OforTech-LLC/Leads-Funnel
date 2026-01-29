'use client';

/**
 * Admin Console Layout
 *
 * Provides authentication wrapper and navigation for admin pages.
 * Includes Suspense boundaries for dynamic content loading.
 */

import { Suspense, useEffect, useState, useCallback } from 'react';
import './admin.css';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  isAuthenticated,
  getCurrentUser,
  redirectToLogin,
  redirectToLogout,
  type AdminUser,
} from '@/lib/admin/auth';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface AdminLayoutProps {
  children: React.ReactNode;
}

/**
 * Loading spinner for Suspense fallback
 */
function AdminLoadingSpinner() {
  return (
    <div className="admin-content-loading">
      <div className="admin-content-spinner" />
      <p>Loading content...</p>
    </div>
  );
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Memoized logout handler to prevent re-renders
  const handleLogout = useCallback(() => {
    redirectToLogout();
  }, []);

  // Memoized retry handler
  const handleRetry = useCallback(() => {
    redirectToLogin();
  }, []);

  useEffect(() => {
    // Skip auth check on callback page
    if (pathname.includes('/admin/callback')) {
      setIsLoading(false);
      return;
    }

    async function checkAuth() {
      try {
        // Check authentication
        const authenticated = await isAuthenticated();
        if (!authenticated) {
          redirectToLogin();
          return;
        }

        // Get current user
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          redirectToLogin();
          return;
        }

        setUser(currentUser);
        setIsLoading(false);
      } catch (error) {
        console.error('[AdminLayout] Authentication error:', error);
        setAuthError(error instanceof Error ? error.message : 'Authentication failed');
        setIsLoading(false);
      }
    }

    checkAuth();
  }, [pathname]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="admin-loading">
        <div className="admin-loading-spinner" />
        <p>Loading admin console...</p>
      </div>
    );
  }

  // Show auth error
  if (authError) {
    return (
      <div className="admin-error">
        <div className="admin-error-content">
          <h2>Authentication Error</h2>
          <p>{authError}</p>
          <button onClick={handleRetry}>Try Again</button>
        </div>
      </div>
    );
  }

  // Callback page doesn't need layout
  if (pathname.includes('/admin/callback')) {
    return <>{children}</>;
  }

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('[AdminLayout] Component error:', error.message);
        console.error('[AdminLayout] Stack:', errorInfo.componentStack);
      }}
    >
      <div className="admin-layout">
        {/* Sidebar Navigation */}
        <aside className="admin-sidebar">
          <div className="admin-logo">
            <h1>Kanjona Admin</h1>
          </div>

          <nav className="admin-nav">
            <Link
              href="/admin"
              className={`admin-nav-item ${pathname === '/admin' || pathname.endsWith('/admin') ? 'active' : ''}`}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
              Dashboard
            </Link>
            <Link
              href="/admin/leads"
              className={`admin-nav-item ${pathname.includes('/admin/leads') ? 'active' : ''}`}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Leads
            </Link>
            <Link
              href="/admin/exports"
              className={`admin-nav-item ${pathname.includes('/admin/exports') ? 'active' : ''}`}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Exports
            </Link>
            <Link
              href="/admin/settings"
              className={`admin-nav-item ${pathname.includes('/admin/settings') ? 'active' : ''}`}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              Settings
            </Link>
          </nav>

          {/* User Info */}
          {user && (
            <div className="admin-user">
              <div className="admin-user-info">
                <span className="admin-user-email">{user.email}</span>
                <span className={`admin-user-role ${user.role.toLowerCase()}`}>{user.role}</span>
              </div>
              <button onClick={handleLogout} className="admin-logout">
                Sign Out
              </button>
            </div>
          )}
        </aside>

        {/* Main Content with Suspense boundary */}
        <main className="admin-main">
          <Suspense fallback={<AdminLoadingSpinner />}>{children}</Suspense>
        </main>
      </div>
    </ErrorBoundary>
  );
}

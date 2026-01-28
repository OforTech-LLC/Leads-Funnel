'use client';

/**
 * Admin Console Layout
 *
 * Provides authentication wrapper and navigation for admin pages.
 * Includes Suspense boundaries for dynamic content loading.
 */

import { Suspense, useEffect, useState, useCallback } from 'react';
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
      <style jsx>{`
        .admin-content-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 24px;
          color: rgba(255, 255, 255, 0.7);
        }
        .admin-content-spinner {
          width: 32px;
          height: 32px;
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 12px;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
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
        <style jsx>{`
          .admin-loading {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%);
            color: #fff;
            font-family:
              system-ui,
              -apple-system,
              sans-serif;
          }
          .admin-loading-spinner {
            width: 48px;
            height: 48px;
            border: 3px solid rgba(255, 255, 255, 0.1);
            border-top-color: #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 16px;
          }
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
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
        <style jsx>{`
          .admin-error {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%);
            color: #fff;
            font-family:
              system-ui,
              -apple-system,
              sans-serif;
          }
          .admin-error-content {
            text-align: center;
            padding: 40px;
          }
          .admin-error-content h2 {
            color: #ef4444;
            margin-bottom: 16px;
          }
          .admin-error-content p {
            color: rgba(255, 255, 255, 0.7);
            margin-bottom: 24px;
          }
          .admin-error-content button {
            padding: 12px 24px;
            background: linear-gradient(135deg, #3b82f6, #8b5cf6);
            border: none;
            border-radius: 8px;
            color: #fff;
            font-size: 14px;
            cursor: pointer;
          }
        `}</style>
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
            <a
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
            </a>
            <a
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
            </a>
            <a
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
            </a>
            <a
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
            </a>
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

        <style jsx>{`
          .admin-layout {
            display: flex;
            min-height: 100vh;
            background: #0f0f13;
            color: #fff;
            font-family:
              system-ui,
              -apple-system,
              sans-serif;
          }

          .admin-sidebar {
            width: 260px;
            background: rgba(20, 20, 30, 0.95);
            border-right: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            flex-direction: column;
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
          }

          .admin-logo {
            padding: 24px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          }

          .admin-logo h1 {
            font-size: 20px;
            font-weight: 600;
            margin: 0;
            background: linear-gradient(135deg, #3b82f6, #8b5cf6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }

          .admin-nav {
            flex: 1;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .admin-nav-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            border-radius: 8px;
            color: rgba(255, 255, 255, 0.7);
            text-decoration: none;
            transition: all 0.2s;
          }

          .admin-nav-item:hover {
            background: rgba(255, 255, 255, 0.05);
            color: #fff;
          }

          .admin-nav-item.active {
            background: rgba(59, 130, 246, 0.2);
            color: #3b82f6;
          }

          .admin-user {
            padding: 16px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
          }

          .admin-user-info {
            display: flex;
            flex-direction: column;
            gap: 4px;
            margin-bottom: 12px;
          }

          .admin-user-email {
            font-size: 14px;
            color: rgba(255, 255, 255, 0.9);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .admin-user-role {
            font-size: 12px;
            padding: 2px 8px;
            border-radius: 4px;
            width: fit-content;
          }

          .admin-user-role.admin {
            background: rgba(59, 130, 246, 0.2);
            color: #3b82f6;
          }

          .admin-user-role.viewer {
            background: rgba(139, 92, 246, 0.2);
            color: #8b5cf6;
          }

          .admin-logout {
            width: 100%;
            padding: 8px 16px;
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-radius: 6px;
            color: #ef4444;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
          }

          .admin-logout:hover {
            background: rgba(239, 68, 68, 0.2);
          }

          .admin-main {
            flex: 1;
            margin-left: 260px;
            padding: 24px;
            min-height: 100vh;
          }
        `}</style>
      </div>
    </ErrorBoundary>
  );
}

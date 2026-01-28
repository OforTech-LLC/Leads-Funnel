'use client';

/**
 * Top Header Bar
 *
 * Displays hamburger menu (mobile), current page context,
 * notification bell, user info, theme toggle, and logout.
 */

import { useTheme } from './Providers';
import { logout } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { useSidebar } from './Sidebar';
import NotificationCenter from './NotificationCenter';
import { API_ENDPOINTS } from '@/lib/constants';

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const { toggle } = useSidebar();
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch(API_ENDPOINTS.AUTH, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setUserEmail(data.user?.email || '');
        }
      } catch {
        // Ignore errors
      }
    }
    loadUser();
  }, []);

  return (
    <header className="h-16 bg-[var(--card-bg)] border-b border-[var(--border-color)] flex items-center justify-between px-4 lg:px-6 sticky top-0 z-20">
      <div className="flex items-center gap-4">
        {/* Hamburger button - mobile only */}
        <button
          onClick={toggle}
          className="lg:hidden p-2 rounded-md hover:bg-[var(--bg-tertiary)] transition-colors"
          aria-label="Toggle navigation menu"
        >
          <svg
            className="w-5 h-5 text-[var(--text-primary)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-2 lg:gap-4">
        {/* Notification Center */}
        <NotificationCenter />

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-md hover:bg-[var(--bg-tertiary)] transition-colors"
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? (
            <svg
              className="w-5 h-5 text-[var(--text-secondary)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
          ) : (
            <svg
              className="w-5 h-5 text-[var(--text-secondary)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          )}
        </button>

        {/* User Info */}
        {userEmail && (
          <span className="hidden sm:inline text-sm text-[var(--text-secondary)]">{userEmail}</span>
        )}

        {/* Logout */}
        <button
          onClick={() => logout()}
          className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors px-3 py-1.5 rounded-md hover:bg-[var(--bg-tertiary)]"
        >
          Logout
        </button>
      </div>
    </header>
  );
}

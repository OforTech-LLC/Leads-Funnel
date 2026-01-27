'use client';

/**
 * useCurrentUser Hook
 *
 * Returns the currently authenticated user with their role and groups.
 * Fetches from the /api/auth endpoint which decodes the JWT cookie.
 */

import { useState, useEffect } from 'react';

export type AdminRole = 'ADMIN' | 'VIEWER' | 'OPERATOR';

export interface CurrentUser {
  sub: string;
  email: string;
  groups: string[];
  role: AdminRole;
}

/**
 * Derive the admin role from Cognito groups.
 * - cognito:groups containing "admin" -> ADMIN
 * - cognito:groups containing "operator" -> OPERATOR
 * - otherwise -> VIEWER
 */
function deriveRole(groups: string[]): AdminRole {
  const lower = groups.map((g) => g.toLowerCase());
  if (lower.some((g) => g.includes('admin'))) return 'ADMIN';
  if (lower.some((g) => g.includes('operator'))) return 'OPERATOR';
  return 'VIEWER';
}

interface UseCurrentUserResult {
  user: CurrentUser | null;
  loading: boolean;
}

export function useCurrentUser(): UseCurrentUserResult {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      try {
        const res = await fetch('/api/auth', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data.user) {
            const groups: string[] = data.user.groups || [];
            setUser({
              sub: data.user.sub || '',
              email: data.user.email || '',
              groups,
              role: deriveRole(groups),
            });
          }
        }
      } catch {
        // Ignore errors - user remains null
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadUser();
    return () => {
      cancelled = true;
    };
  }, []);

  return { user, loading };
}

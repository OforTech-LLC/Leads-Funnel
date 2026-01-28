'use client';

/**
 * useCurrentUser Hook
 *
 * Returns the currently authenticated user with their role and groups.
 * Fetches from the /api/auth endpoint which decodes the JWT cookie.
 */

import { useState, useEffect } from 'react';
import { ADMIN_ROLES, API_ENDPOINTS } from '@/lib/constants';
import type { AdminRole } from '@/lib/constants';

export type { AdminRole };

export interface CurrentUser {
  sub: string;
  email: string;
  groups: string[];
  role: AdminRole;
}

/**
 * Derive the admin role from Cognito groups.
 * Uses exact match to prevent privilege escalation (e.g. a group named
 * "admin-readonly" should NOT grant ADMIN).
 */
function deriveRole(groups: string[]): AdminRole {
  const lower = groups.map((g) => g.toLowerCase());
  if (lower.some((g) => g === 'admin' || g === 'admins')) return ADMIN_ROLES.ADMIN;
  if (lower.some((g) => g === 'operator' || g === 'operators')) return ADMIN_ROLES.OPERATOR;
  if (lower.some((g) => g === 'viewer' || g === 'viewers')) return ADMIN_ROLES.VIEWER;
  return ADMIN_ROLES.VIEWER;
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
        const res = await fetch(API_ENDPOINTS.AUTH, { credentials: 'include' });
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

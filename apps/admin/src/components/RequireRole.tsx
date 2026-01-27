'use client';

/**
 * RequireRole Component
 *
 * Conditionally renders children based on the current user's role.
 * If the user does not have one of the required roles, the children
 * are hidden (or the fallback is rendered).
 */

import { useCurrentUser } from '@/lib/useCurrentUser';
import type { AdminRole } from '@/lib/useCurrentUser';

interface RequireRoleProps {
  /** Roles that are allowed to see the children */
  roles: AdminRole[];
  /** Content to render if the user has the required role */
  children: React.ReactNode;
  /** Optional fallback content if the user does not have the required role */
  fallback?: React.ReactNode;
}

export default function RequireRole({ roles, children, fallback = null }: RequireRoleProps) {
  const { user, loading } = useCurrentUser();

  // While loading, hide the content to avoid flicker
  if (loading) return null;

  // If no user or role not in allowed list, render fallback
  if (!user || !roles.includes(user.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

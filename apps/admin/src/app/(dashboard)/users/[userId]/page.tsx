/**
 * User Detail Page (Server Component)
 *
 * Renders the client component for user details.
 */

import UserDetailClient from './UserDetailClient';

// Required for static export - returns empty array for client-side navigation
export async function generateStaticParams(): Promise<{ userId: string }[]> {
  return [];
}

export default function UserDetailPage() {
  return <UserDetailClient />;
}

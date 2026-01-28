/**
 * User Detail Page (Server Component)
 *
 * Renders the client component for user details.
 * Exports generateStaticParams for static export compatibility.
 */

import UserDetailClient from './UserDetailClient';

// Required for static export with dynamic routes
// Return a placeholder to create the route shell for client-side navigation
export async function generateStaticParams(): Promise<{ userId: string }[]> {
  return [{ userId: '__placeholder__' }];
}

export default function UserDetailPage() {
  return <UserDetailClient />;
}

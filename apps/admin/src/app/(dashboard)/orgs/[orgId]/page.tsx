/**
 * Organization Detail Page (Server Component)
 *
 * Renders the client component for organization details.
 * Exports generateStaticParams for static export compatibility.
 */

import OrgDetailClient from './OrgDetailClient';

// Required for static export with dynamic routes
// Return a placeholder to create the route shell for client-side navigation
export async function generateStaticParams(): Promise<{ orgId: string }[]> {
  return [{ orgId: '__placeholder__' }];
}

export default function OrgDetailPage() {
  return <OrgDetailClient />;
}

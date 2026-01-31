/**
 * Organization Detail Page (Server Component)
 *
 * Renders the client component for organization details.
 */

import OrgDetailClient from './OrgDetailClient';

// Required for static export - returns empty array for client-side navigation
export async function generateStaticParams(): Promise<{ orgId: string }[]> {
  return [];
}

export default function OrgDetailPage() {
  return <OrgDetailClient />;
}

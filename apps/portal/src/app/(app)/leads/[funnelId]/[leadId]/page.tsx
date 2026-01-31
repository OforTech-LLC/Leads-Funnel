/**
 * Lead Detail Page (Server Component)
 *
 * Renders the client component for lead details.
 */

import LeadDetailClient from './LeadDetailClient';

// Required for static export - returns empty array for client-side navigation
export async function generateStaticParams(): Promise<{ funnelId: string; leadId: string }[]> {
  return [];
}

export default function LeadDetailPage() {
  return <LeadDetailClient />;
}

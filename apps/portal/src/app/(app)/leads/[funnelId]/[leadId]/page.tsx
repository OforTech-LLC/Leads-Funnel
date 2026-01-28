/**
 * Lead Detail Page (Server Component)
 *
 * Renders the client component for lead details.
 * Exports generateStaticParams for static export compatibility.
 */

import LeadDetailClient from './LeadDetailClient';

// Required for static export with dynamic routes
// Return a placeholder to create the route shell for client-side navigation
export async function generateStaticParams(): Promise<{ funnelId: string; leadId: string }[]> {
  return [{ funnelId: '__placeholder__', leadId: '__placeholder__' }];
}

export default function LeadDetailPage() {
  return <LeadDetailClient />;
}

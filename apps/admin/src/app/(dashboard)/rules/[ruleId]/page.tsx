/**
 * Rule Detail Page (Server Component)
 *
 * Renders the client component for rule details.
 * Exports generateStaticParams for static export compatibility.
 */

import RuleDetailClient from './RuleDetailClient';

// Required for static export with dynamic routes
// Return a placeholder to create the route shell for client-side navigation
export async function generateStaticParams(): Promise<{ ruleId: string }[]> {
  return [{ ruleId: '__placeholder__' }];
}

export default function RuleDetailPage() {
  return <RuleDetailClient />;
}

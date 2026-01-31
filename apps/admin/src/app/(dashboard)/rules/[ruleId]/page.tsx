/**
 * Rule Detail Page (Server Component)
 *
 * Renders the client component for rule details.
 */

import RuleDetailClient from './RuleDetailClient';

// Required for static export - returns empty array for client-side navigation
export async function generateStaticParams(): Promise<{ ruleId: string }[]> {
  return [];
}

export default function RuleDetailPage() {
  return <RuleDetailClient />;
}

'use client';

/**
 * A/B Test Component
 * Declarative component for rendering experiment variants.
 *
 * Usage:
 *   <ABTest experimentId="form_variant">
 *     <Variant id="single"><LeadForm /></Variant>
 *     <Variant id="multi"><MultiStepForm /></Variant>
 *   </ABTest>
 */

import { type ReactNode, type ReactElement, Children, isValidElement } from 'react';
import { useExperiment } from '@/lib/experiments';

// ---------------------------------------------------------------------------
// Variant (child marker)
// ---------------------------------------------------------------------------

interface VariantProps {
  id: string;
  children: ReactNode;
}

/**
 * Variant component - used as a child of ABTest to define each variant's content.
 * Renders nothing on its own; ABTest selects the matching child.
 */
export function Variant({ children }: VariantProps) {
  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// ABTest (parent)
// ---------------------------------------------------------------------------

interface ABTestProps {
  experimentId: string;
  children: ReactNode;
  /** Optional fallback if the experiment is not loaded yet */
  fallback?: ReactNode;
}

/**
 * ABTest component - selects which Variant child to render based on the
 * experiment assignment for the current session.
 */
export function ABTest({ experimentId, children, fallback = null }: ABTestProps) {
  const activeVariant = useExperiment(experimentId);

  // While hydrating on client (variant is '' until useEffect runs) show fallback
  if (!activeVariant) {
    return <>{fallback}</>;
  }

  // Find the matching Variant child
  const childArray = Children.toArray(children);
  for (const child of childArray) {
    if (isValidElement(child) && (child as ReactElement<VariantProps>).props.id === activeVariant) {
      return <>{(child as ReactElement<VariantProps>).props.children}</>;
    }
  }

  // If no match, render the first variant as fallback
  const first = childArray[0];
  if (isValidElement(first)) {
    return <>{(first as ReactElement<VariantProps>).props.children}</>;
  }

  return null;
}

export default ABTest;

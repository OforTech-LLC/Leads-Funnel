/**
 * A/B Testing Framework
 * Deterministic experiment assignment based on session ID and experiment ID.
 * Supports weighted variant distribution and consistent assignment across page loads.
 *
 * Note: This module exports a React hook (useExperiment). It must only be
 * imported from client components that are already marked with 'use client'.
 */

import { useState, useEffect } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExperimentVariant {
  id: string;
  weight: number;
}

export interface Experiment {
  id: string;
  name: string;
  variants: ExperimentVariant[];
  active: boolean;
}

// ---------------------------------------------------------------------------
// Experiment Definitions
// ---------------------------------------------------------------------------

export const EXPERIMENTS: Experiment[] = [
  {
    id: 'form_variant',
    name: 'Single vs Multi-Step Form',
    variants: [
      { id: 'single', weight: 50 },
      { id: 'multi', weight: 50 },
    ],
    active: true,
  },
  {
    id: 'cta_text',
    name: 'CTA Button Text',
    variants: [
      { id: 'get_started', weight: 50 },
      { id: 'get_free_quotes', weight: 50 },
    ],
    active: true,
  },
];

// ---------------------------------------------------------------------------
// Session ID Management
// ---------------------------------------------------------------------------

const SESSION_ID_KEY = 'ab_session_id';
const VARIANTS_KEY = 'ab_assigned_variants';

/**
 * Generate a session ID using crypto.randomUUID with a fallback
 */
function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get or create session ID from sessionStorage
 */
export function getSessionId(): string {
  if (typeof window === 'undefined') return '';

  try {
    let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
    if (!sessionId) {
      sessionId = generateSessionId();
      sessionStorage.setItem(SESSION_ID_KEY, sessionId);
    }
    return sessionId;
  } catch {
    return generateSessionId();
  }
}

// ---------------------------------------------------------------------------
// Hash-based Variant Assignment
// ---------------------------------------------------------------------------

/**
 * Simple deterministic hash (djb2 variant) for string input.
 * Produces a value between 0 and 1.
 */
function hashToNumber(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) >>> 0;
  }
  return (hash % 10000) / 10000;
}

/**
 * Select a variant based on the hash value and variant weights
 */
function selectVariant(hashValue: number, variants: ExperimentVariant[]): string {
  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
  const threshold = hashValue * totalWeight;

  let accumulated = 0;
  for (const variant of variants) {
    accumulated += variant.weight;
    if (threshold < accumulated) {
      return variant.id;
    }
  }

  // Fallback to last variant
  return variants[variants.length - 1].id;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get the assigned variant for an experiment (non-hook version).
 * Deterministic: same session + experiment always yields the same variant.
 */
export function getVariant(experimentId: string): string {
  const experiment = EXPERIMENTS.find((e) => e.id === experimentId);

  // Return first variant if experiment not found or inactive
  if (!experiment || !experiment.active) {
    return experiment?.variants[0]?.id ?? '';
  }

  // Check cached assignment first
  if (typeof window !== 'undefined') {
    try {
      const cached = sessionStorage.getItem(VARIANTS_KEY);
      if (cached) {
        const assignments = JSON.parse(cached) as Record<string, string>;
        if (assignments[experimentId]) {
          return assignments[experimentId];
        }
      }
    } catch {
      // Continue to compute
    }
  }

  const sessionId = getSessionId();
  const hashInput = `${sessionId}:${experimentId}`;
  const hashValue = hashToNumber(hashInput);
  const variant = selectVariant(hashValue, experiment.variants);

  // Cache the assignment
  storeVariant(experimentId, variant);

  return variant;
}

/**
 * Store variant assignment in sessionStorage
 */
function storeVariant(experimentId: string, variantId: string): void {
  if (typeof window === 'undefined') return;

  try {
    const cached = sessionStorage.getItem(VARIANTS_KEY);
    const assignments: Record<string, string> = cached ? JSON.parse(cached) : {};
    assignments[experimentId] = variantId;
    sessionStorage.setItem(VARIANTS_KEY, JSON.stringify(assignments));
  } catch {
    // sessionStorage unavailable
  }
}

/**
 * React hook for getting the variant for an experiment.
 * Returns the variant ID, stable across re-renders within the same session.
 */
export function useExperiment(experimentId: string): string {
  const [variant, setVariant] = useState<string>('');

  useEffect(() => {
    setVariant(getVariant(experimentId));
  }, [experimentId]);

  return variant;
}

/**
 * Get all assigned variants as a record (for inclusion in lead payloads)
 */
export function getAssignedExperiments(): Record<string, string> {
  if (typeof window === 'undefined') return {};

  try {
    const cached = sessionStorage.getItem(VARIANTS_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

/**
 * Centralized feature flag definitions.
 * Used by backend (SSM Parameter Store) and frontend (env vars / API).
 */

export const FEATURE_FLAGS = {
  BILLING_ENABLED: 'billing_enabled',
  CALENDAR_ENABLED: 'calendar_enabled',
  SLACK_ENABLED: 'slack_enabled',
  TEAMS_ENABLED: 'teams_enabled',
  WEBHOOKS_ENABLED: 'webhooks_enabled',
  LEAD_SCORING_ENABLED: 'lead_scoring_enabled',
  ROUND_ROBIN_ENABLED: 'round_robin_enabled',
  MULTI_STEP_FORM_ENABLED: 'multi_step_form_enabled',
  EXIT_INTENT_ENABLED: 'exit_intent_enabled',
  AB_TESTING_ENABLED: 'ab_testing_enabled',
} as const;

export type FeatureFlag = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];

export const FEATURE_FLAG_DEFAULTS: Record<FeatureFlag, boolean> = {
  [FEATURE_FLAGS.BILLING_ENABLED]: false,
  [FEATURE_FLAGS.CALENDAR_ENABLED]: false,
  [FEATURE_FLAGS.SLACK_ENABLED]: false,
  [FEATURE_FLAGS.TEAMS_ENABLED]: false,
  [FEATURE_FLAGS.WEBHOOKS_ENABLED]: true,
  [FEATURE_FLAGS.LEAD_SCORING_ENABLED]: true,
  [FEATURE_FLAGS.ROUND_ROBIN_ENABLED]: true,
  [FEATURE_FLAGS.MULTI_STEP_FORM_ENABLED]: true,
  [FEATURE_FLAGS.EXIT_INTENT_ENABLED]: true,
  [FEATURE_FLAGS.AB_TESTING_ENABLED]: true,
};

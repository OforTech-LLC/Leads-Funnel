/**
 * Feature flag normalization helpers.
 *
 * Provides a single canonical list of feature flags plus alias mapping
 * so older SSM parameter names continue to work during migration.
 */
export declare const FLAG_DEFAULTS: {
    readonly enable_public_funnels: false;
    readonly enable_admin_console: false;
    readonly enable_portal: false;
    readonly enable_assignment_service: false;
    readonly enable_notification_service: false;
    readonly enable_disputes_and_credits: false;
    readonly enable_evidence_pack: false;
    readonly enable_email_notifications: false;
    readonly enable_sms_notifications: false;
    readonly enable_twilio_sms: false;
    readonly enable_sns_sms: false;
    readonly enable_voice_agent: false;
    readonly enable_twilio_voice: false;
    readonly enable_elevenlabs: false;
    readonly enable_voice_worker_queue: false;
    readonly enable_bedrock_ai: false;
    readonly enable_waf: false;
    readonly enable_admin_ip_allowlist: false;
    readonly enable_cloudfront_logs: false;
    readonly enable_exports: false;
    readonly enable_pdf_exports: false;
    readonly enable_docx_exports: false;
    readonly enable_xlsx_exports: false;
    readonly enable_agent_recommendations: false;
    readonly enable_subscription_auto_assign: false;
    readonly enable_instant_connect: false;
    readonly webhooks_enabled: true;
    readonly lead_scoring_enabled: true;
    readonly round_robin_enabled: true;
    readonly enable_rate_limiting: true;
    readonly enable_deduplication: true;
    readonly enable_ai_analysis: false;
    readonly enable_debug: false;
    readonly billing_enabled: false;
    readonly calendar_enabled: false;
    readonly slack_enabled: false;
    readonly teams_enabled: false;
};
export type FeatureFlagName = keyof typeof FLAG_DEFAULTS;
export declare function normalizeFeatureFlags(raw: Record<string, unknown>): Record<FeatureFlagName, boolean>;
export declare function pickFeatureFlags<T extends readonly FeatureFlagName[]>(flags: Record<FeatureFlagName, boolean>, keys: T): {
    [K in T[number]]: boolean;
};
export declare const ALL_FEATURE_FLAGS: FeatureFlagName[];

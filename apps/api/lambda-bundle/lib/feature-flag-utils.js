/**
 * Feature flag normalization helpers.
 *
 * Provides a single canonical list of feature flags plus alias mapping
 * so older SSM parameter names continue to work during migration.
 */
export const FLAG_DEFAULTS = {
    // Global apps
    enable_public_funnels: false,
    enable_admin_console: false,
    enable_portal: false,
    // Lead pipeline (core)
    enable_assignment_service: false,
    enable_notification_service: false,
    enable_disputes_and_credits: false,
    enable_evidence_pack: false,
    // Channels
    enable_email_notifications: false,
    enable_sms_notifications: false,
    enable_twilio_sms: false,
    enable_sns_sms: false,
    // Voice agent upsell
    enable_voice_agent: false,
    enable_twilio_voice: false,
    enable_elevenlabs: false,
    enable_voice_worker_queue: false,
    enable_bedrock_ai: false,
    // Security / edge
    enable_waf: false,
    enable_admin_ip_allowlist: false,
    enable_cloudfront_logs: false,
    // Exports & reporting
    enable_exports: false,
    enable_pdf_exports: false,
    enable_docx_exports: false,
    enable_xlsx_exports: false,
    // Marketplace behavior
    enable_agent_recommendations: false,
    enable_subscription_auto_assign: false,
    enable_instant_connect: false,
    // Existing internal flags
    webhooks_enabled: true,
    lead_scoring_enabled: true,
    round_robin_enabled: true,
    enable_rate_limiting: true,
    enable_deduplication: true,
    enable_ai_analysis: false,
    enable_debug: false,
    billing_enabled: false,
    calendar_enabled: false,
    slack_enabled: false,
    teams_enabled: false,
};
const FLAG_ALIASES = {
    enable_public_funnels: ['enable_public_funnels', 'enable-public-funnels'],
    enable_admin_console: ['enable_admin_console', 'enable-admin-console', 'enable-org-management'],
    enable_portal: ['enable_portal', 'enable-agent-portal', 'enable_agent_portal', 'enable-portal'],
    enable_assignment_service: [
        'enable_assignment_service',
        'enable_assignment',
        'enable-assignment-engine',
        'enable-assignment',
    ],
    enable_notification_service: [
        'enable_notification_service',
        'enable_notifications',
        'enable-notification-service',
        'enable-notifications',
        'enable-lead-notifications',
    ],
    enable_disputes_and_credits: ['enable_disputes_and_credits', 'enable-disputes-and-credits'],
    enable_evidence_pack: ['enable_evidence_pack', 'enable-evidence-pack'],
    enable_email_notifications: [
        'enable_email_notifications',
        'enable_email',
        'enable-email-notifications',
        'enable-email',
    ],
    enable_sms_notifications: [
        'enable_sms_notifications',
        'enable_sms',
        'enable-sms-notifications',
        'enable-sms',
    ],
    enable_twilio_sms: ['enable_twilio_sms', 'enable_twilio', 'enable-twilio', 'enable-twilio-sms'],
    enable_sns_sms: ['enable_sns_sms', 'enable-sns-sms', 'enable_sns'],
    enable_voice_agent: ['enable_voice_agent', 'enable-voice-agent'],
    enable_twilio_voice: ['enable_twilio_voice', 'enable-twilio-voice'],
    enable_elevenlabs: ['enable_elevenlabs', 'enable-elevenlabs'],
    enable_voice_worker_queue: ['enable_voice_worker_queue', 'enable-voice-worker-queue'],
    enable_bedrock_ai: ['enable_bedrock_ai', 'enable-bedrock-ai'],
    enable_waf: ['enable_waf', 'enable-waf'],
    enable_admin_ip_allowlist: [
        'enable_admin_ip_allowlist',
        'enable-admin-ip-allowlist',
        'enable-ip-allowlist',
    ],
    enable_cloudfront_logs: ['enable_cloudfront_logs', 'enable-cloudfront-logs'],
    enable_exports: ['enable_exports', 'enable-exports'],
    enable_pdf_exports: ['enable_pdf_exports', 'enable-pdf-exports'],
    enable_docx_exports: ['enable_docx_exports', 'enable-docx-exports'],
    enable_xlsx_exports: ['enable_xlsx_exports', 'enable-xlsx-exports'],
    enable_agent_recommendations: ['enable_agent_recommendations', 'enable-agent-recommendations'],
    enable_subscription_auto_assign: [
        'enable_subscription_auto_assign',
        'enable-subscription-auto-assign',
    ],
    enable_instant_connect: ['enable_instant_connect', 'enable-instant-connect'],
    webhooks_enabled: ['webhooks_enabled', 'enable-webhooks', 'webhooks-enabled'],
    lead_scoring_enabled: ['lead_scoring_enabled', 'enable-lead-scoring', 'lead-scoring-enabled'],
    round_robin_enabled: ['round_robin_enabled', 'enable-round-robin', 'round-robin-enabled'],
    enable_rate_limiting: ['enable_rate_limiting', 'enable-rate-limiting'],
    enable_deduplication: ['enable_deduplication', 'enable-deduplication'],
    enable_ai_analysis: ['enable_ai_analysis', 'enable-ai-analysis'],
    enable_debug: ['enable_debug', 'enable-debug'],
    billing_enabled: ['billing_enabled', 'enable-billing', 'billing-enabled'],
    calendar_enabled: ['calendar_enabled', 'enable-calendar', 'calendar-enabled'],
    slack_enabled: ['slack_enabled', 'enable-slack', 'slack-enabled'],
    teams_enabled: ['teams_enabled', 'enable-teams', 'teams-enabled'],
};
const TRUTHY = new Set(['true', '1', 'yes', 'y', 'on']);
const FALSY = new Set(['false', '0', 'no', 'n', 'off']);
function coerceBoolean(value) {
    if (typeof value === 'boolean')
        return value;
    if (typeof value === 'number')
        return value !== 0;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (TRUTHY.has(normalized))
            return true;
        if (FALSY.has(normalized))
            return false;
    }
    return undefined;
}
export function normalizeFeatureFlags(raw) {
    const normalized = { ...FLAG_DEFAULTS };
    Object.keys(FLAG_DEFAULTS).forEach((flag) => {
        const aliases = FLAG_ALIASES[flag] || [flag];
        for (const key of aliases) {
            if (!Object.prototype.hasOwnProperty.call(raw, key))
                continue;
            const coerced = coerceBoolean(raw[key]);
            if (coerced !== undefined) {
                normalized[flag] = coerced;
            }
            break;
        }
    });
    return normalized;
}
export function pickFeatureFlags(flags, keys) {
    const result = {};
    for (const key of keys) {
        result[key] = flags[key];
    }
    return result;
}
export const ALL_FEATURE_FLAGS = Object.keys(FLAG_DEFAULTS);
//# sourceMappingURL=feature-flag-utils.js.map
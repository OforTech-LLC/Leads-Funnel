/**
 * Lead Analyzer Worker
 *
 * Triggered by EventBridge 'Lead Created' events.
 * Performs AI analysis on the lead content and updates the lead record.
 */
import { analyzeLead } from '../lib/ai/analyzer.js';
import { updateLeadAnalysis, getLead } from '../lib/dynamo.js';
import { createLogger } from '../lib/logging.js';
const log = createLogger('lead-analyzer-worker');
// =============================================================================
// Environment Configuration
// =============================================================================
function loadEnvConfig() {
    return {
        awsRegion: process.env.AWS_REGION || 'us-east-1',
        env: process.env.ENVIRONMENT || 'dev',
        projectName: process.env.PROJECT_NAME || 'kanjona',
        rateLimitsTableName: process.env.RATE_LIMITS_TABLE_NAME || '',
        idempotencyTableName: process.env.IDEMPOTENCY_TABLE_NAME || '',
        eventBusName: process.env.EVENT_BUS_NAME || 'default',
        rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '10', 10),
        rateLimitWindowMin: parseInt(process.env.RATE_LIMIT_WINDOW_MIN || '10', 10),
        idempotencyTtlHours: parseInt(process.env.IDEMPOTENCY_TTL_HOURS || '24', 10),
        ipHashSalt: process.env.IP_HASH_SALT || '',
    };
}
/**
 * Get the funnel-specific table name
 */
function getFunnelTableName(config, funnelId) {
    return `${config.projectName}-${config.env}-${funnelId}`;
}
// =============================================================================
// Handler
// =============================================================================
export async function handler(event) {
    const config = loadEnvConfig();
    const detail = event.detail;
    log.info('Received Lead Created event', { leadId: detail.leadId, funnelId: detail.funnelId });
    if (detail.status !== 'accepted') {
        log.info('Skipping analysis for non-accepted lead', { status: detail.status });
        return;
    }
    // Get the funnel-specific table name
    const tableName = getFunnelTableName(config, detail.funnelId);
    try {
        const lead = await getLead(config, tableName, detail.leadId);
        if (!lead) {
            log.warn('Lead not found for analysis', { leadId: detail.leadId });
            return;
        }
        // Combine relevant text fields for analysis
        const textToAnalyze = [lead.message, lead.utm?.utm_term, lead.utm?.utm_content]
            .filter(Boolean)
            .join('\n');
        if (!textToAnalyze.trim()) {
            log.info('No text content to analyze', { leadId: detail.leadId });
            return;
        }
        const analysis = await analyzeLead(textToAnalyze);
        if (analysis) {
            await updateLeadAnalysis(config, tableName, detail.leadId, analysis);
            log.info('Lead analysis updated', { leadId: detail.leadId, urgency: analysis.urgency });
        }
    }
    catch (error) {
        log.error('Error processing lead analysis', {
            leadId: detail.leadId,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        // We don't throw here to avoid infinite retries on the event stream for non-transient errors
        // Ideally we would use a DLQ
    }
}
//# sourceMappingURL=lead-analyzer.js.map
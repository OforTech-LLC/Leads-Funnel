/**
 * Lead Capture API Lambda Handler
 * POST /lead endpoint for capturing leads from the website
 */
import { parseJsonBody, validateLeadPayload } from './lib/validate.js';
import { normalizeLead } from './lib/normalize.js';
import { extractClientIp, analyzeLeadSecurity } from './lib/security.js';
import { checkRateLimit, checkIdempotency, storeLead } from './lib/dynamo.js';
import { getSecretValue } from './lib/clients.js';
import { publishLeadCreatedEvent } from './lib/events.js';
import * as platformLeadsDb from './lib/db/leads.js';
import { getElapsedMs } from './lib/time.js';
import * as http from './lib/http.js';
import { v4 as uuidv4 } from 'uuid';
import { MAX_LEAD_PAYLOAD_SIZE } from './lib/constants.js';
// =============================================================================
// Environment Configuration
// =============================================================================
// Cached IP hash salt (fetched from Secrets Manager on first use)
let cachedIpHashSalt = '';
/**
 * Load base configuration from environment variables
 */
function loadBaseConfig() {
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
    };
}
/**
 * Load full configuration including secrets from Secrets Manager
 */
async function loadConfig() {
    const baseConfig = loadBaseConfig();
    // Fetch IP hash salt from Secrets Manager if not cached
    if (cachedIpHashSalt === '') {
        const saltArn = process.env.IP_HASH_SALT_ARN;
        if (saltArn) {
            const secretJson = await getSecretValue(saltArn, baseConfig.awsRegion);
            try {
                // Secret is stored as JSON: {"salt": "..."}
                const parsed = JSON.parse(secretJson);
                cachedIpHashSalt = parsed.salt || '';
            }
            catch {
                // Fallback to using raw value if not JSON
                cachedIpHashSalt = secretJson;
            }
        }
        else {
            // Fallback to direct environment variable (for local dev)
            cachedIpHashSalt = process.env.IP_HASH_SALT || '';
        }
    }
    return {
        ...baseConfig,
        ipHashSalt: cachedIpHashSalt,
    };
}
/**
 * Get the funnel-specific table name for storing leads
 */
function getFunnelTableName(config, funnelId) {
    return `${config.projectName}-${config.env}-${funnelId}`;
}
/**
 * Extract funnelId from known path patterns.
 *
 * Supported:
 * - /lead/{funnelId}
 * - /funnel/{funnelId}/lead
 * - /funnel/{funnelId}/leads
 * - /{stage}/lead/{funnelId} (stage-prefixed paths)
 */
function extractFunnelIdFromPath(path, stage) {
    if (!path)
        return undefined;
    const parts = path.split('/').filter(Boolean);
    const normalizedParts = stage && parts[0] === stage ? parts.slice(1) : parts;
    if (normalizedParts[0] === 'lead' && normalizedParts[1]) {
        return normalizedParts[1].toLowerCase();
    }
    if (normalizedParts[0] === 'funnel' &&
        normalizedParts[1] &&
        (normalizedParts[2] === 'lead' || normalizedParts[2] === 'leads')) {
        return normalizedParts[1].toLowerCase();
    }
    return undefined;
}
function log(entry) {
    const fullEntry = {
        timestamp: new Date().toISOString(),
        requestId: entry.requestId,
        level: entry.level,
        message: entry.message,
        leadId: entry.leadId,
        status: entry.status,
        suspicious: entry.suspicious,
        reasons: entry.reasons,
        latencyMs: entry.latencyMs,
        emailHash: entry.emailHash,
        ipHash: entry.ipHash,
        errorCode: entry.errorCode,
    };
    // Structured JSON logging - never log PII (email, phone, IP)
    console.log(JSON.stringify(fullEntry));
}
// =============================================================================
// Payload Size Validation
// =============================================================================
function checkPayloadSize(body) {
    if (!body) {
        return { valid: true, size: 0 };
    }
    // Calculate byte size (handles UTF-8 characters correctly)
    const size = Buffer.byteLength(body, 'utf8');
    return {
        valid: size <= MAX_LEAD_PAYLOAD_SIZE,
        size,
    };
}
// =============================================================================
// Response Helpers with Request ID
// =============================================================================
function addRequestIdHeader(response, requestId) {
    if (typeof response === 'string') {
        return response;
    }
    const headers = response.headers || {};
    return {
        ...response,
        headers: {
            ...headers,
            'X-Request-Id': requestId,
        },
    };
}
// =============================================================================
// Lead Scoring Integration
// =============================================================================
/**
 * Conditionally score a lead if the lead_scoring_enabled flag is on.
 * Non-blocking: scoring errors do not fail the request.
 */
async function maybeScoreLead(normalizedLead, security, userAgent, requestId) {
    try {
        const { isFeatureEnabled } = await import('./lib/config.js');
        const enabled = await isFeatureEnabled('lead_scoring_enabled');
        if (!enabled)
            return {};
        const { scoreLead } = await import('./lib/scoring/engine.js');
        const result = scoreLead({
            name: normalizedLead.name,
            email: normalizedLead.email,
            phone: normalizedLead.phone,
            message: normalizedLead.message,
            pageUrl: normalizedLead.pageUrl,
            referrer: normalizedLead.referrer,
            utm: normalizedLead.utm,
            ipHash: security.ipHash,
            userAgent,
        });
        return {
            score: result.score.total,
            matchedRules: result.matchedRules,
        };
    }
    catch (err) {
        log({
            requestId,
            level: 'warn',
            message: 'Lead scoring failed (non-blocking)',
            errorCode: 'SCORING_ERROR',
        });
        return {};
    }
}
let cachedQualityConfig = null;
const QUALITY_CONFIG_TTL_MS = 60 * 1000;
async function loadQualityConfig(config) {
    const now = Date.now();
    if (cachedQualityConfig && cachedQualityConfig.expiresAt > now) {
        return cachedQualityConfig.value;
    }
    const project = config.projectName;
    const env = config.env;
    if (!project || !env) {
        const fallback = {
            quarantineThreshold: Number(process.env.QUALITY_QUARANTINE_THRESHOLD) || undefined,
        };
        cachedQualityConfig = { value: fallback, expiresAt: now + QUALITY_CONFIG_TTL_MS };
        return fallback;
    }
    try {
        const { loadConfig } = await import('./lib/config.js');
        const basePath = `/${project}/${env}/quality`;
        const rawThreshold = await loadConfig(`${basePath}/quarantine_threshold`).catch(() => '');
        const thresholdValue = rawThreshold ? Number(rawThreshold) : undefined;
        const quarantineThreshold = Number.isFinite(thresholdValue) ? thresholdValue : undefined;
        const value = {
            quarantineThreshold: quarantineThreshold || undefined,
        };
        cachedQualityConfig = { value, expiresAt: now + QUALITY_CONFIG_TTL_MS };
        return value;
    }
    catch {
        const fallback = {
            quarantineThreshold: Number(process.env.QUALITY_QUARANTINE_THRESHOLD) || undefined,
        };
        cachedQualityConfig = { value: fallback, expiresAt: now + QUALITY_CONFIG_TTL_MS };
        return fallback;
    }
}
// =============================================================================
// Lambda Handler
// =============================================================================
export async function handler(event, context) {
    const startTime = Date.now();
    // Generate correlation/request ID
    const requestId = context.awsRequestId || uuidv4();
    const requestOrigin = event.headers?.origin || event.headers?.Origin;
    // Handle OPTIONS preflight
    if (event.requestContext.http.method === 'OPTIONS') {
        return addRequestIdHeader(http.noContent(requestOrigin), requestId);
    }
    // Only allow POST
    if (event.requestContext.http.method !== 'POST') {
        log({
            requestId,
            level: 'warn',
            message: 'Method not allowed',
            errorCode: 'METHOD_NOT_ALLOWED',
        });
        return addRequestIdHeader(http.methodNotAllowed(requestOrigin), requestId);
    }
    // Check payload size before processing (DoS protection)
    const payloadCheck = checkPayloadSize(event.body);
    if (!payloadCheck.valid) {
        log({
            requestId,
            level: 'warn',
            message: 'Payload too large',
            errorCode: 'PAYLOAD_TOO_LARGE',
        });
        return addRequestIdHeader(http.payloadTooLarge(MAX_LEAD_PAYLOAD_SIZE, requestOrigin), requestId);
    }
    const config = await loadConfig();
    // Validate configuration
    if (!config.rateLimitsTableName || !config.idempotencyTableName) {
        log({
            requestId,
            level: 'error',
            message: 'DynamoDB table names not configured',
            errorCode: 'CONFIG_ERROR',
        });
        return addRequestIdHeader(http.internalError(requestOrigin), requestId);
    }
    try {
        // Parse JSON body
        const { data, error: parseError } = parseJsonBody(event.body);
        if (parseError) {
            log({
                requestId,
                level: 'warn',
                message: 'Invalid JSON body',
                errorCode: 'INVALID_JSON',
            });
            return addRequestIdHeader(http.invalidJson(parseError, requestOrigin), requestId);
        }
        // Validate payload
        const validation = validateLeadPayload(data);
        if (!validation.valid) {
            log({
                requestId,
                level: 'warn',
                message: 'Validation failed',
                errorCode: 'VALIDATION_ERROR',
            });
            return addRequestIdHeader(http.validationError(validation.errors, requestOrigin), requestId);
        }
        const payload = data;
        const requireConsent = (process.env.REQUIRE_CONSENT || '').toLowerCase() === 'true';
        if (requireConsent && !payload.consent?.privacyAccepted) {
            log({
                requestId,
                level: 'warn',
                message: 'Consent required but not provided',
                errorCode: 'CONSENT_REQUIRED',
            });
            return addRequestIdHeader(http.validationError({ consent: 'Consent is required' }, requestOrigin), requestId);
        }
        // Normalize lead data
        let normalizedLead = normalizeLead(payload);
        // Attempt to infer funnelId from path if not provided in payload
        if (!normalizedLead.funnelId) {
            const pathFunnelId = extractFunnelIdFromPath(event.requestContext.http.path, event.requestContext.stage);
            if (pathFunnelId) {
                normalizedLead = { ...normalizedLead, funnelId: pathFunnelId };
            }
        }
        // Validate funnelId is present and valid
        if (!normalizedLead.funnelId) {
            log({
                requestId,
                level: 'warn',
                message: 'Missing funnelId',
                errorCode: 'VALIDATION_ERROR',
            });
            return addRequestIdHeader(http.validationError({ funnelId: 'funnelId is required' }, requestOrigin), requestId);
        }
        // Get allowed funnel IDs from environment
        const allowedFunnels = new Set((process.env.FUNNEL_IDS || '').split(',').map((id) => id.trim().toLowerCase()));
        if (!allowedFunnels.has(normalizedLead.funnelId)) {
            log({
                requestId,
                level: 'warn',
                message: 'Invalid funnelId',
                errorCode: 'VALIDATION_ERROR',
            });
            return addRequestIdHeader(http.validationError({ funnelId: 'Invalid funnel ID' }, requestOrigin), requestId);
        }
        // Get the funnel-specific table name
        const funnelTableName = getFunnelTableName(config, normalizedLead.funnelId);
        // Extract client IP and analyze security
        const headers = event.headers || {};
        const sourceIp = event.requestContext?.http?.sourceIp;
        const clientIp = extractClientIp(headers, sourceIp);
        const userAgent = headers['user-agent'] || headers['User-Agent'];
        const security = analyzeLeadSecurity(normalizedLead, clientIp, config.ipHashSalt, config.rateLimitWindowMin);
        // Rate limiting (fail-closed)
        try {
            const rateLimit = await checkRateLimit(config, security.ipHash);
            if (!rateLimit.allowed) {
                log({
                    requestId,
                    level: 'warn',
                    message: 'Rate limited',
                    ipHash: security.ipHash,
                    errorCode: 'RATE_LIMITED',
                    latencyMs: getElapsedMs(startTime),
                });
                return addRequestIdHeader(http.rateLimited(requestOrigin), requestId);
            }
        }
        catch (error) {
            // Fail-closed: reject on rate limit errors for security
            log({
                requestId,
                level: 'error',
                message: 'Rate limit check failed',
                errorCode: 'RATE_LIMIT_ERROR',
            });
            return addRequestIdHeader(http.internalError(requestOrigin), requestId);
        }
        // Lead scoring (non-blocking, feature-flagged)
        const scoring = await maybeScoreLead(normalizedLead, security, userAgent, requestId);
        const qualityConfig = await loadQualityConfig(config);
        const threshold = qualityConfig.quarantineThreshold;
        const scoreValue = scoring.score;
        const thresholdEnabled = typeof threshold === 'number' && threshold > 0;
        const quarantineByScore = thresholdEnabled && scoreValue !== undefined && scoreValue < threshold;
        const status = security.suspicious || quarantineByScore ? 'quarantined' : 'accepted';
        // Generate lead ID for idempotency
        const leadId = uuidv4();
        // Idempotency check
        const idempotency = await checkIdempotency(config, security.idempotencyKey, leadId, status);
        if (idempotency.isDuplicate) {
            // Return existing lead info for duplicate request
            log({
                requestId,
                level: 'info',
                message: 'Duplicate request (idempotent)',
                leadId: idempotency.existingLeadId,
                status: idempotency.existingStatus,
                emailHash: security.emailHash,
                ipHash: security.ipHash,
                latencyMs: getElapsedMs(startTime),
            });
            return addRequestIdHeader(http.ok(idempotency.existingLeadId, idempotency.existingStatus, requestOrigin), requestId);
        }
        const capturedAt = new Date().toISOString();
        const phoneDigits = normalizedLead.phone ? normalizedLead.phone.replace(/\D/g, '').length : 0;
        const evidencePack = {
            capturedAt,
            funnelId: normalizedLead.funnelId,
            pageVariant: payload.metadata?.pageVariant,
            pageUrl: normalizedLead.pageUrl,
            referrer: normalizedLead.referrer,
            utm: normalizedLead.utm,
            metadata: payload.metadata,
            consent: payload.consent
                ? {
                    ...payload.consent,
                    capturedAt,
                    ipHash: security.ipHash,
                }
                : undefined,
            verification: {
                emailValid: true,
                phoneValid: phoneDigits >= 7,
            },
            delivery: { attempts: [] },
            quality: {
                score: scoreValue,
                threshold: thresholdEnabled ? threshold : undefined,
                matchedRules: scoring.matchedRules,
                status,
            },
            security: {
                suspicious: security.suspicious,
                reasons: security.reasons,
            },
        };
        // Store lead (with score if available)
        const lead = await storeLead(config, funnelTableName, normalizedLead, security, userAgent, scoring.score, {
            leadId,
            status,
            createdAt: capturedAt,
            evidencePack,
        });
        // Optional: ingest into platform lead table if configured
        const platformTableName = process.env.PLATFORM_LEADS_TABLE_NAME || process.env.DDB_TABLE_NAME || '';
        if (platformTableName) {
            const platformStatus = status === 'quarantined' ? 'quarantined' : 'new';
            try {
                await platformLeadsDb.ingestLead({
                    leadId,
                    funnelId: normalizedLead.funnelId,
                    email: normalizedLead.email,
                    name: normalizedLead.name,
                    phone: normalizedLead.phone,
                    zipCode: normalizedLead.address?.zipCode,
                    message: normalizedLead.message,
                    pageUrl: normalizedLead.pageUrl,
                    referrer: normalizedLead.referrer,
                    utm: normalizedLead.utm,
                    status: platformStatus,
                    ipHash: security.ipHash,
                    userAgent,
                    score: scoring.score,
                    evidencePack,
                    createdAt: capturedAt,
                }, platformTableName);
            }
            catch (err) {
                log({
                    requestId,
                    level: 'warn',
                    message: 'Failed to ingest lead into platform table (non-blocking)',
                    leadId,
                    errorCode: 'PLATFORM_INGEST_ERROR',
                });
            }
        }
        // Publish event (fire-and-forget with error logging)
        try {
            await publishLeadCreatedEvent(config, lead, security);
        }
        catch (eventError) {
            // Log but don't fail the request
            log({
                requestId,
                level: 'error',
                message: 'Failed to publish event',
                leadId: lead.leadId,
                errorCode: 'EVENT_PUBLISH_ERROR',
            });
        }
        // Success log
        log({
            requestId,
            level: 'info',
            message: 'Lead created',
            leadId: lead.leadId,
            status: lead.status,
            suspicious: security.suspicious,
            reasons: security.reasons,
            emailHash: security.emailHash,
            ipHash: security.ipHash,
            latencyMs: getElapsedMs(startTime),
            score: scoring.score,
        });
        return addRequestIdHeader(http.created(lead.leadId, lead.status, requestOrigin), requestId);
    }
    catch (error) {
        // Catch-all error handler - log details for debugging but never expose to client
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        console.error('Unhandled error details:', { errorMessage, errorStack });
        log({
            requestId,
            level: 'error',
            message: 'Unhandled error',
            errorCode: 'INTERNAL_ERROR',
            latencyMs: getElapsedMs(startTime),
        });
        return addRequestIdHeader(http.internalError(requestOrigin), requestId);
    }
}
//# sourceMappingURL=handler.js.map
/**
 * Lead Capture API Lambda Handler
 * POST /lead endpoint for capturing leads from the website
 */

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import type { LeadRequestPayload } from '@kanjona/shared';
import type { EnvConfig, LogEntry, NormalizedLead, SecurityAnalysis } from './types.js';
import { parseJsonBody, validateLeadPayload } from './lib/validate.js';
import { normalizeLead } from './lib/normalize.js';
import { extractClientIp, analyzeLeadSecurity } from './lib/security.js';
import { checkRateLimit, checkIdempotency, storeLead } from './lib/dynamo.js';
import { publishLeadCreatedEvent } from './lib/events.js';
import { getElapsedMs } from './lib/time.js';
import * as http from './lib/http.js';
import { v4 as uuidv4 } from 'uuid';
import { MAX_LEAD_PAYLOAD_SIZE } from './lib/constants.js';

// =============================================================================
// Environment Configuration
// =============================================================================

function loadConfig(): EnvConfig {
  return {
    awsRegion: process.env.AWS_REGION || 'us-east-1',
    env: (process.env.ENV as 'dev' | 'prod') || 'dev',
    ddbTableName: process.env.DDB_TABLE_NAME || '',
    eventBusName: process.env.EVENT_BUS_NAME || 'default',
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '10', 10),
    rateLimitWindowMin: parseInt(process.env.RATE_LIMIT_WINDOW_MIN || '10', 10),
    idempotencyTtlHours: parseInt(process.env.IDEMPOTENCY_TTL_HOURS || '24', 10),
    ipHashSalt: process.env.IP_HASH_SALT || '',
  };
}

// =============================================================================
// Structured Logging
// =============================================================================

interface LogParams {
  requestId: string;
  level: LogEntry['level'];
  message: string;
  leadId?: string;
  status?: string;
  suspicious?: boolean;
  reasons?: string[];
  latencyMs?: number;
  emailHash?: string;
  ipHash?: string;
  errorCode?: string;
  score?: number;
}

function log(entry: LogParams): void {
  const fullEntry: LogEntry = {
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

function checkPayloadSize(body: string | undefined): { valid: boolean; size: number } {
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

function addRequestIdHeader(
  response: APIGatewayProxyResultV2,
  requestId: string
): APIGatewayProxyResultV2 {
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
async function maybeScoreLead(
  normalizedLead: NormalizedLead,
  security: SecurityAnalysis,
  userAgent: string | undefined,
  requestId: string
): Promise<{ score?: number; matchedRules?: string[] }> {
  try {
    const { isFeatureEnabled } = await import('./lib/config.js');
    const enabled = await isFeatureEnabled('lead_scoring_enabled');
    if (!enabled) return {};

    const { scoreLead } = await import('./lib/scoring/engine.js');
    const result = scoreLead({
      name: normalizedLead.name,
      email: normalizedLead.email,
      phone: normalizedLead.phone,
      message: normalizedLead.message,
      pageUrl: normalizedLead.pageUrl,
      referrer: normalizedLead.referrer,
      utm: normalizedLead.utm as Record<string, string> | undefined,
      ipHash: security.ipHash,
      userAgent,
    });

    return {
      score: result.score.total,
      matchedRules: result.matchedRules,
    };
  } catch (err) {
    log({
      requestId,
      level: 'warn',
      message: 'Lead scoring failed (non-blocking)',
      errorCode: 'SCORING_ERROR',
    });
    return {};
  }
}

// =============================================================================
// Lambda Handler
// =============================================================================

export async function handler(
  event: APIGatewayProxyEventV2,
  context: Context
): Promise<APIGatewayProxyResultV2> {
  const startTime = Date.now();
  // Generate correlation/request ID
  const requestId = context.awsRequestId || uuidv4();

  // Handle OPTIONS preflight
  if (event.requestContext.http.method === 'OPTIONS') {
    return addRequestIdHeader(http.noContent(), requestId);
  }

  // Only allow POST
  if (event.requestContext.http.method !== 'POST') {
    log({
      requestId,
      level: 'warn',
      message: 'Method not allowed',
      errorCode: 'METHOD_NOT_ALLOWED',
    });
    return addRequestIdHeader(http.methodNotAllowed(), requestId);
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
    return addRequestIdHeader(http.payloadTooLarge(MAX_LEAD_PAYLOAD_SIZE), requestId);
  }

  const config = loadConfig();

  // Validate configuration
  if (!config.ddbTableName) {
    log({
      requestId,
      level: 'error',
      message: 'DDB_TABLE_NAME not configured',
      errorCode: 'CONFIG_ERROR',
    });
    return addRequestIdHeader(http.internalError(), requestId);
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
      return addRequestIdHeader(http.invalidJson(parseError), requestId);
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
      return addRequestIdHeader(http.validationError(validation.errors), requestId);
    }

    const payload = data as LeadRequestPayload;

    // Normalize lead data
    const normalizedLead: NormalizedLead = normalizeLead(payload);

    // Extract client IP and analyze security
    const headers = event.headers || {};
    const sourceIp = event.requestContext?.http?.sourceIp;
    const clientIp = extractClientIp(headers, sourceIp);
    const userAgent = headers['user-agent'] || headers['User-Agent'];

    const security: SecurityAnalysis = analyzeLeadSecurity(
      normalizedLead,
      clientIp,
      config.ipHashSalt,
      config.rateLimitWindowMin
    );

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
        return addRequestIdHeader(http.rateLimited(), requestId);
      }
    } catch (error) {
      // Fail-closed: reject on rate limit errors for security
      log({
        requestId,
        level: 'error',
        message: 'Rate limit check failed',
        errorCode: 'RATE_LIMIT_ERROR',
      });
      return addRequestIdHeader(http.internalError(), requestId);
    }

    // Generate lead ID for idempotency
    const leadId = uuidv4();
    const status = security.suspicious ? 'quarantined' : 'accepted';

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
      return addRequestIdHeader(
        http.ok(idempotency.existingLeadId!, idempotency.existingStatus!),
        requestId
      );
    }

    // Lead scoring (non-blocking, feature-flagged)
    const scoring = await maybeScoreLead(normalizedLead, security, userAgent, requestId);

    // Store lead (with score if available)
    const lead = await storeLead(config, normalizedLead, security, userAgent, scoring.score);

    // Publish event (fire-and-forget with error logging)
    try {
      await publishLeadCreatedEvent(config, lead, security);
    } catch (eventError) {
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

    return addRequestIdHeader(http.created(lead.leadId, lead.status), requestId);
  } catch (error) {
    // Catch-all error handler - never expose stack traces
    log({
      requestId,
      level: 'error',
      message: 'Unhandled error',
      errorCode: 'INTERNAL_ERROR',
      latencyMs: getElapsedMs(startTime),
    });
    return addRequestIdHeader(http.internalError(), requestId);
  }
}

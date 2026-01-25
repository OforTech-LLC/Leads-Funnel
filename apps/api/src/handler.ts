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

function log(entry: Omit<LogEntry, 'timestamp'>): void {
  const fullEntry: LogEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  };
  // Structured JSON logging - never log PII (email, phone, IP)
  console.log(JSON.stringify(fullEntry));
}

// =============================================================================
// Lambda Handler
// =============================================================================

export async function handler(
  event: APIGatewayProxyEventV2,
  context: Context
): Promise<APIGatewayProxyResultV2> {
  const startTime = Date.now();
  const requestId = context.awsRequestId || 'local';

  // Handle OPTIONS preflight
  if (event.requestContext.http.method === 'OPTIONS') {
    return http.noContent();
  }

  // Only allow POST
  if (event.requestContext.http.method !== 'POST') {
    log({
      requestId,
      level: 'warn',
      message: 'Method not allowed',
      errorCode: 'METHOD_NOT_ALLOWED',
    });
    return http.methodNotAllowed();
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
    return http.internalError();
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
      return http.invalidJson(parseError);
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
      return http.validationError(validation.errors);
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
        return http.rateLimited();
      }
    } catch (error) {
      // Fail-closed: reject on rate limit errors for security
      log({
        requestId,
        level: 'error',
        message: 'Rate limit check failed',
        errorCode: 'RATE_LIMIT_ERROR',
      });
      return http.internalError();
    }

    // Generate lead ID for idempotency
    const { v4: uuidv4 } = await import('uuid');
    const leadId = uuidv4();
    const status = security.suspicious ? 'quarantined' : 'accepted';

    // Idempotency check
    const idempotency = await checkIdempotency(
      config,
      security.idempotencyKey,
      leadId,
      status
    );

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
      return http.ok(
        idempotency.existingLeadId!,
        idempotency.existingStatus!
      );
    }

    // Store lead
    const lead = await storeLead(config, normalizedLead, security, userAgent);

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
    });

    return http.created(lead.leadId, lead.status);
  } catch (error) {
    // Catch-all error handler - never expose stack traces
    log({
      requestId,
      level: 'error',
      message: 'Unhandled error',
      errorCode: 'INTERNAL_ERROR',
      latencyMs: getElapsedMs(startTime),
    });
    return http.internalError();
  }
}

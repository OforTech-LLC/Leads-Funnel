/**
 * Admin API Lambda Handler
 *
 * Handles all admin console API routes:
 * - GET  /admin/funnels - List available funnels
 * - POST /admin/query - Query leads with filters
 * - POST /admin/leads/update - Update single lead
 * - POST /admin/leads/bulk-update - Bulk update leads
 * - POST /admin/exports/create - Create export job
 * - GET  /admin/exports/status - Get export job status
 * - GET  /admin/exports/download - Get presigned download URL
 * - GET  /admin/stats - Get funnel statistics
 *
 * Security Features:
 * - JWT authentication with Cognito JWKS verification
 * - RBAC permission checks for write operations
 * - Rate limiting (per-user for queries, global for exports)
 * - Payload size limits to prevent DoS
 * - Request ID tracking for debugging and audit trails
 */

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import type {
  AdminConfig,
  AdminUser,
  LogEntry,
  QueryLeadsRequest,
  UpdateLeadRequest,
  BulkUpdateRequest,
  ExportRequest,
} from './types.js';
import { authenticateAdmin, extractClientIp, hasPermission } from './lib/auth.js';
import {
  queryLeads,
  updateLead,
  bulkUpdateLeads,
  getFunnelStats,
  listFunnels,
} from './lib/leads.js';
import { createExportJob, getExportJob, getDownloadUrl } from './lib/exports.js';
import {
  logViewLeads,
  logUpdateLead,
  logBulkUpdate,
  logCreateExport,
  logDownloadExport,
  logViewStats,
} from './lib/audit.js';
import * as http from './lib/http.js';
import { v4 as uuidv4 } from 'uuid';

// =============================================================================
// Security Constants
// =============================================================================

/**
 * Maximum payload size (10KB)
 *
 * Security: Prevents DoS attacks via large payloads that could exhaust
 * Lambda memory or cause timeouts during parsing. 10KB is sufficient
 * for all legitimate admin operations while blocking abuse.
 */
const MAX_PAYLOAD_SIZE = 10 * 1024; // 10KB in bytes

// =============================================================================
// Configuration
// =============================================================================

function loadConfig(): AdminConfig {
  return {
    awsRegion: process.env.AWS_REGION_NAME || process.env.AWS_REGION || 'us-east-1',
    env: (process.env.ENV as 'dev' | 'prod') || 'dev',
    projectName: process.env.PROJECT_NAME || 'kanjona',
    cognitoUserPoolId: process.env.COGNITO_USER_POOL_ID || '',
    cognitoClientId: process.env.COGNITO_CLIENT_ID || '',
    cognitoIssuer: process.env.COGNITO_ISSUER || '',
    allowedEmailsSsmPath: process.env.ALLOWED_EMAILS_SSM_PATH || '',
    featureFlagSsmPath: process.env.FEATURE_FLAG_SSM_PATH || '',
    ipAllowlistFlagPath: process.env.IP_ALLOWLIST_FLAG_PATH || '',
    ipAllowlistSsmPath: process.env.IP_ALLOWLIST_SSM_PATH || '',
    exportsBucket: process.env.EXPORTS_BUCKET || '',
    auditTable: process.env.AUDIT_TABLE || '',
    exportJobsTable: process.env.EXPORT_JOBS_TABLE || '',
    logLevel: (process.env.LOG_LEVEL as AdminConfig['logLevel']) || 'info',
  };
}

// =============================================================================
// Rate Limiting
// =============================================================================

/**
 * In-memory rate limit store (for single Lambda instance)
 *
 * Limitation: This only works within a single Lambda instance. Multiple
 * concurrent instances will have separate rate limit counters.
 *
 * Production Enhancement: Use DynamoDB or ElastiCache for distributed
 * rate limiting across all Lambda instances.
 */
interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Rate limit configuration
// Security: Different limits for different operations based on expected usage patterns
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window for queries
const RATE_LIMIT_QUERY_MAX = 100; // 100 queries/min - generous for normal admin work
const RATE_LIMIT_EXPORT_WINDOW_MS = 60 * 60 * 1000; // 1 hour window for exports
const RATE_LIMIT_EXPORT_MAX = 10; // 10 exports/hour - prevents data scraping

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number; // seconds until reset
}

/**
 * Check rate limit for a user/action combination
 *
 * Algorithm: Sliding window counter implementation
 * - Each key tracks request count and window start time
 * - When window expires, counter resets
 * - Requests within window increment counter
 *
 * Memory Management: Periodically cleans up old entries when map grows
 * too large to prevent memory leaks in long-running Lambda instances.
 */
function checkRateLimit(key: string, windowMs: number, maxRequests: number): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // Memory cleanup: Prevent unbounded growth in long-running instances
  // Triggers when map exceeds 10,000 entries (unlikely but defensive)
  if (rateLimitStore.size > 10000) {
    const cutoff = now - Math.max(RATE_LIMIT_WINDOW_MS, RATE_LIMIT_EXPORT_WINDOW_MS);
    for (const [k, v] of rateLimitStore) {
      if (v.windowStart < cutoff) {
        rateLimitStore.delete(k);
      }
    }
  }

  // New window or expired window - reset counter
  if (!entry || now - entry.windowStart > windowMs) {
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetIn: Math.ceil(windowMs / 1000),
    };
  }

  // Within existing window - increment and check
  entry.count++;
  const resetIn = Math.ceil((entry.windowStart + windowMs - now) / 1000);

  if (entry.count > maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetIn,
    };
  }

  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetIn,
  };
}

/**
 * Check query rate limit (100/min per user+IP)
 *
 * Security: Key combines user ID and IP to prevent:
 * - Single user overwhelming the system
 * - Shared accounts being used from multiple IPs for amplification
 */
function checkQueryRateLimit(userId: string, clientIp: string): RateLimitResult {
  const key = `query:${userId}:${clientIp}`;
  return checkRateLimit(key, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_QUERY_MAX);
}

/**
 * Check export rate limit (10/hour per user)
 *
 * Security: Stricter limit for exports because:
 * - Exports can contain large amounts of data
 * - Exports consume significant compute resources
 * - Excessive exports may indicate data exfiltration attempt
 */
function checkExportRateLimit(userId: string): RateLimitResult {
  const key = `export:${userId}`;
  return checkRateLimit(key, RATE_LIMIT_EXPORT_WINDOW_MS, RATE_LIMIT_EXPORT_MAX);
}

// =============================================================================
// Payload Size Validation
// =============================================================================

/**
 * Validate request body size
 *
 * Security: Prevents DoS attacks using large payloads that could:
 * - Exhaust Lambda memory during JSON parsing
 * - Cause timeouts during processing
 * - Inflate CloudWatch log costs
 *
 * Note: Uses Buffer.byteLength for accurate UTF-8 size calculation
 * (important for international characters that use multiple bytes).
 */
function checkPayloadSize(body: string | undefined): { valid: boolean; size: number } {
  if (!body) {
    return { valid: true, size: 0 };
  }

  // Calculate byte size (handles UTF-8 characters correctly)
  const size = Buffer.byteLength(body, 'utf8');

  return {
    valid: size <= MAX_PAYLOAD_SIZE,
    size,
  };
}

// =============================================================================
// Logging
// =============================================================================

interface LogParams {
  requestId: string;
  level: LogEntry['level'];
  message: string;
  userId?: string;
  action?: string;
  errorCode?: string;
  latencyMs?: number;
}

/**
 * Structured JSON logging for CloudWatch
 *
 * Format: JSON log entries for easy parsing and querying in CloudWatch Insights.
 * Includes request ID for correlation across distributed traces.
 */
function log(entry: LogParams): void {
  const fullEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    requestId: entry.requestId,
    level: entry.level,
    message: entry.message,
    userId: entry.userId,
    action: entry.action,
    errorCode: entry.errorCode,
    latencyMs: entry.latencyMs,
  };
  console.log(JSON.stringify(fullEntry));
}

// =============================================================================
// Request Parsing
// =============================================================================

function parseBody<T>(body: string | undefined): T | null {
  if (!body) return null;
  try {
    return JSON.parse(body) as T;
  } catch {
    return null;
  }
}

function getQueryParam(event: APIGatewayProxyEventV2, name: string): string | undefined {
  return event.queryStringParameters?.[name];
}

// =============================================================================
// Response Helpers with Request ID
// =============================================================================

/**
 * Add request ID header to response
 *
 * Debugging: Request ID allows tracing requests through:
 * - API Gateway logs
 * - Lambda logs
 * - Client-side error reporting
 * Makes debugging production issues significantly easier.
 */
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

/**
 * Rate limited response with Retry-After header
 *
 * HTTP Standard: 429 status code with Retry-After header tells clients
 * when they can retry, enabling proper backoff behavior.
 */
function rateLimitedResponse(requestId: string, resetIn: number): APIGatewayProxyResultV2 {
  return addRequestIdHeader(
    {
      statusCode: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(resetIn),
      },
      body: JSON.stringify({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please try again later.',
        },
      }),
    },
    requestId
  );
}

/**
 * Payload too large response
 *
 * HTTP Standard: 413 status code indicates the request entity is too large.
 */
function payloadTooLargeResponse(requestId: string): APIGatewayProxyResultV2 {
  return addRequestIdHeader(
    {
      statusCode: 413,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: `Request body exceeds maximum size of ${Math.round(MAX_PAYLOAD_SIZE / 1024)}KB`,
        },
      }),
    },
    requestId
  );
}

// =============================================================================
// Route Handlers
// =============================================================================

async function handleListFunnels(
  config: AdminConfig,
  _user: AdminUser
): Promise<APIGatewayProxyResultV2> {
  const funnels = await listFunnels(config);
  return http.ok({ funnels });
}

async function handleQueryLeads(
  config: AdminConfig,
  user: AdminUser,
  body: QueryLeadsRequest,
  clientIp: string,
  userAgent: string
): Promise<APIGatewayProxyResultV2> {
  if (!body.funnelId) {
    return http.badRequest('funnelId is required');
  }

  const result = await queryLeads(config, body);

  // Audit log for compliance - tracks who accessed what data
  await logViewLeads(
    config,
    user,
    body.funnelId,
    body as unknown as Record<string, unknown>,
    result.totalCount,
    clientIp,
    userAgent
  );

  return http.ok(result);
}

async function handleUpdateLead(
  config: AdminConfig,
  user: AdminUser,
  body: UpdateLeadRequest,
  clientIp: string,
  userAgent: string
): Promise<APIGatewayProxyResultV2> {
  // RBAC: Only Admin role can modify data
  if (!hasPermission(user, 'write')) {
    return http.forbidden('Insufficient permissions', 'PERMISSION_DENIED');
  }

  if (!body.funnelId || !body.leadId) {
    return http.badRequest('funnelId and leadId are required');
  }

  const updated = await updateLead(config, body);

  // Audit log for compliance - tracks all data modifications
  await logUpdateLead(
    config,
    user,
    body.funnelId,
    body.leadId,
    body as unknown as Record<string, unknown>,
    clientIp,
    userAgent
  );

  return http.ok({ lead: updated });
}

async function handleBulkUpdate(
  config: AdminConfig,
  user: AdminUser,
  body: BulkUpdateRequest,
  clientIp: string,
  userAgent: string
): Promise<APIGatewayProxyResultV2> {
  // RBAC: Only Admin role can modify data
  if (!hasPermission(user, 'write')) {
    return http.forbidden('Insufficient permissions', 'PERMISSION_DENIED');
  }

  if (!body.funnelId || !body.leadIds || body.leadIds.length === 0) {
    return http.badRequest('funnelId and leadIds are required');
  }

  // Security: Limit bulk operations to prevent abuse
  // 100 leads per request balances usability with resource protection
  if (body.leadIds.length > 100) {
    return http.badRequest('Maximum 100 leads per bulk update');
  }

  const result = await bulkUpdateLeads(config, body);

  // Audit log for compliance - tracks bulk modifications
  await logBulkUpdate(
    config,
    user,
    body.funnelId,
    body.leadIds,
    body as unknown as Record<string, unknown>,
    clientIp,
    userAgent
  );

  return http.ok(result);
}

async function handleCreateExport(
  config: AdminConfig,
  user: AdminUser,
  body: ExportRequest,
  clientIp: string,
  userAgent: string,
  requestId: string
): Promise<APIGatewayProxyResultV2> {
  // RBAC: Both Admin and Viewer can export (read-only operation)
  if (!hasPermission(user, 'export')) {
    return http.forbidden('Insufficient permissions', 'PERMISSION_DENIED');
  }

  // Stricter rate limit for exports to prevent data scraping
  const rateLimit = checkExportRateLimit(user.sub);
  if (!rateLimit.allowed) {
    log({
      requestId,
      level: 'warn',
      message: 'Export rate limited',
      userId: user.sub,
      errorCode: 'RATE_LIMITED',
    });
    return rateLimitedResponse(requestId, rateLimit.resetIn);
  }

  if (!body.funnelId || !body.format) {
    return http.badRequest('funnelId and format are required');
  }

  // Security: Whitelist allowed formats to prevent path traversal
  // or other injection attacks via format parameter
  const validFormats = ['csv', 'xlsx', 'pdf', 'docx', 'json'];
  if (!validFormats.includes(body.format)) {
    return http.badRequest(`Invalid format. Supported: ${validFormats.join(', ')}`);
  }

  const job = await createExportJob(config, user, body);

  // Audit log for compliance - tracks all data exports
  await logCreateExport(
    config,
    user,
    body.funnelId,
    job.jobId,
    body.format,
    body as unknown as Record<string, unknown>,
    clientIp,
    userAgent
  );

  return http.created({ job });
}

async function handleExportStatus(
  config: AdminConfig,
  user: AdminUser,
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  const jobId = getQueryParam(event, 'jobId');
  if (!jobId) {
    return http.badRequest('jobId query parameter is required');
  }

  // Security: getExportJob filters by user.sub to prevent accessing other users' exports
  const job = await getExportJob(config, user.sub, jobId);
  if (!job) {
    return http.notFound('Export job not found');
  }

  return http.ok({ job });
}

async function handleExportDownload(
  config: AdminConfig,
  user: AdminUser,
  event: APIGatewayProxyEventV2,
  clientIp: string,
  userAgent: string
): Promise<APIGatewayProxyResultV2> {
  const jobId = getQueryParam(event, 'jobId');
  if (!jobId) {
    return http.badRequest('jobId query parameter is required');
  }

  // Security: getExportJob filters by user.sub to prevent accessing other users' exports
  const job = await getExportJob(config, user.sub, jobId);
  if (!job) {
    return http.notFound('Export job not found');
  }

  if (job.status !== 'completed') {
    return http.badRequest('Export is not ready for download');
  }

  // Security: Presigned URL has 1 hour expiry - limits exposure window
  const downloadUrl = await getDownloadUrl(config, job);

  // Audit log for compliance - tracks all data downloads
  await logDownloadExport(config, user, jobId, job.funnelId, clientIp, userAgent);

  return http.ok({ downloadUrl, expiresIn: 3600 });
}

async function handleGetStats(
  config: AdminConfig,
  user: AdminUser,
  event: APIGatewayProxyEventV2,
  clientIp: string,
  userAgent: string
): Promise<APIGatewayProxyResultV2> {
  const funnelId = getQueryParam(event, 'funnelId');
  if (!funnelId) {
    return http.badRequest('funnelId query parameter is required');
  }

  const stats = await getFunnelStats(config, funnelId);

  // Audit log for compliance - tracks dashboard access
  await logViewStats(config, user, funnelId, clientIp, userAgent);

  return http.ok({ stats });
}

// =============================================================================
// Main Handler
// =============================================================================

/**
 * Lambda entry point for admin API requests
 *
 * Request Processing Flow:
 * 1. Generate/extract request ID for tracing
 * 2. Handle CORS preflight (OPTIONS)
 * 3. Validate payload size (DoS protection)
 * 4. Extract client info (IP, User-Agent)
 * 5. Authenticate user (JWT verification)
 * 6. Check rate limits
 * 7. Route to appropriate handler
 * 8. Add request ID to response
 *
 * Error Handling: All unhandled exceptions return 500 with request ID
 * for debugging. Internal error details are never exposed to clients.
 */
export async function handler(
  event: APIGatewayProxyEventV2,
  context: Context
): Promise<APIGatewayProxyResultV2> {
  const startTime = Date.now();

  // Request ID for distributed tracing
  // Uses Lambda's built-in request ID when available, falls back to UUID
  const requestId = context.awsRequestId || uuidv4();
  const config = loadConfig();

  // Handle OPTIONS preflight for CORS
  if (event.requestContext.http.method === 'OPTIONS') {
    return addRequestIdHeader(http.noContent(), requestId);
  }

  // Extract route info for routing
  const method = event.requestContext.http.method;
  const path = event.requestContext.http.path;
  const routeKey = `${method} ${path}`;

  // Security: Check payload size BEFORE any processing
  // Prevents resource exhaustion from large payloads
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    const payloadCheck = checkPayloadSize(event.body);
    if (!payloadCheck.valid) {
      log({
        requestId,
        level: 'warn',
        message: 'Payload too large',
        errorCode: 'PAYLOAD_TOO_LARGE',
      });
      return payloadTooLargeResponse(requestId);
    }
  }

  // Extract client info for logging and rate limiting
  const headers = event.headers || {};
  const clientIp = extractClientIp(headers, event.requestContext?.http?.sourceIp);
  const userAgent = headers['user-agent'] || headers['User-Agent'] || 'unknown';
  const authHeader = headers['authorization'] || headers['Authorization'];

  log({
    requestId,
    level: 'info',
    message: 'Admin request received',
  });

  try {
    // Authentication: Verify JWT with Cognito JWKS
    const authResult = await authenticateAdmin(authHeader, clientIp, config);
    if (!authResult.success) {
      log({
        requestId,
        level: 'warn',
        message: 'Authentication failed',
        errorCode: authResult.errorCode,
        latencyMs: Date.now() - startTime,
      });
      return addRequestIdHeader(
        http.unauthorized(authResult.error || 'Authentication failed', authResult.errorCode),
        requestId
      );
    }

    const user = authResult.user!;

    log({
      requestId,
      level: 'info',
      message: 'User authenticated',
      userId: user.sub,
    });

    // Rate limiting: Check query rate limit for all routes except exports
    // Exports have their own stricter limit checked in the handler
    if (!routeKey.includes('/exports/create')) {
      const rateLimit = checkQueryRateLimit(user.sub, clientIp);
      if (!rateLimit.allowed) {
        log({
          requestId,
          level: 'warn',
          message: 'Rate limited',
          userId: user.sub,
          errorCode: 'RATE_LIMITED',
          latencyMs: Date.now() - startTime,
        });
        return rateLimitedResponse(requestId, rateLimit.resetIn);
      }
    }

    // Route to appropriate handler based on method and path
    let response: APIGatewayProxyResultV2;

    switch (routeKey) {
      case 'GET /admin/funnels':
        response = await handleListFunnels(config, user);
        break;

      case 'POST /admin/query': {
        const body = parseBody<QueryLeadsRequest>(event.body);
        if (!body) {
          response = http.badRequest('Invalid request body');
        } else {
          response = await handleQueryLeads(config, user, body, clientIp, userAgent);
        }
        break;
      }

      case 'POST /admin/leads/update': {
        const body = parseBody<UpdateLeadRequest>(event.body);
        if (!body) {
          response = http.badRequest('Invalid request body');
        } else {
          response = await handleUpdateLead(config, user, body, clientIp, userAgent);
        }
        break;
      }

      case 'POST /admin/leads/bulk-update': {
        const body = parseBody<BulkUpdateRequest>(event.body);
        if (!body) {
          response = http.badRequest('Invalid request body');
        } else {
          response = await handleBulkUpdate(config, user, body, clientIp, userAgent);
        }
        break;
      }

      case 'POST /admin/exports/create': {
        const body = parseBody<ExportRequest>(event.body);
        if (!body) {
          response = http.badRequest('Invalid request body');
        } else {
          response = await handleCreateExport(config, user, body, clientIp, userAgent, requestId);
        }
        break;
      }

      case 'GET /admin/exports/status':
        response = await handleExportStatus(config, user, event);
        break;

      case 'GET /admin/exports/download':
        response = await handleExportDownload(config, user, event, clientIp, userAgent);
        break;

      case 'GET /admin/stats':
        response = await handleGetStats(config, user, event, clientIp, userAgent);
        break;

      default:
        response = http.notFound('Route not found');
    }

    // Add request ID to response for client-side correlation
    response = addRequestIdHeader(response, requestId);

    log({
      requestId,
      level: 'info',
      message: 'Request completed',
      userId: user.sub,
      latencyMs: Date.now() - startTime,
    });

    return response;
  } catch (error) {
    // Security: Never expose internal error details to clients
    // Log full error for debugging, return generic message
    log({
      requestId,
      level: 'error',
      message: 'Unhandled error',
      errorCode: 'INTERNAL_ERROR',
      latencyMs: Date.now() - startTime,
    });
    return addRequestIdHeader(http.internalError(), requestId);
  }
}

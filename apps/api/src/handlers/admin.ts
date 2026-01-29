/**
 * Admin API Handler
 *
 * Handles all /admin/* endpoints. Requires admin JWT authentication
 * and checks the enable_admin_console feature flag.
 *
 * Performance:
 *   - X-Request-Id header injected on every response for distributed tracing
 *   - All DynamoDB/S3/SSM calls use centralized clients with HTTP keep-alive
 *   - 1 MB body size limit enforced before JSON parsing (Issue #1)
 *
 * Endpoints:
 *   POST/GET/PUT/DELETE /admin/orgs
 *   POST/GET/PUT/DELETE /admin/users
 *   POST/PUT/DELETE/GET /admin/orgs/:orgId/members
 *   POST/GET/PUT/DELETE /admin/rules
 *   POST /admin/rules/test
 *   POST /admin/rules/bulk-create
 *   POST /admin/leads/query
 *   GET/PUT /admin/leads/:funnelId/:leadId
 *   POST /admin/leads/:funnelId/:leadId/reassign
 *   POST /admin/leads/bulk-update
 *   POST /admin/leads/bulk-import
 *   GET /admin/notifications
 *   POST/GET /admin/exports
 *   GET /admin/exports/:exportId/download
 *   POST/GET/PUT/DELETE /admin/webhooks
 *   GET /admin/webhooks/:id/deliveries
 *   POST /admin/webhooks/:id/test
 *   GET /admin/analytics/overview
 *   GET /admin/analytics/funnels
 *   GET /admin/analytics/orgs
 *   GET /admin/analytics/trends
 *   GET /admin/analytics/lead-sources
 *   POST /admin/gdpr/erasure
 *   GET /admin/gdpr/export/:emailHash
 */

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { authenticateAdmin, AuthError } from '../lib/auth/admin-auth.js';
import { canAdminWrite } from '../lib/auth/permissions.js';
import { recordAudit } from '../lib/db/audit.js';
import * as orgsDb from '../lib/db/orgs.js';
import * as usersDb from '../lib/db/users.js';
import * as membershipsDb from '../lib/db/memberships.js';
import * as rulesDb from '../lib/db/rules.js';
import * as leadsDb from '../lib/db/leads.js';
import * as notificationsDb from '../lib/db/notifications.js';
import * as exportsDb from '../lib/db/exports.js';
import { createPortalUser } from '../lib/cognito/portal-users.js';
import * as resp from '../lib/response.js';
import { matchLeadToRule } from '../lib/assignment/matcher.js';
import { getPresignedDownloadUrl } from '../lib/storage/s3.js';
import { parseBody, pathParam, queryParam, getIpHash } from '../lib/handler-utils.js';
import { createLogger } from '../lib/logging.js';
import { ValidationError } from '../lib/errors.js';
import { isFeatureEnabled } from '../lib/config.js';
import { getAllFlags, updateFeatureFlag, FeatureFlagName } from '../lib/feature-flags.js';
import { handleWebhookRoutes } from '../lib/webhooks/handler.js';
import { emitLeadStatusChanged } from '../lib/events.js';
import * as analytics from '../lib/analytics/aggregator.js';
import { LEAD_STATUSES } from '@kanjona/shared';
import { PutCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { getDocClient } from '../lib/db/client.js';
import { getExportsTableName, getPlatformLeadsTableName } from '../lib/db/table-names.js';
import { ulid } from '../lib/id.js';
import {
  MAX_BODY_SIZE,
  DB_PREFIXES,
  DB_SORT_KEYS,
  HTTP_HEADERS,
  HTTP_STATUS,
  ACTOR_TYPES,
  VALID_MEMBERSHIP_ROLES as VALID_ROLES_LIST,
  VALID_GRANULARITIES,
  ANALYTICS_GRANULARITY,
} from '../lib/constants.js';

const log = createLogger('admin-handler');

// ---------------------------------------------------------------------------
// Validation constants
// ---------------------------------------------------------------------------

const VALID_MEMBERSHIP_ROLES: readonly string[] = VALID_ROLES_LIST;

const VALID_LEAD_STATUSES: leadsDb.LeadStatus[] = [...LEAD_STATUSES];

const BULK_UPDATE_MAX = 100;

type PortalUserRole = 'admin' | 'manager' | 'agent';

function normalizeEmail(raw: unknown): string {
  return typeof raw === 'string' ? raw.toLowerCase().trim() : '';
}

function isValidEmail(email: string): boolean {
  return email.length > 3 && email.includes('@') && email.includes('.');
}

function slugifyOrgName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function isValidOrgSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

function normalizePortalRole(role: unknown): PortalUserRole {
  if (role === 'admin' || role === 'manager' || role === 'agent') return role;
  return 'agent';
}

function mapPortalRoleToMembership(role: PortalUserRole): membershipsDb.MembershipRole {
  if (role === 'admin' || role === 'manager') return 'MANAGER';
  return 'AGENT';
}

type AdminPipelineStatus =
  | 'none'
  | 'nurturing'
  | 'negotiating'
  | 'closing'
  | 'closed_won'
  | 'closed_lost';

function mapStatusToPipeline(status: leadsDb.LeadStatus): AdminPipelineStatus {
  switch (status) {
    case 'won':
      return 'closed_won';
    case 'lost':
    case 'dnc':
    case 'quarantined':
      return 'closed_lost';
    case 'booked':
    case 'converted':
      return 'closing';
    case 'qualified':
    case 'contacted':
      return 'negotiating';
    default:
      return 'nurturing';
  }
}

type AdminMemberRole = 'owner' | 'admin' | 'member';

function mapMembershipRoleToAdmin(role: membershipsDb.MembershipRole): AdminMemberRole {
  switch (role) {
    case 'ORG_OWNER':
      return 'owner';
    case 'MANAGER':
      return 'admin';
    case 'AGENT':
    case 'VIEWER':
    default:
      return 'member';
  }
}

function mapAdminRoleToMembership(role: string): membershipsDb.MembershipRole | null {
  switch (role) {
    case 'owner':
      return 'ORG_OWNER';
    case 'admin':
      return 'MANAGER';
    case 'member':
      return 'AGENT';
    default:
      return VALID_MEMBERSHIP_ROLES.includes(role) ? (role as membershipsDb.MembershipRole) : null;
  }
}

function mapPipelineToStatus(status?: AdminPipelineStatus): leadsDb.LeadStatus | undefined {
  switch (status) {
    case 'closed_won':
      return 'won';
    case 'closed_lost':
      return 'lost';
    case 'closing':
      return 'booked';
    case 'negotiating':
      return 'qualified';
    case 'nurturing':
      return 'contacted';
    default:
      return undefined;
  }
}

type AdminRuleShape = {
  ruleId: string;
  name: string;
  priority: number;
  funnels: string[];
  zipCodes: string[];
  targetOrgId: string;
  targetOrgName: string;
  targetUserId?: string;
  targetUserName?: string;
  active: boolean;
  dailyCap?: number;
  monthlyCap?: number;
  currentDailyCount: number;
  currentMonthlyCount: number;
  matchedLeadsCount: number;
  createdAt: string;
  updatedAt: string;
  description?: string;
};

async function mapAdminRule(
  rule: rulesDb.AssignmentRule,
  orgCache: Map<string, orgsDb.Org | null>,
  userCache: Map<string, usersDb.User | null>
): Promise<AdminRuleShape> {
  if (!orgCache.has(rule.orgId)) {
    orgCache.set(rule.orgId, await orgsDb.getOrg(rule.orgId));
  }
  const orgName = orgCache.get(rule.orgId)?.name || rule.orgId;

  let targetUserName: string | undefined;
  if (rule.targetUserId) {
    if (!userCache.has(rule.targetUserId)) {
      userCache.set(rule.targetUserId, await usersDb.getUser(rule.targetUserId));
    }
    targetUserName = userCache.get(rule.targetUserId)?.name;
  }

  const funnels = rule.funnelId && rule.funnelId !== '*' ? [rule.funnelId] : [];
  const zipCodes = rule.zipPatterns || [];

  return {
    ruleId: rule.ruleId,
    name: rule.name,
    priority: rule.priority,
    funnels,
    zipCodes,
    targetOrgId: rule.orgId,
    targetOrgName: orgName,
    targetUserId: rule.targetUserId,
    targetUserName,
    active: rule.isActive,
    dailyCap: rule.dailyCap,
    monthlyCap: rule.monthlyCap,
    currentDailyCount: 0,
    currentMonthlyCount: 0,
    matchedLeadsCount: 0,
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt,
    description: rule.description,
  };
}

async function mapAdminRules(rules: rulesDb.AssignmentRule[]): Promise<AdminRuleShape[]> {
  const orgCache = new Map<string, orgsDb.Org | null>();
  const userCache = new Map<string, usersDb.User | null>();

  return Promise.all(rules.map((rule) => mapAdminRule(rule, orgCache, userCache)));
}

async function mapAdminLeads(leads: leadsDb.PlatformLead[]): Promise<
  Array<{
    leadId: string;
    funnelId: string;
    name: string;
    email: string;
    phone?: string;
    status: leadsDb.LeadStatus;
    pipelineStatus: AdminPipelineStatus;
    tags: string[];
    notes: string;
    doNotContact: boolean;
    assignedOrgId?: string;
    assignedOrgName?: string;
    assignedUserId?: string;
    assignedUserName?: string;
    zipCode?: string;
    qualityScore?: number;
    createdAt: string;
    updatedAt: string;
  }>
> {
  const orgCache = new Map<string, orgsDb.Org | null>();
  const userCache = new Map<string, usersDb.User | null>();

  return Promise.all(
    leads.map(async (lead) => {
      let assignedOrgName: string | undefined;
      if (lead.orgId) {
        if (!orgCache.has(lead.orgId)) {
          orgCache.set(lead.orgId, await orgsDb.getOrg(lead.orgId));
        }
        assignedOrgName = orgCache.get(lead.orgId)?.name;
      }

      let assignedUserName: string | undefined;
      if (lead.assignedUserId) {
        if (!userCache.has(lead.assignedUserId)) {
          userCache.set(lead.assignedUserId, await usersDb.getUser(lead.assignedUserId));
        }
        assignedUserName = userCache.get(lead.assignedUserId)?.name;
      }

      return {
        leadId: lead.leadId,
        funnelId: lead.funnelId,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        status: lead.status,
        pipelineStatus: mapStatusToPipeline(lead.status),
        tags: lead.tags || [],
        notes: (lead.notes || []).join('\n'),
        doNotContact: lead.status === 'dnc',
        assignedOrgId: lead.orgId,
        assignedOrgName,
        assignedUserId: lead.assignedUserId,
        assignedUserName,
        zipCode: lead.zipCode,
        qualityScore: lead.score,
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt,
      };
    })
  );
}

function mapExportJob(job: exportsDb.ExportJob): {
  jobId: string;
  funnelId?: string;
  format: exportsDb.ExportFormat;
  status: exportsDb.ExportStatus;
  recordCount?: number;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
  expiresAt: string;
} {
  return {
    jobId: job.exportId,
    funnelId: job.funnelId,
    format: job.format,
    status: job.status,
    recordCount: job.recordCount,
    errorMessage: job.errorMessage,
    createdAt: job.createdAt,
    completedAt: job.completedAt,
    expiresAt: job.expiresAt,
  };
}

const MAX_STATS_PAGES = 10;
const MAX_STATS_LEADS = 1000;

async function collectFunnelLeads(funnelId: string): Promise<leadsDb.PlatformLead[]> {
  const leads: leadsDb.PlatformLead[] = [];
  let cursor: string | undefined;
  let pages = 0;

  do {
    const result = await leadsDb.queryLeads({
      funnelId,
      cursor,
      limit: 100,
    });
    leads.push(...result.items);
    cursor = result.nextCursor;
    pages++;
  } while (cursor && pages < MAX_STATS_PAGES && leads.length < MAX_STATS_LEADS);

  return leads;
}

function buildFunnelStats(
  funnelId: string,
  leads: leadsDb.PlatformLead[]
): {
  funnelId: string;
  totalLeads: number;
  byStatus: Record<leadsDb.LeadStatus, number>;
  byPipelineStatus: Record<AdminPipelineStatus, number>;
  last24Hours: number;
  last7Days: number;
  last30Days: number;
} {
  const byStatus = VALID_LEAD_STATUSES.reduce(
    (acc, status) => ({ ...acc, [status]: 0 }),
    {} as Record<leadsDb.LeadStatus, number>
  );
  const byPipelineStatus: Record<AdminPipelineStatus, number> = {
    none: 0,
    nurturing: 0,
    negotiating: 0,
    closing: 0,
    closed_won: 0,
    closed_lost: 0,
  };

  const now = Date.now();
  let last24Hours = 0;
  let last7Days = 0;
  let last30Days = 0;

  leads.forEach((lead) => {
    byStatus[lead.status] = (byStatus[lead.status] || 0) + 1;
    const pipeline = mapStatusToPipeline(lead.status);
    byPipelineStatus[pipeline] = (byPipelineStatus[pipeline] || 0) + 1;

    const createdAt = new Date(lead.createdAt).getTime();
    const diffHours = (now - createdAt) / (1000 * 60 * 60);
    if (diffHours <= 24) last24Hours++;
    if (diffHours <= 24 * 7) last7Days++;
    if (diffHours <= 24 * 30) last30Days++;
  });

  return {
    funnelId,
    totalLeads: leads.length,
    byStatus,
    byPipelineStatus,
    last24Hours,
    last7Days,
    last30Days,
  };
}

async function collectRecentLeadsAcrossFunnels(
  funnelIds: string[],
  limit = 10
): Promise<leadsDb.PlatformLead[]> {
  if (funnelIds.length === 0) return [];
  const perFunnel = Math.max(1, Math.ceil(limit / funnelIds.length));

  const results = await Promise.all(
    funnelIds.map((funnelId) =>
      leadsDb.queryLeads({
        funnelId,
        limit: perFunnel,
      })
    )
  );

  const combined = results.flatMap((result) => result.items);
  combined.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return combined.slice(0, limit);
}

// ---------------------------------------------------------------------------
// Body size check (Issue #1)
// ---------------------------------------------------------------------------

/**
 * Reject request bodies larger than MAX_BODY_SIZE (1 MB).
 *
 * Returns a 413 Payload Too Large response if the body exceeds the limit,
 * or null if the body is within bounds.  GET / DELETE / OPTIONS requests
 * are exempt (they should not carry a body).
 */
function checkBodySize(
  event: APIGatewayProxyEventV2,
  requestOrigin?: string
): APIGatewayProxyResultV2 | null {
  const method = event.requestContext.http.method;
  if (method === 'GET' || method === 'DELETE' || method === 'OPTIONS') return null;

  const body = event.body;
  if (!body) return null;

  const byteSize = Buffer.byteLength(body, 'utf8');
  if (byteSize > MAX_BODY_SIZE) {
    log.warn('admin.bodyTooLarge', { size: byteSize, limit: MAX_BODY_SIZE });
    return resp.payloadTooLarge(requestOrigin);
  }
  return null;
}

// ---------------------------------------------------------------------------
// X-Request-Id injection wrapper
// ---------------------------------------------------------------------------

/**
 * Inject the X-Request-Id header into any API Gateway response.
 * Uses the API Gateway request ID for end-to-end distributed tracing.
 */
function injectRequestId(
  response: APIGatewayProxyResultV2,
  requestId: string
): APIGatewayProxyResultV2 {
  if (typeof response === 'string') return response;
  const headers = (response.headers || {}) as Record<string, string>;
  return {
    ...response,
    headers: {
      ...headers,
      [HTTP_HEADERS.X_REQUEST_ID]: requestId,
    },
  };
}

// ---------------------------------------------------------------------------
// Main Handler (exported)
// ---------------------------------------------------------------------------

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const requestId = event.requestContext.requestId || '';
  const result = await handleAdminRequest(event);
  return injectRequestId(result, requestId);
}

// ---------------------------------------------------------------------------
// Admin request routing
// ---------------------------------------------------------------------------

async function handleAdminRequest(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const method = event.requestContext.http.method;
  const path = event.requestContext.http.path;
  const requestOrigin = event.headers?.origin || event.headers?.Origin;

  if (method === 'OPTIONS') {
    return resp.noContent(requestOrigin);
  }

  // Issue #1: Enforce 1 MB body size limit before any processing
  const sizeCheck = checkBodySize(event, requestOrigin);
  if (sizeCheck) return sizeCheck;

  // Authenticate
  let admin;
  try {
    admin = await authenticateAdmin(event);
  } catch (err) {
    if (err instanceof AuthError) {
      return resp.error('AUTH_ERROR', err.message, err.statusCode, undefined, requestOrigin);
    }
    return resp.unauthorized(undefined, requestOrigin);
  }

  // Strip /admin prefix for routing
  const subpath = path.replace(/^\/admin/, '');
  const canWrite = canAdminWrite(admin.role);

  try {
    // ---- WEBHOOKS (feature-flagged) ----
    if (subpath.startsWith('/webhooks')) {
      const webhooksEnabled = await isFeatureEnabled('webhooks_enabled');
      if (!webhooksEnabled) return resp.notFound('Endpoint not found', requestOrigin);
      const result = await handleWebhookRoutes(event, subpath, method, canWrite, requestOrigin);
      if (result) return result;
    }

    // ---- FEATURE FLAGS ----
    if (subpath === '/flags' && method === 'GET') {
      const flags = await getAllFlags();
      return resp.success(flags, undefined, requestOrigin);
    }

    if (subpath === '/flags' && method === 'PATCH') {
      if (!canWrite) return resp.forbidden(undefined, requestOrigin);
      const body = parseBody(event);
      if (body === null) return resp.badRequest('Invalid JSON in request body', requestOrigin);

      const { flag, enabled } = body;
      if (!flag || typeof enabled !== 'boolean') {
        return resp.badRequest('flag (string) and enabled (boolean) are required', requestOrigin);
      }

      try {
        await updateFeatureFlag(flag as FeatureFlagName, enabled);

        await recordAudit({
          actorId: admin.emailHash,
          actorType: ACTOR_TYPES.ADMIN,
          action: 'flag.update',
          resourceType: 'system',
          resourceId: flag as string,
          details: { newValue: enabled },
          ipHash: getIpHash(event),
        });

        return resp.success({ success: true }, undefined, requestOrigin);
      } catch (err) {
        log.error('flag.update.error', { error: err });
        return resp.internalError(requestOrigin);
      }
    }

    // ---- SETTINGS (read-only) ----
    if (subpath === '/settings' && method === 'GET') {
      if (!canWrite) return resp.forbidden(undefined, requestOrigin);
      const featureFlags = await getAllFlags();
      const config = {
        environment: process.env.ENVIRONMENT || process.env.ENV || '',
        projectName: process.env.PROJECT_NAME || '',
        apiBaseUrl: process.env.API_BASE_URL || '',
      };
      return resp.success({ featureFlags, config }, undefined, requestOrigin);
    }

    // ---- ANALYTICS ----
    if (subpath.startsWith('/analytics/')) {
      return await handleAnalyticsRoutes(event, subpath, method, requestOrigin);
    }

    // ---- GDPR ----
    if (subpath.startsWith('/gdpr/')) {
      return await handleGdprRoutes(
        event,
        subpath,
        method,
        canWrite,
        admin.emailHash,
        requestOrigin
      );
    }

    // ---- ORGS ----
    if (subpath === '/orgs' && method === 'POST') {
      if (!canWrite) return resp.forbidden(undefined, requestOrigin);
      const body = parseBody(event);
      if (body === null) return resp.badRequest('Invalid JSON in request body', requestOrigin);
      if (!body.name || !body.slug || !body.contactEmail) {
        return resp.badRequest('name, slug, and contactEmail are required', requestOrigin);
      }
      const org = await orgsDb.createOrg({
        name: body.name as string,
        slug: body.slug as string,
        contactEmail: body.contactEmail as string,
        phone: body.phone as string | undefined,
        timezone: body.timezone as string | undefined,
        notifyEmails: body.notifyEmails as string[] | undefined,
        notifySms: body.notifySms as string[] | undefined,
        settings: body.settings as Record<string, unknown> | undefined,
      });
      await recordAudit({
        actorId: admin.emailHash,
        actorType: ACTOR_TYPES.ADMIN,
        action: 'org.create',
        resourceType: 'org',
        resourceId: org.orgId,
        ipHash: getIpHash(event),
      });
      return resp.created(org, requestOrigin);
    }

    if (subpath === '/orgs' && method === 'GET') {
      const result = await orgsDb.listOrgs(
        queryParam(event, 'cursor'),
        Number(queryParam(event, 'limit')) || 25,
        queryParam(event, 'search') || undefined
      );
      return resp.success(
        {
          orgs: result.items,
          total: result.items.length,
          nextToken: result.nextCursor,
        },
        undefined,
        requestOrigin
      );
    }

    if (/^\/orgs\/[^/]+$/.test(subpath) && method === 'GET') {
      const orgId = pathParam(event, 2); // admin/orgs/<orgId>
      const org = await orgsDb.getOrg(orgId);
      if (!org) return resp.notFound('Organization not found', requestOrigin);
      return resp.success(org, undefined, requestOrigin);
    }

    if (/^\/orgs\/[^/]+$/.test(subpath) && method === 'PUT') {
      if (!canWrite) return resp.forbidden(undefined, requestOrigin);
      const orgId = pathParam(event, 2);
      const body = parseBody(event);
      if (body === null) return resp.badRequest('Invalid JSON in request body', requestOrigin);
      const updated = await orgsDb.updateOrg({
        orgId,
        name: body.name as string | undefined,
        slug: body.slug as string | undefined,
        contactEmail: body.contactEmail as string | undefined,
        phone: body.phone as string | undefined,
        timezone: body.timezone as string | undefined,
        notifyEmails: body.notifyEmails as string[] | undefined,
        notifySms: body.notifySms as string[] | undefined,
        settings: body.settings as Record<string, unknown> | undefined,
      });
      // Fix 9: Sanitize audit log - only log field names, not raw body values
      await recordAudit({
        actorId: admin.emailHash,
        actorType: ACTOR_TYPES.ADMIN,
        action: 'org.update',
        resourceType: 'org',
        resourceId: orgId,
        details: { updatedFields: Object.keys(body) },
        ipHash: getIpHash(event),
      });
      return resp.success(updated, undefined, requestOrigin);
    }

    if (/^\/orgs\/[^/]+$/.test(subpath) && method === 'DELETE') {
      if (!canWrite) return resp.forbidden(undefined, requestOrigin);
      const orgId = pathParam(event, 2);
      await orgsDb.softDeleteOrg(orgId);
      await recordAudit({
        actorId: admin.emailHash,
        actorType: ACTOR_TYPES.ADMIN,
        action: 'org.delete',
        resourceType: 'org',
        resourceId: orgId,
        ipHash: getIpHash(event),
      });
      return resp.noContent(requestOrigin);
    }

    // ---- USERS ----
    if (subpath === '/users' && method === 'POST') {
      if (!canWrite) return resp.forbidden(undefined, requestOrigin);
      const body = parseBody(event);
      if (body === null) return resp.badRequest('Invalid JSON in request body', requestOrigin);
      const email = normalizeEmail(body.email);
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (!email || !isValidEmail(email) || !name) {
        return resp.badRequest('Valid email and name are required', requestOrigin);
      }

      const userType = body.userType === 'portal' ? 'portal' : 'platform';

      if (userType === 'portal') {
        const portalEnabled = await isFeatureEnabled('enable_portal');
        if (!portalEnabled) return resp.notFound('Endpoint not found', requestOrigin);

        const existing = await usersDb.getUserByEmail(email);
        if (existing) return resp.conflict('User already exists', requestOrigin);

        const createOrg = body.createOrg === true;
        const orgIdInput = typeof body.orgId === 'string' ? body.orgId.trim() : '';
        const orgName = typeof body.orgName === 'string' ? body.orgName.trim() : '';
        const orgSlugInput =
          typeof body.orgSlug === 'string' ? body.orgSlug.trim().toLowerCase() : '';
        let createdOrg: orgsDb.Org | null = null;
        let resolvedOrgId = orgIdInput;

        if (createOrg) {
          if (!orgName) {
            return resp.badRequest('orgName is required to create org', requestOrigin);
          }
          const slug = orgSlugInput || slugifyOrgName(orgName);
          if (!slug || !isValidOrgSlug(slug)) {
            return resp.badRequest('orgSlug is invalid', requestOrigin);
          }
          createdOrg = await orgsDb.createOrg({
            name: orgName,
            slug,
            contactEmail: email,
          });
          resolvedOrgId = createdOrg.orgId;
        } else {
          if (!resolvedOrgId) {
            return resp.badRequest('orgId is required for portal users', requestOrigin);
          }
          const org = await orgsDb.getOrg(resolvedOrgId);
          if (!org) return resp.notFound('Organization not found', requestOrigin);
        }

        const portalRoleInput = normalizePortalRole(body.portalRole);
        const portalRole: PortalUserRole = createOrg ? 'admin' : portalRoleInput;
        const membershipRole: membershipsDb.MembershipRole = createOrg
          ? 'ORG_OWNER'
          : mapPortalRoleToMembership(portalRole);
        let cognitoSub = '';
        try {
          const created = await createPortalUser({ email, name });
          cognitoSub = created.cognitoSub;
        } catch (err) {
          const errorName = err instanceof Error ? err.name : 'UnknownError';
          if (createdOrg) {
            await orgsDb.softDeleteOrg(createdOrg.orgId);
          }
          if (errorName === 'UsernameExistsException') {
            return resp.conflict('User already exists in portal user pool', requestOrigin);
          }
          log.error('admin.portalUser.create.failed', { error: err });
          return resp.internalError(requestOrigin);
        }

        let user: usersDb.User;
        try {
          user = await usersDb.createUser({
            email,
            name,
            cognitoSub,
            phone: body.phone as string | undefined,
            avatarUrl: body.avatarUrl as string | undefined,
            preferences: body.preferences as Record<string, unknown> | undefined,
            status: 'active',
          });

          await membershipsDb.addMember({
            orgId: resolvedOrgId,
            userId: user.userId,
            role: membershipRole,
          });
        } catch (err) {
          if (createdOrg) {
            await orgsDb.softDeleteOrg(createdOrg.orgId);
          }
          log.error('admin.portalUser.provision.failed', { error: err });
          return resp.internalError(requestOrigin);
        }

        if (createdOrg) {
          await recordAudit({
            actorId: admin.emailHash,
            actorType: ACTOR_TYPES.ADMIN,
            action: 'org.create',
            resourceType: 'org',
            resourceId: createdOrg.orgId,
            details: { name: createdOrg.name, slug: createdOrg.slug },
            ipHash: getIpHash(event),
          });
        }

        await recordAudit({
          actorId: admin.emailHash,
          actorType: ACTOR_TYPES.ADMIN,
          action: 'portal_user.create',
          resourceType: 'user',
          resourceId: user.userId,
          details: { orgId: resolvedOrgId, role: portalRole },
          ipHash: getIpHash(event),
        });

        const mapped = await mapAdminUser(user);
        return resp.created(
          {
            ...mapped,
            portalInviteSent: true,
            portalOrgId: resolvedOrgId,
            portalRole,
            requiresPasswordReset: true,
          },
          requestOrigin
        );
      }

      const user = await usersDb.createUser({
        email,
        name,
        cognitoSub: body.cognitoSub as string | undefined,
        phone: body.phone as string | undefined,
        avatarUrl: body.avatarUrl as string | undefined,
        preferences: body.preferences as Record<string, unknown> | undefined,
        status: 'active',
      });
      await recordAudit({
        actorId: admin.emailHash,
        actorType: ACTOR_TYPES.ADMIN,
        action: 'user.create',
        resourceType: 'user',
        resourceId: user.userId,
        ipHash: getIpHash(event),
      });
      const mapped = await mapAdminUser(user);
      return resp.created(mapped, requestOrigin);
    }

    if (subpath === '/users' && method === 'GET') {
      const search = queryParam(event, 'search') || undefined;
      const status = queryParam(event, 'status') as usersDb.UserStatus | undefined;
      const result = await usersDb.listUsers({
        cursor: queryParam(event, 'cursor'),
        limit: Number(queryParam(event, 'limit')) || 25,
        search,
        status,
      });
      const users = await Promise.all(result.items.map(mapAdminUser));
      return resp.success(
        {
          users,
          total: users.length,
          nextToken: result.nextCursor,
        },
        undefined,
        requestOrigin
      );
    }

    if (/^\/users\/[^/]+$/.test(subpath) && method === 'GET') {
      const userId = pathParam(event, 2);
      const user = await usersDb.getUser(userId);
      if (!user) return resp.notFound('User not found', requestOrigin);
      const mapped = await mapAdminUserDetail(user);
      return resp.success(mapped, undefined, requestOrigin);
    }

    if (/^\/users\/[^/]+$/.test(subpath) && method === 'PUT') {
      if (!canWrite) return resp.forbidden(undefined, requestOrigin);
      const userId = pathParam(event, 2);
      const body = parseBody(event);
      if (body === null) return resp.badRequest('Invalid JSON in request body', requestOrigin);
      const updated = await usersDb.updateUser({
        userId,
        email: body.email as string | undefined,
        name: body.name as string | undefined,
        cognitoSub: body.cognitoSub as string | undefined,
        status: body.status as usersDb.UserStatus | undefined,
        phone: body.phone as string | undefined,
        avatarUrl: body.avatarUrl as string | undefined,
        preferences: body.preferences as Record<string, unknown> | undefined,
      });
      // Fix 9: Sanitize audit log - only log field names, not raw body values
      await recordAudit({
        actorId: admin.emailHash,
        actorType: ACTOR_TYPES.ADMIN,
        action: 'user.update',
        resourceType: 'user',
        resourceId: userId,
        details: { updatedFields: Object.keys(body) },
        ipHash: getIpHash(event),
      });
      const mapped = await mapAdminUser(updated);
      return resp.success(mapped, undefined, requestOrigin);
    }

    if (/^\/users\/[^/]+$/.test(subpath) && method === 'DELETE') {
      if (!canWrite) return resp.forbidden(undefined, requestOrigin);
      const userId = pathParam(event, 2);
      await usersDb.softDeleteUser(userId);
      await recordAudit({
        actorId: admin.emailHash,
        actorType: ACTOR_TYPES.ADMIN,
        action: 'user.delete',
        resourceType: 'user',
        resourceId: userId,
        ipHash: getIpHash(event),
      });
      return resp.noContent(requestOrigin);
    }

    // ---- MEMBERS ----
    if (/^\/orgs\/[^/]+\/members$/.test(subpath) && method === 'POST') {
      if (!canWrite) return resp.forbidden(undefined, requestOrigin);
      const orgId = pathParam(event, 2);
      const body = parseBody(event);
      if (body === null) return resp.badRequest('Invalid JSON in request body', requestOrigin);
      if (!body.userId || !body.role) {
        return resp.badRequest('userId and role are required', requestOrigin);
      }
      const resolvedRole = mapAdminRoleToMembership(body.role as string);
      if (!resolvedRole) {
        return resp.badRequest('Invalid role. Must be one of: owner, admin, member', requestOrigin);
      }
      const membership = await membershipsDb.addMember({
        orgId,
        userId: body.userId as string,
        role: resolvedRole,
        notifyEmail: body.notifyEmail as boolean | undefined,
        notifySms: body.notifySms as boolean | undefined,
      });
      await recordAudit({
        actorId: admin.emailHash,
        actorType: ACTOR_TYPES.ADMIN,
        action: 'member.add',
        resourceType: 'membership',
        resourceId: `${orgId}:${body.userId}`,
        ipHash: getIpHash(event),
      });
      return resp.created(membership, requestOrigin);
    }

    if (/^\/orgs\/[^/]+\/members$/.test(subpath) && method === 'GET') {
      const orgId = pathParam(event, 2);
      const result = await membershipsDb.listOrgMembers(
        orgId,
        queryParam(event, 'cursor'),
        Number(queryParam(event, 'limit')) || 50
      );
      const memberUsers = await Promise.all(
        result.items.map(async (member) => ({
          member,
          user: await usersDb.getUser(member.userId),
        }))
      );

      const members = memberUsers.map(({ member, user }) => ({
        userId: member.userId,
        email: user?.email || '',
        name: user?.name || member.userId,
        role: mapMembershipRoleToAdmin(member.role),
        joinedAt: member.joinedAt,
      }));

      return resp.paginated(
        members,
        {
          nextCursor: result.nextCursor,
          hasMore: !!result.nextCursor,
        },
        requestOrigin
      );
    }

    if (/^\/orgs\/[^/]+\/members\/[^/]+$/.test(subpath) && method === 'PUT') {
      if (!canWrite) return resp.forbidden(undefined, requestOrigin);
      const orgId = pathParam(event, 2);
      const userId = pathParam(event, 4); // admin/orgs/<orgId>/members/<userId>
      const body = parseBody(event);
      if (body === null) return resp.badRequest('Invalid JSON in request body', requestOrigin);
      const resolvedRole = body.role
        ? (mapAdminRoleToMembership(body.role as string) ?? undefined)
        : undefined;
      if (body.role && !resolvedRole) {
        return resp.badRequest('Invalid role. Must be one of: owner, admin, member', requestOrigin);
      }
      const updated = await membershipsDb.updateMember({
        orgId,
        userId,
        role: resolvedRole,
        notifyEmail: body.notifyEmail as boolean | undefined,
        notifySms: body.notifySms as boolean | undefined,
      });
      // Fix 9: Sanitize audit log - only log field names, not raw body values
      await recordAudit({
        actorId: admin.emailHash,
        actorType: ACTOR_TYPES.ADMIN,
        action: 'member.update',
        resourceType: 'membership',
        resourceId: `${orgId}:${userId}`,
        details: { updatedFields: Object.keys(body) },
        ipHash: getIpHash(event),
      });
      return resp.success(updated, undefined, requestOrigin);
    }

    if (/^\/orgs\/[^/]+\/members\/[^/]+$/.test(subpath) && method === 'DELETE') {
      if (!canWrite) return resp.forbidden(undefined, requestOrigin);
      const orgId = pathParam(event, 2);
      const userId = pathParam(event, 4);
      await membershipsDb.removeMember(orgId, userId);
      await recordAudit({
        actorId: admin.emailHash,
        actorType: ACTOR_TYPES.ADMIN,
        action: 'member.remove',
        resourceType: 'membership',
        resourceId: `${orgId}:${userId}`,
        ipHash: getIpHash(event),
      });
      return resp.noContent(requestOrigin);
    }

    // ---- RULES ----
    if (subpath === '/rules' && method === 'POST') {
      if (!canWrite) return resp.forbidden(undefined, requestOrigin);
      const body = parseBody(event);
      if (body === null) return resp.badRequest('Invalid JSON in request body', requestOrigin);
      const rawFunnels = Array.isArray(body.funnels) ? body.funnels : [];
      const funnels = rawFunnels.map((f) => String(f).trim()).filter(Boolean);
      const funnelIdInput = typeof body.funnelId === 'string' ? body.funnelId.trim() : '';
      const targetOrgId =
        (typeof body.targetOrgId === 'string' && body.targetOrgId.trim()) ||
        (typeof body.orgId === 'string' && body.orgId.trim()) ||
        '';

      if (!targetOrgId || !body.name || body.priority === undefined) {
        return resp.badRequest('targetOrgId, name, and priority are required', requestOrigin);
      }

      const funnelIds = funnels.length > 0 ? funnels : funnelIdInput ? [funnelIdInput] : ['*'];
      const zipPatterns = Array.isArray(body.zipCodes)
        ? body.zipCodes.map((z) => String(z).trim()).filter(Boolean)
        : Array.isArray(body.zipPatterns)
          ? body.zipPatterns.map((z) => String(z).trim()).filter(Boolean)
          : [];

      const createdRules: rulesDb.AssignmentRule[] = [];

      for (const funnelId of funnelIds) {
        const rule = await rulesDb.createRule({
          funnelId,
          orgId: targetOrgId,
          targetUserId:
            typeof body.targetUserId === 'string' ? body.targetUserId.trim() : undefined,
          name: body.name as string,
          priority: body.priority as number,
          zipPatterns,
          dailyCap: body.dailyCap as number | undefined,
          monthlyCap: body.monthlyCap as number | undefined,
          isActive: (body.active as boolean | undefined) ?? (body.isActive as boolean | undefined),
          description: body.description as string | undefined,
        });
        createdRules.push(rule);
      }

      const [mapped] = await mapAdminRules(createdRules);
      await recordAudit({
        actorId: admin.emailHash,
        actorType: ACTOR_TYPES.ADMIN,
        action: 'rule.create',
        resourceType: 'rule',
        resourceId: createdRules[0]?.ruleId || 'rule',
        ipHash: getIpHash(event),
      });
      return resp.created(
        {
          ...mapped,
          createdCount: createdRules.length,
        },
        requestOrigin
      );
    }

    if (subpath === '/rules' && method === 'GET') {
      const funnelId = queryParam(event, 'funnelId');
      const result = await rulesDb.listRules(
        funnelId || undefined,
        queryParam(event, 'cursor'),
        Number(queryParam(event, 'limit')) || 50
      );
      const mapped = await mapAdminRules(result.items);
      return resp.success(
        {
          rules: mapped,
          total: mapped.length,
          nextToken: result.nextCursor,
        },
        undefined,
        requestOrigin
      );
    }

    if (/^\/rules\/test$/.test(subpath) && method === 'POST') {
      const body = parseBody(event);
      if (body === null) return resp.badRequest('Invalid JSON in request body', requestOrigin);
      const funnelId = body.funnelId as string;
      const zipCode = body.zipCode as string;
      if (!funnelId) return resp.badRequest('funnelId is required', requestOrigin);
      const rules = await rulesDb.getRulesByFunnel(funnelId);
      // Adapt to the matcher's expected AssignmentRule type from lib/types/events
      const adapted = rules.map((r) => ({
        ruleId: r.ruleId,
        funnelId: r.funnelId,
        targetType: r.targetUserId ? ('USER' as const) : ('ORG' as const),
        targetId: r.targetUserId || r.orgId,
        orgId: r.orgId,
        zipPatterns: r.zipPatterns,
        priority: r.priority,
        active: r.isActive,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }));
      const matched = matchLeadToRule(funnelId, zipCode || '', adapted);
      const mapped = await mapAdminRules(rules);
      const matchedRule = matched
        ? mapped.find((rule) => rule.ruleId === matched.ruleId) || null
        : null;
      const evaluatedRules = mapped.map((rule) => ({
        ruleId: rule.ruleId,
        name: rule.name,
        matched: rule.ruleId === matchedRule?.ruleId,
        reason: rule.ruleId === matchedRule?.ruleId ? 'Matched by ZIP/priority' : 'Not matched',
      }));
      return resp.success(
        {
          matchedRule,
          evaluatedRules,
        },
        undefined,
        requestOrigin
      );
    }

    // ---- BULK RULES CREATE (Task 6) ----
    if (/^\/rules\/bulk-create$/.test(subpath) && method === 'POST') {
      if (!canWrite) return resp.forbidden(undefined, requestOrigin);
      const body = parseBody(event);
      if (body === null) return resp.badRequest('Invalid JSON in request body', requestOrigin);
      const ruleInputs = body.rules as Array<Record<string, unknown>> | undefined;
      if (!Array.isArray(ruleInputs) || ruleInputs.length === 0) {
        return resp.badRequest('rules array is required and must not be empty', requestOrigin);
      }
      if (ruleInputs.length > BULK_UPDATE_MAX) {
        return resp.badRequest(`Maximum ${BULK_UPDATE_MAX} rules per bulk create`, requestOrigin);
      }

      const created: rulesDb.AssignmentRule[] = [];
      const errors: Array<{ index: number; error: string }> = [];

      for (let i = 0; i < ruleInputs.length; i++) {
        const input = ruleInputs[i];
        try {
          const targetOrgId =
            (typeof input.targetOrgId === 'string' && input.targetOrgId.trim()) ||
            (typeof input.orgId === 'string' && input.orgId.trim()) ||
            '';
          if (!input.funnelId || !targetOrgId || !input.name || input.priority === undefined) {
            errors.push({
              index: i,
              error: 'funnelId, targetOrgId, name, and priority are required',
            });
            continue;
          }
          const rule = await rulesDb.createRule({
            funnelId: input.funnelId as string,
            orgId: targetOrgId,
            targetUserId: input.targetUserId as string | undefined,
            name: input.name as string,
            priority: input.priority as number,
            zipPatterns: (input.zipPatterns as string[]) || [],
            dailyCap: input.dailyCap as number | undefined,
            monthlyCap: input.monthlyCap as number | undefined,
            isActive: input.active as boolean | undefined,
            description: input.description as string | undefined,
          });
          created.push(rule);
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          errors.push({ index: i, error: msg });
        }
      }

      await recordAudit({
        actorId: admin.emailHash,
        actorType: ACTOR_TYPES.ADMIN,
        action: 'rule.bulkCreate',
        resourceType: 'rule',
        resourceId: 'bulk',
        details: { created: created.length, failed: errors.length },
        ipHash: getIpHash(event),
      });

      const mapped = await mapAdminRules(created);
      return resp.success(
        {
          created: created.length,
          failed: errors.length,
          errors,
          rules: mapped,
        },
        undefined,
        requestOrigin
      );
    }

    if (/^\/rules\/[^/]+$/.test(subpath) && method === 'GET') {
      const ruleId = pathParam(event, 2);
      const rule = await rulesDb.getRule(ruleId);
      if (!rule) return resp.notFound('Rule not found', requestOrigin);
      const [mapped] = await mapAdminRules([rule]);
      return resp.success(
        {
          ...mapped,
          conditions: {
            funnels: mapped.funnels,
            zipCodes: mapped.zipCodes,
            targetOrgId: mapped.targetOrgId,
            targetUserId: mapped.targetUserId,
          },
        },
        undefined,
        requestOrigin
      );
    }

    if (/^\/rules\/[^/]+$/.test(subpath) && method === 'PUT') {
      if (!canWrite) return resp.forbidden(undefined, requestOrigin);
      const ruleId = pathParam(event, 2);
      const body = parseBody(event);
      if (body === null) return resp.badRequest('Invalid JSON in request body', requestOrigin);
      const funnelsInput = Array.isArray(body.funnels) ? body.funnels : undefined;
      const funnels = funnelsInput?.map((f) => String(f).trim()).filter(Boolean) || [];
      if (funnels.length > 1) {
        return resp.badRequest('Only one funnel is supported per rule', requestOrigin);
      }
      const funnelId =
        funnels.length === 1
          ? funnels[0]
          : typeof body.funnelId === 'string'
            ? body.funnelId.trim()
            : undefined;
      const zipPatterns = Array.isArray(body.zipCodes)
        ? body.zipCodes.map((z) => String(z).trim()).filter(Boolean)
        : Array.isArray(body.zipPatterns)
          ? body.zipPatterns.map((z) => String(z).trim()).filter(Boolean)
          : undefined;
      const targetOrgId =
        typeof body.targetOrgId === 'string'
          ? body.targetOrgId.trim()
          : typeof body.orgId === 'string'
            ? body.orgId.trim()
            : undefined;
      const updated = await rulesDb.updateRule({
        ruleId,
        funnelId: funnelId || undefined,
        orgId: targetOrgId || undefined,
        name: body.name as string | undefined,
        priority: body.priority as number | undefined,
        zipPatterns,
        dailyCap: body.dailyCap as number | undefined,
        monthlyCap: body.monthlyCap as number | undefined,
        isActive: (body.active as boolean | undefined) ?? (body.isActive as boolean | undefined),
        targetUserId: body.targetUserId as string | undefined,
        description: body.description as string | undefined,
      });
      // Fix 9: Sanitize audit log - only log field names, not raw body values
      await recordAudit({
        actorId: admin.emailHash,
        actorType: ACTOR_TYPES.ADMIN,
        action: 'rule.update',
        resourceType: 'rule',
        resourceId: ruleId,
        details: { updatedFields: Object.keys(body) },
        ipHash: getIpHash(event),
      });
      const [mapped] = await mapAdminRules([updated]);
      return resp.success(
        {
          ...mapped,
          conditions: {
            funnels: mapped.funnels,
            zipCodes: mapped.zipCodes,
            targetOrgId: mapped.targetOrgId,
            targetUserId: mapped.targetUserId,
          },
        },
        undefined,
        requestOrigin
      );
    }

    if (/^\/rules\/[^/]+$/.test(subpath) && method === 'DELETE') {
      if (!canWrite) return resp.forbidden(undefined, requestOrigin);
      const ruleId = pathParam(event, 2);
      await rulesDb.softDeleteRule(ruleId);
      await recordAudit({
        actorId: admin.emailHash,
        actorType: ACTOR_TYPES.ADMIN,
        action: 'rule.delete',
        resourceType: 'rule',
        resourceId: ruleId,
        ipHash: getIpHash(event),
      });
      return resp.noContent(requestOrigin);
    }

    // ---- LEADS ----
    if (subpath === '/query' && method === 'POST') {
      const body = parseBody(event);
      if (body === null) return resp.badRequest('Invalid JSON in request body', requestOrigin);

      const statusFromPipeline = mapPipelineToStatus(body.pipelineStatus as AdminPipelineStatus);
      const funnelId = body.funnelId as string | undefined;
      const orgId = body.orgId as string | undefined;
      const status = (body.status as leadsDb.LeadStatus | undefined) || statusFromPipeline;

      const hasFilter = Boolean(funnelId || orgId || status);
      if (!hasFilter) {
        return resp.success(
          { leads: [], totalCount: 0, nextToken: undefined },
          undefined,
          requestOrigin
        );
      }

      const result = await leadsDb.queryLeads({
        funnelId,
        orgId,
        status,
        startDate: body.startDate as string | undefined,
        endDate: body.endDate as string | undefined,
        cursor: (body.nextToken as string | undefined) || (body.cursor as string | undefined),
        limit: body.pageSize as number | undefined,
        assignedUserId: body.userId as string | undefined,
      });

      let mapped = await mapAdminLeads(result.items);
      if (body.search) {
        const search = String(body.search).toLowerCase();
        mapped = mapped.filter(
          (lead) =>
            lead.name.toLowerCase().includes(search) || lead.email.toLowerCase().includes(search)
        );
      }
      if (body.zipCode) {
        const zip = String(body.zipCode);
        mapped = mapped.filter((lead) => (lead.zipCode || '').includes(zip));
      }

      return resp.success(
        {
          leads: mapped,
          totalCount: mapped.length,
          nextToken: result.nextCursor,
        },
        undefined,
        requestOrigin
      );
    }

    if (subpath === '/leads/query' && method === 'POST') {
      const body = parseBody(event);
      if (body === null) return resp.badRequest('Invalid JSON in request body', requestOrigin);
      const result = await leadsDb.queryLeads({
        funnelId: body.funnelId as string | undefined,
        orgId: body.orgId as string | undefined,
        status: body.status as leadsDb.LeadStatus | undefined,
        startDate: body.startDate as string | undefined,
        endDate: body.endDate as string | undefined,
        cursor: body.cursor as string | undefined,
        limit: body.limit as number | undefined,
      });
      return resp.paginated(
        result.items,
        {
          nextCursor: result.nextCursor,
          hasMore: !!result.nextCursor,
        },
        requestOrigin
      );
    }

    // ---- BULK UPDATE LEADS (Task 6) ----
    if (subpath === '/leads/bulk-update' && method === 'POST') {
      if (!canWrite) return resp.forbidden(undefined, requestOrigin);
      const body = parseBody(event);
      if (body === null) return resp.badRequest('Invalid JSON in request body', requestOrigin);
      let updates = body.updates as
        | Array<{
            funnelId: string;
            leadId: string;
            status?: string;
            tags?: string[];
            notes?: string;
          }>
        | undefined;

      if (!Array.isArray(updates)) {
        const funnelId = body.funnelId as string | undefined;
        const leadIds = body.leadIds as string[] | undefined;
        if (!funnelId || !Array.isArray(leadIds) || leadIds.length === 0) {
          return resp.badRequest('updates array or funnelId + leadIds is required', requestOrigin);
        }

        const statusFromPipeline = mapPipelineToStatus(body.pipelineStatus as AdminPipelineStatus);
        const bulkStatus =
          (body.status as string | undefined) ||
          statusFromPipeline ||
          (body.doNotContact ? 'dnc' : undefined);
        const tags = Array.isArray(body.tags) ? (body.tags as string[]) : undefined;
        const notes = typeof body.notes === 'string' ? body.notes : undefined;

        updates = leadIds.map((leadId) => ({
          funnelId,
          leadId,
          status: bulkStatus,
          tags,
          notes,
        }));
      }

      if (!updates || updates.length === 0) {
        return resp.badRequest('updates array is required', requestOrigin);
      }
      if (updates.length > BULK_UPDATE_MAX) {
        return resp.badRequest(`Maximum ${BULK_UPDATE_MAX} items per bulk update`, requestOrigin);
      }

      let succeeded = 0;
      let failed = 0;
      const errors: Array<{ funnelId: string; leadId: string; error: string }> = [];

      for (const item of updates) {
        if (!item.funnelId || !item.leadId) {
          errors.push({
            funnelId: item.funnelId || '',
            leadId: item.leadId || '',
            error: 'funnelId and leadId are required',
          });
          failed++;
          continue;
        }
        if (item.status && !VALID_LEAD_STATUSES.includes(item.status as leadsDb.LeadStatus)) {
          errors.push({
            funnelId: item.funnelId,
            leadId: item.leadId,
            error: `Invalid status: ${item.status}`,
          });
          failed++;
          continue;
        }

        try {
          const existing = await leadsDb.getLead(item.funnelId, item.leadId);
          const oldStatus = existing?.status || 'unknown';

          await leadsDb.updateLead({
            funnelId: item.funnelId,
            leadId: item.leadId,
            status: item.status as leadsDb.LeadStatus | undefined,
            tags: item.tags,
            notes: item.notes ? [item.notes] : undefined,
            force: true,
          });

          if (item.status) {
            // Fire webhook for status change
            void emitLeadStatusChanged({
              leadId: item.leadId,
              funnelId: item.funnelId,
              oldStatus,
              newStatus: item.status,
              changedBy: admin.emailHash,
            });
          }

          succeeded++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          errors.push({ funnelId: item.funnelId, leadId: item.leadId, error: msg });
          failed++;
        }
      }

      await recordAudit({
        actorId: admin.emailHash,
        actorType: ACTOR_TYPES.ADMIN,
        action: 'lead.bulkUpdate',
        resourceType: 'lead',
        resourceId: 'bulk',
        details: { succeeded, failed, total: updates.length },
        ipHash: getIpHash(event),
      });

      return resp.success({ updated: succeeded, failed, errors }, undefined, requestOrigin);
    }

    // ---- BULK IMPORT LEADS (Task 6) ----
    if (subpath === '/leads/bulk-import' && method === 'POST') {
      if (!canWrite) return resp.forbidden(undefined, requestOrigin);
      const body = parseBody(event);
      if (body === null) return resp.badRequest('Invalid JSON in request body', requestOrigin);

      const leads = Array.isArray(body.leads) ? (body.leads as Record<string, string>[]) : null;
      const csvData = body.csv as string | undefined;
      const funnelId = body.funnelId as string | undefined;

      if (!leads && (!csvData || !funnelId)) {
        return resp.badRequest('leads array or csv + funnelId are required', requestOrigin);
      }

      let imported = 0;
      let failedCount = 0;
      const importErrors: Array<{ row: number; error: string }> = [];

      if (leads) {
        const rows = leads.slice(0, 1000);
        for (let i = 0; i < rows.length; i++) {
          const record = rows[i];
          const email = record.email || '';
          const name = record.name || '';
          const phone = record.phone || '';
          const message = record.message || '';
          const rowFunnelId = record.funnelId || funnelId;

          if (!rowFunnelId) {
            importErrors.push({ row: i + 1, error: 'Missing funnelId' });
            failedCount++;
            continue;
          }

          if (!email || !email.includes('@')) {
            importErrors.push({ row: i + 1, error: 'Invalid or missing email' });
            failedCount++;
            continue;
          }

          try {
            await leadsDb.createLead({
              funnelId: rowFunnelId,
              email,
              name: name || undefined,
              phone: phone || undefined,
              message: message || undefined,
              source: 'bulk-import',
            });
            imported++;
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            importErrors.push({ row: i + 1, error: msg });
            failedCount++;
          }
        }
      } else if (csvData && funnelId) {
        const lines = csvData
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean);
        if (lines.length < 2) {
          return resp.badRequest(
            'CSV must contain a header row and at least one data row',
            requestOrigin
          );
        }

        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
        const emailIdx = headers.indexOf('email');
        const nameIdx = headers.indexOf('name');
        const phoneIdx = headers.indexOf('phone');
        const messageIdx = headers.indexOf('message');

        if (emailIdx === -1) {
          return resp.badRequest('CSV must contain an email column', requestOrigin);
        }

        // Issue #6: Use BatchWriteCommand for bulk imports (25 per batch)
        // For now, the createLead function does individual PutCommands with
        // GSI projections that are complex. We keep the sequential approach
        // but batch where possible. The per-item createLead call is needed
        // because it generates UUIDs, hashes, and GSI keys per lead.
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.trim());
          const email = cols[emailIdx] || '';
          const name = nameIdx >= 0 ? cols[nameIdx] || '' : '';
          const phone = phoneIdx >= 0 ? cols[phoneIdx] || '' : '';
          const message = messageIdx >= 0 ? cols[messageIdx] || '' : '';

          if (!email || !email.includes('@')) {
            importErrors.push({ row: i + 1, error: 'Invalid or missing email' });
            failedCount++;
            continue;
          }

          try {
            await leadsDb.createLead({
              funnelId,
              email,
              name: name || undefined,
              phone: phone || undefined,
              message: message || undefined,
              source: 'bulk-import',
            });
            imported++;
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            importErrors.push({ row: i + 1, error: msg });
            failedCount++;
          }
        }
      }

      await recordAudit({
        actorId: admin.emailHash,
        actorType: ACTOR_TYPES.ADMIN,
        action: 'lead.bulkImport',
        resourceType: 'lead',
        resourceId: funnelId || 'bulk-import',
        details: { imported, failed: failedCount },
        ipHash: getIpHash(event),
      });

      return resp.success(
        { imported, failed: failedCount, skipped: 0, errors: importErrors },
        undefined,
        requestOrigin
      );
    }

    if (/^\/leads\/[^/]+\/[^/]+$/.test(subpath) && method === 'GET') {
      const funnelId = pathParam(event, 2);
      const leadId = pathParam(event, 3);
      const lead = await leadsDb.getLead(funnelId, leadId);
      if (!lead) return resp.notFound('Lead not found', requestOrigin);
      const [mapped] = await mapAdminLeads([lead]);

      const notifications = await notificationsDb.listNotificationsByLead(leadId, undefined, 50);
      const notificationHistory = notifications.items.map((n) => ({
        id: n.notificationId,
        channel: n.channel,
        status: n.status,
        recipient: n.recipient,
        sentAt: n.sentAt,
        error: n.errorMessage,
      }));

      return resp.success(
        {
          ...mapped,
          message: lead.message,
          pageUrl: lead.pageUrl,
          referrer: lead.referrer,
          utm: lead.utm,
          ipHash: lead.ipHash,
          userAgent: lead.userAgent,
          evidencePack: lead.evidencePack,
          auditTrail: [],
          notificationHistory,
        },
        undefined,
        requestOrigin
      );
    }

    if (/^\/leads\/[^/]+\/[^/]+$/.test(subpath) && method === 'PUT') {
      if (!canWrite) return resp.forbidden(undefined, requestOrigin);
      const funnelId = pathParam(event, 2);
      const leadId = pathParam(event, 3);
      const body = parseBody(event);
      if (body === null) return resp.badRequest('Invalid JSON in request body', requestOrigin);
      const statusFromPipeline = mapPipelineToStatus(body.pipelineStatus as AdminPipelineStatus);
      const desiredStatus =
        (body.status as leadsDb.LeadStatus | undefined) ||
        statusFromPipeline ||
        (body.doNotContact ? 'dnc' : undefined);

      // Fix 7: Validate lead status against the actual LeadStatus type
      if (desiredStatus && !VALID_LEAD_STATUSES.includes(desiredStatus as leadsDb.LeadStatus)) {
        return resp.badRequest(
          `Invalid status. Must be one of: ${VALID_LEAD_STATUSES.join(', ')}`,
          requestOrigin
        );
      }

      // Capture old status for webhook
      const existingLead = await leadsDb.getLead(funnelId, leadId);
      const oldStatus = existingLead?.status || 'unknown';

      // Pass force flag from body -- admin can override state machine
      const notes =
        typeof body.notes === 'string' ? [body.notes] : (body.notes as string[] | undefined);

      const updated = await leadsDb.updateLead({
        funnelId,
        leadId,
        status: desiredStatus as leadsDb.LeadStatus | undefined,
        orgId: body.orgId as string | undefined,
        assignedUserId: body.assignedUserId as string | undefined,
        ruleId: body.ruleId as string | undefined,
        notes,
        tags: body.tags as string[] | undefined,
        force: body.force as boolean | undefined,
      });

      // Emit webhook for status change
      if (desiredStatus && desiredStatus !== oldStatus) {
        void emitLeadStatusChanged({
          leadId,
          funnelId,
          oldStatus,
          newStatus: desiredStatus as string,
          changedBy: admin.emailHash,
        });
      }

      // Fix 9: Sanitize audit log - only log field names, not raw body values
      await recordAudit({
        actorId: admin.emailHash,
        actorType: ACTOR_TYPES.ADMIN,
        action: 'lead.update',
        resourceType: 'lead',
        resourceId: `${funnelId}:${leadId}`,
        details: { updatedFields: Object.keys(body) },
        ipHash: getIpHash(event),
      });
      const [mapped] = await mapAdminLeads([updated]);
      return resp.success(mapped, undefined, requestOrigin);
    }

    if (subpath === '/leads/update' && method === 'POST') {
      if (!canWrite) return resp.forbidden(undefined, requestOrigin);
      const body = parseBody(event);
      if (body === null) return resp.badRequest('Invalid JSON in request body', requestOrigin);
      const funnelId = typeof body.funnelId === 'string' ? body.funnelId.trim() : '';
      const leadId = typeof body.leadId === 'string' ? body.leadId.trim() : '';
      if (!funnelId || !leadId) {
        return resp.badRequest('funnelId and leadId are required', requestOrigin);
      }

      const statusFromPipeline = mapPipelineToStatus(body.pipelineStatus as AdminPipelineStatus);
      const desiredStatus =
        (body.status as leadsDb.LeadStatus | undefined) ||
        statusFromPipeline ||
        (body.doNotContact ? 'dnc' : undefined);

      if (desiredStatus && !VALID_LEAD_STATUSES.includes(desiredStatus)) {
        return resp.badRequest(
          `Invalid status. Must be one of: ${VALID_LEAD_STATUSES.join(', ')}`,
          requestOrigin
        );
      }

      const existingLead = await leadsDb.getLead(funnelId, leadId);
      const oldStatus = existingLead?.status || 'unknown';

      const notes =
        typeof body.notes === 'string' ? [body.notes] : (body.notes as string[] | undefined);

      const updated = await leadsDb.updateLead({
        funnelId,
        leadId,
        status: desiredStatus,
        orgId: body.assignedOrgId as string | undefined,
        assignedUserId: body.assignedUserId as string | undefined,
        ruleId: body.ruleId as string | undefined,
        notes,
        tags: body.tags as string[] | undefined,
        force: true,
      });

      if (desiredStatus && desiredStatus !== oldStatus) {
        void emitLeadStatusChanged({
          leadId,
          funnelId,
          oldStatus,
          newStatus: desiredStatus,
          changedBy: admin.emailHash,
        });
      }

      await recordAudit({
        actorId: admin.emailHash,
        actorType: ACTOR_TYPES.ADMIN,
        action: 'lead.update',
        resourceType: 'lead',
        resourceId: `${body.funnelId}:${body.leadId}`,
        details: { updatedFields: Object.keys(body) },
        ipHash: getIpHash(event),
      });

      const [mapped] = await mapAdminLeads([updated]);
      return resp.success(mapped, undefined, requestOrigin);
    }

    if (/^\/leads\/[^/]+\/[^/]+\/reassign$/.test(subpath) && method === 'POST') {
      if (!canWrite) return resp.forbidden(undefined, requestOrigin);
      const funnelId = pathParam(event, 2);
      const leadId = pathParam(event, 3);
      const body = parseBody(event);
      if (body === null) return resp.badRequest('Invalid JSON in request body', requestOrigin);
      if (!body.orgId) return resp.badRequest('orgId is required', requestOrigin);
      const updated = await leadsDb.reassignLead(
        funnelId,
        leadId,
        body.orgId as string,
        body.ruleId as string | undefined
      );
      await recordAudit({
        actorId: admin.emailHash,
        actorType: ACTOR_TYPES.ADMIN,
        action: 'lead.reassign',
        resourceType: 'lead',
        resourceId: `${funnelId}:${leadId}`,
        details: { newOrgId: body.orgId },
        ipHash: getIpHash(event),
      });
      const [mapped] = await mapAdminLeads([updated]);
      return resp.success(mapped, undefined, requestOrigin);
    }

    if (subpath === '/leads/reassign' && method === 'POST') {
      if (!canWrite) return resp.forbidden(undefined, requestOrigin);
      const body = parseBody(event);
      if (body === null) return resp.badRequest('Invalid JSON in request body', requestOrigin);
      if (!body.funnelId || !body.leadId || !body.targetOrgId) {
        return resp.badRequest('funnelId, leadId, and targetOrgId are required', requestOrigin);
      }

      const updated = await leadsDb.reassignLead(
        body.funnelId as string,
        body.leadId as string,
        body.targetOrgId as string,
        body.ruleId as string | undefined
      );

      if (body.targetUserId) {
        await leadsDb.updateLead({
          funnelId: body.funnelId as string,
          leadId: body.leadId as string,
          assignedUserId: body.targetUserId as string,
          force: true,
        });
      }

      await recordAudit({
        actorId: admin.emailHash,
        actorType: ACTOR_TYPES.ADMIN,
        action: 'lead.reassign',
        resourceType: 'lead',
        resourceId: `${body.funnelId}:${body.leadId}`,
        details: { newOrgId: body.targetOrgId, newUserId: body.targetUserId },
        ipHash: getIpHash(event),
      });

      const [mapped] = await mapAdminLeads([updated]);
      return resp.success(mapped, undefined, requestOrigin);
    }

    // ---- DASHBOARD / STATS ----
    if (subpath === '/dashboard' && method === 'GET') {
      const funnelIds = (process.env.FUNNEL_IDS || '')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);

      const funnelStats = await Promise.all(
        funnelIds.map(async (funnelId) => {
          const leads = await collectFunnelLeads(funnelId);
          return buildFunnelStats(funnelId, leads);
        })
      );

      const totalLeads = funnelStats.reduce((sum, stat) => sum + stat.totalLeads, 0);
      const unassignedLeads = funnelStats.reduce(
        (sum, stat) => sum + (stat.byStatus.unassigned || 0),
        0
      );

      const recentLeadsRaw = await collectRecentLeadsAcrossFunnels(funnelIds, 10);
      const recentLeads = await mapAdminLeads(recentLeadsRaw);

      const orgs = await orgsDb.listOrgs(undefined, 100);
      const rules = await rulesDb.listRules(undefined, undefined, 100);

      return resp.success(
        {
          totalLeads,
          activeOrgs: orgs.items.length,
          activeRules: rules.items.length,
          unassignedLeads,
          recentLeads,
          funnelStats,
        },
        undefined,
        requestOrigin
      );
    }

    if (subpath === '/stats' && method === 'GET') {
      const funnelId = queryParam(event, 'funnelId');
      if (!funnelId) return resp.badRequest('funnelId is required', requestOrigin);
      const leads = await collectFunnelLeads(funnelId);
      const stats = buildFunnelStats(funnelId, leads);
      return resp.success(stats, undefined, requestOrigin);
    }

    if (subpath === '/funnels' && method === 'GET') {
      const funnels = (process.env.FUNNEL_IDS || '')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
      return resp.success({ funnels }, undefined, requestOrigin);
    }

    // ---- NOTIFICATIONS ----
    if (subpath === '/notifications' && method === 'GET') {
      const cursor = queryParam(event, 'cursor') || queryParam(event, 'nextToken');
      const limit = Number(queryParam(event, 'limit') || queryParam(event, 'pageSize')) || 50;
      const result = await notificationsDb.listNotifications(
        cursor,
        limit,
        queryParam(event, 'startDate'),
        queryParam(event, 'endDate')
      );
      const notifications = result.items.map((n) => ({
        notificationId: n.notificationId,
        leadId: n.leadId,
        funnelId: n.funnelId,
        channel: n.channel,
        status: n.status,
        recipient: n.recipient,
        sentAt: n.sentAt,
        error: n.errorMessage,
        retryCount: 0,
      }));
      return resp.success(
        { notifications, total: notifications.length, nextToken: result.nextCursor },
        undefined,
        requestOrigin
      );
    }

    if (/^\/notifications\/[^/]+\/retry$/.test(subpath) && method === 'POST') {
      if (!canWrite) return resp.forbidden(undefined, requestOrigin);
      return resp.success({ retried: true }, undefined, requestOrigin);
    }

    // ---- ADMIN ALERTS (Notification Center) ----
    if (subpath === '/alerts' && method === 'GET') {
      return resp.success({ items: [], total: 0, unreadCount: 0 }, undefined, requestOrigin);
    }

    if (/^\/alerts\/[^/]+\/read$/.test(subpath) && method === 'POST') {
      return resp.success({ updated: true }, undefined, requestOrigin);
    }

    if (subpath === '/alerts/read-all' && method === 'POST') {
      return resp.success({ updated: true }, undefined, requestOrigin);
    }

    // ---- EXPORTS ----
    if (subpath === '/exports' && method === 'POST') {
      if (!canWrite) return resp.forbidden(undefined, requestOrigin);
      const body = parseBody(event);
      if (body === null) return resp.badRequest('Invalid JSON in request body', requestOrigin);
      if (!body.format) {
        return resp.badRequest('format is required (csv, xlsx, json)', requestOrigin);
      }

      // Rate limit: check for pending exports by this admin
      const pendingExports = await exportsDb.listExports();
      const myPending = pendingExports.items.filter(
        (e) => e.requestedBy === admin.emailHash && e.status === 'pending'
      );
      if (myPending.length >= 3) {
        return resp.error(
          'RATE_LIMITED',
          'Too many pending exports. Please wait for current exports to complete.',
          HTTP_STATUS.RATE_LIMITED,
          undefined,
          requestOrigin
        );
      }

      // Fix 4: Atomic throttle to prevent TOCTOU race condition
      const doc = getDocClient();
      const throttleKey = `${DB_PREFIXES.EXPORT_THROTTLE}${admin.emailHash}`;
      try {
        await doc.send(
          new PutCommand({
            TableName: getExportsTableName(),
            Item: {
              pk: throttleKey,
              sk: DB_SORT_KEYS.THROTTLE,
              createdAt: new Date().toISOString(),
              ttl: Math.floor(Date.now() / 1000) + 10, // 10 second cooldown
            },
            ConditionExpression: 'attribute_not_exists(pk)',
          })
        );
      } catch (err: unknown) {
        if (
          err &&
          typeof err === 'object' &&
          'name' in err &&
          err.name === 'ConditionalCheckFailedException'
        ) {
          return resp.error(
            'RATE_LIMITED',
            'Please wait before creating another export',
            HTTP_STATUS.RATE_LIMITED,
            undefined,
            requestOrigin
          );
        }
        throw err;
      }

      const job = await exportsDb.createExport({
        requestedBy: admin.emailHash,
        funnelId: body.funnelId as string | undefined,
        orgId: body.orgId as string | undefined,
        format: body.format as exportsDb.ExportFormat,
        filters: body.filters as Record<string, unknown> | undefined,
      });
      await recordAudit({
        actorId: admin.emailHash,
        actorType: ACTOR_TYPES.ADMIN,
        action: 'export.create',
        resourceType: 'export',
        resourceId: job.exportId,
        ipHash: getIpHash(event),
      });
      return resp.created(mapExportJob(job), requestOrigin);
    }

    if (subpath === '/exports' && method === 'GET') {
      const cursor = queryParam(event, 'cursor') || queryParam(event, 'nextToken');
      const limit = Number(queryParam(event, 'limit') || queryParam(event, 'pageSize')) || 25;
      const result = await exportsDb.listExports(cursor, limit);
      const exportsList = result.items.map(mapExportJob);
      return resp.success(
        { exports: exportsList, total: exportsList.length, nextToken: result.nextCursor },
        undefined,
        requestOrigin
      );
    }

    if (subpath === '/exports/create' && method === 'POST') {
      if (!canWrite) return resp.forbidden(undefined, requestOrigin);
      const body = parseBody(event);
      if (body === null) return resp.badRequest('Invalid JSON in request body', requestOrigin);
      if (!body.format) {
        return resp.badRequest('format is required (csv, xlsx, json)', requestOrigin);
      }

      const job = await exportsDb.createExport({
        requestedBy: admin.emailHash,
        funnelId: body.funnelId as string | undefined,
        orgId: body.orgId as string | undefined,
        format: body.format as exportsDb.ExportFormat,
        filters: {
          status: body.status,
          startDate: body.startDate,
          endDate: body.endDate,
          fields: body.fields,
        },
      });

      await recordAudit({
        actorId: admin.emailHash,
        actorType: ACTOR_TYPES.ADMIN,
        action: 'export.create',
        resourceType: 'export',
        resourceId: job.exportId,
        ipHash: getIpHash(event),
      });

      return resp.created(mapExportJob(job), requestOrigin);
    }

    if (subpath === '/exports/status' && method === 'GET') {
      const jobId = queryParam(event, 'jobId');
      if (!jobId) return resp.badRequest('jobId is required', requestOrigin);
      const job = await exportsDb.getExport(jobId);
      if (!job) return resp.notFound('Export not found', requestOrigin);
      return resp.success(mapExportJob(job), undefined, requestOrigin);
    }

    if (subpath === '/exports/download' && method === 'GET') {
      const jobId = queryParam(event, 'jobId');
      if (!jobId) return resp.badRequest('jobId is required', requestOrigin);
      const job = await exportsDb.getExport(jobId);
      if (!job) return resp.notFound('Export not found', requestOrigin);
      if (job.status !== 'completed' || !job.s3Key) {
        return resp.badRequest('Export not ready for download', requestOrigin);
      }
      if (job.requestedBy !== admin.emailHash && !canWrite) {
        return resp.forbidden('You can only download your own exports', requestOrigin);
      }
      const bucket = process.env.EXPORTS_BUCKET || '';
      const url = await getPresignedDownloadUrl(bucket, job.s3Key, 3600);
      return resp.success({ downloadUrl: url, expiresIn: 3600 }, undefined, requestOrigin);
    }

    if (subpath === '/exports/schedules' && method === 'GET') {
      return resp.success({ schedules: [], total: 0 }, undefined, requestOrigin);
    }

    if (subpath === '/exports/schedule' && method === 'POST') {
      if (!canWrite) return resp.forbidden(undefined, requestOrigin);
      const body = parseBody(event);
      if (body === null) return resp.badRequest('Invalid JSON in request body', requestOrigin);

      const schedule = {
        id: ulid(),
        funnelId: body.funnelId as string,
        format: body.format as exportsDb.ExportFormat,
        frequency: body.frequency as string,
        dayOfWeekOrMonth: body.dayOfWeekOrMonth,
        timeUtc: body.timeUtc,
        deliveryEmail: body.deliveryEmail,
        enabled: true,
        nextRunAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        status: 'pending',
        fields: body.fields,
      };

      return resp.created(schedule, requestOrigin);
    }

    if (/^\/exports\/schedules\/[^/]+$/.test(subpath) && method === 'DELETE') {
      if (!canWrite) return resp.forbidden(undefined, requestOrigin);
      return resp.noContent(requestOrigin);
    }

    if (/^\/exports\/[^/]+\/download$/.test(subpath) && method === 'GET') {
      const exportId = pathParam(event, 2);
      const job = await exportsDb.getExport(exportId);
      if (!job) return resp.notFound('Export not found', requestOrigin);
      if (job.status !== 'completed' || !job.s3Key) {
        return resp.badRequest('Export not ready for download', requestOrigin);
      }
      // Fix 5: Verify the requesting admin owns this export or has write permissions
      if (job.requestedBy !== admin.emailHash && !canWrite) {
        return resp.forbidden('You can only download your own exports', requestOrigin);
      }
      // Generate presigned URL via centralized S3 storage module
      const bucket = process.env.EXPORTS_BUCKET || '';
      const url = await getPresignedDownloadUrl(bucket, job.s3Key, 3600);
      await recordAudit({
        actorId: admin.emailHash,
        actorType: ACTOR_TYPES.ADMIN,
        action: 'export.download',
        resourceType: 'export',
        resourceId: exportId,
        ipHash: getIpHash(event),
      });
      return resp.success({ downloadUrl: url, expiresIn: 3600 }, undefined, requestOrigin);
    }

    return resp.notFound('Admin endpoint not found', requestOrigin);
  } catch (err) {
    // Handle ValidationError from the lead status state machine
    if (err instanceof ValidationError) {
      return resp.badRequest(err.message, requestOrigin);
    }

    const msg = err instanceof Error ? err.message : 'Unknown error';
    log.error('admin.handler.error', { error: msg, path, method });

    // Handle DynamoDB conditional check failures as 409
    if (
      err &&
      typeof err === 'object' &&
      'name' in err &&
      err.name === 'ConditionalCheckFailedException'
    ) {
      return resp.conflict('Resource conflict or not found', requestOrigin);
    }

    return resp.internalError(requestOrigin);
  }
}

type AdminUserRole = 'owner' | 'admin' | 'member';

function mapMembershipRoleToAdminRole(role: membershipsDb.MembershipRole): AdminUserRole {
  switch (role) {
    case 'ORG_OWNER':
      return 'owner';
    case 'MANAGER':
      return 'admin';
    default:
      return 'member';
  }
}

async function mapAdminUser(user: usersDb.User): Promise<{
  userId: string;
  email: string;
  name: string;
  status: usersDb.UserStatus;
  orgIds: string[];
  orgNames: string[];
  leadCount: number;
  createdAt: string;
  updatedAt: string;
}> {
  const memberships = await membershipsDb.listUserOrgs(user.userId, undefined, 50);
  const orgIds = memberships.items.map((m) => m.orgId);
  const orgs = await Promise.all(orgIds.map((orgId) => orgsDb.getOrg(orgId)));
  const orgNames = orgs
    .filter(Boolean)
    .map((org) => org?.name || '')
    .filter(Boolean);

  return {
    userId: user.userId,
    email: user.email,
    name: user.name,
    status: user.status || 'active',
    orgIds,
    orgNames,
    leadCount: 0,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

async function mapAdminUserDetail(user: usersDb.User): Promise<{
  userId: string;
  email: string;
  name: string;
  status: usersDb.UserStatus;
  orgIds: string[];
  orgNames: string[];
  leadCount: number;
  createdAt: string;
  updatedAt: string;
  phone?: string;
  role: 'admin' | 'user';
  lastLoginAt?: string;
  orgs: Array<{ orgId: string; orgName: string; role: AdminUserRole; joinedAt: string }>;
}> {
  const memberships = await membershipsDb.listUserOrgs(user.userId, undefined, 50);
  const orgs = await Promise.all(
    memberships.items.map(async (membership) => {
      const org = await orgsDb.getOrg(membership.orgId);
      return {
        orgId: membership.orgId,
        orgName: org?.name || membership.orgId,
        role: mapMembershipRoleToAdminRole(membership.role),
        joinedAt: membership.joinedAt,
      };
    })
  );

  const orgIds = orgs.map((org) => org.orgId);
  const orgNames = orgs.map((org) => org.orgName);

  return {
    userId: user.userId,
    email: user.email,
    name: user.name,
    status: user.status || 'active',
    orgIds,
    orgNames,
    leadCount: 0,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    phone: user.phone,
    role: 'user',
    lastLoginAt: undefined,
    orgs,
  };
}

// ---------------------------------------------------------------------------
// Analytics Routes (Task 5)
// ---------------------------------------------------------------------------

async function handleAnalyticsRoutes(
  event: APIGatewayProxyEventV2,
  subpath: string,
  method: string,
  requestOrigin?: string
): Promise<APIGatewayProxyResultV2> {
  if (method !== 'GET') return resp.notFound('Analytics endpoint not found', requestOrigin);

  const startDate =
    queryParam(event, 'startDate') || new Date(Date.now() - 30 * 86400000).toISOString();
  const endDate = queryParam(event, 'endDate') || new Date().toISOString();
  const dateRange: analytics.DateRange = { startDate, endDate };

  // GET /admin/analytics/overview
  if (subpath === '/analytics/overview') {
    const metrics = await analytics.getOverviewMetrics(dateRange);
    return resp.success(metrics, undefined, requestOrigin);
  }

  // GET /admin/analytics/funnels
  if (subpath === '/analytics/funnels') {
    const metrics = await analytics.getFunnelMetrics(dateRange);
    return resp.success(metrics, undefined, requestOrigin);
  }

  // GET /admin/analytics/orgs
  if (subpath === '/analytics/orgs') {
    const metrics = await analytics.getOrgMetrics(dateRange);
    return resp.success(metrics, undefined, requestOrigin);
  }

  // GET /admin/analytics/trends
  if (subpath === '/analytics/trends') {
    const granularity = (queryParam(event, 'granularity') ||
      ANALYTICS_GRANULARITY.DAILY) as analytics.Granularity;
    if (!(VALID_GRANULARITIES as readonly string[]).includes(granularity)) {
      return resp.badRequest(
        `granularity must be one of: ${VALID_GRANULARITIES.join(', ')}`,
        requestOrigin
      );
    }
    const trends = await analytics.getTrends(dateRange, granularity);
    return resp.success(trends, undefined, requestOrigin);
  }

  // GET /admin/analytics/lead-sources
  if (subpath === '/analytics/lead-sources') {
    const metrics = await analytics.getLeadSourceAttribution(dateRange);
    return resp.success(metrics, undefined, requestOrigin);
  }

  return resp.notFound('Analytics endpoint not found', requestOrigin);
}

// ---------------------------------------------------------------------------
// GDPR Routes (Task 7)
// ---------------------------------------------------------------------------

async function handleGdprRoutes(
  event: APIGatewayProxyEventV2,
  subpath: string,
  method: string,
  canWrite: boolean,
  adminEmailHash: string,
  requestOrigin?: string
): Promise<APIGatewayProxyResultV2> {
  const doc = getDocClient();

  // POST /admin/gdpr/erasure
  if (subpath === '/gdpr/erasure' && method === 'POST') {
    if (!canWrite) return resp.forbidden(undefined, requestOrigin);
    const body = parseBody(event);
    if (body === null) return resp.badRequest('Invalid JSON in request body', requestOrigin);
    const emailHash = body.emailHash as string | undefined;
    if (!emailHash) return resp.badRequest('emailHash is required', requestOrigin);

    // Find all leads matching the email hash
    const results = await doc.send(
      new ScanCommand({
        TableName: getPlatformLeadsTableName(),
        FilterExpression: `begins_with(pk, :prefix) AND sk = :meta AND emailHash = :eh`,
        ExpressionAttributeValues: {
          ':prefix': DB_PREFIXES.LEAD,
          ':meta': DB_SORT_KEYS.META,
          ':eh': emailHash,
        },
      })
    );

    const leads = results.Items || [];
    let redacted = 0;

    for (const lead of leads) {
      try {
        await doc.send(
          new UpdateCommand({
            TableName: getPlatformLeadsTableName(),
            Key: { pk: lead.pk, sk: lead.sk },
            UpdateExpression: `SET #name = :redacted, email = :redacted, phone = :redacted,
              #msg = :redacted, #ip = :redacted, userAgent = :redacted`,
            ExpressionAttributeNames: {
              '#name': 'name',
              '#msg': 'message',
              '#ip': 'ipHash',
            },
            ExpressionAttributeValues: {
              ':redacted': '[REDACTED]',
            },
          })
        );
        redacted++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        log.error('gdpr.erasure.leadFailed', { pk: lead.pk as string, error: msg });
      }
    }

    // Log erasure request in audit table
    await recordAudit({
      actorId: adminEmailHash,
      actorType: ACTOR_TYPES.ADMIN,
      action: 'gdpr.erasure',
      resourceType: 'lead',
      resourceId: emailHash,
      details: { leadsFound: leads.length, leadsRedacted: redacted },
      ipHash: getIpHash(event),
    });

    return resp.success(
      {
        emailHash,
        leadsFound: leads.length,
        leadsRedacted: redacted,
      },
      undefined,
      requestOrigin
    );
  }

  // GET /admin/gdpr/export/:emailHash
  if (/^\/gdpr\/export\/[^/]+$/.test(subpath) && method === 'GET') {
    const emailHash = pathParam(event, 3); // admin/gdpr/export/<emailHash>

    // Find all leads matching the email hash
    const results = await doc.send(
      new ScanCommand({
        TableName: getPlatformLeadsTableName(),
        FilterExpression: `begins_with(pk, :prefix) AND sk = :meta AND emailHash = :eh`,
        ExpressionAttributeValues: {
          ':prefix': DB_PREFIXES.LEAD,
          ':meta': DB_SORT_KEYS.META,
          ':eh': emailHash,
        },
      })
    );

    const leads = (results.Items || []).map((item) => ({
      leadId: item.leadId,
      funnelId: item.funnelId,
      name: item.name,
      email: item.email,
      phone: item.phone,
      status: item.status,
      notes: item.notes,
      tags: item.tags,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      orgId: item.orgId,
    }));

    await recordAudit({
      actorId: adminEmailHash,
      actorType: ACTOR_TYPES.ADMIN,
      action: 'gdpr.export',
      resourceType: 'lead',
      resourceId: emailHash,
      details: { leadsFound: leads.length },
      ipHash: getIpHash(event),
    });

    return resp.success(
      {
        emailHash,
        exportedAt: new Date().toISOString(),
        leads,
      },
      undefined,
      requestOrigin
    );
  }

  return resp.notFound('GDPR endpoint not found', requestOrigin);
}

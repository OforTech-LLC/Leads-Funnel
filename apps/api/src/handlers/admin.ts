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
import { PutCommand, ScanCommand, UpdateCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { getDocClient, tableName } from '../lib/db/client.js';
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

// Fix 7: Align with LeadStatus type from leads.ts (includes 'booked')
const VALID_LEAD_STATUSES: leadsDb.LeadStatus[] = [
  'new',
  'assigned',
  'contacted',
  'qualified',
  'converted',
  'lost',
  'dnc',
  'quarantined',
  'unassigned',
  'booked',
];

const BULK_UPDATE_MAX = 100;

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
function checkBodySize(event: APIGatewayProxyEventV2): APIGatewayProxyResultV2 | null {
  const method = event.requestContext.http.method;
  if (method === 'GET' || method === 'DELETE' || method === 'OPTIONS') return null;

  const body = event.body;
  if (!body) return null;

  const byteSize = Buffer.byteLength(body, 'utf8');
  if (byteSize > MAX_BODY_SIZE) {
    log.warn('admin.bodyTooLarge', { size: byteSize, limit: MAX_BODY_SIZE });
    return resp.payloadTooLarge();
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

  if (method === 'OPTIONS') {
    return resp.noContent();
  }

  // Issue #1: Enforce 1 MB body size limit before any processing
  const sizeCheck = checkBodySize(event);
  if (sizeCheck) return sizeCheck;

  // Authenticate
  let admin;
  try {
    admin = await authenticateAdmin(event);
  } catch (err) {
    if (err instanceof AuthError) {
      return resp.error('AUTH_ERROR', err.message, err.statusCode);
    }
    return resp.unauthorized();
  }

  // Strip /admin prefix for routing
  const subpath = path.replace(/^\/admin/, '');
  const canWrite = canAdminWrite(admin.role);

  try {
    // ---- WEBHOOKS (feature-flagged) ----
    if (subpath.startsWith('/webhooks')) {
      const webhooksEnabled = await isFeatureEnabled('webhooks_enabled');
      if (!webhooksEnabled) return resp.notFound('Endpoint not found');
      const result = await handleWebhookRoutes(event, subpath, method, canWrite);
      if (result) return result;
    }

    // ---- FEATURE FLAGS ----
    if (subpath === '/flags' && method === 'GET') {
      const flags = await getAllFlags();
      return resp.success(flags);
    }

    if (subpath === '/flags' && method === 'PATCH') {
      if (!canWrite) return resp.forbidden();
      const body = parseBody(event);
      if (body === null) return resp.badRequest('Invalid JSON in request body');

      const { flag, enabled } = body;
      if (!flag || typeof enabled !== 'boolean') {
        return resp.badRequest('flag (string) and enabled (boolean) are required');
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

        return resp.success({ success: true });
      } catch (err) {
        log.error('flag.update.error', { error: err });
        return resp.internalError('Failed to update feature flag');
      }
    }

    // ---- ANALYTICS ----
    if (subpath.startsWith('/analytics/')) {
      return await handleAnalyticsRoutes(event, subpath, method);
    }

    // ---- GDPR ----
    if (subpath.startsWith('/gdpr/')) {
      return await handleGdprRoutes(event, subpath, method, canWrite, admin.emailHash);
    }

    // ---- ORGS ----
    if (subpath === '/orgs' && method === 'POST') {
      if (!canWrite) return resp.forbidden();
      const body = parseBody(event);
      if (body === null) return resp.badRequest('Invalid JSON in request body');
      if (!body.name || !body.slug || !body.contactEmail) {
        return resp.badRequest('name, slug, and contactEmail are required');
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
      return resp.created(org);
    }

    if (subpath === '/orgs' && method === 'GET') {
      const result = await orgsDb.listOrgs(
        queryParam(event, 'cursor'),
        Number(queryParam(event, 'limit')) || 25
      );
      return resp.paginated(result.items, {
        nextCursor: result.nextCursor,
        hasMore: !!result.nextCursor,
      });
    }

    if (/^\/orgs\/[^/]+$/.test(subpath) && method === 'GET') {
      const orgId = pathParam(event, 2); // admin/orgs/<orgId>
      const org = await orgsDb.getOrg(orgId);
      if (!org) return resp.notFound('Organization not found');
      return resp.success(org);
    }

    if (/^\/orgs\/[^/]+$/.test(subpath) && method === 'PUT') {
      if (!canWrite) return resp.forbidden();
      const orgId = pathParam(event, 2);
      const body = parseBody(event);
      if (body === null) return resp.badRequest('Invalid JSON in request body');
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
      return resp.success(updated);
    }

    if (/^\/orgs\/[^/]+$/.test(subpath) && method === 'DELETE') {
      if (!canWrite) return resp.forbidden();
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
      return resp.noContent();
    }

    // ---- USERS ----
    if (subpath === '/users' && method === 'POST') {
      if (!canWrite) return resp.forbidden();
      const body = parseBody(event);
      if (body === null) return resp.badRequest('Invalid JSON in request body');
      if (!body.email || !body.name) {
        return resp.badRequest('email and name are required');
      }
      const user = await usersDb.createUser({
        email: body.email as string,
        name: body.name as string,
        cognitoSub: body.cognitoSub as string | undefined,
        phone: body.phone as string | undefined,
        avatarUrl: body.avatarUrl as string | undefined,
        preferences: body.preferences as Record<string, unknown> | undefined,
      });
      await recordAudit({
        actorId: admin.emailHash,
        actorType: ACTOR_TYPES.ADMIN,
        action: 'user.create',
        resourceType: 'user',
        resourceId: user.userId,
        ipHash: getIpHash(event),
      });
      return resp.created(user);
    }

    if (subpath === '/users' && method === 'GET') {
      const result = await usersDb.listUsers(
        queryParam(event, 'cursor'),
        Number(queryParam(event, 'limit')) || 25
      );
      return resp.paginated(result.items, {
        nextCursor: result.nextCursor,
        hasMore: !!result.nextCursor,
      });
    }

    if (/^\/users\/[^/]+$/.test(subpath) && method === 'GET') {
      const userId = pathParam(event, 2);
      const user = await usersDb.getUser(userId);
      if (!user) return resp.notFound('User not found');
      return resp.success(user);
    }

    if (/^\/users\/[^/]+$/.test(subpath) && method === 'PUT') {
      if (!canWrite) return resp.forbidden();
      const userId = pathParam(event, 2);
      const body = parseBody(event);
      if (body === null) return resp.badRequest('Invalid JSON in request body');
      const updated = await usersDb.updateUser({
        userId,
        email: body.email as string | undefined,
        name: body.name as string | undefined,
        cognitoSub: body.cognitoSub as string | undefined,
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
      return resp.success(updated);
    }

    if (/^\/users\/[^/]+$/.test(subpath) && method === 'DELETE') {
      if (!canWrite) return resp.forbidden();
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
      return resp.noContent();
    }

    // ---- MEMBERS ----
    if (/^\/orgs\/[^/]+\/members$/.test(subpath) && method === 'POST') {
      if (!canWrite) return resp.forbidden();
      const orgId = pathParam(event, 2);
      const body = parseBody(event);
      if (body === null) return resp.badRequest('Invalid JSON in request body');
      if (!body.userId || !body.role) {
        return resp.badRequest('userId and role are required');
      }
      // Validate membership role
      if (!VALID_MEMBERSHIP_ROLES.includes(body.role as string)) {
        return resp.badRequest(
          `Invalid role. Must be one of: ${VALID_MEMBERSHIP_ROLES.join(', ')}`
        );
      }
      const membership = await membershipsDb.addMember({
        orgId,
        userId: body.userId as string,
        role: body.role as membershipsDb.MembershipRole,
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
      return resp.created(membership);
    }

    if (/^\/orgs\/[^/]+\/members$/.test(subpath) && method === 'GET') {
      const orgId = pathParam(event, 2);
      const result = await membershipsDb.listOrgMembers(
        orgId,
        queryParam(event, 'cursor'),
        Number(queryParam(event, 'limit')) || 50
      );
      return resp.paginated(result.items, {
        nextCursor: result.nextCursor,
        hasMore: !!result.nextCursor,
      });
    }

    if (/^\/orgs\/[^/]+\/members\/[^/]+$/.test(subpath) && method === 'PUT') {
      if (!canWrite) return resp.forbidden();
      const orgId = pathParam(event, 2);
      const userId = pathParam(event, 4); // admin/orgs/<orgId>/members/<userId>
      const body = parseBody(event);
      if (body === null) return resp.badRequest('Invalid JSON in request body');
      // Validate membership role if provided
      if (body.role && !VALID_MEMBERSHIP_ROLES.includes(body.role as string)) {
        return resp.badRequest(
          `Invalid role. Must be one of: ${VALID_MEMBERSHIP_ROLES.join(', ')}`
        );
      }
      const updated = await membershipsDb.updateMember({
        orgId,
        userId,
        role: body.role as membershipsDb.MembershipRole | undefined,
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
      return resp.success(updated);
    }

    if (/^\/orgs\/[^/]+\/members\/[^/]+$/.test(subpath) && method === 'DELETE') {
      if (!canWrite) return resp.forbidden();
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
      return resp.noContent();
    }

    // ---- RULES ----
    if (subpath === '/rules' && method === 'POST') {
      if (!canWrite) return resp.forbidden();
      const body = parseBody(event);
      if (body === null) return resp.badRequest('Invalid JSON in request body');
      if (!body.funnelId || !body.orgId || !body.name || body.priority === undefined) {
        return resp.badRequest('funnelId, orgId, name, priority, and zipPatterns are required');
      }
      const rule = await rulesDb.createRule({
        funnelId: body.funnelId as string,
        orgId: body.orgId as string,
        name: body.name as string,
        priority: body.priority as number,
        zipPatterns: (body.zipPatterns as string[]) || [],
        dailyCap: (body.dailyCap as number) || 0,
        isActive: body.isActive as boolean | undefined,
      });
      await recordAudit({
        actorId: admin.emailHash,
        actorType: ACTOR_TYPES.ADMIN,
        action: 'rule.create',
        resourceType: 'rule',
        resourceId: rule.ruleId,
        ipHash: getIpHash(event),
      });
      return resp.created(rule);
    }

    if (subpath === '/rules' && method === 'GET') {
      const funnelId = queryParam(event, 'funnelId');
      const result = await rulesDb.listRules(
        funnelId,
        queryParam(event, 'cursor'),
        Number(queryParam(event, 'limit')) || 50
      );
      return resp.paginated(result.items, {
        nextCursor: result.nextCursor,
        hasMore: !!result.nextCursor,
      });
    }

    if (/^\/rules\/test$/.test(subpath) && method === 'POST') {
      const body = parseBody(event);
      if (body === null) return resp.badRequest('Invalid JSON in request body');
      const funnelId = body.funnelId as string;
      const zipCode = body.zipCode as string;
      if (!funnelId) return resp.badRequest('funnelId is required');
      const rules = await rulesDb.getRulesByFunnel(funnelId);
      // Adapt to the matcher's expected AssignmentRule type from lib/types/events
      const adapted = rules.map((r) => ({
        ruleId: r.ruleId,
        funnelId: r.funnelId,
        targetType: 'ORG' as const,
        targetId: r.orgId,
        orgId: r.orgId,
        zipPatterns: r.zipPatterns,
        priority: r.priority,
        active: r.isActive,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }));
      const matched = matchLeadToRule(funnelId, zipCode || '', adapted);
      return resp.success({
        matched: matched
          ? { ruleId: matched.ruleId, orgId: matched.orgId, priority: matched.priority }
          : null,
        totalRulesEvaluated: rules.length,
      });
    }

    // ---- BULK RULES CREATE (Task 6) ----
    if (/^\/rules\/bulk-create$/.test(subpath) && method === 'POST') {
      if (!canWrite) return resp.forbidden();
      const body = parseBody(event);
      if (body === null) return resp.badRequest('Invalid JSON in request body');
      const ruleInputs = body.rules as Array<Record<string, unknown>> | undefined;
      if (!Array.isArray(ruleInputs) || ruleInputs.length === 0) {
        return resp.badRequest('rules array is required and must not be empty');
      }
      if (ruleInputs.length > BULK_UPDATE_MAX) {
        return resp.badRequest(`Maximum ${BULK_UPDATE_MAX} rules per bulk create`);
      }

      const created: unknown[] = [];
      const errors: Array<{ index: number; error: string }> = [];

      for (let i = 0; i < ruleInputs.length; i++) {
        const input = ruleInputs[i];
        try {
          if (!input.funnelId || !input.orgId || !input.name || input.priority === undefined) {
            errors.push({ index: i, error: 'funnelId, orgId, name, and priority are required' });
            continue;
          }
          const rule = await rulesDb.createRule({
            funnelId: input.funnelId as string,
            orgId: input.orgId as string,
            name: input.name as string,
            priority: input.priority as number,
            zipPatterns: (input.zipPatterns as string[]) || [],
            dailyCap: (input.dailyCap as number) || 0,
            isActive: input.isActive as boolean | undefined,
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

      return resp.success({
        created: created.length,
        failed: errors.length,
        errors,
        rules: created,
      });
    }

    if (/^\/rules\/[^/]+$/.test(subpath) && method === 'GET') {
      const ruleId = pathParam(event, 2);
      const rule = await rulesDb.getRule(ruleId);
      if (!rule) return resp.notFound('Rule not found');
      return resp.success(rule);
    }

    if (/^\/rules\/[^/]+$/.test(subpath) && method === 'PUT') {
      if (!canWrite) return resp.forbidden();
      const ruleId = pathParam(event, 2);
      const body = parseBody(event);
      if (body === null) return resp.badRequest('Invalid JSON in request body');
      const updated = await rulesDb.updateRule({
        ruleId,
        name: body.name as string | undefined,
        priority: body.priority as number | undefined,
        zipPatterns: body.zipPatterns as string[] | undefined,
        dailyCap: body.dailyCap as number | undefined,
        isActive: body.isActive as boolean | undefined,
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
      return resp.success(updated);
    }

    if (/^\/rules\/[^/]+$/.test(subpath) && method === 'DELETE') {
      if (!canWrite) return resp.forbidden();
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
      return resp.noContent();
    }

    // ---- LEADS ----
    if (subpath === '/leads/query' && method === 'POST') {
      const body = parseBody(event);
      if (body === null) return resp.badRequest('Invalid JSON in request body');
      const result = await leadsDb.queryLeads({
        funnelId: body.funnelId as string | undefined,
        orgId: body.orgId as string | undefined,
        status: body.status as leadsDb.LeadStatus | undefined,
        startDate: body.startDate as string | undefined,
        endDate: body.endDate as string | undefined,
        cursor: body.cursor as string | undefined,
        limit: body.limit as number | undefined,
      });
      return resp.paginated(result.items, {
        nextCursor: result.nextCursor,
        hasMore: !!result.nextCursor,
      });
    }

    // ---- BULK UPDATE LEADS (Task 6) ----
    if (subpath === '/leads/bulk-update' && method === 'POST') {
      if (!canWrite) return resp.forbidden();
      const body = parseBody(event);
      if (body === null) return resp.badRequest('Invalid JSON in request body');
      const updates = body.updates as
        | Array<{ funnelId: string; leadId: string; status: string }>
        | undefined;

      if (!Array.isArray(updates) || updates.length === 0) {
        return resp.badRequest('updates array is required');
      }
      if (updates.length > BULK_UPDATE_MAX) {
        return resp.badRequest(`Maximum ${BULK_UPDATE_MAX} items per bulk update`);
      }

      let succeeded = 0;
      let failed = 0;
      const errors: Array<{ funnelId: string; leadId: string; error: string }> = [];

      for (const item of updates) {
        if (!item.funnelId || !item.leadId || !item.status) {
          errors.push({
            funnelId: item.funnelId || '',
            leadId: item.leadId || '',
            error: 'funnelId, leadId, and status are required',
          });
          failed++;
          continue;
        }
        if (!VALID_LEAD_STATUSES.includes(item.status as leadsDb.LeadStatus)) {
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
            status: item.status as leadsDb.LeadStatus,
            force: true,
          });

          // Fire webhook for status change
          void emitLeadStatusChanged({
            leadId: item.leadId,
            funnelId: item.funnelId,
            oldStatus,
            newStatus: item.status,
            changedBy: admin.emailHash,
          });

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

      return resp.success({ succeeded, failed, errors });
    }

    // ---- BULK IMPORT LEADS (Task 6) ----
    if (subpath === '/leads/bulk-import' && method === 'POST') {
      if (!canWrite) return resp.forbidden();
      const body = parseBody(event);
      if (body === null) return resp.badRequest('Invalid JSON in request body');

      const csvData = body.csv as string | undefined;
      const funnelId = body.funnelId as string | undefined;

      if (!csvData || !funnelId) {
        return resp.badRequest('csv (string) and funnelId are required');
      }

      const lines = csvData
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length < 2) {
        return resp.badRequest('CSV must contain a header row and at least one data row');
      }

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const emailIdx = headers.indexOf('email');
      const nameIdx = headers.indexOf('name');
      const phoneIdx = headers.indexOf('phone');
      const messageIdx = headers.indexOf('message');

      if (emailIdx === -1) {
        return resp.badRequest('CSV must contain an email column');
      }

      let imported = 0;
      let failedCount = 0;
      const importErrors: Array<{ row: number; error: string }> = [];

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

      await recordAudit({
        actorId: admin.emailHash,
        actorType: ACTOR_TYPES.ADMIN,
        action: 'lead.bulkImport',
        resourceType: 'lead',
        resourceId: funnelId,
        details: { imported, failed: failedCount },
        ipHash: getIpHash(event),
      });

      return resp.success({ imported, failed: failedCount, errors: importErrors });
    }

    if (/^\/leads\/[^/]+\/[^/]+$/.test(subpath) && method === 'GET') {
      const funnelId = pathParam(event, 2);
      const leadId = pathParam(event, 3);
      const lead = await leadsDb.getLead(funnelId, leadId);
      if (!lead) return resp.notFound('Lead not found');
      return resp.success(lead);
    }

    if (/^\/leads\/[^/]+\/[^/]+$/.test(subpath) && method === 'PUT') {
      if (!canWrite) return resp.forbidden();
      const funnelId = pathParam(event, 2);
      const leadId = pathParam(event, 3);
      const body = parseBody(event);
      if (body === null) return resp.badRequest('Invalid JSON in request body');
      // Fix 7: Validate lead status against the actual LeadStatus type
      if (body.status && !VALID_LEAD_STATUSES.includes(body.status as leadsDb.LeadStatus)) {
        return resp.badRequest(`Invalid status. Must be one of: ${VALID_LEAD_STATUSES.join(', ')}`);
      }

      // Capture old status for webhook
      const existingLead = await leadsDb.getLead(funnelId, leadId);
      const oldStatus = existingLead?.status || 'unknown';

      // Pass force flag from body -- admin can override state machine
      const updated = await leadsDb.updateLead({
        funnelId,
        leadId,
        status: body.status as leadsDb.LeadStatus | undefined,
        orgId: body.orgId as string | undefined,
        assignedUserId: body.assignedUserId as string | undefined,
        ruleId: body.ruleId as string | undefined,
        notes: body.notes as string[] | undefined,
        tags: body.tags as string[] | undefined,
        force: body.force as boolean | undefined,
      });

      // Emit webhook for status change
      if (body.status && body.status !== oldStatus) {
        void emitLeadStatusChanged({
          leadId,
          funnelId,
          oldStatus,
          newStatus: body.status as string,
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
      return resp.success(updated);
    }

    if (/^\/leads\/[^/]+\/[^/]+\/reassign$/.test(subpath) && method === 'POST') {
      if (!canWrite) return resp.forbidden();
      const funnelId = pathParam(event, 2);
      const leadId = pathParam(event, 3);
      const body = parseBody(event);
      if (body === null) return resp.badRequest('Invalid JSON in request body');
      if (!body.orgId) return resp.badRequest('orgId is required');
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
      return resp.success(updated);
    }

    // ---- NOTIFICATIONS ----
    if (subpath === '/notifications' && method === 'GET') {
      const result = await notificationsDb.listNotifications(
        queryParam(event, 'cursor'),
        Number(queryParam(event, 'limit')) || 50,
        queryParam(event, 'startDate'),
        queryParam(event, 'endDate')
      );
      return resp.paginated(result.items, {
        nextCursor: result.nextCursor,
        hasMore: !!result.nextCursor,
      });
    }

    // ---- EXPORTS ----
    if (subpath === '/exports' && method === 'POST') {
      if (!canWrite) return resp.forbidden();
      const body = parseBody(event);
      if (body === null) return resp.badRequest('Invalid JSON in request body');
      if (!body.format) return resp.badRequest('format is required (csv, xlsx, json)');

      // Rate limit: check for pending exports by this admin
      const pendingExports = await exportsDb.listExports();
      const myPending = pendingExports.items.filter(
        (e) => e.requestedBy === admin.emailHash && e.status === 'pending'
      );
      if (myPending.length >= 3) {
        return resp.error(
          'RATE_LIMITED',
          'Too many pending exports. Please wait for current exports to complete.',
          HTTP_STATUS.RATE_LIMITED
        );
      }

      // Fix 4: Atomic throttle to prevent TOCTOU race condition
      const doc = getDocClient();
      const throttleKey = `${DB_PREFIXES.EXPORT_THROTTLE}${admin.emailHash}`;
      try {
        await doc.send(
          new PutCommand({
            TableName: tableName(),
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
            HTTP_STATUS.RATE_LIMITED
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
      return resp.created(job);
    }

    if (subpath === '/exports' && method === 'GET') {
      const result = await exportsDb.listExports(
        queryParam(event, 'cursor'),
        Number(queryParam(event, 'limit')) || 25
      );
      return resp.paginated(result.items, {
        nextCursor: result.nextCursor,
        hasMore: !!result.nextCursor,
      });
    }

    if (/^\/exports\/[^/]+\/download$/.test(subpath) && method === 'GET') {
      const exportId = pathParam(event, 2);
      const job = await exportsDb.getExport(exportId);
      if (!job) return resp.notFound('Export not found');
      if (job.status !== 'completed' || !job.s3Key) {
        return resp.badRequest('Export not ready for download');
      }
      // Fix 5: Verify the requesting admin owns this export or has write permissions
      if (job.requestedBy !== admin.emailHash && !canWrite) {
        return resp.forbidden('You can only download your own exports');
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
      return resp.success({ url, expiresIn: 3600 });
    }

    return resp.notFound('Admin endpoint not found');
  } catch (err) {
    // Handle ValidationError from the lead status state machine
    if (err instanceof ValidationError) {
      return resp.badRequest(err.message);
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
      return resp.conflict('Resource conflict or not found');
    }

    return resp.internalError();
  }
}

// ---------------------------------------------------------------------------
// Analytics Routes (Task 5)
// ---------------------------------------------------------------------------

async function handleAnalyticsRoutes(
  event: APIGatewayProxyEventV2,
  subpath: string,
  method: string
): Promise<APIGatewayProxyResultV2> {
  if (method !== 'GET') return resp.notFound('Analytics endpoint not found');

  const startDate =
    queryParam(event, 'startDate') || new Date(Date.now() - 30 * 86400000).toISOString();
  const endDate = queryParam(event, 'endDate') || new Date().toISOString();
  const dateRange: analytics.DateRange = { startDate, endDate };

  // GET /admin/analytics/overview
  if (subpath === '/analytics/overview') {
    const metrics = await analytics.getOverviewMetrics(dateRange);
    return resp.success(metrics);
  }

  // GET /admin/analytics/funnels
  if (subpath === '/analytics/funnels') {
    const metrics = await analytics.getFunnelMetrics(dateRange);
    return resp.success(metrics);
  }

  // GET /admin/analytics/orgs
  if (subpath === '/analytics/orgs') {
    const metrics = await analytics.getOrgMetrics(dateRange);
    return resp.success(metrics);
  }

  // GET /admin/analytics/trends
  if (subpath === '/analytics/trends') {
    const granularity = (queryParam(event, 'granularity') ||
      ANALYTICS_GRANULARITY.DAILY) as analytics.Granularity;
    if (!(VALID_GRANULARITIES as readonly string[]).includes(granularity)) {
      return resp.badRequest(`granularity must be one of: ${VALID_GRANULARITIES.join(', ')}`);
    }
    const trends = await analytics.getTrends(dateRange, granularity);
    return resp.success(trends);
  }

  // GET /admin/analytics/lead-sources
  if (subpath === '/analytics/lead-sources') {
    const metrics = await analytics.getLeadSourceAttribution(dateRange);
    return resp.success(metrics);
  }

  return resp.notFound('Analytics endpoint not found');
}

// ---------------------------------------------------------------------------
// GDPR Routes (Task 7)
// ---------------------------------------------------------------------------

async function handleGdprRoutes(
  event: APIGatewayProxyEventV2,
  subpath: string,
  method: string,
  canWrite: boolean,
  adminEmailHash: string
): Promise<APIGatewayProxyResultV2> {
  const doc = getDocClient();

  // POST /admin/gdpr/erasure
  if (subpath === '/gdpr/erasure' && method === 'POST') {
    if (!canWrite) return resp.forbidden();
    const body = parseBody(event);
    if (body === null) return resp.badRequest('Invalid JSON in request body');
    const emailHash = body.emailHash as string | undefined;
    if (!emailHash) return resp.badRequest('emailHash is required');

    // Find all leads matching the email hash
    const results = await doc.send(
      new ScanCommand({
        TableName: tableName(),
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
            TableName: tableName(),
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

    return resp.success({
      emailHash,
      leadsFound: leads.length,
      leadsRedacted: redacted,
    });
  }

  // GET /admin/gdpr/export/:emailHash
  if (/^\/gdpr\/export\/[^/]+$/.test(subpath) && method === 'GET') {
    const emailHash = pathParam(event, 3); // admin/gdpr/export/<emailHash>

    // Find all leads matching the email hash
    const results = await doc.send(
      new ScanCommand({
        TableName: tableName(),
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

    return resp.success({
      emailHash,
      exportedAt: new Date().toISOString(),
      leads,
    });
  }

  return resp.notFound('GDPR endpoint not found');
}

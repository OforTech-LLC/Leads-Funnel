/**
 * Admin API Handler
 *
 * Handles all /admin/* endpoints. Requires admin JWT authentication
 * and checks the enable_admin_console feature flag.
 *
 * Endpoints:
 *   POST/GET/PUT/DELETE /admin/orgs
 *   POST/GET/PUT/DELETE /admin/users
 *   POST/PUT/DELETE/GET /admin/orgs/:orgId/members
 *   POST/GET/PUT/DELETE /admin/rules
 *   POST /admin/rules/test
 *   POST /admin/leads/query
 *   GET/PUT /admin/leads/:funnelId/:leadId
 *   POST /admin/leads/:funnelId/:leadId/reassign
 *   GET /admin/notifications
 *   POST/GET /admin/exports
 *   GET /admin/exports/:exportId/download
 */

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { authenticateAdmin, AuthError } from '../lib/auth/admin-auth.js';
import { canAdminWrite } from '../lib/auth/permissions.js';
import { recordAudit } from '../lib/db/audit.js';
import { sha256 } from '../lib/hash.js';
import * as orgsDb from '../lib/db/orgs.js';
import * as usersDb from '../lib/db/users.js';
import * as membershipsDb from '../lib/db/memberships.js';
import * as rulesDb from '../lib/db/rules.js';
import * as leadsDb from '../lib/db/leads.js';
import * as notificationsDb from '../lib/db/notifications.js';
import * as exportsDb from '../lib/db/exports.js';
import * as resp from '../lib/response.js';
import { matchLeadToRule } from '../lib/assignment/matcher.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseBody(event: APIGatewayProxyEventV2): Record<string, unknown> {
  if (!event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch {
    return {};
  }
}

function pathParam(event: APIGatewayProxyEventV2, position: number): string {
  // path looks like /admin/orgs/abc123
  const parts = (event.requestContext.http.path || '').split('/').filter(Boolean);
  return parts[position] || '';
}

function qp(event: APIGatewayProxyEventV2, key: string): string | undefined {
  return event.queryStringParameters?.[key];
}

function getIpHash(event: APIGatewayProxyEventV2): string {
  const ip = event.requestContext?.http?.sourceIp || '';
  return sha256(ip);
}

// ---------------------------------------------------------------------------
// Main Handler
// ---------------------------------------------------------------------------

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const method = event.requestContext.http.method;
  const path = event.requestContext.http.path;

  if (method === 'OPTIONS') {
    return resp.noContent();
  }

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

  try {
    // ---- ORGS ----
    if (subpath === '/orgs' && method === 'POST') {
      if (!canAdminWrite(admin.role)) return resp.forbidden();
      const body = parseBody(event);
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
        actorType: 'admin',
        action: 'org.create',
        resourceType: 'org',
        resourceId: org.orgId,
        ipHash: getIpHash(event),
      });
      return resp.created(org);
    }

    if (subpath === '/orgs' && method === 'GET') {
      const result = await orgsDb.listOrgs(qp(event, 'cursor'), Number(qp(event, 'limit')) || 25);
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
      if (!canAdminWrite(admin.role)) return resp.forbidden();
      const orgId = pathParam(event, 2);
      const body = parseBody(event);
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
      await recordAudit({
        actorId: admin.emailHash,
        actorType: 'admin',
        action: 'org.update',
        resourceType: 'org',
        resourceId: orgId,
        details: body,
        ipHash: getIpHash(event),
      });
      return resp.success(updated);
    }

    if (/^\/orgs\/[^/]+$/.test(subpath) && method === 'DELETE') {
      if (!canAdminWrite(admin.role)) return resp.forbidden();
      const orgId = pathParam(event, 2);
      await orgsDb.softDeleteOrg(orgId);
      await recordAudit({
        actorId: admin.emailHash,
        actorType: 'admin',
        action: 'org.delete',
        resourceType: 'org',
        resourceId: orgId,
        ipHash: getIpHash(event),
      });
      return resp.noContent();
    }

    // ---- USERS ----
    if (subpath === '/users' && method === 'POST') {
      if (!canAdminWrite(admin.role)) return resp.forbidden();
      const body = parseBody(event);
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
        actorType: 'admin',
        action: 'user.create',
        resourceType: 'user',
        resourceId: user.userId,
        ipHash: getIpHash(event),
      });
      return resp.created(user);
    }

    if (subpath === '/users' && method === 'GET') {
      const result = await usersDb.listUsers(qp(event, 'cursor'), Number(qp(event, 'limit')) || 25);
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
      if (!canAdminWrite(admin.role)) return resp.forbidden();
      const userId = pathParam(event, 2);
      const body = parseBody(event);
      const updated = await usersDb.updateUser({
        userId,
        email: body.email as string | undefined,
        name: body.name as string | undefined,
        cognitoSub: body.cognitoSub as string | undefined,
        phone: body.phone as string | undefined,
        avatarUrl: body.avatarUrl as string | undefined,
        preferences: body.preferences as Record<string, unknown> | undefined,
      });
      await recordAudit({
        actorId: admin.emailHash,
        actorType: 'admin',
        action: 'user.update',
        resourceType: 'user',
        resourceId: userId,
        details: body,
        ipHash: getIpHash(event),
      });
      return resp.success(updated);
    }

    if (/^\/users\/[^/]+$/.test(subpath) && method === 'DELETE') {
      if (!canAdminWrite(admin.role)) return resp.forbidden();
      const userId = pathParam(event, 2);
      await usersDb.softDeleteUser(userId);
      await recordAudit({
        actorId: admin.emailHash,
        actorType: 'admin',
        action: 'user.delete',
        resourceType: 'user',
        resourceId: userId,
        ipHash: getIpHash(event),
      });
      return resp.noContent();
    }

    // ---- MEMBERS ----
    if (/^\/orgs\/[^/]+\/members$/.test(subpath) && method === 'POST') {
      if (!canAdminWrite(admin.role)) return resp.forbidden();
      const orgId = pathParam(event, 2);
      const body = parseBody(event);
      if (!body.userId || !body.role) {
        return resp.badRequest('userId and role are required');
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
        actorType: 'admin',
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
        qp(event, 'cursor'),
        Number(qp(event, 'limit')) || 50
      );
      return resp.paginated(result.items, {
        nextCursor: result.nextCursor,
        hasMore: !!result.nextCursor,
      });
    }

    if (/^\/orgs\/[^/]+\/members\/[^/]+$/.test(subpath) && method === 'PUT') {
      if (!canAdminWrite(admin.role)) return resp.forbidden();
      const orgId = pathParam(event, 2);
      const userId = pathParam(event, 4); // admin/orgs/<orgId>/members/<userId>
      const body = parseBody(event);
      const updated = await membershipsDb.updateMember({
        orgId,
        userId,
        role: body.role as membershipsDb.MembershipRole | undefined,
        notifyEmail: body.notifyEmail as boolean | undefined,
        notifySms: body.notifySms as boolean | undefined,
      });
      await recordAudit({
        actorId: admin.emailHash,
        actorType: 'admin',
        action: 'member.update',
        resourceType: 'membership',
        resourceId: `${orgId}:${userId}`,
        details: body,
        ipHash: getIpHash(event),
      });
      return resp.success(updated);
    }

    if (/^\/orgs\/[^/]+\/members\/[^/]+$/.test(subpath) && method === 'DELETE') {
      if (!canAdminWrite(admin.role)) return resp.forbidden();
      const orgId = pathParam(event, 2);
      const userId = pathParam(event, 4);
      await membershipsDb.removeMember(orgId, userId);
      await recordAudit({
        actorId: admin.emailHash,
        actorType: 'admin',
        action: 'member.remove',
        resourceType: 'membership',
        resourceId: `${orgId}:${userId}`,
        ipHash: getIpHash(event),
      });
      return resp.noContent();
    }

    // ---- RULES ----
    if (subpath === '/rules' && method === 'POST') {
      if (!canAdminWrite(admin.role)) return resp.forbidden();
      const body = parseBody(event);
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
        actorType: 'admin',
        action: 'rule.create',
        resourceType: 'rule',
        resourceId: rule.ruleId,
        ipHash: getIpHash(event),
      });
      return resp.created(rule);
    }

    if (subpath === '/rules' && method === 'GET') {
      const funnelId = qp(event, 'funnelId');
      const result = await rulesDb.listRules(
        funnelId,
        qp(event, 'cursor'),
        Number(qp(event, 'limit')) || 50
      );
      return resp.paginated(result.items, {
        nextCursor: result.nextCursor,
        hasMore: !!result.nextCursor,
      });
    }

    if (/^\/rules\/test$/.test(subpath) && method === 'POST') {
      const body = parseBody(event);
      const funnelId = body.funnelId as string;
      const zipCode = body.zipCode as string;
      if (!funnelId) return resp.badRequest('funnelId is required');
      const rules = await rulesDb.getRulesByFunnel(funnelId);
      // Adapt to the matcher's expected AssignmentRule type from workers/types
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

    if (/^\/rules\/[^/]+$/.test(subpath) && method === 'GET') {
      const ruleId = pathParam(event, 2);
      const rule = await rulesDb.getRule(ruleId);
      if (!rule) return resp.notFound('Rule not found');
      return resp.success(rule);
    }

    if (/^\/rules\/[^/]+$/.test(subpath) && method === 'PUT') {
      if (!canAdminWrite(admin.role)) return resp.forbidden();
      const ruleId = pathParam(event, 2);
      const body = parseBody(event);
      const updated = await rulesDb.updateRule({
        ruleId,
        name: body.name as string | undefined,
        priority: body.priority as number | undefined,
        zipPatterns: body.zipPatterns as string[] | undefined,
        dailyCap: body.dailyCap as number | undefined,
        isActive: body.isActive as boolean | undefined,
      });
      await recordAudit({
        actorId: admin.emailHash,
        actorType: 'admin',
        action: 'rule.update',
        resourceType: 'rule',
        resourceId: ruleId,
        details: body,
        ipHash: getIpHash(event),
      });
      return resp.success(updated);
    }

    if (/^\/rules\/[^/]+$/.test(subpath) && method === 'DELETE') {
      if (!canAdminWrite(admin.role)) return resp.forbidden();
      const ruleId = pathParam(event, 2);
      await rulesDb.softDeleteRule(ruleId);
      await recordAudit({
        actorId: admin.emailHash,
        actorType: 'admin',
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

    if (/^\/leads\/[^/]+\/[^/]+$/.test(subpath) && method === 'GET') {
      const funnelId = pathParam(event, 2);
      const leadId = pathParam(event, 3);
      const lead = await leadsDb.getLead(funnelId, leadId);
      if (!lead) return resp.notFound('Lead not found');
      return resp.success(lead);
    }

    if (/^\/leads\/[^/]+\/[^/]+$/.test(subpath) && method === 'PUT') {
      if (!canAdminWrite(admin.role)) return resp.forbidden();
      const funnelId = pathParam(event, 2);
      const leadId = pathParam(event, 3);
      const body = parseBody(event);
      const updated = await leadsDb.updateLead({
        funnelId,
        leadId,
        status: body.status as leadsDb.LeadStatus | undefined,
        orgId: body.orgId as string | undefined,
        assignedUserId: body.assignedUserId as string | undefined,
        ruleId: body.ruleId as string | undefined,
        notes: body.notes as string[] | undefined,
        tags: body.tags as string[] | undefined,
      });
      await recordAudit({
        actorId: admin.emailHash,
        actorType: 'admin',
        action: 'lead.update',
        resourceType: 'lead',
        resourceId: `${funnelId}:${leadId}`,
        details: body,
        ipHash: getIpHash(event),
      });
      return resp.success(updated);
    }

    if (/^\/leads\/[^/]+\/[^/]+\/reassign$/.test(subpath) && method === 'POST') {
      if (!canAdminWrite(admin.role)) return resp.forbidden();
      const funnelId = pathParam(event, 2);
      const leadId = pathParam(event, 3);
      const body = parseBody(event);
      if (!body.orgId) return resp.badRequest('orgId is required');
      const updated = await leadsDb.reassignLead(
        funnelId,
        leadId,
        body.orgId as string,
        body.ruleId as string | undefined
      );
      await recordAudit({
        actorId: admin.emailHash,
        actorType: 'admin',
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
        qp(event, 'cursor'),
        Number(qp(event, 'limit')) || 50,
        qp(event, 'startDate'),
        qp(event, 'endDate')
      );
      return resp.paginated(result.items, {
        nextCursor: result.nextCursor,
        hasMore: !!result.nextCursor,
      });
    }

    // ---- EXPORTS ----
    if (subpath === '/exports' && method === 'POST') {
      if (!canAdminWrite(admin.role)) return resp.forbidden();
      const body = parseBody(event);
      if (!body.format) return resp.badRequest('format is required (csv, xlsx, json)');
      const job = await exportsDb.createExport({
        requestedBy: admin.emailHash,
        funnelId: body.funnelId as string | undefined,
        orgId: body.orgId as string | undefined,
        format: body.format as exportsDb.ExportFormat,
        filters: body.filters as Record<string, unknown> | undefined,
      });
      await recordAudit({
        actorId: admin.emailHash,
        actorType: 'admin',
        action: 'export.create',
        resourceType: 'export',
        resourceId: job.exportId,
        ipHash: getIpHash(event),
      });
      return resp.created(job);
    }

    if (subpath === '/exports' && method === 'GET') {
      const result = await exportsDb.listExports(
        qp(event, 'cursor'),
        Number(qp(event, 'limit')) || 25
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
      // Generate presigned URL
      const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
      const s3 = new S3Client({});
      const bucket = process.env.EXPORTS_BUCKET || '';
      const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: job.s3Key }), {
        expiresIn: 3600,
      });
      await recordAudit({
        actorId: admin.emailHash,
        actorType: 'admin',
        action: 'export.download',
        resourceType: 'export',
        resourceId: exportId,
        ipHash: getIpHash(event),
      });
      return resp.success({ url, expiresIn: 3600 });
    }

    return resp.notFound('Admin endpoint not found');
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.log(
      JSON.stringify({ level: 'error', message: 'admin.handler.error', error: msg, path, method })
    );

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

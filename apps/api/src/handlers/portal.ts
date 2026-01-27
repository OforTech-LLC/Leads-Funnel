/**
 * Portal API Handler
 *
 * Handles all /portal/* endpoints for organization agents/owners.
 * Requires portal JWT authentication and checks the enable_agent_portal flag.
 *
 * Endpoints:
 *   GET  /portal/me                              - Current user profile
 *   GET  /portal/org                             - User's primary org details
 *   GET  /portal/leads                           - List leads for user's org(s)
 *   GET  /portal/leads/:funnelId/:leadId         - Get single lead
 *   PUT  /portal/leads/:funnelId/:leadId/status  - Update lead status
 *   POST /portal/leads/:funnelId/:leadId/notes   - Add note to lead
 *   PUT  /portal/settings                        - Update user preferences
 */

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { authenticatePortal, checkLeadAccess, PortalAuthError } from '../lib/auth/portal-auth.js';
import { canPortalUpdateLead, canPortalViewAllOrgLeads } from '../lib/auth/permissions.js';
import type { MembershipRole } from '../lib/auth/permissions.js';
import { recordAudit } from '../lib/db/audit.js';
import * as usersDb from '../lib/db/users.js';
import * as orgsDb from '../lib/db/orgs.js';
import * as membershipsDb from '../lib/db/memberships.js';
import * as leadsDb from '../lib/db/leads.js';
import * as resp from '../lib/response.js';
import { sha256 } from '../lib/hash.js';

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
  const parts = (event.requestContext.http.path || '').split('/').filter(Boolean);
  return parts[position] || '';
}

function qp(event: APIGatewayProxyEventV2, key: string): string | undefined {
  return event.queryStringParameters?.[key];
}

function ipHash(event: APIGatewayProxyEventV2): string {
  const ip = event.requestContext?.http?.sourceIp || '';
  return sha256(ip);
}

/**
 * Get the user's membership role in a specific org.
 */
async function getMemberRole(userId: string, orgId: string): Promise<MembershipRole | null> {
  const m = await membershipsDb.getMember(orgId, userId);
  if (!m) return null;
  return m.role;
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
  let identity;
  try {
    identity = await authenticatePortal(event);
  } catch (err) {
    if (err instanceof PortalAuthError) {
      return resp.error('AUTH_ERROR', err.message, err.statusCode);
    }
    return resp.unauthorized();
  }

  const subpath = path.replace(/^\/portal/, '');

  try {
    // ---- ME ----
    if (subpath === '/me' && method === 'GET') {
      const user = await usersDb.getUser(identity.userId);
      if (!user) return resp.notFound('User not found');

      // Also get memberships
      const memberships = await membershipsDb.listUserOrgs(identity.userId);

      return resp.success({
        user: {
          userId: user.userId,
          email: user.email,
          name: user.name,
          phone: user.phone,
          avatarUrl: user.avatarUrl,
          preferences: user.preferences,
          createdAt: user.createdAt,
        },
        memberships: memberships.items.map((m) => ({
          orgId: m.orgId,
          role: m.role,
          notifyEmail: m.notifyEmail,
          notifySms: m.notifySms,
        })),
        primaryOrgId: identity.primaryOrgId,
      });
    }

    // ---- ORG ----
    if (subpath === '/org' && method === 'GET') {
      const orgId = qp(event, 'orgId') || identity.primaryOrgId;
      if (!orgId) return resp.badRequest('No org context');
      if (!identity.orgIds.includes(orgId)) return resp.forbidden('Not a member of this org');

      const org = await orgsDb.getOrg(orgId);
      if (!org) return resp.notFound('Organization not found');

      const members = await membershipsDb.listOrgMembers(orgId);

      return resp.success({
        org: {
          orgId: org.orgId,
          name: org.name,
          slug: org.slug,
          contactEmail: org.contactEmail,
          phone: org.phone,
          timezone: org.timezone,
          createdAt: org.createdAt,
        },
        members: members.items.map((m) => ({
          userId: m.userId,
          role: m.role,
          notifyEmail: m.notifyEmail,
          notifySms: m.notifySms,
          joinedAt: m.joinedAt,
        })),
      });
    }

    // ---- LEADS LIST ----
    if (subpath === '/leads' && method === 'GET') {
      const orgId = qp(event, 'orgId') || identity.primaryOrgId;
      if (!orgId) return resp.badRequest('No org context');
      if (!identity.orgIds.includes(orgId)) return resp.forbidden('Not a member of this org');

      const memberRole = await getMemberRole(identity.userId, orgId);
      if (!memberRole) return resp.forbidden('Not a member of this org');

      // Agents can only see their own assigned leads
      const isFullView = canPortalViewAllOrgLeads(memberRole);

      const result = await leadsDb.queryLeads({
        orgId,
        funnelId: qp(event, 'funnelId'),
        status: qp(event, 'status') as leadsDb.LeadStatus | undefined,
        startDate: qp(event, 'startDate'),
        endDate: qp(event, 'endDate'),
        cursor: qp(event, 'cursor'),
        limit: Number(qp(event, 'limit')) || 25,
      });

      let items = result.items;

      // Filter for agents: only show leads assigned to them
      if (!isFullView) {
        items = items.filter((lead) => lead.assignedUserId === identity.userId);
      }

      return resp.paginated(items, {
        nextCursor: result.nextCursor,
        hasMore: !!result.nextCursor,
      });
    }

    // ---- SINGLE LEAD ----
    if (/^\/leads\/[^/]+\/[^/]+$/.test(subpath) && method === 'GET') {
      const funnelId = pathParam(event, 2); // portal/leads/<funnelId>/<leadId>
      const leadId = pathParam(event, 3);
      const lead = await leadsDb.getLead(funnelId, leadId);
      if (!lead) return resp.notFound('Lead not found');

      // Check access
      if (!checkLeadAccess(identity, lead)) {
        return resp.forbidden('Not authorized to view this lead');
      }

      return resp.success(lead);
    }

    // ---- UPDATE LEAD STATUS ----
    if (/^\/leads\/[^/]+\/[^/]+\/status$/.test(subpath) && method === 'PUT') {
      const funnelId = pathParam(event, 2);
      const leadId = pathParam(event, 3);
      const body = parseBody(event);
      const newStatus = body.status as string | undefined;

      if (!newStatus) return resp.badRequest('status is required');

      const validStatuses: leadsDb.LeadStatus[] = [
        'new',
        'assigned',
        'contacted',
        'qualified',
        'converted',
        'lost',
        'dnc',
      ];
      if (!validStatuses.includes(newStatus as leadsDb.LeadStatus)) {
        return resp.badRequest(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }

      // Load lead and check access
      const lead = await leadsDb.getLead(funnelId, leadId);
      if (!lead) return resp.notFound('Lead not found');
      if (!checkLeadAccess(identity, lead)) {
        return resp.forbidden('Not authorized to update this lead');
      }

      // Check permission to update
      const orgId = lead.orgId || identity.primaryOrgId;
      const memberRole = await getMemberRole(identity.userId, orgId);
      if (!memberRole || !canPortalUpdateLead(memberRole)) {
        return resp.forbidden('Insufficient permissions to update lead');
      }

      const updated = await leadsDb.updateLead({
        funnelId,
        leadId,
        status: newStatus as leadsDb.LeadStatus,
      });

      await recordAudit({
        actorId: identity.userId,
        actorType: 'portal_user',
        action: 'lead.update',
        resourceType: 'lead',
        resourceId: `${funnelId}:${leadId}`,
        details: { status: newStatus },
        ipHash: ipHash(event),
      });

      return resp.success(updated);
    }

    // ---- ADD NOTE ----
    if (/^\/leads\/[^/]+\/[^/]+\/notes$/.test(subpath) && method === 'POST') {
      const funnelId = pathParam(event, 2);
      const leadId = pathParam(event, 3);
      const body = parseBody(event);
      const note = body.note as string | undefined;

      if (!note || typeof note !== 'string' || note.trim().length === 0) {
        return resp.badRequest('note is required and must be non-empty');
      }

      // Load lead and check access
      const lead = await leadsDb.getLead(funnelId, leadId);
      if (!lead) return resp.notFound('Lead not found');
      if (!checkLeadAccess(identity, lead)) {
        return resp.forbidden('Not authorized to add notes to this lead');
      }

      const orgId = lead.orgId || identity.primaryOrgId;
      const memberRole = await getMemberRole(identity.userId, orgId);
      if (!memberRole || !canPortalUpdateLead(memberRole)) {
        return resp.forbidden('Insufficient permissions');
      }

      // Append note with timestamp and author
      const now = new Date().toISOString();
      const noteEntry = `[${now}] ${identity.email}: ${note.trim()}`;
      const existingNotes = lead.notes || [];
      const updatedNotes = [...existingNotes, noteEntry];

      const updated = await leadsDb.updateLead({
        funnelId,
        leadId,
        notes: updatedNotes,
      });

      await recordAudit({
        actorId: identity.userId,
        actorType: 'portal_user',
        action: 'lead.update',
        resourceType: 'lead',
        resourceId: `${funnelId}:${leadId}`,
        details: { addedNote: true },
        ipHash: ipHash(event),
      });

      return resp.success(updated);
    }

    // ---- UPDATE SETTINGS ----
    if (subpath === '/settings' && method === 'PUT') {
      const body = parseBody(event);

      // Update user preferences
      if (body.preferences) {
        await usersDb.updateUser({
          userId: identity.userId,
          preferences: body.preferences as Record<string, unknown>,
        });
      }

      // Update notification settings for a specific org
      if (body.orgId && (body.notifyEmail !== undefined || body.notifySms !== undefined)) {
        const orgId = body.orgId as string;
        if (!identity.orgIds.includes(orgId)) {
          return resp.forbidden('Not a member of this org');
        }

        await membershipsDb.updateMember({
          orgId,
          userId: identity.userId,
          notifyEmail: body.notifyEmail as boolean | undefined,
          notifySms: body.notifySms as boolean | undefined,
        });
      }

      await recordAudit({
        actorId: identity.userId,
        actorType: 'portal_user',
        action: 'settings.update',
        resourceType: 'user',
        resourceId: identity.userId,
        details: { keys: Object.keys(body) },
        ipHash: ipHash(event),
      });

      return resp.success({ updated: true });
    }

    return resp.notFound('Portal endpoint not found');
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.log(
      JSON.stringify({
        level: 'error',
        message: 'portal.handler.error',
        error: msg,
        path,
        method,
        userId: identity.userId,
      })
    );

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

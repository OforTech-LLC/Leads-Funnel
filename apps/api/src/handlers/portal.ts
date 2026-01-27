/**
 * Portal API Handler
 *
 * Handles all /portal/* endpoints for organization agents/owners.
 * Requires portal JWT authentication and checks the enable_agent_portal flag.
 *
 * Performance:
 *   - X-Request-Id header injected on every response for distributed tracing
 *   - All DynamoDB/S3/SSM calls use centralized clients with HTTP keep-alive
 *
 * Endpoints:
 *   GET  /portal/me                              - Current user profile
 *   GET  /portal/org                             - User's primary org details
 *   GET  /portal/leads                           - List leads for user's org(s)
 *   GET  /portal/leads/:funnelId/:leadId         - Get single lead
 *   PUT  /portal/leads/:funnelId/:leadId/status  - Update lead status
 *   POST /portal/leads/:funnelId/:leadId/notes   - Add note to lead
 *   PUT  /portal/settings                        - Update user preferences
 *
 * Feature-flagged endpoints:
 *   GET  /portal/billing                          - Current plan and usage
 *   GET  /portal/billing/invoices                 - Invoice history
 *   POST /portal/billing/upgrade                  - Change plan (stub)
 *   POST /portal/calendar/connect                 - Connect calendar provider
 *   GET  /portal/calendar/availability            - Get available slots
 *   POST /portal/calendar/book                    - Book appointment for lead
 *   DELETE /portal/calendar/disconnect            - Disconnect calendar
 *   POST /portal/integrations/slack               - Configure Slack webhook
 *   POST /portal/integrations/teams               - Configure Teams webhook
 *   DELETE /portal/integrations/:provider         - Remove integration
 *   POST /portal/integrations/:provider/test      - Test notification
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
import { parseBody, pathParam, queryParam, getIpHash } from '../lib/handler-utils.js';
import { createLogger } from '../lib/logging.js';
import { isFeatureEnabled, loadFeatureFlags } from '../lib/config.js';
import { emitLeadStatusChanged, emitLeadNoteAdded } from '../lib/events.js';

const log = createLogger('portal-handler');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_NOTE_LENGTH = 2000;
const MAX_NOTES_PER_LEAD = 100;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Get the user's membership role in a specific org.
 */
async function getMemberRole(userId: string, orgId: string): Promise<MembershipRole | null> {
  const m = await membershipsDb.getMember(orgId, userId);
  if (!m) return null;
  return m.role;
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
      'X-Request-Id': requestId,
    },
  };
}

// ---------------------------------------------------------------------------
// Main Handler (exported)
// ---------------------------------------------------------------------------

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const requestId = event.requestContext.requestId || '';
  const result = await handlePortalRequest(event);
  return injectRequestId(result, requestId);
}

// ---------------------------------------------------------------------------
// Portal request routing
// ---------------------------------------------------------------------------

async function handlePortalRequest(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
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
      const orgId = queryParam(event, 'orgId') || identity.primaryOrgId;
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
      const orgId = queryParam(event, 'orgId') || identity.primaryOrgId;
      if (!orgId) return resp.badRequest('No org context');
      if (!identity.orgIds.includes(orgId)) return resp.forbidden('Not a member of this org');

      const memberRole = await getMemberRole(identity.userId, orgId);
      if (!memberRole) return resp.forbidden('Not a member of this org');

      // Agents can only see their own assigned leads
      const isFullView = canPortalViewAllOrgLeads(memberRole);

      // Build query params - filter at DB level for agents
      const queryParams: leadsDb.QueryLeadsInput = {
        orgId,
        funnelId: queryParam(event, 'funnelId'),
        status: queryParam(event, 'status') as leadsDb.LeadStatus | undefined,
        startDate: queryParam(event, 'startDate'),
        endDate: queryParam(event, 'endDate'),
        cursor: queryParam(event, 'cursor'),
        limit: Number(queryParam(event, 'limit')) || 25,
      };

      // Pass assignedUserId filter to DB query for agents
      if (!isFullView) {
        queryParams.assignedUserId = identity.userId;
      }

      const result = await leadsDb.queryLeads(queryParams);

      return resp.paginated(result.items, {
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
      if (body === null) return resp.badRequest('Invalid JSON in request body');
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

      const oldStatus = lead.status;

      const updated = await leadsDb.updateLead({
        funnelId,
        leadId,
        status: newStatus as leadsDb.LeadStatus,
      });

      // Fire webhook for status change
      if (newStatus !== oldStatus) {
        void emitLeadStatusChanged({
          leadId,
          funnelId,
          oldStatus,
          newStatus,
          changedBy: identity.userId,
        });
      }

      await recordAudit({
        actorId: identity.userId,
        actorType: 'portal_user',
        action: 'lead.update',
        resourceType: 'lead',
        resourceId: `${funnelId}:${leadId}`,
        details: { status: newStatus },
        ipHash: getIpHash(event),
      });

      return resp.success(updated);
    }

    // ---- ADD NOTE ----
    if (/^\/leads\/[^/]+\/[^/]+\/notes$/.test(subpath) && method === 'POST') {
      const funnelId = pathParam(event, 2);
      const leadId = pathParam(event, 3);
      const body = parseBody(event);
      if (body === null) return resp.badRequest('Invalid JSON in request body');
      const note = body.note as string | undefined;

      if (!note || typeof note !== 'string' || note.trim().length === 0) {
        return resp.badRequest('note is required and must be non-empty');
      }

      // Fix 8: Enforce note length limit
      if (note.length > MAX_NOTE_LENGTH) {
        return resp.badRequest(`Note must be ${MAX_NOTE_LENGTH} characters or less`);
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

      // Fix 8: Enforce max notes count per lead
      const existingNotes = lead.notes || [];
      if (existingNotes.length >= MAX_NOTES_PER_LEAD) {
        return resp.badRequest(`Maximum of ${MAX_NOTES_PER_LEAD} notes per lead reached`);
      }

      // Append note with timestamp and author
      const now = new Date().toISOString();
      const noteEntry = `[${now}] ${identity.email}: ${note.trim()}`;
      const updatedNotes = [...existingNotes, noteEntry];

      const updated = await leadsDb.updateLead({
        funnelId,
        leadId,
        notes: updatedNotes,
      });

      // Fire webhook for note added
      void emitLeadNoteAdded({
        leadId,
        funnelId,
        addedBy: identity.userId,
      });

      await recordAudit({
        actorId: identity.userId,
        actorType: 'portal_user',
        action: 'lead.update',
        resourceType: 'lead',
        resourceId: `${funnelId}:${leadId}`,
        details: { addedNote: true },
        ipHash: getIpHash(event),
      });

      return resp.success(updated);
    }

    // ---- UPDATE SETTINGS ----
    if (subpath === '/settings' && method === 'PUT') {
      const body = parseBody(event);
      if (body === null) return resp.badRequest('Invalid JSON in request body');

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
        ipHash: getIpHash(event),
      });

      return resp.success({ updated: true });
    }

    // ---- BILLING (feature-flagged) ----
    if (subpath.startsWith('/billing')) {
      const billingEnabled = await isFeatureEnabled('billing_enabled');
      if (!billingEnabled) return resp.notFound('Endpoint not found');
      return await handleBillingRoutes(event, subpath, method, identity);
    }

    // ---- CALENDAR (feature-flagged) ----
    if (subpath.startsWith('/calendar')) {
      const calendarEnabled = await isFeatureEnabled('calendar_enabled');
      if (!calendarEnabled) return resp.notFound('Endpoint not found');
      return await handleCalendarRoutes(event, subpath, method, identity);
    }

    // ---- INTEGRATIONS: Slack/Teams (feature-flagged) ----
    if (subpath.startsWith('/integrations')) {
      return await handleIntegrationRoutes(event, subpath, method, identity);
    }

    return resp.notFound('Portal endpoint not found');
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    log.error('portal.handler.error', {
      error: msg,
      path,
      method,
      userId: identity.userId,
    });

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
// Billing Routes (Task 2)
// ---------------------------------------------------------------------------

async function handleBillingRoutes(
  event: APIGatewayProxyEventV2,
  subpath: string,
  method: string,
  identity: { userId: string; email: string; primaryOrgId: string; orgIds: string[] }
): Promise<APIGatewayProxyResultV2> {
  // Dynamic imports to avoid loading when disabled
  const { getBillingAccount, changePlan, getPlanDetails } =
    await import('../lib/billing/accounts.js');
  const { getCurrentUsage } = await import('../lib/billing/metering.js');
  const { getStripeService } = await import('../lib/billing/stripe-stub.js');

  const orgId = queryParam(event, 'orgId') || identity.primaryOrgId;
  if (!orgId) return resp.badRequest('No org context');
  if (!identity.orgIds.includes(orgId)) return resp.forbidden('Not a member of this org');

  // GET /portal/billing - Current plan and usage
  if (subpath === '/billing' && method === 'GET') {
    const account = await getBillingAccount(orgId);
    const usage = await getCurrentUsage(orgId);
    const plan = getPlanDetails(account.tier);

    return resp.success({
      plan,
      usage: {
        leadsReceived: usage?.leadsReceived || 0,
        leadsAccepted: usage?.leadsAccepted || 0,
        leadsRejected: usage?.leadsRejected || 0,
      },
      currentPeriodStart: account.currentPeriodStart,
      currentPeriodEnd: account.currentPeriodEnd,
      status: account.status,
    });
  }

  // GET /portal/billing/invoices - Invoice history
  if (subpath === '/billing/invoices' && method === 'GET') {
    const account = await getBillingAccount(orgId);
    const stripe = getStripeService();
    const invoices = await stripe.getInvoices(
      account.stripeCustomerId || '',
      Number(queryParam(event, 'limit')) || 10
    );
    return resp.success({ invoices });
  }

  // POST /portal/billing/upgrade - Change plan (stub)
  if (subpath === '/billing/upgrade' && method === 'POST') {
    const body = parseBody(event);
    if (body === null) return resp.badRequest('Invalid JSON in request body');
    const newTier = body.tier as string | undefined;
    if (!newTier || !['free', 'starter', 'pro', 'enterprise'].includes(newTier)) {
      return resp.badRequest('tier must be one of: free, starter, pro, enterprise');
    }

    const account = await changePlan(orgId, newTier as 'free' | 'starter' | 'pro' | 'enterprise');

    await recordAudit({
      actorId: identity.userId,
      actorType: 'portal_user',
      action: 'billing.upgrade',
      resourceType: 'billing',
      resourceId: orgId,
      details: { newTier },
      ipHash: getIpHash(event),
    });

    return resp.success(account);
  }

  return resp.notFound('Billing endpoint not found');
}

// ---------------------------------------------------------------------------
// Calendar Routes (Task 3)
// ---------------------------------------------------------------------------

async function handleCalendarRoutes(
  event: APIGatewayProxyEventV2,
  subpath: string,
  method: string,
  identity: { userId: string; email: string; primaryOrgId: string; orgIds: string[] }
): Promise<APIGatewayProxyResultV2> {
  const { PutCommand, GetCommand, DeleteCommand } = await import('@aws-sdk/lib-dynamodb');
  const { getDocClient, tableName } = await import('../lib/db/client.js');
  const { createCalendarProvider, getSupportedProviders } =
    await import('../lib/calendar/factory.js');
  const doc = getDocClient();

  // POST /portal/calendar/connect
  if (subpath === '/calendar/connect' && method === 'POST') {
    const body = parseBody(event);
    if (body === null) return resp.badRequest('Invalid JSON in request body');
    const provider = body.provider as string | undefined;
    const supported = getSupportedProviders();
    if (!provider || !supported.includes(provider as 'google' | 'outlook' | 'apple' | 'caldav')) {
      return resp.badRequest(`provider must be one of: ${supported.join(', ')}`);
    }

    const now = new Date().toISOString();
    const config = {
      pk: `CALENDAR#${identity.userId}`,
      sk: 'CONFIG',
      userId: identity.userId,
      orgId: identity.primaryOrgId,
      provider,
      accessToken: body.accessToken as string | undefined,
      refreshToken: body.refreshToken as string | undefined,
      calendarId: body.calendarId as string | undefined,
      caldavUrl: body.caldavUrl as string | undefined,
      connected: true,
      createdAt: now,
      updatedAt: now,
    };

    await doc.send(
      new PutCommand({
        TableName: tableName(),
        Item: config,
      })
    );

    await recordAudit({
      actorId: identity.userId,
      actorType: 'portal_user',
      action: 'calendar.connect',
      resourceType: 'calendar',
      resourceId: identity.userId,
      details: { provider },
      ipHash: getIpHash(event),
    });

    return resp.success({ connected: true, provider });
  }

  // GET /portal/calendar/availability
  if (subpath === '/calendar/availability' && method === 'GET') {
    const start = queryParam(event, 'start');
    const end = queryParam(event, 'end');
    if (!start || !end) return resp.badRequest('start and end query parameters are required');

    // Load user's calendar config
    const result = await doc.send(
      new GetCommand({
        TableName: tableName(),
        Key: { pk: `CALENDAR#${identity.userId}`, sk: 'CONFIG' },
      })
    );

    if (!result.Item || !result.Item.connected) {
      return resp.badRequest('No calendar connected. Please connect a calendar first.');
    }

    const calConfig = result.Item as {
      provider: 'google' | 'outlook' | 'apple' | 'caldav';
      accessToken?: string;
      calendarId?: string;
      caldavUrl?: string;
      [key: string]: unknown;
    };
    const providerInstance = createCalendarProvider(calConfig as any);
    const slots = await providerInstance.getAvailability(new Date(start), new Date(end));

    return resp.success({
      slots: slots.map((s) => ({
        start: s.start.toISOString(),
        end: s.end.toISOString(),
        available: s.available,
      })),
    });
  }

  // POST /portal/calendar/book
  if (subpath === '/calendar/book' && method === 'POST') {
    const body = parseBody(event);
    if (body === null) return resp.badRequest('Invalid JSON in request body');
    if (!body.startTime || !body.endTime || !body.title) {
      return resp.badRequest('startTime, endTime, and title are required');
    }

    // Load user's calendar config
    const result = await doc.send(
      new GetCommand({
        TableName: tableName(),
        Key: { pk: `CALENDAR#${identity.userId}`, sk: 'CONFIG' },
      })
    );

    if (!result.Item || !result.Item.connected) {
      return resp.badRequest('No calendar connected');
    }

    const calConfig = result.Item as any;
    const providerInstance = createCalendarProvider(calConfig);

    const eventId = await providerInstance.createEvent({
      title: body.title as string,
      description: body.description as string | undefined,
      startTime: new Date(body.startTime as string),
      endTime: new Date(body.endTime as string),
      attendees: body.attendeeEmail
        ? [{ email: body.attendeeEmail as string, name: body.attendeeName as string | undefined }]
        : undefined,
    });

    await recordAudit({
      actorId: identity.userId,
      actorType: 'portal_user',
      action: 'calendar.book',
      resourceType: 'calendar',
      resourceId: eventId,
      details: { leadId: body.leadId, funnelId: body.funnelId },
      ipHash: getIpHash(event),
    });

    return resp.success({
      eventId,
      provider: calConfig.provider,
      startTime: body.startTime,
      endTime: body.endTime,
      title: body.title,
    });
  }

  // DELETE /portal/calendar/disconnect
  if (subpath === '/calendar/disconnect' && method === 'DELETE') {
    await doc.send(
      new DeleteCommand({
        TableName: tableName(),
        Key: { pk: `CALENDAR#${identity.userId}`, sk: 'CONFIG' },
      })
    );

    await recordAudit({
      actorId: identity.userId,
      actorType: 'portal_user',
      action: 'calendar.disconnect',
      resourceType: 'calendar',
      resourceId: identity.userId,
      ipHash: getIpHash(event),
    });

    return resp.success({ disconnected: true });
  }

  return resp.notFound('Calendar endpoint not found');
}

// ---------------------------------------------------------------------------
// Integration Routes: Slack/Teams (Task 4)
// ---------------------------------------------------------------------------

async function handleIntegrationRoutes(
  event: APIGatewayProxyEventV2,
  subpath: string,
  method: string,
  identity: { userId: string; email: string; primaryOrgId: string; orgIds: string[] }
): Promise<APIGatewayProxyResultV2> {
  const flags = await loadFeatureFlags();
  const { saveChannelConfig, deleteChannelConfig, sendTestNotification } =
    await import('../lib/messaging/dispatcher.js');

  const orgId = queryParam(event, 'orgId') || identity.primaryOrgId;
  if (!orgId) return resp.badRequest('No org context');
  if (!identity.orgIds.includes(orgId)) return resp.forbidden('Not a member of this org');

  // POST /portal/integrations/slack
  if (subpath === '/integrations/slack' && method === 'POST') {
    if (!flags.slack_enabled) return resp.notFound('Endpoint not found');
    const body = parseBody(event);
    if (body === null) return resp.badRequest('Invalid JSON in request body');
    if (!body.webhookUrl) return resp.badRequest('webhookUrl is required');

    const config = await saveChannelConfig(
      orgId,
      'slack',
      body.webhookUrl as string,
      body.channelName as string | undefined
    );

    await recordAudit({
      actorId: identity.userId,
      actorType: 'portal_user',
      action: 'integration.configure',
      resourceType: 'integration',
      resourceId: `${orgId}:slack`,
      ipHash: getIpHash(event),
    });

    return resp.success(config);
  }

  // POST /portal/integrations/teams
  if (subpath === '/integrations/teams' && method === 'POST') {
    if (!flags.teams_enabled) return resp.notFound('Endpoint not found');
    const body = parseBody(event);
    if (body === null) return resp.badRequest('Invalid JSON in request body');
    if (!body.webhookUrl) return resp.badRequest('webhookUrl is required');

    const config = await saveChannelConfig(
      orgId,
      'teams',
      body.webhookUrl as string,
      body.channelName as string | undefined
    );

    await recordAudit({
      actorId: identity.userId,
      actorType: 'portal_user',
      action: 'integration.configure',
      resourceType: 'integration',
      resourceId: `${orgId}:teams`,
      ipHash: getIpHash(event),
    });

    return resp.success(config);
  }

  // DELETE /portal/integrations/:provider
  if (/^\/integrations\/(slack|teams)$/.test(subpath) && method === 'DELETE') {
    const provider = pathParam(event, 2) as 'slack' | 'teams';

    if (provider === 'slack' && !flags.slack_enabled) return resp.notFound('Endpoint not found');
    if (provider === 'teams' && !flags.teams_enabled) return resp.notFound('Endpoint not found');

    await deleteChannelConfig(orgId, provider);

    await recordAudit({
      actorId: identity.userId,
      actorType: 'portal_user',
      action: 'integration.remove',
      resourceType: 'integration',
      resourceId: `${orgId}:${provider}`,
      ipHash: getIpHash(event),
    });

    return resp.success({ removed: true, provider });
  }

  // POST /portal/integrations/:provider/test
  if (/^\/integrations\/(slack|teams)\/test$/.test(subpath) && method === 'POST') {
    const provider = pathParam(event, 2) as 'slack' | 'teams';

    if (provider === 'slack' && !flags.slack_enabled) return resp.notFound('Endpoint not found');
    if (provider === 'teams' && !flags.teams_enabled) return resp.notFound('Endpoint not found');

    const result = await sendTestNotification(orgId, provider);
    return resp.success(result);
  }

  return resp.notFound('Integration endpoint not found');
}

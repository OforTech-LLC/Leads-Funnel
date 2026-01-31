/**
 * Portal API Handler
 *
 * Handles all /portal/* endpoints for organization agents/owners.
 * Requires portal JWT authentication and checks the enable_portal flag.
 *
 * Performance:
 *   - X-Request-Id header injected on every response for distributed tracing
 *   - All DynamoDB/S3/SSM calls use centralized clients with HTTP keep-alive
 *   - 1 MB body size limit enforced before JSON parsing (Issue #1)
 *
 * Endpoints:
 *   GET  /portal/me                              - Current user profile
 *   POST /portal/me/avatar                       - Generate avatar upload URL
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
import { authenticatePortal, checkLeadAccess, PortalAuthError, } from '../lib/auth/portal-auth.js';
import { canPortalManageMembers, canPortalUpdateLead, canPortalViewAllOrgLeads, } from '../lib/auth/permissions.js';
import { recordAudit } from '../lib/db/audit.js';
import * as usersDb from '../lib/db/users.js';
import * as orgsDb from '../lib/db/orgs.js';
import * as membershipsDb from '../lib/db/memberships.js';
import * as leadsDb from '../lib/db/leads.js';
import * as exportsDb from '../lib/db/exports.js';
import * as resp from '../lib/response.js';
import { parseBody, pathParam, queryParam, getIpHash } from '../lib/handler-utils.js';
import { createLogger } from '../lib/logging.js';
import { isFeatureEnabled, loadFeatureFlags } from '../lib/config.js';
import { emitLeadStatusChanged, emitLeadNoteAdded } from '../lib/events.js';
import { getPresignedDownloadUrl, getPresignedUploadUrl } from '../lib/storage/s3.js';
import { ulid } from '../lib/id.js';
import { validateUrl } from '../lib/validate.js';
import { MAX_BODY_SIZE, DB_PREFIXES, DB_SORT_KEYS, HTTP_HEADERS, VALID_BILLING_TIERS, ACTOR_TYPES, } from '../lib/constants.js';
const log = createLogger('portal-handler');
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const MAX_NOTE_LENGTH = 2000;
const MAX_NOTES_PER_LEAD = 100;
const MIN_PROFILE_NAME_LENGTH = 2;
const MAX_PROFILE_NAME_LENGTH = 120;
const MAX_PROFILE_PHONE_LENGTH = 40;
const MIN_PROFILE_PHONE_DIGITS = 7;
const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_AVATAR_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const DEFAULT_NOTIFICATION_PREFERENCES = {
    emailNotifications: true,
    smsNotifications: false,
};
const DEFAULT_GRANULAR_NOTIFICATION_PREFERENCES = {
    newLeadEmail: true,
    newLeadSms: false,
    newLeadPush: false,
    statusChangeEmail: true,
    statusChangeSms: false,
    statusChangePush: false,
    teamActivityEmail: true,
    teamActivitySms: false,
    teamActivityPush: false,
    weeklyDigestEmail: true,
};
const DEFAULT_SERVICE_PREFERENCES = {
    categories: [],
    zipCodes: [],
    businessHours: {
        monday: { enabled: true, start: '09:00', end: '17:00' },
        tuesday: { enabled: true, start: '09:00', end: '17:00' },
        wednesday: { enabled: true, start: '09:00', end: '17:00' },
        thursday: { enabled: true, start: '09:00', end: '17:00' },
        friday: { enabled: true, start: '09:00', end: '17:00' },
        saturday: { enabled: false, start: '09:00', end: '17:00' },
        sunday: { enabled: false, start: '09:00', end: '17:00' },
    },
};
function splitName(fullName) {
    if (!fullName)
        return { firstName: '', lastName: '' };
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1)
        return { firstName: parts[0], lastName: '' };
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}
function formatFunnelName(funnelId) {
    return funnelId
        .replace(/[-_]+/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0].toUpperCase() + part.slice(1))
        .join(' ');
}
function mapMembershipRoleToProfileRole(role) {
    switch (role) {
        case 'ORG_OWNER':
            return 'admin';
        case 'MANAGER':
            return 'manager';
        default:
            return 'agent';
    }
}
function mapMembershipRoleToTeamRole(role) {
    switch (role) {
        case 'ORG_OWNER':
        case 'MANAGER':
            return 'admin';
        default:
            return 'agent';
    }
}
function countDigits(value) {
    return value.replace(/\D/g, '').length;
}
function getAvatarExtension(contentType) {
    switch (contentType) {
        case 'image/jpeg':
            return 'jpg';
        case 'image/png':
            return 'png';
        case 'image/webp':
            return 'webp';
        default:
            return null;
    }
}
function buildAvatarPublicUrl(bucket, key) {
    const base = process.env.AVATAR_PUBLIC_BASE_URL?.trim().replace(/\/+$/, '');
    if (base) {
        return `${base}/${key}`;
    }
    const region = process.env.AWS_REGION || 'us-east-1';
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}
function buildProfileCompleteness(user, firstName, lastName) {
    const missingFields = [];
    const phone = user.phone?.trim() || '';
    const avatarUrl = user.avatarUrl?.trim() || '';
    if (!firstName.trim())
        missingFields.push('firstName');
    if (!lastName.trim())
        missingFields.push('lastName');
    if (countDigits(phone) < 7)
        missingFields.push('phone');
    if (!avatarUrl)
        missingFields.push('avatarUrl');
    const totalFields = 4;
    const completed = totalFields - missingFields.length;
    const score = Math.round((completed / totalFields) * 100);
    return {
        score,
        missingFields,
        isComplete: missingFields.length === 0,
    };
}
function parsePortalPreferences(raw) {
    const notificationPreferences = raw?.notificationPreferences ||
        DEFAULT_NOTIFICATION_PREFERENCES;
    const granularNotifications = raw?.granularNotifications ||
        DEFAULT_GRANULAR_NOTIFICATION_PREFERENCES;
    const servicePreferences = raw?.servicePreferences ||
        DEFAULT_SERVICE_PREFERENCES;
    return {
        notificationPreferences: {
            ...DEFAULT_NOTIFICATION_PREFERENCES,
            ...notificationPreferences,
        },
        granularNotifications: {
            ...DEFAULT_GRANULAR_NOTIFICATION_PREFERENCES,
            ...granularNotifications,
        },
        servicePreferences: {
            ...DEFAULT_SERVICE_PREFERENCES,
            ...servicePreferences,
            businessHours: {
                ...DEFAULT_SERVICE_PREFERENCES.businessHours,
                ...(servicePreferences.businessHours || {}),
            },
        },
    };
}
function buildPortalProfile(user, membership, identity) {
    const { firstName, lastName } = splitName(user.name);
    const { notificationPreferences } = parsePortalPreferences(user.preferences);
    const profileCompleteness = buildProfileCompleteness(user, firstName, lastName);
    return {
        id: user.userId,
        email: user.email,
        firstName,
        lastName,
        role: mapMembershipRoleToProfileRole(membership?.role),
        orgIds: identity.orgIds,
        primaryOrgId: identity.primaryOrgId,
        avatarUrl: user.avatarUrl?.trim() || null,
        phone: user.phone?.trim() || null,
        notificationPreferences: {
            emailNotifications: membership?.notifyEmail ?? notificationPreferences.emailNotifications,
            smsNotifications: membership?.notifySms ?? notificationPreferences.smsNotifications,
        },
        profileCompleteness,
        createdAt: user.createdAt,
    };
}
async function requireCompleteProfile(identity, requestOrigin) {
    const user = await usersDb.getUser(identity.userId);
    if (!user)
        return resp.notFound('User not found', requestOrigin);
    const { firstName, lastName } = splitName(user.name);
    const completeness = buildProfileCompleteness(user, firstName, lastName);
    if (!completeness.isComplete) {
        return resp.error('PROFILE_INCOMPLETE', 'Complete your profile to access leads', 403, { missingFields: completeness.missingFields }, requestOrigin);
    }
    return null;
}
function parsePortalNote(note, leadId, index) {
    const match = note.match(/^\[(?<date>.+?)\]\s+(?<author>.+?):\s+(?<content>.+)$/);
    const createdAt = match?.groups?.date && !Number.isNaN(Date.parse(match.groups.date))
        ? new Date(match.groups.date).toISOString()
        : new Date().toISOString();
    const authorName = match?.groups?.author || 'Unknown';
    const content = match?.groups?.content || note;
    return {
        id: `${leadId}-${index}`,
        leadId,
        authorId: '',
        authorName,
        content,
        createdAt,
    };
}
function buildPortalTimeline(lead) {
    return [
        {
            id: `${lead.leadId}-created`,
            leadId: lead.leadId,
            type: 'created',
            description: 'Lead created',
            performedBy: 'system',
            performedByName: 'System',
            createdAt: lead.createdAt,
        },
    ];
}
async function mapPortalLeads(leads) {
    const userCache = new Map();
    return Promise.all(leads.map(async (lead) => {
        let assignedName = null;
        if (lead.assignedUserId) {
            if (!userCache.has(lead.assignedUserId)) {
                userCache.set(lead.assignedUserId, await usersDb.getUser(lead.assignedUserId));
            }
            const assignedUser = userCache.get(lead.assignedUserId);
            if (assignedUser) {
                const { firstName, lastName } = splitName(assignedUser.name);
                assignedName = `${firstName} ${lastName}`.trim() || assignedUser.email;
            }
        }
        const { firstName, lastName } = splitName(lead.name);
        const notes = (lead.notes || []).map((note, index) => parsePortalNote(note, lead.leadId, index));
        return {
            id: lead.leadId,
            funnelId: lead.funnelId,
            funnelName: formatFunnelName(lead.funnelId),
            firstName,
            lastName,
            email: lead.email,
            phone: lead.phone || '',
            zip: lead.zipCode || '',
            city: '',
            state: '',
            status: lead.status,
            assignedTo: lead.assignedUserId || null,
            assignedName,
            notes,
            timeline: buildPortalTimeline(lead),
            qualityScore: lead.score,
            evidencePack: lead.evidencePack,
            createdAt: lead.createdAt,
            updatedAt: lead.updatedAt,
        };
    }));
}
function mapOrgToPortal(org, memberCount) {
    const settings = org.settings || {};
    const plan = settings.plan || 'starter';
    return {
        id: org.orgId,
        name: org.name,
        slug: org.slug,
        logoUrl: settings.logoUrl || null,
        plan,
        memberCount,
        leadsUsed: settings.leadsUsed,
        leadsLimit: settings.leadsLimit,
        createdAt: org.createdAt,
    };
}
function getDateRangeFromQuery(event) {
    const preset = queryParam(event, 'preset') || '30d';
    const now = new Date();
    if (preset === 'custom') {
        const from = queryParam(event, 'from');
        const to = queryParam(event, 'to');
        const start = from ? new Date(from) : new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
        const end = to ? new Date(to) : now;
        return {
            startDate: new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())).toISOString(),
            endDate: new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate(), 23, 59, 59, 999)).toISOString(),
        };
    }
    const days = preset === 'today' ? 1 : preset === '7d' ? 7 : preset === '90d' ? 90 : 30;
    const start = new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    const startUtc = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
    const endUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
    return { startDate: startUtc.toISOString(), endDate: endUtc.toISOString() };
}
const MAX_ANALYTICS_PAGES = 20;
const MAX_ANALYTICS_LEADS = 2000;
async function collectOrgLeads(orgId, range, assignedUserId) {
    const leads = [];
    let cursor;
    let pages = 0;
    do {
        const result = await leadsDb.queryLeads({
            orgId,
            startDate: range?.startDate,
            endDate: range?.endDate,
            cursor,
            limit: 100,
            assignedUserId,
        });
        leads.push(...result.items);
        cursor = result.nextCursor;
        pages++;
    } while (cursor && pages < MAX_ANALYTICS_PAGES && leads.length < MAX_ANALYTICS_LEADS);
    return leads;
}
function countByStatus(leads) {
    return leads.reduce((acc, lead) => {
        acc[lead.status] = (acc[lead.status] || 0) + 1;
        return acc;
    }, {});
}
/**
 * Get the user's membership role in a specific org.
 */
async function getMemberRole(userId, orgId) {
    const m = await membershipsDb.getMember(orgId, userId);
    if (!m)
        return null;
    return m.role;
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
function checkBodySize(event, requestOrigin) {
    const method = event.requestContext.http.method;
    if (method === 'GET' || method === 'DELETE' || method === 'OPTIONS')
        return null;
    const body = event.body;
    if (!body)
        return null;
    const byteSize = Buffer.byteLength(body, 'utf8');
    if (byteSize > MAX_BODY_SIZE) {
        log.warn('portal.bodyTooLarge', { size: byteSize, limit: MAX_BODY_SIZE });
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
function injectRequestId(response, requestId) {
    if (typeof response === 'string')
        return response;
    const headers = (response.headers || {});
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
export async function handler(event) {
    const requestId = event.requestContext.requestId || '';
    const result = await handlePortalRequest(event);
    return injectRequestId(result, requestId);
}
// ---------------------------------------------------------------------------
// Portal request routing
// ---------------------------------------------------------------------------
async function handlePortalRequest(event) {
    const method = event.requestContext.http.method;
    const path = event.requestContext.http.path;
    const requestOrigin = event.headers?.origin || event.headers?.Origin;
    if (method === 'OPTIONS') {
        return resp.noContent(requestOrigin);
    }
    // Issue #1: Enforce 1 MB body size limit before any processing
    const sizeCheck = checkBodySize(event, requestOrigin);
    if (sizeCheck)
        return sizeCheck;
    // Authenticate
    let identity;
    try {
        identity = await authenticatePortal(event);
    }
    catch (err) {
        if (err instanceof PortalAuthError) {
            return resp.error('AUTH_ERROR', err.message, err.statusCode, undefined, requestOrigin);
        }
        return resp.unauthorized(undefined, requestOrigin);
    }
    const subpath = path.replace(/^\/portal/, '');
    try {
        if (subpath.startsWith('/leads')) {
            const gate = await requireCompleteProfile(identity, requestOrigin);
            if (gate)
                return gate;
        }
        // ---- ME ----
        if (subpath === '/me' && method === 'GET') {
            const user = await usersDb.getUser(identity.userId);
            if (!user)
                return resp.notFound('User not found', requestOrigin);
            const membership = identity.primaryOrgId
                ? await membershipsDb.getMember(identity.primaryOrgId, identity.userId)
                : null;
            const profile = buildPortalProfile(user, membership, identity);
            return resp.success(profile, undefined, requestOrigin);
        }
        if (subpath === '/me/avatar' && method === 'POST') {
            const body = parseBody(event);
            if (body === null)
                return resp.badRequest('Invalid JSON in request body', requestOrigin);
            const contentType = typeof body.contentType === 'string' ? body.contentType.trim().toLowerCase() : '';
            const contentLength = typeof body.contentLength === 'number' ? body.contentLength : Number(body.contentLength);
            if (!contentType || !ALLOWED_AVATAR_MIME_TYPES.has(contentType)) {
                return resp.badRequest('Unsupported avatar contentType', requestOrigin);
            }
            if (!Number.isFinite(contentLength) || contentLength <= 0) {
                return resp.badRequest('contentLength must be a positive number', requestOrigin);
            }
            if (contentLength > MAX_AVATAR_SIZE_BYTES) {
                return resp.badRequest(`Avatar exceeds max size of ${Math.round(MAX_AVATAR_SIZE_BYTES / 1024 / 1024)}MB`, requestOrigin);
            }
            const bucket = process.env.AVATARS_BUCKET || '';
            if (!bucket) {
                return resp.error('CONFIG_ERROR', 'Avatar uploads are not configured', 500, undefined, requestOrigin);
            }
            const extension = getAvatarExtension(contentType);
            if (!extension) {
                return resp.badRequest('Unsupported avatar format', requestOrigin);
            }
            const key = `avatars/${identity.userId}/${ulid()}.${extension}`;
            const uploadUrl = await getPresignedUploadUrl(bucket, key, contentType, 900);
            const publicUrl = buildAvatarPublicUrl(bucket, key);
            return resp.success({
                uploadUrl,
                publicUrl,
                headers: { 'Content-Type': contentType },
                maxBytes: MAX_AVATAR_SIZE_BYTES,
            }, undefined, requestOrigin);
        }
        if (subpath === '/me' && method === 'PUT') {
            const body = parseBody(event);
            if (body === null)
                return resp.badRequest('Invalid JSON in request body', requestOrigin);
            const updates = { userId: identity.userId };
            const firstNameInput = typeof body.firstName === 'string' ? body.firstName.trim() : undefined;
            const lastNameInput = typeof body.lastName === 'string' ? body.lastName.trim() : undefined;
            if (firstNameInput !== undefined || lastNameInput !== undefined) {
                if (!firstNameInput || !lastNameInput) {
                    return resp.badRequest('firstName and lastName are required', requestOrigin);
                }
                if (firstNameInput.length < MIN_PROFILE_NAME_LENGTH) {
                    return resp.badRequest('firstName is too short', requestOrigin);
                }
                if (lastNameInput.length < MIN_PROFILE_NAME_LENGTH) {
                    return resp.badRequest('lastName is too short', requestOrigin);
                }
                if (firstNameInput.length > MAX_PROFILE_NAME_LENGTH ||
                    lastNameInput.length > MAX_PROFILE_NAME_LENGTH) {
                    return resp.badRequest('Name is too long', requestOrigin);
                }
                updates.name = `${firstNameInput} ${lastNameInput}`.trim();
            }
            if (body.phone !== undefined) {
                if (typeof body.phone !== 'string') {
                    return resp.badRequest('phone must be a string', requestOrigin);
                }
                const phone = body.phone.trim();
                if (phone.length > MAX_PROFILE_PHONE_LENGTH) {
                    return resp.badRequest('phone is too long', requestOrigin);
                }
                if (phone && countDigits(phone) < MIN_PROFILE_PHONE_DIGITS) {
                    return resp.badRequest('phone must include at least 7 digits', requestOrigin);
                }
                updates.phone = phone;
            }
            if (body.avatarUrl !== undefined) {
                if (typeof body.avatarUrl !== 'string') {
                    return resp.badRequest('avatarUrl must be a string', requestOrigin);
                }
                const avatarUrl = body.avatarUrl.trim();
                const validation = validateUrl(avatarUrl);
                if (!validation.valid) {
                    return resp.badRequest(validation.error || 'Invalid avatarUrl', requestOrigin);
                }
                updates.avatarUrl = avatarUrl;
            }
            const hasUpdates = Object.keys(updates).some((key) => key !== 'userId');
            if (!hasUpdates) {
                return resp.badRequest('No profile fields provided', requestOrigin);
            }
            await usersDb.updateUser(updates);
            const updated = await usersDb.getUser(identity.userId);
            if (!updated)
                return resp.notFound('User not found', requestOrigin);
            const membership = identity.primaryOrgId
                ? await membershipsDb.getMember(identity.primaryOrgId, identity.userId)
                : null;
            const profile = buildPortalProfile(updated, membership, identity);
            return resp.success(profile, undefined, requestOrigin);
        }
        // ---- ORG ----
        if (subpath === '/org' && method === 'GET') {
            const orgId = queryParam(event, 'orgId') || identity.primaryOrgId;
            if (!orgId)
                return resp.badRequest('No org context', requestOrigin);
            if (!identity.orgIds.includes(orgId)) {
                return resp.forbidden('Not a member of this org', requestOrigin);
            }
            const org = await orgsDb.getOrg(orgId);
            if (!org)
                return resp.notFound('Organization not found', requestOrigin);
            const members = await membershipsDb.listOrgMembers(orgId, undefined, 100);
            const portalOrg = mapOrgToPortal(org, members.items.length);
            return resp.success(portalOrg, undefined, requestOrigin);
        }
        // ---- TEAM MEMBERS ----
        if (subpath === '/org/members' && method === 'GET') {
            const orgId = queryParam(event, 'orgId') || identity.primaryOrgId;
            if (!orgId)
                return resp.badRequest('No org context', requestOrigin);
            if (!identity.orgIds.includes(orgId)) {
                return resp.forbidden('Not a member of this org', requestOrigin);
            }
            const members = await membershipsDb.listOrgMembers(orgId, undefined, 100);
            const memberUsers = await Promise.all(members.items.map(async (member) => ({
                member,
                user: await usersDb.getUser(member.userId),
            })));
            const response = memberUsers
                .filter((entry) => entry.user)
                .map((entry) => {
                const { firstName, lastName } = splitName(entry.user?.name);
                return {
                    userId: entry.member.userId,
                    email: entry.user?.email || '',
                    firstName,
                    lastName,
                    role: mapMembershipRoleToTeamRole(entry.member.role),
                    status: 'active',
                    avatarUrl: entry.user?.avatarUrl || null,
                    lastActiveAt: null,
                    joinedAt: entry.member.joinedAt,
                };
            });
            return resp.success(response, undefined, requestOrigin);
        }
        if (subpath === '/org/members/invites' && method === 'GET') {
            return resp.forbidden('Team invites are managed by administrators in the admin console', requestOrigin);
        }
        if (subpath === '/org/members/invite' && method === 'POST') {
            return resp.forbidden('Team invites are managed by administrators in the admin console', requestOrigin);
        }
        if (/^\/org\/members\/[^/]+$/.test(subpath) && method === 'DELETE') {
            const orgId = queryParam(event, 'orgId') || identity.primaryOrgId;
            if (!orgId)
                return resp.badRequest('No org context', requestOrigin);
            if (!identity.orgIds.includes(orgId)) {
                return resp.forbidden('Not a member of this org', requestOrigin);
            }
            const memberRole = await getMemberRole(identity.userId, orgId);
            if (!memberRole || !canPortalManageMembers(memberRole)) {
                return resp.forbidden('Insufficient permissions to remove members', requestOrigin);
            }
            const userId = pathParam(event, 3);
            await membershipsDb.removeMember(orgId, userId);
            await recordAudit({
                actorId: identity.userId,
                actorType: ACTOR_TYPES.PORTAL_USER,
                action: 'member.remove',
                resourceType: 'org',
                resourceId: orgId,
                details: { userId },
                ipHash: getIpHash(event),
            });
            return resp.noContent(requestOrigin);
        }
        if (/^\/org\/members\/[^/]+\/role$/.test(subpath) && method === 'PUT') {
            const orgId = queryParam(event, 'orgId') || identity.primaryOrgId;
            if (!orgId)
                return resp.badRequest('No org context', requestOrigin);
            if (!identity.orgIds.includes(orgId)) {
                return resp.forbidden('Not a member of this org', requestOrigin);
            }
            const memberRole = await getMemberRole(identity.userId, orgId);
            if (!memberRole || !canPortalManageMembers(memberRole)) {
                return resp.forbidden('Insufficient permissions to update roles', requestOrigin);
            }
            const body = parseBody(event);
            if (body === null)
                return resp.badRequest('Invalid JSON in request body', requestOrigin);
            const role = typeof body.role === 'string' ? body.role : 'agent';
            const membershipRole = role === 'admin' ? 'MANAGER' : 'AGENT';
            const userId = pathParam(event, 3);
            const updated = await membershipsDb.updateMember({
                orgId,
                userId,
                role: membershipRole,
            });
            const updatedUser = await usersDb.getUser(userId);
            const { firstName, lastName } = splitName(updatedUser?.name);
            await recordAudit({
                actorId: identity.userId,
                actorType: ACTOR_TYPES.PORTAL_USER,
                action: 'member.update',
                resourceType: 'org',
                resourceId: orgId,
                details: { userId, role: updated.role },
                ipHash: getIpHash(event),
            });
            return resp.success({
                userId: updated.userId,
                email: updatedUser?.email || '',
                firstName,
                lastName,
                role: mapMembershipRoleToTeamRole(updated.role),
                status: 'active',
                avatarUrl: updatedUser?.avatarUrl || null,
                lastActiveAt: null,
                joinedAt: updated.joinedAt,
            }, undefined, requestOrigin);
        }
        // ---- LEADS LIST ----
        if (subpath === '/leads' && method === 'GET') {
            const orgId = queryParam(event, 'orgId') || identity.primaryOrgId;
            if (!orgId)
                return resp.badRequest('No org context', requestOrigin);
            if (!identity.orgIds.includes(orgId)) {
                return resp.forbidden('Not a member of this org', requestOrigin);
            }
            const memberRole = await getMemberRole(identity.userId, orgId);
            if (!memberRole)
                return resp.forbidden('Not a member of this org', requestOrigin);
            // Agents can only see their own assigned leads
            const isFullView = canPortalViewAllOrgLeads(memberRole);
            // Build query params - filter at DB level for agents
            const queryParams = {
                orgId,
                funnelId: queryParam(event, 'funnelId'),
                status: queryParam(event, 'status'),
                startDate: queryParam(event, 'startDate') || queryParam(event, 'dateFrom'),
                endDate: queryParam(event, 'endDate') || queryParam(event, 'dateTo'),
                cursor: queryParam(event, 'cursor'),
                limit: Number(queryParam(event, 'limit')) || 25,
            };
            // Pass assignedUserId filter to DB query for agents
            if (!isFullView) {
                queryParams.assignedUserId = identity.userId;
            }
            const result = await leadsDb.queryLeads(queryParams);
            const portalLeads = await mapPortalLeads(result.items);
            return resp.success({
                data: portalLeads,
                nextCursor: result.nextCursor || null,
                total: portalLeads.length,
            }, undefined, requestOrigin);
        }
        // ---- SINGLE LEAD ----
        if (/^\/leads\/[^/]+\/[^/]+$/.test(subpath) && method === 'GET') {
            const funnelId = pathParam(event, 2); // portal/leads/<funnelId>/<leadId>
            const leadId = pathParam(event, 3);
            const lead = await leadsDb.getLead(funnelId, leadId);
            if (!lead)
                return resp.notFound('Lead not found', requestOrigin);
            // Check access
            if (!checkLeadAccess(identity, lead)) {
                return resp.forbidden('Not authorized to view this lead', requestOrigin);
            }
            const [portalLead] = await mapPortalLeads([lead]);
            return resp.success(portalLead, undefined, requestOrigin);
        }
        // ---- UPDATE LEAD STATUS ----
        if (/^\/leads\/[^/]+\/[^/]+\/status$/.test(subpath) &&
            (method === 'PUT' || method === 'PATCH')) {
            const funnelId = pathParam(event, 2);
            const leadId = pathParam(event, 3);
            const body = parseBody(event);
            if (body === null)
                return resp.badRequest('Invalid JSON in request body', requestOrigin);
            const newStatus = body.status;
            if (!newStatus)
                return resp.badRequest('status is required', requestOrigin);
            const validPortalStatuses = [
                'new',
                'assigned',
                'unassigned',
                'contacted',
                'qualified',
                'booked',
                'converted',
                'won',
                'lost',
                'dnc',
                'quarantined',
            ];
            if (!validPortalStatuses.includes(newStatus)) {
                return resp.badRequest(`Invalid status. Must be one of: ${validPortalStatuses.join(', ')}`, requestOrigin);
            }
            // Load lead and check access
            const lead = await leadsDb.getLead(funnelId, leadId);
            if (!lead)
                return resp.notFound('Lead not found', requestOrigin);
            if (!checkLeadAccess(identity, lead)) {
                return resp.forbidden('Not authorized to update this lead', requestOrigin);
            }
            // Check permission to update
            const orgId = lead.orgId || identity.primaryOrgId;
            const memberRole = await getMemberRole(identity.userId, orgId);
            if (!memberRole || !canPortalUpdateLead(memberRole)) {
                return resp.forbidden('Insufficient permissions to update lead', requestOrigin);
            }
            const oldStatus = lead.status;
            const updated = await leadsDb.updateLead({
                funnelId,
                leadId,
                status: newStatus,
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
                actorType: ACTOR_TYPES.PORTAL_USER,
                action: 'lead.update',
                resourceType: 'lead',
                resourceId: `${funnelId}:${leadId}`,
                details: { status: newStatus },
                ipHash: getIpHash(event),
            });
            const [portalLead] = await mapPortalLeads([updated]);
            return resp.success(portalLead, undefined, requestOrigin);
        }
        // ---- ADD NOTE ----
        if (/^\/leads\/[^/]+\/[^/]+\/notes$/.test(subpath) && method === 'POST') {
            const funnelId = pathParam(event, 2);
            const leadId = pathParam(event, 3);
            const body = parseBody(event);
            if (body === null)
                return resp.badRequest('Invalid JSON in request body', requestOrigin);
            const note = body.note;
            if (!note || typeof note !== 'string' || note.trim().length === 0) {
                return resp.badRequest('note is required and must be non-empty', requestOrigin);
            }
            // Fix 8: Enforce note length limit
            if (note.length > MAX_NOTE_LENGTH) {
                return resp.badRequest(`Note must be ${MAX_NOTE_LENGTH} characters or less`, requestOrigin);
            }
            // Load lead and check access
            const lead = await leadsDb.getLead(funnelId, leadId);
            if (!lead)
                return resp.notFound('Lead not found', requestOrigin);
            if (!checkLeadAccess(identity, lead)) {
                return resp.forbidden('Not authorized to add notes to this lead', requestOrigin);
            }
            const orgId = lead.orgId || identity.primaryOrgId;
            const memberRole = await getMemberRole(identity.userId, orgId);
            if (!memberRole || !canPortalUpdateLead(memberRole)) {
                return resp.forbidden('Insufficient permissions', requestOrigin);
            }
            // Fix 8: Enforce max notes count per lead
            const existingNotes = lead.notes || [];
            if (existingNotes.length >= MAX_NOTES_PER_LEAD) {
                return resp.badRequest(`Maximum of ${MAX_NOTES_PER_LEAD} notes per lead reached`, requestOrigin);
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
                actorType: ACTOR_TYPES.PORTAL_USER,
                action: 'lead.update',
                resourceType: 'lead',
                resourceId: `${funnelId}:${leadId}`,
                details: { addedNote: true },
                ipHash: getIpHash(event),
            });
            const [portalLead] = await mapPortalLeads([updated]);
            return resp.success(portalLead, undefined, requestOrigin);
        }
        // ---- ASSIGN LEAD ----
        if (/^\/leads\/[^/]+\/[^/]+\/assign$/.test(subpath) &&
            (method === 'PATCH' || method === 'PUT')) {
            const funnelId = pathParam(event, 2);
            const leadId = pathParam(event, 3);
            const body = parseBody(event);
            if (body === null)
                return resp.badRequest('Invalid JSON in request body', requestOrigin);
            const assignedTo = typeof body.assignedTo === 'string' ? body.assignedTo : null;
            const lead = await leadsDb.getLead(funnelId, leadId);
            if (!lead)
                return resp.notFound('Lead not found', requestOrigin);
            if (!checkLeadAccess(identity, lead)) {
                return resp.forbidden('Not authorized to update this lead', requestOrigin);
            }
            const orgId = lead.orgId || identity.primaryOrgId;
            const memberRole = await getMemberRole(identity.userId, orgId);
            if (!memberRole || !canPortalUpdateLead(memberRole)) {
                return resp.forbidden('Insufficient permissions to update lead', requestOrigin);
            }
            const shouldAssignStatus = lead.status === 'new' || lead.status === 'unassigned';
            const shouldUnassign = !assignedTo;
            const updated = await leadsDb.updateLead({
                funnelId,
                leadId,
                orgId,
                assignedUserId: assignedTo || undefined,
                assignedAt: assignedTo ? new Date().toISOString() : undefined,
                status: shouldUnassign ? 'unassigned' : shouldAssignStatus ? 'assigned' : undefined,
                force: shouldUnassign,
            });
            await recordAudit({
                actorId: identity.userId,
                actorType: ACTOR_TYPES.PORTAL_USER,
                action: 'lead.assign',
                resourceType: 'lead',
                resourceId: `${funnelId}:${leadId}`,
                details: { assignedTo },
                ipHash: getIpHash(event),
            });
            const [portalLead] = await mapPortalLeads([updated]);
            return resp.success(portalLead, undefined, requestOrigin);
        }
        // ---- BULK STATUS UPDATE ----
        if (subpath === '/leads/bulk/status' && method === 'POST') {
            const body = parseBody(event);
            if (body === null)
                return resp.badRequest('Invalid JSON in request body', requestOrigin);
            const leads = Array.isArray(body.leads) ? body.leads : [];
            const status = body.status;
            if (!status)
                return resp.badRequest('status is required', requestOrigin);
            if (leads.length === 0)
                return resp.badRequest('leads array is required', requestOrigin);
            const validPortalStatuses = [
                'new',
                'assigned',
                'unassigned',
                'contacted',
                'qualified',
                'booked',
                'converted',
                'won',
                'lost',
                'dnc',
                'quarantined',
            ];
            if (!validPortalStatuses.includes(status)) {
                return resp.badRequest(`Invalid status. Must be one of: ${validPortalStatuses.join(', ')}`, requestOrigin);
            }
            let updatedCount = 0;
            for (const item of leads) {
                if (!item?.funnelId || !item?.leadId)
                    continue;
                const lead = await leadsDb.getLead(item.funnelId, item.leadId);
                if (!lead || !checkLeadAccess(identity, lead))
                    continue;
                const orgId = lead.orgId || identity.primaryOrgId;
                const memberRole = await getMemberRole(identity.userId, orgId);
                if (!memberRole || !canPortalUpdateLead(memberRole))
                    continue;
                await leadsDb.updateLead({
                    funnelId: item.funnelId,
                    leadId: item.leadId,
                    status,
                });
                updatedCount++;
            }
            await recordAudit({
                actorId: identity.userId,
                actorType: ACTOR_TYPES.PORTAL_USER,
                action: 'lead.bulkUpdate',
                resourceType: 'lead',
                resourceId: 'bulk',
                details: { updated: updatedCount },
                ipHash: getIpHash(event),
            });
            return resp.success({ updated: updatedCount }, undefined, requestOrigin);
        }
        // ---- BULK ASSIGN ----
        if (subpath === '/leads/bulk/assign' && method === 'POST') {
            const body = parseBody(event);
            if (body === null)
                return resp.badRequest('Invalid JSON in request body', requestOrigin);
            const leads = Array.isArray(body.leads) ? body.leads : [];
            const assignedTo = typeof body.assignedTo === 'string' ? body.assignedTo : '';
            if (!assignedTo)
                return resp.badRequest('assignedTo is required', requestOrigin);
            if (leads.length === 0)
                return resp.badRequest('leads array is required', requestOrigin);
            let updatedCount = 0;
            for (const item of leads) {
                if (!item?.funnelId || !item?.leadId)
                    continue;
                const lead = await leadsDb.getLead(item.funnelId, item.leadId);
                if (!lead || !checkLeadAccess(identity, lead))
                    continue;
                const orgId = lead.orgId || identity.primaryOrgId;
                const memberRole = await getMemberRole(identity.userId, orgId);
                if (!memberRole || !canPortalUpdateLead(memberRole))
                    continue;
                await leadsDb.updateLead({
                    funnelId: item.funnelId,
                    leadId: item.leadId,
                    orgId,
                    assignedUserId: assignedTo,
                    assignedAt: new Date().toISOString(),
                    status: lead.status === 'new' || lead.status === 'unassigned' ? 'assigned' : undefined,
                });
                updatedCount++;
            }
            await recordAudit({
                actorId: identity.userId,
                actorType: ACTOR_TYPES.PORTAL_USER,
                action: 'lead.assign',
                resourceType: 'lead',
                resourceId: 'bulk',
                details: { updated: updatedCount, assignedTo },
                ipHash: getIpHash(event),
            });
            return resp.success({ updated: updatedCount }, undefined, requestOrigin);
        }
        // ---- DASHBOARD ----
        if (subpath === '/dashboard' && method === 'GET') {
            const orgId = queryParam(event, 'orgId') || identity.primaryOrgId;
            if (!orgId)
                return resp.badRequest('No org context', requestOrigin);
            if (!identity.orgIds.includes(orgId)) {
                return resp.forbidden('Not a member of this org', requestOrigin);
            }
            const memberRole = await getMemberRole(identity.userId, orgId);
            if (!memberRole)
                return resp.forbidden('Not a member of this org', requestOrigin);
            const assignedFilter = canPortalViewAllOrgLeads(memberRole) ? undefined : identity.userId;
            const leads = await collectOrgLeads(orgId, undefined, assignedFilter);
            const statusCounts = countByStatus(leads);
            const now = new Date();
            const todayRange = {
                startDate: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString(),
                endDate: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)).toISOString(),
            };
            const todayLeads = await collectOrgLeads(orgId, todayRange, assignedFilter);
            const recentLeads = await mapPortalLeads(leads.slice(0, 10));
            const activeStatuses = ['new', 'assigned', 'contacted', 'qualified', 'booked', 'converted'];
            const totalActiveLeads = activeStatuses.reduce((sum, status) => sum + (statusCounts[status] || 0), 0);
            return resp.success({
                newLeadsToday: todayLeads.length,
                totalActiveLeads,
                leadsByStatus: statusCounts,
                recentLeads,
            }, undefined, requestOrigin);
        }
        // ---- ANALYTICS ----
        if (subpath.startsWith('/analytics') && method === 'GET') {
            const orgId = queryParam(event, 'orgId') || identity.primaryOrgId;
            if (!orgId)
                return resp.badRequest('No org context', requestOrigin);
            if (!identity.orgIds.includes(orgId)) {
                return resp.forbidden('Not a member of this org', requestOrigin);
            }
            const memberRole = await getMemberRole(identity.userId, orgId);
            if (!memberRole)
                return resp.forbidden('Not a member of this org', requestOrigin);
            const assignedFilter = canPortalViewAllOrgLeads(memberRole) ? undefined : identity.userId;
            const range = getDateRangeFromQuery(event);
            const leads = await collectOrgLeads(orgId, range, assignedFilter);
            const statusCounts = countByStatus(leads);
            if (subpath === '/analytics/overview') {
                const previousStart = new Date(range.startDate);
                const previousEnd = new Date(range.endDate);
                const durationMs = previousEnd.getTime() - previousStart.getTime();
                const prevRange = {
                    startDate: new Date(previousStart.getTime() - durationMs).toISOString(),
                    endDate: new Date(previousStart.getTime() - 1).toISOString(),
                };
                const prevLeads = await collectOrgLeads(orgId, prevRange, assignedFilter);
                const prevStatusCounts = countByStatus(prevLeads);
                const totalLeads = leads.length;
                const wonCount = statusCounts.won || 0;
                const bookedCount = statusCounts.booked || 0;
                const totalActiveLeads = [
                    'new',
                    'assigned',
                    'contacted',
                    'qualified',
                    'booked',
                    'converted',
                ].reduce((sum, status) => sum + (statusCounts[status] || 0), 0);
                const conversionRate = totalLeads > 0 ? Math.round((wonCount / totalLeads) * 100) : 0;
                const prevTotalLeads = prevLeads.length;
                const prevWonCount = prevStatusCounts.won || 0;
                const prevBookedCount = prevStatusCounts.booked || 0;
                const prevActiveLeads = [
                    'new',
                    'assigned',
                    'contacted',
                    'qualified',
                    'booked',
                    'converted',
                ].reduce((sum, status) => sum + (prevStatusCounts[status] || 0), 0);
                const prevConversionRate = prevTotalLeads > 0 ? Math.round((prevWonCount / prevTotalLeads) * 100) : 0;
                const buildTrend = (current, previous) => {
                    if (previous === 0) {
                        return {
                            direction: current > 0 ? 'up' : 'flat',
                            percentage: 0,
                            previousValue: previous,
                        };
                    }
                    const diff = current - previous;
                    const percentage = Math.round((diff / previous) * 100);
                    return {
                        direction: diff === 0 ? 'flat' : diff > 0 ? 'up' : 'down',
                        percentage: Math.abs(percentage),
                        previousValue: previous,
                    };
                };
                return resp.success({
                    newLeadsToday: (statusCounts.new || 0) + (statusCounts.assigned || 0),
                    totalActiveLeads,
                    wonCount,
                    bookedCount,
                    conversionRate,
                    avgResponseTimeMinutes: 0,
                    trends: {
                        newLeadsToday: buildTrend((statusCounts.new || 0) + (statusCounts.assigned || 0), (prevStatusCounts.new || 0) + (prevStatusCounts.assigned || 0)),
                        totalActiveLeads: buildTrend(totalActiveLeads, prevActiveLeads),
                        wonCount: buildTrend(wonCount, prevWonCount),
                        bookedCount: buildTrend(bookedCount, prevBookedCount),
                        conversionRate: buildTrend(conversionRate, prevConversionRate),
                        avgResponseTimeMinutes: buildTrend(0, 0),
                    },
                }, undefined, requestOrigin);
            }
            if (subpath === '/analytics/trends') {
                const points = [];
                const byDate = new Map();
                leads.forEach((lead) => {
                    const dateKey = lead.createdAt.slice(0, 10);
                    const existing = byDate.get(dateKey) || { received: 0, converted: 0 };
                    existing.received += 1;
                    if (lead.status === 'won' || lead.status === 'converted') {
                        existing.converted += 1;
                    }
                    byDate.set(dateKey, existing);
                });
                byDate.forEach((value, date) => {
                    points.push({ date, ...value });
                });
                points.sort((a, b) => a.date.localeCompare(b.date));
                return resp.success({ data: points }, undefined, requestOrigin);
            }
            if (subpath === '/analytics/funnel') {
                const stages = ['new', 'contacted', 'qualified', 'booked', 'won'];
                const total = leads.length || 1;
                const funnel = stages.map((stage, index) => {
                    const count = statusCounts[stage] || 0;
                    const prevCount = index === 0 ? total : statusCounts[stages[index - 1]] || total;
                    const percentage = Math.round((count / total) * 100);
                    const dropOffPercent = prevCount > 0 ? Math.round(((prevCount - count) / prevCount) * 100) : 0;
                    return {
                        stage,
                        label: stage.replace(/^\w/, (c) => c.toUpperCase()),
                        count,
                        percentage,
                        dropOffPercent,
                    };
                });
                return resp.success({ data: funnel }, undefined, requestOrigin);
            }
            if (subpath === '/analytics/by-funnel') {
                const counts = leads.reduce((acc, lead) => {
                    acc[lead.funnelId] = (acc[lead.funnelId] || 0) + 1;
                    return acc;
                }, {});
                const breakdown = Object.entries(counts)
                    .map(([funnelId, count]) => ({
                    funnelId,
                    funnelName: formatFunnelName(funnelId),
                    count,
                }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 10);
                return resp.success({ data: breakdown }, undefined, requestOrigin);
            }
            if (subpath === '/analytics/activity') {
                const limit = Number(queryParam(event, 'limit')) || 10;
                const recentLeads = leads.slice(0, limit);
                const activity = recentLeads.map((lead) => ({
                    id: `lead-${lead.leadId}`,
                    type: 'lead_received',
                    description: `New lead from ${lead.funnelId}`,
                    performedBy: 'system',
                    performedByName: 'System',
                    leadId: lead.leadId,
                    funnelId: lead.funnelId,
                    createdAt: lead.createdAt,
                }));
                return resp.success({ data: activity }, undefined, requestOrigin);
            }
        }
        // ---- NOTIFICATIONS ----
        if (subpath.startsWith('/notifications')) {
            if (subpath === '/notifications/count' && method === 'GET') {
                return resp.success({ unread: 0 }, undefined, requestOrigin);
            }
            if (subpath === '/notifications/mark-all-read' && method === 'POST') {
                return resp.success({ updated: true }, undefined, requestOrigin);
            }
            if (/^\/notifications\/[^/]+\/read$/.test(subpath) && method === 'PUT') {
                return resp.success({ updated: true }, undefined, requestOrigin);
            }
            if (subpath === '/notifications' && method === 'GET') {
                return resp.success({ data: [], nextCursor: null, total: 0 }, undefined, requestOrigin);
            }
        }
        // ---- EXPORTS ----
        if (subpath === '/exports' && method === 'POST') {
            const body = parseBody(event);
            if (body === null)
                return resp.badRequest('Invalid JSON in request body', requestOrigin);
            if (!body.format)
                return resp.badRequest('format is required', requestOrigin);
            const job = await exportsDb.createExport({
                requestedBy: identity.userId,
                orgId: identity.primaryOrgId || undefined,
                format: body.format,
                filters: {
                    dateFrom: body.dateFrom,
                    dateTo: body.dateTo,
                    status: body.status,
                    fields: body.fields,
                },
            });
            return resp.created({
                id: job.exportId,
                status: job.status,
                format: job.format,
                totalRecords: job.recordCount,
                processedRecords: job.recordCount,
                errorMessage: job.errorMessage,
                createdAt: job.createdAt,
                completedAt: job.completedAt,
            }, requestOrigin);
        }
        if (/^\/exports\/[^/]+$/.test(subpath) && method === 'GET') {
            const exportId = pathParam(event, 2);
            const job = await exportsDb.getExport(exportId);
            if (!job)
                return resp.notFound('Export not found', requestOrigin);
            if (job.orgId && !identity.orgIds.includes(job.orgId)) {
                return resp.forbidden('Not authorized to access this export', requestOrigin);
            }
            return resp.success({
                id: job.exportId,
                status: job.status,
                format: job.format,
                totalRecords: job.recordCount,
                processedRecords: job.recordCount,
                errorMessage: job.errorMessage,
                createdAt: job.createdAt,
                completedAt: job.completedAt,
            }, undefined, requestOrigin);
        }
        if (/^\/exports\/[^/]+\/download$/.test(subpath) && method === 'GET') {
            const exportId = pathParam(event, 2);
            const job = await exportsDb.getExport(exportId);
            if (!job)
                return resp.notFound('Export not found', requestOrigin);
            if (job.orgId && !identity.orgIds.includes(job.orgId)) {
                return resp.forbidden('Not authorized to access this export', requestOrigin);
            }
            if (job.status !== 'completed' || !job.s3Key) {
                return resp.badRequest('Export not ready for download', requestOrigin);
            }
            const bucket = process.env.EXPORTS_BUCKET || '';
            const url = await getPresignedDownloadUrl(bucket, job.s3Key, 3600);
            return {
                statusCode: 302,
                headers: {
                    [HTTP_HEADERS.ACCESS_CONTROL_ALLOW_ORIGIN]: resp.getCorsOrigin(requestOrigin),
                    [HTTP_HEADERS.ACCESS_CONTROL_ALLOW_CREDENTIALS]: 'true',
                    Location: url,
                },
                body: '',
            };
        }
        // ---- SETTINGS ----
        if (subpath === '/settings' && method === 'GET') {
            const user = await usersDb.getUser(identity.userId);
            if (!user)
                return resp.notFound('User not found', requestOrigin);
            const prefs = parsePortalPreferences(user.preferences);
            return resp.success({
                ...prefs.servicePreferences,
                ...prefs.granularNotifications,
            }, undefined, requestOrigin);
        }
        if (subpath === '/settings' && method === 'PUT') {
            const body = parseBody(event);
            if (body === null)
                return resp.badRequest('Invalid JSON in request body', requestOrigin);
            const user = await usersDb.getUser(identity.userId);
            if (!user)
                return resp.notFound('User not found', requestOrigin);
            const current = parsePortalPreferences(user.preferences);
            const nextPreferences = { ...(user.preferences || {}) };
            const hasNotificationPrefs = typeof body.emailNotifications === 'boolean' || typeof body.smsNotifications === 'boolean';
            if (hasNotificationPrefs) {
                const merged = {
                    ...current.notificationPreferences,
                    ...(typeof body.emailNotifications === 'boolean'
                        ? { emailNotifications: body.emailNotifications }
                        : {}),
                    ...(typeof body.smsNotifications === 'boolean'
                        ? { smsNotifications: body.smsNotifications }
                        : {}),
                };
                nextPreferences.notificationPreferences = merged;
                if (identity.primaryOrgId) {
                    await membershipsDb.updateMember({
                        orgId: identity.primaryOrgId,
                        userId: identity.userId,
                        notifyEmail: merged.emailNotifications,
                        notifySms: merged.smsNotifications,
                    });
                }
            }
            const servicePrefsUpdates = {};
            if (Array.isArray(body.categories))
                servicePrefsUpdates.categories = body.categories;
            if (Array.isArray(body.zipCodes))
                servicePrefsUpdates.zipCodes = body.zipCodes;
            if (body.businessHours && typeof body.businessHours === 'object') {
                servicePrefsUpdates.businessHours =
                    body.businessHours;
            }
            if (Object.keys(servicePrefsUpdates).length > 0) {
                nextPreferences.servicePreferences = {
                    ...current.servicePreferences,
                    ...servicePrefsUpdates,
                    businessHours: {
                        ...current.servicePreferences.businessHours,
                        ...(servicePrefsUpdates.businessHours || {}),
                    },
                };
            }
            const granularKeys = [
                'newLeadEmail',
                'newLeadSms',
                'newLeadPush',
                'statusChangeEmail',
                'statusChangeSms',
                'statusChangePush',
                'teamActivityEmail',
                'teamActivitySms',
                'teamActivityPush',
                'weeklyDigestEmail',
            ];
            const granularUpdates = {};
            granularKeys.forEach((key) => {
                if (typeof body[key] === 'boolean') {
                    granularUpdates[key] = body[key];
                }
            });
            if (Object.keys(granularUpdates).length > 0) {
                nextPreferences.granularNotifications = {
                    ...current.granularNotifications,
                    ...granularUpdates,
                };
            }
            await usersDb.updateUser({
                userId: identity.userId,
                preferences: nextPreferences,
            });
            await recordAudit({
                actorId: identity.userId,
                actorType: ACTOR_TYPES.PORTAL_USER,
                action: 'settings.update',
                resourceType: 'user',
                resourceId: identity.userId,
                details: { keys: Object.keys(body) },
                ipHash: getIpHash(event),
            });
            const prefs = parsePortalPreferences(nextPreferences);
            return resp.success({
                ...prefs.servicePreferences,
                ...prefs.granularNotifications,
            }, undefined, requestOrigin);
        }
        // ---- BILLING (feature-flagged) ----
        if (subpath.startsWith('/billing')) {
            const billingEnabled = await isFeatureEnabled('billing_enabled');
            if (!billingEnabled)
                return resp.notFound('Endpoint not found', requestOrigin);
            return await handleBillingRoutes(event, subpath, method, identity, requestOrigin);
        }
        // ---- CALENDAR (feature-flagged) ----
        if (subpath.startsWith('/calendar')) {
            const calendarEnabled = await isFeatureEnabled('calendar_enabled');
            if (!calendarEnabled)
                return resp.notFound('Endpoint not found', requestOrigin);
            return await handleCalendarRoutes(event, subpath, method, identity, requestOrigin);
        }
        // ---- INTEGRATIONS: Slack/Teams (feature-flagged) ----
        if (subpath.startsWith('/integrations')) {
            return await handleIntegrationRoutes(event, subpath, method, identity, requestOrigin);
        }
        return resp.notFound('Portal endpoint not found', requestOrigin);
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        log.error('portal.handler.error', {
            error: msg,
            path,
            method,
            userId: identity.userId,
        });
        if (err &&
            typeof err === 'object' &&
            'name' in err &&
            err.name === 'ConditionalCheckFailedException') {
            return resp.conflict('Resource conflict or not found', requestOrigin);
        }
        return resp.internalError(requestOrigin);
    }
}
// ---------------------------------------------------------------------------
// Billing Routes (Task 2)
// ---------------------------------------------------------------------------
async function handleBillingRoutes(event, subpath, method, identity, requestOrigin) {
    // Dynamic imports to avoid loading when disabled
    const { getBillingAccount, changePlan, getPlanDetails } = await import('../lib/billing/accounts.js');
    const { getCurrentUsage } = await import('../lib/billing/metering.js');
    const { getStripeService } = await import('../lib/billing/stripe-stub.js');
    const orgId = queryParam(event, 'orgId') || identity.primaryOrgId;
    if (!orgId)
        return resp.badRequest('No org context', requestOrigin);
    if (!identity.orgIds.includes(orgId)) {
        return resp.forbidden('Not a member of this org', requestOrigin);
    }
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
        }, undefined, requestOrigin);
    }
    // GET /portal/billing/invoices - Invoice history
    if (subpath === '/billing/invoices' && method === 'GET') {
        const account = await getBillingAccount(orgId);
        const stripe = getStripeService();
        const invoices = await stripe.getInvoices(account.stripeCustomerId || '', Number(queryParam(event, 'limit')) || 10);
        return resp.success({ invoices }, undefined, requestOrigin);
    }
    // POST /portal/billing/upgrade - Change plan (stub)
    if (subpath === '/billing/upgrade' && method === 'POST') {
        const body = parseBody(event);
        if (body === null)
            return resp.badRequest('Invalid JSON in request body', requestOrigin);
        const newTier = body.tier;
        if (!newTier || !VALID_BILLING_TIERS.includes(newTier)) {
            return resp.badRequest(`tier must be one of: ${VALID_BILLING_TIERS.join(', ')}`, requestOrigin);
        }
        const account = await changePlan(orgId, newTier);
        await recordAudit({
            actorId: identity.userId,
            actorType: ACTOR_TYPES.PORTAL_USER,
            action: 'billing.upgrade',
            resourceType: 'billing',
            resourceId: orgId,
            details: { newTier },
            ipHash: getIpHash(event),
        });
        return resp.success(account, undefined, requestOrigin);
    }
    return resp.notFound('Billing endpoint not found', requestOrigin);
}
// ---------------------------------------------------------------------------
// Calendar Routes (Task 3)
// ---------------------------------------------------------------------------
async function handleCalendarRoutes(event, subpath, method, identity, requestOrigin) {
    const { PutCommand, GetCommand, DeleteCommand } = await import('@aws-sdk/lib-dynamodb');
    const { getDocClient, tableName } = await import('../lib/db/client.js');
    const { createCalendarProvider, getSupportedProviders } = await import('../lib/calendar/factory.js');
    const doc = getDocClient();
    // POST /portal/calendar/connect
    if (subpath === '/calendar/connect' && method === 'POST') {
        const body = parseBody(event);
        if (body === null)
            return resp.badRequest('Invalid JSON in request body', requestOrigin);
        const provider = body.provider;
        const supported = getSupportedProviders();
        if (!provider || !supported.includes(provider)) {
            return resp.badRequest(`provider must be one of: ${supported.join(', ')}`, requestOrigin);
        }
        const now = new Date().toISOString();
        const config = {
            pk: `${DB_PREFIXES.CALENDAR}${identity.userId}`,
            sk: DB_SORT_KEYS.CONFIG,
            userId: identity.userId,
            orgId: identity.primaryOrgId,
            provider,
            accessToken: body.accessToken,
            refreshToken: body.refreshToken,
            calendarId: body.calendarId,
            caldavUrl: body.caldavUrl,
            connected: true,
            createdAt: now,
            updatedAt: now,
        };
        await doc.send(new PutCommand({
            TableName: tableName(),
            Item: config,
        }));
        await recordAudit({
            actorId: identity.userId,
            actorType: ACTOR_TYPES.PORTAL_USER,
            action: 'calendar.connect',
            resourceType: 'calendar',
            resourceId: identity.userId,
            details: { provider },
            ipHash: getIpHash(event),
        });
        return resp.success({ connected: true, provider }, undefined, requestOrigin);
    }
    // GET /portal/calendar/availability
    if (subpath === '/calendar/availability' && method === 'GET') {
        const start = queryParam(event, 'start');
        const end = queryParam(event, 'end');
        if (!start || !end) {
            return resp.badRequest('start and end query parameters are required', requestOrigin);
        }
        // Load user's calendar config
        const result = await doc.send(new GetCommand({
            TableName: tableName(),
            Key: {
                pk: `${DB_PREFIXES.CALENDAR}${identity.userId}`,
                sk: DB_SORT_KEYS.CONFIG,
            },
        }));
        if (!result.Item || !result.Item.connected) {
            return resp.badRequest('No calendar connected. Please connect a calendar first.', requestOrigin);
        }
        const calConfig = result.Item;
        const providerInstance = createCalendarProvider(calConfig);
        const slots = await providerInstance.getAvailability(new Date(start), new Date(end));
        return resp.success({
            slots: slots.map((s) => ({
                start: s.start.toISOString(),
                end: s.end.toISOString(),
                available: s.available,
            })),
        }, undefined, requestOrigin);
    }
    // POST /portal/calendar/book
    if (subpath === '/calendar/book' && method === 'POST') {
        const body = parseBody(event);
        if (body === null)
            return resp.badRequest('Invalid JSON in request body', requestOrigin);
        if (!body.startTime || !body.endTime || !body.title) {
            return resp.badRequest('startTime, endTime, and title are required', requestOrigin);
        }
        // Load user's calendar config
        const result = await doc.send(new GetCommand({
            TableName: tableName(),
            Key: {
                pk: `${DB_PREFIXES.CALENDAR}${identity.userId}`,
                sk: DB_SORT_KEYS.CONFIG,
            },
        }));
        if (!result.Item || !result.Item.connected) {
            return resp.badRequest('No calendar connected', requestOrigin);
        }
        const calConfig = result.Item;
        const providerInstance = createCalendarProvider(calConfig);
        const eventId = await providerInstance.createEvent({
            title: body.title,
            description: body.description,
            startTime: new Date(body.startTime),
            endTime: new Date(body.endTime),
            attendees: body.attendeeEmail
                ? [{ email: body.attendeeEmail, name: body.attendeeName }]
                : undefined,
        });
        await recordAudit({
            actorId: identity.userId,
            actorType: ACTOR_TYPES.PORTAL_USER,
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
        }, undefined, requestOrigin);
    }
    // DELETE /portal/calendar/disconnect
    if (subpath === '/calendar/disconnect' && method === 'DELETE') {
        await doc.send(new DeleteCommand({
            TableName: tableName(),
            Key: {
                pk: `${DB_PREFIXES.CALENDAR}${identity.userId}`,
                sk: DB_SORT_KEYS.CONFIG,
            },
        }));
        await recordAudit({
            actorId: identity.userId,
            actorType: ACTOR_TYPES.PORTAL_USER,
            action: 'calendar.disconnect',
            resourceType: 'calendar',
            resourceId: identity.userId,
            ipHash: getIpHash(event),
        });
        return resp.success({ disconnected: true }, undefined, requestOrigin);
    }
    return resp.notFound('Calendar endpoint not found', requestOrigin);
}
// ---------------------------------------------------------------------------
// Integration Routes: Slack/Teams (Task 4)
// ---------------------------------------------------------------------------
async function handleIntegrationRoutes(event, subpath, method, identity, requestOrigin) {
    const flags = await loadFeatureFlags();
    const { saveChannelConfig, deleteChannelConfig, sendTestNotification } = await import('../lib/messaging/dispatcher.js');
    const orgId = queryParam(event, 'orgId') || identity.primaryOrgId;
    if (!orgId)
        return resp.badRequest('No org context', requestOrigin);
    if (!identity.orgIds.includes(orgId)) {
        return resp.forbidden('Not a member of this org', requestOrigin);
    }
    // POST /portal/integrations/slack
    if (subpath === '/integrations/slack' && method === 'POST') {
        if (!flags.slack_enabled)
            return resp.notFound('Endpoint not found', requestOrigin);
        const body = parseBody(event);
        if (body === null)
            return resp.badRequest('Invalid JSON in request body', requestOrigin);
        if (!body.webhookUrl)
            return resp.badRequest('webhookUrl is required', requestOrigin);
        const config = await saveChannelConfig(orgId, 'slack', body.webhookUrl, body.channelName);
        await recordAudit({
            actorId: identity.userId,
            actorType: ACTOR_TYPES.PORTAL_USER,
            action: 'integration.configure',
            resourceType: 'integration',
            resourceId: `${orgId}:slack`,
            ipHash: getIpHash(event),
        });
        return resp.success(config, undefined, requestOrigin);
    }
    // POST /portal/integrations/teams
    if (subpath === '/integrations/teams' && method === 'POST') {
        if (!flags.teams_enabled)
            return resp.notFound('Endpoint not found', requestOrigin);
        const body = parseBody(event);
        if (body === null)
            return resp.badRequest('Invalid JSON in request body', requestOrigin);
        if (!body.webhookUrl)
            return resp.badRequest('webhookUrl is required', requestOrigin);
        const config = await saveChannelConfig(orgId, 'teams', body.webhookUrl, body.channelName);
        await recordAudit({
            actorId: identity.userId,
            actorType: ACTOR_TYPES.PORTAL_USER,
            action: 'integration.configure',
            resourceType: 'integration',
            resourceId: `${orgId}:teams`,
            ipHash: getIpHash(event),
        });
        return resp.success(config, undefined, requestOrigin);
    }
    // DELETE /portal/integrations/:provider
    if (/^\/integrations\/(slack|teams)$/.test(subpath) && method === 'DELETE') {
        const provider = pathParam(event, 2);
        if (provider === 'slack' && !flags.slack_enabled) {
            return resp.notFound('Endpoint not found', requestOrigin);
        }
        if (provider === 'teams' && !flags.teams_enabled) {
            return resp.notFound('Endpoint not found', requestOrigin);
        }
        await deleteChannelConfig(orgId, provider);
        await recordAudit({
            actorId: identity.userId,
            actorType: ACTOR_TYPES.PORTAL_USER,
            action: 'integration.remove',
            resourceType: 'integration',
            resourceId: `${orgId}:${provider}`,
            ipHash: getIpHash(event),
        });
        return resp.success({ removed: true, provider }, undefined, requestOrigin);
    }
    // POST /portal/integrations/:provider/test
    if (/^\/integrations\/(slack|teams)\/test$/.test(subpath) && method === 'POST') {
        const provider = pathParam(event, 2);
        if (provider === 'slack' && !flags.slack_enabled) {
            return resp.notFound('Endpoint not found', requestOrigin);
        }
        if (provider === 'teams' && !flags.teams_enabled) {
            return resp.notFound('Endpoint not found', requestOrigin);
        }
        const result = await sendTestNotification(orgId, provider);
        return resp.success(result, undefined, requestOrigin);
    }
    return resp.notFound('Integration endpoint not found', requestOrigin);
}
//# sourceMappingURL=portal.js.map
/**
 * Notification Dispatcher
 *
 * Orchestrates all notification sending for lead events. Handles:
 * - Internal ops notifications (email + SMS)
 * - Org member notifications based on org notification policy
 * - Feature flag checks for each notification channel
 * - Recording all notification attempts in DynamoDB
 *
 * Error Handling:
 * - Individual notification failures do not stop other notifications
 * - All attempts are recorded regardless of success/failure
 * - Errors are logged but never propagated to fail the entire worker
 */
import { PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { GetParameterCommand } from '@aws-sdk/client-ssm';
import { v4 as uuidv4 } from 'uuid';
import { getDocClient, getSsmClient } from '../clients.js';
import * as orgsDb from '../db/orgs.js';
import * as membershipsDb from '../db/memberships.js';
import * as usersDb from '../db/users.js';
import { sendEmail, buildLeadAssignedEmail, buildLeadUnassignedEmail } from './email.js';
import { sendSms, buildLeadAssignedSms, buildLeadUnassignedSms } from './sms.js';
import { DB_PREFIXES, DB_SORT_KEYS } from '../constants.js';
// =============================================================================
// SSM Parameter Cache
// =============================================================================
let cachedInternalRecipients = null;
let internalRecipientsCacheExpiry = 0;
const SSM_CACHE_TTL_MS = 60 * 1000; // 60 seconds
/**
 * Load internal notification recipients from SSM Parameter Store.
 *
 * Expected SSM parameter value format (JSON array):
 * [
 *   { "name": "Ops Team", "email": "ops@kanjona.com", "phone": "+15551234567" },
 *   { "name": "Manager", "email": "manager@kanjona.com" }
 * ]
 */
async function loadInternalRecipients(region, ssmPath) {
    const now = Date.now();
    if (cachedInternalRecipients && now < internalRecipientsCacheExpiry) {
        return cachedInternalRecipients;
    }
    if (!ssmPath) {
        console.log(JSON.stringify({
            level: 'warn',
            message: 'Internal recipients SSM path not configured',
        }));
        return [];
    }
    try {
        const client = getSsmClient(region);
        const result = await client.send(new GetParameterCommand({
            Name: ssmPath,
            WithDecryption: true,
        }));
        if (!result.Parameter?.Value) {
            return [];
        }
        const recipients = JSON.parse(result.Parameter.Value);
        cachedInternalRecipients = recipients;
        internalRecipientsCacheExpiry = now + SSM_CACHE_TTL_MS;
        return recipients;
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown SSM error';
        console.log(JSON.stringify({
            level: 'error',
            message: 'Failed to load internal recipients from SSM',
            error: errorMessage,
        }));
        return [];
    }
}
async function loadOrgMembersWithUsers(orgId) {
    try {
        const result = await membershipsDb.listOrgMembers(orgId, undefined, 200);
        const members = result.items;
        const userCache = new Map();
        await Promise.all(members.map(async (member) => {
            if (!userCache.has(member.userId)) {
                userCache.set(member.userId, await usersDb.getUser(member.userId));
            }
        }));
        return members.map((member) => ({
            member,
            user: userCache.get(member.userId) || null,
        }));
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log(JSON.stringify({
            level: 'error',
            message: 'Failed to load org members',
            orgId,
            error: errorMessage,
        }));
        return [];
    }
}
/**
 * Record a notification attempt in DynamoDB.
 *
 * Records all notifications (sent, failed, skipped) for audit and
 * deduplication purposes. TTL is set to 90 days.
 */
async function recordNotification(region, tableName, record) {
    const client = getDocClient(region);
    if (!tableName) {
        console.log(JSON.stringify({
            level: 'warn',
            message: 'Notifications table not configured',
            notificationId: record.notificationId,
        }));
        return;
    }
    try {
        await client.send(new PutCommand({
            TableName: tableName,
            Item: record,
        }));
    }
    catch (error) {
        // Log but do not throw - recording failures should not block notifications
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log(JSON.stringify({
            level: 'error',
            message: 'Failed to record notification',
            notificationId: record.notificationId,
            error: errorMessage,
        }));
    }
}
/**
 * Update lead notification timestamps to prevent duplicate notifications.
 */
async function updateLeadNotificationTimestamp(region, tableName, leadId, funnelId, field) {
    const client = getDocClient(region);
    try {
        await client.send(new UpdateCommand({
            TableName: tableName,
            Key: {
                pk: `${DB_PREFIXES.LEAD}${funnelId}#${leadId}`,
                sk: DB_SORT_KEYS.META,
            },
            UpdateExpression: 'SET #field = :now',
            ExpressionAttributeNames: {
                '#field': field,
            },
            ExpressionAttributeValues: {
                ':now': new Date().toISOString(),
            },
        }));
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log(JSON.stringify({
            level: 'warn',
            message: 'Failed to update lead notification timestamp',
            leadId,
            field,
            error: errorMessage,
        }));
    }
}
// =============================================================================
// Notification TTL
// =============================================================================
/**
 * Get TTL for notification records (90 days from now)
 */
function getNotificationTtl() {
    return Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60;
}
// =============================================================================
// Internal Notifications
// =============================================================================
/**
 * Send notifications to internal operations team.
 *
 * @param config - Worker configuration
 * @param featureFlags - Current feature flag state
 * @param lead - The lead record
 * @param eventType - 'assigned' or 'unassigned'
 * @param reason - Unassignment reason (for unassigned events)
 */
async function notifyInternal(config, featureFlags, lead, eventType, reason) {
    const recipients = await loadInternalRecipients(config.awsRegion, config.internalRecipientsSsmPath);
    if (recipients.length === 0) {
        console.log(JSON.stringify({
            level: 'info',
            message: 'No internal recipients configured',
        }));
        return;
    }
    const ttl = getNotificationTtl();
    for (const recipient of recipients) {
        // Send email notification
        if (featureFlags.enable_email_notifications && recipient.email) {
            const emailContent = eventType === 'assigned'
                ? buildLeadAssignedEmail(lead, recipient.name)
                : buildLeadUnassignedEmail(lead, reason || 'unknown');
            const emailResult = await sendEmail({
                to: recipient.email,
                subject: emailContent.subject,
                htmlBody: emailContent.htmlBody,
                textBody: emailContent.textBody,
                fromAddress: config.sesFromAddress,
                region: config.awsRegion,
            });
            await recordNotification(config.awsRegion, config.notificationsTableName, {
                pk: `${DB_PREFIXES.NOTIFY}${lead.leadId}`,
                sk: `EMAIL#internal#${recipient.email}`,
                notificationId: uuidv4(),
                leadId: lead.leadId,
                funnelId: lead.funnelId,
                recipientType: 'internal',
                recipientId: recipient.email,
                channel: 'email',
                status: emailResult.success ? 'sent' : 'failed',
                messageId: emailResult.messageId,
                errorMessage: emailResult.error,
                sentAt: new Date().toISOString(),
                ttl,
            });
        }
        // Send SMS notification
        if (featureFlags.enable_sms_notifications && recipient.phone) {
            const smsBody = eventType === 'assigned'
                ? buildLeadAssignedSms(lead)
                : buildLeadUnassignedSms(lead, reason || 'unknown');
            const smsResult = await sendSms({
                to: recipient.phone,
                body: smsBody,
                region: config.awsRegion,
                featureFlags,
                twilioSecretArn: config.twilioSecretArn,
            });
            await recordNotification(config.awsRegion, config.notificationsTableName, {
                pk: `${DB_PREFIXES.NOTIFY}${lead.leadId}`,
                sk: `SMS#internal#${recipient.phone}`,
                notificationId: uuidv4(),
                leadId: lead.leadId,
                funnelId: lead.funnelId,
                recipientType: 'internal',
                recipientId: recipient.phone,
                channel: 'sms',
                status: smsResult.success ? 'sent' : 'failed',
                messageId: smsResult.messageId,
                errorMessage: smsResult.error,
                sentAt: new Date().toISOString(),
                ttl,
            });
        }
    }
}
// =============================================================================
// Org Member Notifications
// =============================================================================
/**
 * Send notifications to assigned organization members.
 *
 * Notification targeting depends on the org's notification policy:
 * - "org_all": Notify all active members with notification flags enabled
 * - "assigned_only": Notify only the assigned user, or org owners/managers if
 *   no specific user was assigned
 *
 * @param config - Worker configuration
 * @param featureFlags - Current feature flag state
 * @param lead - The lead record
 * @param event - The lead.assigned event detail
 */
async function notifyOrgMembers(config, featureFlags, lead, event) {
    const orgId = event.assignedOrgId;
    // Load org to get notification policy
    const org = await orgsDb.getOrg(orgId);
    if (!org) {
        console.log(JSON.stringify({
            level: 'warn',
            message: 'Org not found for notification',
            orgId,
        }));
        return;
    }
    const policyRaw = org.settings?.notificationPolicy;
    const notificationPolicy = policyRaw === 'org_all' || policyRaw === 'assigned_only' ? policyRaw : 'assigned_only';
    // Load all org members + user profiles
    const allMembers = await loadOrgMembersWithUsers(orgId);
    const activeMembers = allMembers.filter((entry) => entry.user?.status === 'active');
    if (activeMembers.length === 0) {
        console.log(JSON.stringify({
            level: 'warn',
            message: 'No active members found for org',
            orgId,
        }));
        return;
    }
    // Determine which members to notify based on org policy
    let membersToNotify;
    const isLeadership = (role) => role === 'ORG_OWNER' || role === 'MANAGER';
    if (notificationPolicy === 'org_all') {
        // Notify all active members with notification flags
        membersToNotify = activeMembers.filter((entry) => entry.member.notifyEmail || entry.member.notifySms);
    }
    else {
        // assigned_only policy
        if (event.assignedUserId) {
            // Notify the specifically assigned user
            const assignedMember = activeMembers.find((entry) => entry.member.userId === event.assignedUserId);
            if (assignedMember) {
                membersToNotify = [assignedMember];
            }
            else {
                // Assigned user not found in members - fall back to owners/managers
                membersToNotify = activeMembers.filter((entry) => isLeadership(entry.member.role) && (entry.member.notifyEmail || entry.member.notifySms));
            }
        }
        else {
            // No specific user assigned - notify owners and managers
            membersToNotify = activeMembers.filter((entry) => isLeadership(entry.member.role) && (entry.member.notifyEmail || entry.member.notifySms));
        }
    }
    if (membersToNotify.length === 0) {
        console.log(JSON.stringify({
            level: 'info',
            message: 'No members to notify after policy filter',
            orgId,
            policy: notificationPolicy,
        }));
        return;
    }
    const ttl = getNotificationTtl();
    // Send notifications to each member
    for (const entry of membersToNotify) {
        const member = entry.member;
        const user = entry.user;
        const displayName = user?.name || user?.email || 'Team member';
        // Send email if member has email notifications enabled
        if (featureFlags.enable_email_notifications && member.notifyEmail && user?.email) {
            const emailContent = buildLeadAssignedEmail(lead, displayName);
            const emailResult = await sendEmail({
                to: user.email,
                subject: emailContent.subject,
                htmlBody: emailContent.htmlBody,
                textBody: emailContent.textBody,
                fromAddress: config.sesFromAddress,
                region: config.awsRegion,
            });
            await recordNotification(config.awsRegion, config.notificationsTableName, {
                pk: `${DB_PREFIXES.NOTIFY}${lead.leadId}`,
                sk: `EMAIL#org_member#${member.userId}`,
                notificationId: uuidv4(),
                leadId: lead.leadId,
                funnelId: lead.funnelId,
                recipientType: 'org_member',
                recipientId: user.email,
                channel: 'email',
                status: emailResult.success ? 'sent' : 'failed',
                messageId: emailResult.messageId,
                errorMessage: emailResult.error,
                sentAt: new Date().toISOString(),
                ttl,
            });
        }
        // Send SMS if member has SMS notifications enabled
        if (featureFlags.enable_sms_notifications && member.notifySms && user?.phone) {
            const smsBody = buildLeadAssignedSms(lead);
            const smsResult = await sendSms({
                to: user.phone,
                body: smsBody,
                region: config.awsRegion,
                featureFlags,
                twilioSecretArn: config.twilioSecretArn,
            });
            await recordNotification(config.awsRegion, config.notificationsTableName, {
                pk: `${DB_PREFIXES.NOTIFY}${lead.leadId}`,
                sk: `SMS#org_member#${member.userId}`,
                notificationId: uuidv4(),
                leadId: lead.leadId,
                funnelId: lead.funnelId,
                recipientType: 'org_member',
                recipientId: user.phone,
                channel: 'sms',
                status: smsResult.success ? 'sent' : 'failed',
                messageId: smsResult.messageId,
                errorMessage: smsResult.error,
                sentAt: new Date().toISOString(),
                ttl,
            });
        }
    }
}
// =============================================================================
// Public API
// =============================================================================
/**
 * Dispatch all notifications for a lead event.
 *
 * Orchestrates internal and org notifications based on event type and
 * feature flags. All errors are handled gracefully - individual notification
 * failures do not prevent other notifications from being sent.
 *
 * @param config - Worker configuration
 * @param featureFlags - Current feature flag state
 * @param event - The EventBridge event detail (assigned or unassigned)
 * @param lead - The lead record from DynamoDB
 */
export async function dispatchNotifications(config, featureFlags, event, lead) {
    const isAssigned = 'assignedOrgId' in event;
    console.log(JSON.stringify({
        level: 'info',
        message: 'Dispatching notifications',
        leadId: lead.leadId,
        eventType: isAssigned ? 'assigned' : 'unassigned',
    }));
    try {
        if (isAssigned) {
            const assignedEvent = event;
            // Notify internal ops
            await notifyInternal(config, featureFlags, lead, 'assigned');
            // Update lead internal notification timestamp
            await updateLeadNotificationTimestamp(config.awsRegion, config.leadsTableName, lead.leadId, lead.funnelId, 'notifiedInternalAt');
            // Notify assigned org members
            await notifyOrgMembers(config, featureFlags, lead, assignedEvent);
            // Update lead org notification timestamp
            await updateLeadNotificationTimestamp(config.awsRegion, config.leadsTableName, lead.leadId, lead.funnelId, 'notifiedOrgAt');
        }
        else {
            const unassignedEvent = event;
            // Notify internal ops only for unassigned leads
            await notifyInternal(config, featureFlags, lead, 'unassigned', unassignedEvent.reason);
            // Update lead internal notification timestamp
            await updateLeadNotificationTimestamp(config.awsRegion, config.leadsTableName, lead.leadId, lead.funnelId, 'notifiedInternalAt');
        }
        console.log(JSON.stringify({
            level: 'info',
            message: 'Notifications dispatched successfully',
            leadId: lead.leadId,
        }));
    }
    catch (error) {
        // Log but do not throw - notification failures should not fail the worker
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log(JSON.stringify({
            level: 'error',
            message: 'Notification dispatch error',
            leadId: lead.leadId,
            error: errorMessage,
        }));
    }
}
//# sourceMappingURL=dispatcher.js.map
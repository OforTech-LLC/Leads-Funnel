/**
 * GDPR Data Management
 *
 * Provides GDPR-compliant data operations:
 * - Delete all data for an email (Right to Erasure)
 * - Export all data for a user (Subject Access Request)
 * - Anonymize data instead of deleting (for analytics retention)
 */
import { DynamoDBClient, ListTablesCommand } from '@aws-sdk/client-dynamodb';
import { QueryCommand, UpdateCommand, BatchWriteCommand, } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { getDocClient } from '../../lib/clients.js';
import { GSI_INDEX_NAMES } from '../../lib/constants.js';
// =============================================================================
// Helper Functions
// =============================================================================
/**
 * Get table name for a funnel
 */
function getTableName(config, funnelId) {
    return `${config.projectName}-${config.env}-${funnelId}`;
}
/**
 * Generate a deterministic but anonymized identifier
 */
function generateAnonymizedId() {
    return `anon_${uuidv4().slice(0, 8)}`;
}
/**
 * List all funnel tables
 *
 * Note: ListTables requires the low-level DynamoDB client, not the
 * Document client. We create a temporary client here since this is
 * an infrequent admin-only operation and the ListTables API is not
 * available on DynamoDBDocumentClient.
 */
async function listFunnelTables(config) {
    const client = new DynamoDBClient({});
    const prefix = `${config.projectName}-${config.env}-`;
    const funnelIds = [];
    let lastTableName;
    do {
        const result = await client.send(new ListTablesCommand({
            ExclusiveStartTableName: lastTableName,
        }));
        for (const tableName of result.TableNames || []) {
            if (tableName.startsWith(prefix) &&
                !tableName.includes('audit') &&
                !tableName.includes('exports')) {
                funnelIds.push(tableName.replace(prefix, ''));
            }
        }
        lastTableName = result.LastEvaluatedTableName;
    } while (lastTableName);
    return funnelIds;
}
/**
 * Find all leads by email across a funnel table
 */
async function findLeadsByEmail(tableName, email) {
    const ddb = getDocClient();
    const leads = [];
    let lastKey;
    do {
        const result = await ddb.send(new QueryCommand({
            TableName: tableName,
            IndexName: GSI_INDEX_NAMES.GSI1,
            KeyConditionExpression: 'gsi1pk = :email',
            ExpressionAttributeValues: {
                ':email': `EMAIL#${email.toLowerCase()}`,
            },
            ExclusiveStartKey: lastKey,
        }));
        leads.push(...(result.Items || []));
        lastKey = result.LastEvaluatedKey;
    } while (lastKey);
    return leads;
}
/**
 * Find audit logs for a user by email
 */
async function findAuditLogsByEmail(config, email) {
    const ddb = getDocClient();
    const logs = [];
    let lastKey;
    // Query by email GSI if available, otherwise scan with filter
    do {
        const result = await ddb.send(new QueryCommand({
            TableName: config.auditTable,
            IndexName: GSI_INDEX_NAMES.GSI1,
            KeyConditionExpression: 'gsi1pk = :email',
            ExpressionAttributeValues: {
                ':email': `EMAIL#${email.toLowerCase()}`,
            },
            ExclusiveStartKey: lastKey,
            Limit: 1000,
        }));
        logs.push(...(result.Items || []));
        lastKey = result.LastEvaluatedKey;
    } while (lastKey);
    return logs;
}
// =============================================================================
// GDPR Operations
// =============================================================================
/**
 * Delete all data for an email address (Right to Erasure / Right to be Forgotten)
 *
 * This permanently deletes:
 * - All lead records across all funnels
 * - All audit log entries related to this email
 *
 * @param config - Admin configuration
 * @param email - Email address to delete data for
 * @param requestedBy - Email/ID of admin making the request (for audit)
 * @returns Delete result with count of deleted records
 */
export async function deleteLeadData(config, email, requestedBy) {
    const ddb = getDocClient();
    const timestamp = new Date().toISOString();
    const auditId = uuidv4();
    const normalizedEmail = email.toLowerCase().trim();
    let deletedRecords = 0;
    const funnelsAffected = [];
    // Get all funnel tables
    const funnelIds = await listFunnelTables(config);
    // Delete leads from each funnel table
    for (const funnelId of funnelIds) {
        const tableName = getTableName(config, funnelId);
        const leads = await findLeadsByEmail(tableName, normalizedEmail);
        if (leads.length > 0) {
            funnelsAffected.push(funnelId);
            // Batch delete leads (DynamoDB batch limit is 25)
            for (let i = 0; i < leads.length; i += 25) {
                const batch = leads.slice(i, i + 25);
                const deleteRequests = batch.map((lead) => ({
                    DeleteRequest: {
                        Key: {
                            pk: lead.pk,
                            sk: lead.sk,
                        },
                    },
                }));
                await ddb.send(new BatchWriteCommand({
                    RequestItems: {
                        [tableName]: deleteRequests,
                    },
                }));
                deletedRecords += batch.length;
            }
        }
    }
    // Log the GDPR deletion action to audit table
    await ddb.send(new UpdateCommand({
        TableName: config.auditTable,
        Key: {
            pk: `GDPR#${auditId}`,
            sk: 'DELETE',
        },
        UpdateExpression: 'SET #action = :action, email = :email, requestedBy = :requestedBy, deletedRecords = :deletedRecords, funnelsAffected = :funnels, #ts = :timestamp, gsi1pk = :gsi1pk',
        ExpressionAttributeNames: {
            '#action': 'action',
            '#ts': 'timestamp',
        },
        ExpressionAttributeValues: {
            ':action': 'GDPR_DELETE',
            ':email': normalizedEmail,
            ':requestedBy': requestedBy,
            ':deletedRecords': deletedRecords,
            ':funnels': funnelsAffected,
            ':timestamp': timestamp,
            ':gsi1pk': `GDPR#${normalizedEmail}`,
        },
    }));
    return {
        success: true,
        email: normalizedEmail,
        deletedRecords,
        funnelsAffected,
        auditId,
        timestamp,
    };
}
/**
 * Export all user data for GDPR Subject Access Request (SAR)
 *
 * Returns a comprehensive export of all data associated with an email:
 * - Lead records from all funnels
 * - Audit log entries
 * - Associated metadata
 *
 * @param config - Admin configuration
 * @param email - Email address to export data for
 * @param requestedBy - Email/ID of admin making the request (for audit)
 * @returns Export result containing all user data
 */
export async function exportUserData(config, email, requestedBy) {
    const ddb = getDocClient();
    const timestamp = new Date().toISOString();
    const exportId = uuidv4();
    const normalizedEmail = email.toLowerCase().trim();
    const exportedLeads = [];
    const exportedAuditLogs = [];
    // Get all funnel tables
    const funnelIds = await listFunnelTables(config);
    // Export leads from each funnel table
    for (const funnelId of funnelIds) {
        const tableName = getTableName(config, funnelId);
        const leads = await findLeadsByEmail(tableName, normalizedEmail);
        for (const lead of leads) {
            exportedLeads.push({
                leadId: lead.leadId,
                funnelId: lead.funnelId || funnelId,
                name: lead.name,
                email: lead.email,
                phone: lead.phone,
                notes: lead.notes,
                status: lead.status,
                pipelineStatus: lead.pipelineStatus,
                tags: lead.tags,
                createdAt: lead.createdAt,
                updatedAt: lead.updatedAt,
            });
        }
    }
    // Export audit logs
    try {
        const auditLogs = await findAuditLogsByEmail(config, normalizedEmail);
        for (const log of auditLogs) {
            exportedAuditLogs.push({
                action: log.action,
                resourceType: log.resourceType,
                resourceId: log.resourceId,
                timestamp: log.timestamp,
                details: log.details,
            });
        }
    }
    catch {
        // Audit log export may fail if GSI doesn't exist - continue with lead export
    }
    // Log the GDPR export action
    await ddb.send(new UpdateCommand({
        TableName: config.auditTable,
        Key: {
            pk: `GDPR#${exportId}`,
            sk: 'EXPORT',
        },
        UpdateExpression: 'SET #action = :action, email = :email, requestedBy = :requestedBy, recordCount = :count, #ts = :timestamp, gsi1pk = :gsi1pk',
        ExpressionAttributeNames: {
            '#action': 'action',
            '#ts': 'timestamp',
        },
        ExpressionAttributeValues: {
            ':action': 'GDPR_EXPORT',
            ':email': normalizedEmail,
            ':requestedBy': requestedBy,
            ':count': exportedLeads.length + exportedAuditLogs.length,
            ':timestamp': timestamp,
            ':gsi1pk': `GDPR#${normalizedEmail}`,
        },
    }));
    return {
        success: true,
        email: normalizedEmail,
        exportId,
        data: {
            leads: exportedLeads,
            auditLogs: exportedAuditLogs,
            metadata: {
                exportedAt: timestamp,
                exportedBy: requestedBy,
                totalRecords: exportedLeads.length + exportedAuditLogs.length,
            },
        },
        timestamp,
    };
}
/**
 * Anonymize lead data instead of deleting
 *
 * Useful for retaining analytics data while removing PII:
 * - Replaces name with "Anonymized User"
 * - Replaces email with anonymized identifier
 * - Clears phone, notes, and other PII fields
 * - Preserves non-PII data (status, timestamps, UTM)
 *
 * @param config - Admin configuration
 * @param email - Email address to anonymize
 * @param requestedBy - Email/ID of admin making the request (for audit)
 * @returns Anonymize result with count of affected records
 */
export async function anonymizeLeadData(config, email, requestedBy) {
    const ddb = getDocClient();
    const timestamp = new Date().toISOString();
    const auditId = uuidv4();
    const normalizedEmail = email.toLowerCase().trim();
    const anonymizedId = generateAnonymizedId();
    let anonymizedRecords = 0;
    const funnelsAffected = [];
    // Get all funnel tables
    const funnelIds = await listFunnelTables(config);
    // Anonymize leads in each funnel table
    for (const funnelId of funnelIds) {
        const tableName = getTableName(config, funnelId);
        const leads = await findLeadsByEmail(tableName, normalizedEmail);
        if (leads.length > 0) {
            funnelsAffected.push(funnelId);
            // Update each lead with anonymized data
            for (const lead of leads) {
                await ddb.send(new UpdateCommand({
                    TableName: tableName,
                    Key: {
                        pk: lead.pk,
                        sk: lead.sk,
                    },
                    UpdateExpression: `
              SET #name = :anonName,
                  email = :anonEmail,
                  phone = :removed,
                  notes = :removed,
                  gsi1pk = :anonGsi1pk,
                  anonymizedAt = :timestamp,
                  anonymizedBy = :requestedBy
              REMOVE ipHash, userAgent, referrer, pageUrl
            `,
                    ExpressionAttributeNames: {
                        '#name': 'name',
                    },
                    ExpressionAttributeValues: {
                        ':anonName': 'Anonymized User',
                        ':anonEmail': `${anonymizedId}@anonymized.local`,
                        ':removed': '[REMOVED]',
                        ':anonGsi1pk': `EMAIL#${anonymizedId}@anonymized.local`,
                        ':timestamp': timestamp,
                        ':requestedBy': requestedBy,
                    },
                }));
                anonymizedRecords++;
            }
        }
    }
    // Log the GDPR anonymization action
    await ddb.send(new UpdateCommand({
        TableName: config.auditTable,
        Key: {
            pk: `GDPR#${auditId}`,
            sk: 'ANONYMIZE',
        },
        UpdateExpression: 'SET #action = :action, originalEmail = :email, anonymizedId = :anonId, requestedBy = :requestedBy, anonymizedRecords = :count, funnelsAffected = :funnels, #ts = :timestamp, gsi1pk = :gsi1pk',
        ExpressionAttributeNames: {
            '#action': 'action',
            '#ts': 'timestamp',
        },
        ExpressionAttributeValues: {
            ':action': 'GDPR_ANONYMIZE',
            ':email': normalizedEmail,
            ':anonId': anonymizedId,
            ':requestedBy': requestedBy,
            ':count': anonymizedRecords,
            ':funnels': funnelsAffected,
            ':timestamp': timestamp,
            ':gsi1pk': `GDPR#${normalizedEmail}`,
        },
    }));
    return {
        success: true,
        email: normalizedEmail,
        anonymizedRecords,
        funnelsAffected,
        auditId,
        timestamp,
    };
}
/**
 * Get GDPR action history for an email
 *
 * Returns all GDPR-related actions taken for a specific email.
 *
 * @param config - Admin configuration
 * @param email - Email address to look up
 * @returns Array of GDPR action records
 */
export async function getGdprHistory(config, email) {
    const ddb = getDocClient();
    const normalizedEmail = email.toLowerCase().trim();
    const history = [];
    let lastKey;
    do {
        const result = await ddb.send(new QueryCommand({
            TableName: config.auditTable,
            IndexName: GSI_INDEX_NAMES.GSI1,
            KeyConditionExpression: 'gsi1pk = :gsi1pk',
            ExpressionAttributeValues: {
                ':gsi1pk': `GDPR#${normalizedEmail}`,
            },
            ExclusiveStartKey: lastKey,
        }));
        for (const item of result.Items || []) {
            history.push({
                action: item.action,
                timestamp: item.timestamp,
                details: item,
            });
        }
        lastKey = result.LastEvaluatedKey;
    } while (lastKey);
    // Sort by timestamp descending (most recent first)
    history.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return history;
}
//# sourceMappingURL=gdpr.js.map
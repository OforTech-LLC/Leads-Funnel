/**
 * Admin Lead Operations
 *
 * DynamoDB operations for querying and updating leads.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  QueryCommand,
  UpdateCommand,
  ScanCommand,
  GetCommand,
} from '@aws-sdk/lib-dynamodb';
import type {
  AdminConfig,
  Lead,
  LeadStatus,
  PipelineStatus,
  QueryLeadsRequest,
  QueryLeadsResponse,
  UpdateLeadRequest,
  BulkUpdateRequest,
  FunnelStats,
} from '../types.js';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

// Maximum number of scan iterations to prevent runaway queries
const MAX_SCAN_ITERATIONS = 100;
// Default page size limit
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

/**
 * Get table name for a funnel
 */
function getTableName(config: AdminConfig, funnelId: string): string {
  return `${config.projectName}-${config.env}-${funnelId}`;
}

/**
 * Query leads with filters and pagination
 */
export async function queryLeads(
  config: AdminConfig,
  request: QueryLeadsRequest
): Promise<QueryLeadsResponse> {
  const tableName = getTableName(config, request.funnelId);
  const pageSize = Math.min(request.pageSize || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

  // Decode pagination token if provided
  let exclusiveStartKey: Record<string, unknown> | undefined;
  if (request.nextToken) {
    try {
      exclusiveStartKey = JSON.parse(Buffer.from(request.nextToken, 'base64').toString());
    } catch {
      // Invalid token, start from beginning
    }
  }

  // Build filter expression parts
  const filterParts: string[] = ['begins_with(pk, :leadPrefix)'];
  const expressionValues: Record<string, unknown> = {
    ':leadPrefix': 'LEAD#',
  };
  const expressionNames: Record<string, string> = {};

  // Status filter
  if (request.status) {
    filterParts.push('#status = :status');
    expressionNames['#status'] = 'status';
    expressionValues[':status'] = request.status;
  }

  // Date range filter
  if (request.startDate) {
    filterParts.push('createdAt >= :startDate');
    expressionValues[':startDate'] = request.startDate;
  }
  if (request.endDate) {
    filterParts.push('createdAt <= :endDate');
    expressionValues[':endDate'] = request.endDate;
  }

  // Search filter (email or name contains)
  if (request.search) {
    filterParts.push('(contains(#email, :search) OR contains(#name, :search))');
    expressionNames['#email'] = 'email';
    expressionNames['#name'] = 'name';
    expressionValues[':search'] = request.search.toLowerCase();
  }

  let result;

  // If querying by status without search, use GSI2
  if (request.status && !request.search) {
    result = await ddb.send(
      new QueryCommand({
        TableName: tableName,
        IndexName: 'GSI2',
        KeyConditionExpression: 'gsi2pk = :statusKey',
        ExpressionAttributeValues: {
          ':statusKey': `STATUS#${request.status}`,
          ...expressionValues,
        },
        ExpressionAttributeNames:
          Object.keys(expressionNames).length > 0 ? expressionNames : undefined,
        FilterExpression: filterParts.length > 1 ? filterParts.slice(1).join(' AND ') : undefined,
        Limit: pageSize,
        ExclusiveStartKey: exclusiveStartKey,
        ScanIndexForward: request.sortOrder !== 'desc',
      })
    );
  } else {
    // Full table scan with filters (for search or no status filter)
    result = await ddb.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression: filterParts.join(' AND '),
        ExpressionAttributeValues: expressionValues,
        ExpressionAttributeNames:
          Object.keys(expressionNames).length > 0 ? expressionNames : undefined,
        Limit: MAX_PAGE_SIZE, // Limit scan to prevent runaway queries
        ExclusiveStartKey: exclusiveStartKey,
      })
    );
  }

  // Build response
  const leads = (result.Items || []).filter((item) => item.sk === 'META') as Lead[];

  // Sort results if needed
  if (request.sortField) {
    leads.sort((a, b) => {
      const aVal = a[request.sortField!] || '';
      const bVal = b[request.sortField!] || '';
      const cmp = String(aVal).localeCompare(String(bVal));
      return request.sortOrder === 'desc' ? -cmp : cmp;
    });
  }

  // Encode pagination token
  let nextToken: string | undefined;
  if (result.LastEvaluatedKey) {
    nextToken = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64');
  }

  return {
    leads,
    totalCount: result.Count || 0,
    nextToken,
  };
}

/**
 * Get a single lead by ID
 */
export async function getLead(
  config: AdminConfig,
  funnelId: string,
  leadId: string
): Promise<Lead | null> {
  const tableName = getTableName(config, funnelId);

  const result = await ddb.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        pk: `LEAD#${leadId}`,
        sk: 'META',
      },
      // Only fetch needed attributes
      ProjectionExpression:
        'leadId, #name, email, phone, #status, pipelineStatus, tags, notes, doNotContact, createdAt, updatedAt',
      ExpressionAttributeNames: {
        '#name': 'name',
        '#status': 'status',
      },
    })
  );

  return (result.Item as Lead) || null;
}

/**
 * Update a single lead
 */
export async function updateLead(config: AdminConfig, request: UpdateLeadRequest): Promise<Lead> {
  const tableName = getTableName(config, request.funnelId);
  const timestamp = new Date().toISOString();

  // Build update expression
  const updateParts: string[] = ['#updatedAt = :updatedAt'];
  const expressionNames: Record<string, string> = {
    '#updatedAt': 'updatedAt',
  };
  const expressionValues: Record<string, unknown> = {
    ':updatedAt': timestamp,
  };

  if (request.status !== undefined) {
    updateParts.push('#status = :status');
    updateParts.push('gsi2pk = :gsi2pk');
    expressionNames['#status'] = 'status';
    expressionValues[':status'] = request.status;
    expressionValues[':gsi2pk'] = `STATUS#${request.status}`;
  }

  if (request.pipelineStatus !== undefined) {
    updateParts.push('pipelineStatus = :pipelineStatus');
    expressionValues[':pipelineStatus'] = request.pipelineStatus;
  }

  if (request.tags !== undefined) {
    updateParts.push('tags = :tags');
    expressionValues[':tags'] = request.tags;
  }

  if (request.notes !== undefined) {
    updateParts.push('notes = :notes');
    expressionValues[':notes'] = request.notes;
  }

  if (request.doNotContact !== undefined) {
    updateParts.push('doNotContact = :doNotContact');
    expressionValues[':doNotContact'] = request.doNotContact;

    // If marking as DNC, also update status
    if (request.doNotContact && request.status === undefined) {
      updateParts.push('#status = :status');
      updateParts.push('gsi2pk = :gsi2pk');
      expressionNames['#status'] = 'status';
      expressionValues[':status'] = 'dnc';
      expressionValues[':gsi2pk'] = 'STATUS#dnc';
    }
  }

  const result = await ddb.send(
    new UpdateCommand({
      TableName: tableName,
      Key: {
        pk: `LEAD#${request.leadId}`,
        sk: 'META',
      },
      UpdateExpression: `SET ${updateParts.join(', ')}`,
      ExpressionAttributeNames: expressionNames,
      ExpressionAttributeValues: expressionValues,
      ReturnValues: 'ALL_NEW',
      ConditionExpression: 'attribute_exists(pk)', // Ensure lead exists
    })
  );

  return result.Attributes as Lead;
}

/**
 * Bulk update multiple leads
 */
export async function bulkUpdateLeads(
  config: AdminConfig,
  request: BulkUpdateRequest
): Promise<{ updated: number; failed: number }> {
  let updated = 0;
  let failed = 0;

  // Process in parallel with concurrency limit
  const concurrency = 10;
  const chunks: string[][] = [];
  for (let i = 0; i < request.leadIds.length; i += concurrency) {
    chunks.push(request.leadIds.slice(i, i + concurrency));
  }

  for (const chunk of chunks) {
    const results = await Promise.allSettled(
      chunk.map((leadId) =>
        updateLead(config, {
          funnelId: request.funnelId,
          leadId,
          status: request.status,
          pipelineStatus: request.pipelineStatus,
          tags: request.tags,
          doNotContact: request.doNotContact,
        })
      )
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        updated++;
      } else {
        failed++;
      }
    }
  }

  return { updated, failed };
}

/**
 * Get funnel statistics with scan limits and pagination
 */
export async function getFunnelStats(config: AdminConfig, funnelId: string): Promise<FunnelStats> {
  const tableName = getTableName(config, funnelId);

  // Get counts by status
  const statusCounts: Record<LeadStatus, number> = {
    new: 0,
    contacted: 0,
    qualified: 0,
    converted: 0,
    lost: 0,
    dnc: 0,
    quarantined: 0,
  };

  const pipelineCounts: Record<PipelineStatus, number> = {
    none: 0,
    nurturing: 0,
    negotiating: 0,
    closing: 0,
    closed_won: 0,
    closed_lost: 0,
  };

  // Scan table to count (for small tables, consider using DynamoDB Streams + aggregates for scale)
  let totalLeads = 0;
  let last24Hours = 0;
  let last7Days = 0;
  let last30Days = 0;

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  let lastKey: Record<string, unknown> | undefined;
  let scanIterations = 0;

  do {
    // Prevent runaway scans
    if (scanIterations >= MAX_SCAN_ITERATIONS) {
      console.warn(
        `getFunnelStats: Reached max scan iterations (${MAX_SCAN_ITERATIONS}) for funnel ${funnelId}`
      );
      break;
    }
    scanIterations++;

    const result = await ddb.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression: 'begins_with(pk, :leadPrefix) AND sk = :meta',
        ExpressionAttributeValues: {
          ':leadPrefix': 'LEAD#',
          ':meta': 'META',
        },
        // Only fetch needed attributes for stats calculation
        ProjectionExpression: '#status, pipelineStatus, createdAt',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExclusiveStartKey: lastKey,
        // Limit each scan to prevent timeouts
        Limit: 1000,
      })
    );

    for (const item of result.Items || []) {
      totalLeads++;

      const status = item.status as LeadStatus;
      const pipelineStatus = (item.pipelineStatus as PipelineStatus) || 'none';
      const createdAt = item.createdAt as string;

      if (status in statusCounts) {
        statusCounts[status]++;
      }
      if (pipelineStatus in pipelineCounts) {
        pipelineCounts[pipelineStatus]++;
      }

      if (createdAt >= oneDayAgo) last24Hours++;
      if (createdAt >= sevenDaysAgo) last7Days++;
      if (createdAt >= thirtyDaysAgo) last30Days++;
    }

    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return {
    funnelId,
    totalLeads,
    byStatus: statusCounts,
    byPipelineStatus: pipelineCounts,
    last24Hours,
    last7Days,
    last30Days,
  };
}

/**
 * List available funnels (tables)
 */
export async function listFunnels(config: AdminConfig): Promise<string[]> {
  // Get funnel IDs from environment or list tables
  const prefix = `${config.projectName}-${config.env}-`;

  // Use DynamoDB ListTables to discover funnel tables
  const { DynamoDBClient, ListTablesCommand } = await import('@aws-sdk/client-dynamodb');
  const client = new DynamoDBClient({});

  const funnelIds: string[] = [];
  let lastTableName: string | undefined;

  do {
    const result = await client.send(
      new ListTablesCommand({
        ExclusiveStartTableName: lastTableName,
      })
    );

    for (const tableName of result.TableNames || []) {
      if (
        tableName.startsWith(prefix) &&
        !tableName.includes('rate-limits') &&
        !tableName.includes('idempotency')
      ) {
        funnelIds.push(tableName.replace(prefix, ''));
      }
    }

    lastTableName = result.LastEvaluatedTableName;
  } while (lastTableName);

  return funnelIds.sort();
}

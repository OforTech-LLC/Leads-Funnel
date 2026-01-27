/**
 * Data Retention Script
 *
 * Deletes or archives leads older than a configurable retention period.
 * Can be run as a scheduled Lambda or cron job.
 *
 * Usage:
 *   - As Lambda: Configure with CloudWatch Events schedule
 *   - As CLI: npx ts-node data-retention.ts [--dry-run] [--retention-days=90]
 *
 * Environment Variables:
 *   - RETENTION_DAYS: Number of days to retain data (default: 90)
 *   - ARCHIVE_BUCKET: S3 bucket for archiving (optional, deletes if not set)
 *   - PROJECT_NAME: Project name prefix for table discovery
 *   - ENV: Environment (dev/prod)
 *   - DRY_RUN: Set to "true" to preview without deleting
 */

import { DynamoDBClient, ListTablesCommand } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  ScanCommand,
  DeleteCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import type { Handler, ScheduledEvent } from 'aws-lambda';

// =============================================================================
// Configuration
// =============================================================================

interface RetentionConfig {
  retentionDays: number;
  archiveBucket?: string;
  projectName: string;
  env: 'dev' | 'prod';
  dryRun: boolean;
  batchSize: number;
  maxIterations: number;
}

function loadConfig(): RetentionConfig {
  return {
    retentionDays: parseInt(process.env.RETENTION_DAYS || '90', 10),
    archiveBucket: process.env.ARCHIVE_BUCKET,
    projectName: process.env.PROJECT_NAME || 'kanjona',
    env: (process.env.ENV as 'dev' | 'prod') || 'dev',
    dryRun: process.env.DRY_RUN === 'true',
    batchSize: parseInt(process.env.BATCH_SIZE || '25', 10),
    maxIterations: parseInt(process.env.MAX_ITERATIONS || '1000', 10),
  };
}

// =============================================================================
// Types
// =============================================================================

interface LeadRecord {
  pk: string;
  sk: string;
  leadId: string;
  email: string;
  name: string;
  createdAt: string;
  status: string;
  [key: string]: unknown;
}

interface RetentionResult {
  success: boolean;
  processedFunnels: string[];
  totalScanned: number;
  totalDeleted: number;
  totalArchived: number;
  errors: string[];
  duration: number;
  timestamp: string;
}

interface FunnelResult {
  funnelId: string;
  scanned: number;
  deleted: number;
  archived: number;
  errors: string[];
}

// =============================================================================
// Clients
// =============================================================================

const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { removeUndefinedValues: true },
});
const s3 = new S3Client({});

// =============================================================================
// Logging
// =============================================================================

function log(
  level: 'info' | 'warn' | 'error',
  message: string,
  data?: Record<string, unknown>
): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...data,
  };
  console.log(JSON.stringify(entry));
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get the cutoff date for retention
 */
function getCutoffDate(retentionDays: number): string {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);
  return cutoff.toISOString();
}

/**
 * List all funnel tables
 */
async function listFunnelTables(config: RetentionConfig): Promise<string[]> {
  const prefix = `${config.projectName}-${config.env}-`;
  const funnelIds: string[] = [];
  let lastTableName: string | undefined;

  do {
    const result = await ddbClient.send(
      new ListTablesCommand({
        ExclusiveStartTableName: lastTableName,
      })
    );

    for (const tableName of result.TableNames || []) {
      if (
        tableName.startsWith(prefix) &&
        !tableName.includes('audit') &&
        !tableName.includes('exports') &&
        !tableName.includes('rate-limits')
      ) {
        funnelIds.push(tableName.replace(prefix, ''));
      }
    }

    lastTableName = result.LastEvaluatedTableName;
  } while (lastTableName);

  return funnelIds;
}

/**
 * Get table name for a funnel
 */
function getTableName(config: RetentionConfig, funnelId: string): string {
  return `${config.projectName}-${config.env}-${funnelId}`;
}

/**
 * Archive leads to S3 before deletion
 */
async function archiveLeads(
  config: RetentionConfig,
  funnelId: string,
  leads: LeadRecord[]
): Promise<void> {
  if (!config.archiveBucket || leads.length === 0) {
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const key = `archives/${config.env}/${funnelId}/${timestamp}.json`;

  const archiveData = {
    funnelId,
    archivedAt: new Date().toISOString(),
    retentionDays: config.retentionDays,
    recordCount: leads.length,
    leads: leads.map((lead) => ({
      leadId: lead.leadId,
      email: lead.email,
      name: lead.name,
      createdAt: lead.createdAt,
      status: lead.status,
    })),
  };

  await s3.send(
    new PutObjectCommand({
      Bucket: config.archiveBucket,
      Key: key,
      Body: JSON.stringify(archiveData, null, 2),
      ContentType: 'application/json',
      ServerSideEncryption: 'AES256',
      Metadata: {
        'retention-days': config.retentionDays.toString(),
        'funnel-id': funnelId,
        'record-count': leads.length.toString(),
      },
    })
  );

  log('info', 'Archived leads to S3', {
    bucket: config.archiveBucket,
    key,
    recordCount: leads.length,
  });
}

/**
 * Delete leads in batches
 */
async function deleteLeadsBatch(
  tableName: string,
  leads: LeadRecord[],
  dryRun: boolean
): Promise<number> {
  if (dryRun || leads.length === 0) {
    return leads.length;
  }

  // DynamoDB batch limit is 25 items
  let deleted = 0;

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

    try {
      const result = await ddb.send(
        new BatchWriteCommand({
          RequestItems: {
            [tableName]: deleteRequests,
          },
        })
      );

      // Handle unprocessed items
      const unprocessed = result.UnprocessedItems?.[tableName]?.length || 0;
      deleted += batch.length - unprocessed;

      if (unprocessed > 0) {
        log('warn', 'Some items were not processed', {
          tableName,
          unprocessed,
        });
      }
    } catch (error) {
      log('error', 'Batch delete failed', {
        tableName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  return deleted;
}

/**
 * Process retention for a single funnel
 */
async function processRetentionForFunnel(
  config: RetentionConfig,
  funnelId: string,
  cutoffDate: string
): Promise<FunnelResult> {
  const tableName = getTableName(config, funnelId);
  const result: FunnelResult = {
    funnelId,
    scanned: 0,
    deleted: 0,
    archived: 0,
    errors: [],
  };

  let lastKey: Record<string, unknown> | undefined;
  let iterations = 0;
  const leadsToDelete: LeadRecord[] = [];

  log('info', 'Processing funnel retention', {
    funnelId,
    tableName,
    cutoffDate,
    dryRun: config.dryRun,
  });

  // Scan for old leads
  do {
    if (iterations >= config.maxIterations) {
      log('warn', 'Max iterations reached', { funnelId, iterations });
      break;
    }
    iterations++;

    try {
      const scanResult = await ddb.send(
        new ScanCommand({
          TableName: tableName,
          FilterExpression: 'begins_with(pk, :leadPrefix) AND sk = :meta AND createdAt < :cutoff',
          ExpressionAttributeValues: {
            ':leadPrefix': 'LEAD#',
            ':meta': 'META',
            ':cutoff': cutoffDate,
          },
          ProjectionExpression: 'pk, sk, leadId, email, #name, createdAt, #status',
          ExpressionAttributeNames: {
            '#name': 'name',
            '#status': 'status',
          },
          ExclusiveStartKey: lastKey,
          Limit: 100,
        })
      );

      result.scanned += scanResult.ScannedCount || 0;

      for (const item of scanResult.Items || []) {
        leadsToDelete.push(item as LeadRecord);
      }

      lastKey = scanResult.LastEvaluatedKey;

      // Process batch when we have enough
      if (leadsToDelete.length >= config.batchSize) {
        // Archive before deleting
        if (config.archiveBucket) {
          await archiveLeads(config, funnelId, leadsToDelete);
          result.archived += leadsToDelete.length;
        }

        // Delete batch
        const deleted = await deleteLeadsBatch(tableName, leadsToDelete, config.dryRun);
        result.deleted += deleted;

        log('info', 'Processed batch', {
          funnelId,
          deleted,
          archived: config.archiveBucket ? leadsToDelete.length : 0,
          dryRun: config.dryRun,
        });

        leadsToDelete.length = 0;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.errors.push(errorMsg);
      log('error', 'Scan failed', { funnelId, error: errorMsg });
      break;
    }
  } while (lastKey);

  // Process remaining leads
  if (leadsToDelete.length > 0) {
    try {
      if (config.archiveBucket) {
        await archiveLeads(config, funnelId, leadsToDelete);
        result.archived += leadsToDelete.length;
      }

      const deleted = await deleteLeadsBatch(tableName, leadsToDelete, config.dryRun);
      result.deleted += deleted;

      log('info', 'Processed final batch', {
        funnelId,
        deleted,
        archived: config.archiveBucket ? leadsToDelete.length : 0,
        dryRun: config.dryRun,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.errors.push(errorMsg);
    }
  }

  return result;
}

// =============================================================================
// Main Execution
// =============================================================================

/**
 * Execute data retention cleanup
 */
export async function executeRetention(
  config?: Partial<RetentionConfig>
): Promise<RetentionResult> {
  const startTime = Date.now();
  const fullConfig = { ...loadConfig(), ...config };
  const cutoffDate = getCutoffDate(fullConfig.retentionDays);

  log('info', 'Starting data retention cleanup', {
    retentionDays: fullConfig.retentionDays,
    cutoffDate,
    dryRun: fullConfig.dryRun,
    archiveBucket: fullConfig.archiveBucket || 'none (will delete)',
  });

  const result: RetentionResult = {
    success: true,
    processedFunnels: [],
    totalScanned: 0,
    totalDeleted: 0,
    totalArchived: 0,
    errors: [],
    duration: 0,
    timestamp: new Date().toISOString(),
  };

  try {
    // Get all funnel tables
    const funnelIds = await listFunnelTables(fullConfig);
    log('info', 'Found funnel tables', { count: funnelIds.length, funnelIds });

    // Process each funnel
    for (const funnelId of funnelIds) {
      try {
        const funnelResult = await processRetentionForFunnel(fullConfig, funnelId, cutoffDate);

        result.processedFunnels.push(funnelId);
        result.totalScanned += funnelResult.scanned;
        result.totalDeleted += funnelResult.deleted;
        result.totalArchived += funnelResult.archived;

        if (funnelResult.errors.length > 0) {
          result.errors.push(...funnelResult.errors.map((e) => `${funnelId}: ${e}`));
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        result.errors.push(`${funnelId}: ${errorMsg}`);
        log('error', 'Failed to process funnel', { funnelId, error: errorMsg });
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    result.success = false;
    result.errors.push(errorMsg);
    log('error', 'Retention cleanup failed', { error: errorMsg });
  }

  result.duration = Date.now() - startTime;
  result.success = result.errors.length === 0;

  log('info', 'Data retention cleanup completed', {
    success: result.success,
    processedFunnels: result.processedFunnels.length,
    totalScanned: result.totalScanned,
    totalDeleted: result.totalDeleted,
    totalArchived: result.totalArchived,
    errorCount: result.errors.length,
    durationMs: result.duration,
    dryRun: fullConfig.dryRun,
  });

  return result;
}

/**
 * Lambda handler for scheduled execution
 */
export const handler: Handler<ScheduledEvent, RetentionResult> = async (event) => {
  log('info', 'Lambda invoked', {
    source: event.source,
    time: event.time,
    region: event.region,
  });

  return executeRetention();
};

// =============================================================================
// CLI Support
// =============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  let retentionDays: number | undefined;
  const retentionArg = args.find((arg) => arg.startsWith('--retention-days='));
  if (retentionArg) {
    retentionDays = parseInt(retentionArg.split('=')[1], 10);
  }

  const config: Partial<RetentionConfig> = {
    dryRun,
    ...(retentionDays && { retentionDays }),
  };

  if (dryRun) {
    console.log('Running in DRY RUN mode - no data will be deleted\n');
  }

  const result = await executeRetention(config);

  console.log('\n=== Retention Cleanup Summary ===');
  console.log(`Status: ${result.success ? 'SUCCESS' : 'FAILED'}`);
  console.log(`Funnels Processed: ${result.processedFunnels.length}`);
  console.log(`Total Scanned: ${result.totalScanned}`);
  console.log(`Total Deleted: ${result.totalDeleted}${dryRun ? ' (dry run)' : ''}`);
  console.log(`Total Archived: ${result.totalArchived}`);
  console.log(`Duration: ${result.duration}ms`);

  if (result.errors.length > 0) {
    console.log('\nErrors:');
    result.errors.forEach((e) => console.log(`  - ${e}`));
  }

  process.exit(result.success ? 0 : 1);
}

// Run CLI if executed directly
if (require.main === module) {
  main().catch(console.error);
}

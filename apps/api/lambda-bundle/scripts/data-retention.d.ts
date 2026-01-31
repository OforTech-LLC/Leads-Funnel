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
import type { Handler, ScheduledEvent } from 'aws-lambda';
interface RetentionConfig {
    retentionDays: number;
    archiveBucket?: string;
    projectName: string;
    env: 'dev' | 'prod';
    dryRun: boolean;
    batchSize: number;
    maxIterations: number;
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
/**
 * Execute data retention cleanup
 */
export declare function executeRetention(config?: Partial<RetentionConfig>): Promise<RetentionResult>;
/**
 * Lambda handler for scheduled execution
 */
export declare const handler: Handler<ScheduledEvent, RetentionResult>;
export {};

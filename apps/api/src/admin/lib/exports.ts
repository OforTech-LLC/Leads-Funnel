/**
 * Admin Export Operations
 *
 * Handles export creation, generation, and S3 presigned URLs.
 * Supports CSV, XLSX, PDF, DOCX, and JSON formats.
 */

import { PutCommand, GetCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import type {
  AdminConfig,
  AdminUser,
  ExportJob,
  ExportRequest,
  ExportFormat,
  Lead,
} from '../types.js';
import { queryLeads } from './leads.js';
import { getDocClient, getS3Client } from '../../lib/clients.js';

// Export expiration: 24 hours
const EXPORT_EXPIRATION_HOURS = 24;
const PRESIGNED_URL_EXPIRATION_SECONDS = 3600; // 1 hour

/**
 * Create a new export job
 */
export async function createExportJob(
  config: AdminConfig,
  user: AdminUser,
  request: ExportRequest
): Promise<ExportJob> {
  const ddb = getDocClient();
  const jobId = uuidv4();
  const timestamp = new Date().toISOString();
  const expiresAt = new Date(Date.now() + EXPORT_EXPIRATION_HOURS * 60 * 60 * 1000).toISOString();
  const ttl = Math.floor(Date.now() / 1000) + EXPORT_EXPIRATION_HOURS * 60 * 60;

  const job: ExportJob = {
    pk: `USER#${user.sub}`,
    sk: `EXPORT#${timestamp}#${jobId}`,
    jobId,
    userId: user.sub,
    userEmail: user.email,
    funnelId: request.funnelId,
    format: request.format,
    status: 'pending',
    createdAt: timestamp,
    expiresAt,
    ttl,
  };

  await ddb.send(
    new PutCommand({
      TableName: config.exportJobsTable,
      Item: job,
    })
  );

  // Start processing immediately (synchronous for small exports)
  try {
    await processExportJob(config, job, request);
  } catch (error) {
    // Update job status to failed
    await updateJobStatus(
      config,
      job,
      'failed',
      error instanceof Error ? error.message : 'Unknown error'
    );
    throw error;
  }

  // Return updated job
  return getExportJob(config, user.sub, jobId) as Promise<ExportJob>;
}

/**
 * Get export job by ID
 */
export async function getExportJob(
  config: AdminConfig,
  userId: string,
  jobId: string
): Promise<ExportJob | null> {
  const ddb = getDocClient();

  // Query with begins_with to find the job regardless of timestamp in sort key
  const queryResult = await ddb.send(
    new QueryCommand({
      TableName: config.exportJobsTable,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :skPrefix)',
      FilterExpression: 'jobId = :jobId',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':skPrefix': 'EXPORT#',
        ':jobId': jobId,
      },
    })
  );

  return (queryResult.Items?.[0] as ExportJob) || null;
}

/**
 * Update job status
 */
async function updateJobStatus(
  config: AdminConfig,
  job: ExportJob,
  status: ExportJob['status'],
  errorMessage?: string,
  s3Key?: string,
  recordCount?: number
): Promise<void> {
  const ddb = getDocClient();
  const updates: string[] = ['#status = :status'];
  const names: Record<string, string> = { '#status': 'status' };
  const values: Record<string, unknown> = { ':status': status };

  if (status === 'completed') {
    updates.push('completedAt = :completedAt');
    values[':completedAt'] = new Date().toISOString();
  }

  if (s3Key) {
    updates.push('s3Key = :s3Key');
    values[':s3Key'] = s3Key;
  }

  if (recordCount !== undefined) {
    updates.push('recordCount = :recordCount');
    values[':recordCount'] = recordCount;
  }

  if (errorMessage) {
    updates.push('errorMessage = :errorMessage');
    values[':errorMessage'] = errorMessage;
  }

  await ddb.send(
    new UpdateCommand({
      TableName: config.exportJobsTable,
      Key: {
        pk: job.pk,
        sk: job.sk,
      },
      UpdateExpression: `SET ${updates.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    })
  );
}

/**
 * Process export job - fetch leads and generate file
 */
async function processExportJob(
  config: AdminConfig,
  job: ExportJob,
  request: ExportRequest
): Promise<void> {
  const s3 = getS3Client();

  // Update status to processing
  await updateJobStatus(config, job, 'processing');

  // Fetch all leads matching criteria
  const allLeads: Lead[] = [];
  let nextToken: string | undefined;

  do {
    const result = await queryLeads(config, {
      funnelId: request.funnelId,
      status: request.status,
      startDate: request.startDate,
      endDate: request.endDate,
      pageSize: 100,
      nextToken,
    });

    allLeads.push(...result.leads);
    nextToken = result.nextToken;
  } while (nextToken);

  // Generate export file
  const content = await generateExportContent(allLeads, request.format, request.fields);

  // Upload to S3
  const s3Key = `exports/${job.userId}/${job.jobId}.${getFileExtension(request.format)}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: config.exportsBucket,
      Key: s3Key,
      Body: content,
      ContentType: getContentType(request.format),
      Metadata: {
        userId: job.userId,
        jobId: job.jobId,
        funnelId: request.funnelId,
        format: request.format,
        recordCount: String(allLeads.length),
      },
    })
  );

  // Update job as completed
  await updateJobStatus(config, job, 'completed', undefined, s3Key, allLeads.length);
}

/**
 * Generate export content based on format
 */
async function generateExportContent(
  leads: Lead[],
  format: ExportFormat,
  fields?: string[]
): Promise<Buffer | string> {
  const defaultFields = [
    'leadId',
    'email',
    'phone',
    'name',
    'status',
    'pipelineStatus',
    'tags',
    'notes',
    'doNotContact',
    'createdAt',
    'updatedAt',
  ];

  const selectedFields = fields || defaultFields;

  switch (format) {
    case 'csv':
      return generateCsv(leads, selectedFields);
    case 'json':
      return generateJson(leads, selectedFields);
    case 'xlsx':
      return generateXlsx(leads, selectedFields);
    case 'pdf':
      return generatePdf(leads, selectedFields);
    case 'docx':
      return generateDocx(leads, selectedFields);
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

/**
 * Generate CSV content
 */
function generateCsv(leads: Lead[], fields: string[]): string {
  const header = fields.join(',');
  const rows = leads.map((lead) => {
    return fields
      .map((field) => {
        const value = lead[field as keyof Lead];
        if (value === null || value === undefined) return '';
        if (Array.isArray(value)) return `"${value.join(';')}"`;
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      })
      .join(',');
  });

  return [header, ...rows].join('\n');
}

/**
 * Generate JSON content
 */
function generateJson(leads: Lead[], fields: string[]): string {
  const filteredLeads = leads.map((lead) => {
    const filtered: Record<string, unknown> = {};
    for (const field of fields) {
      filtered[field] = lead[field as keyof Lead];
    }
    return filtered;
  });

  return JSON.stringify(filteredLeads, null, 2);
}

/**
 * Generate XLSX content (simplified - in production use xlsx library)
 */
async function generateXlsx(leads: Lead[], fields: string[]): Promise<Buffer> {
  // For production, use a library like 'xlsx' or 'exceljs'
  // This is a simplified placeholder that generates CSV for now
  const csv = generateCsv(leads, fields);
  return Buffer.from(csv, 'utf-8');
}

/**
 * Generate PDF content (simplified - in production use pdfkit or similar)
 */
async function generatePdf(leads: Lead[], fields: string[]): Promise<Buffer> {
  // For production, use a library like 'pdfkit' or 'puppeteer'
  // This is a simplified placeholder that generates text for now
  const lines = [
    'Lead Export Report',
    `Generated: ${new Date().toISOString()}`,
    `Total Records: ${leads.length}`,
    '',
    fields.join(' | '),
    '='.repeat(80),
  ];

  for (const lead of leads) {
    const values = fields.map((f) => String(lead[f as keyof Lead] || ''));
    lines.push(values.join(' | '));
  }

  return Buffer.from(lines.join('\n'), 'utf-8');
}

/**
 * Generate DOCX content (simplified - in production use docx library)
 */
async function generateDocx(leads: Lead[], fields: string[]): Promise<Buffer> {
  // For production, use a library like 'docx'
  // This is a simplified placeholder that generates text for now
  return generatePdf(leads, fields);
}

/**
 * Get file extension for format
 */
function getFileExtension(format: ExportFormat): string {
  switch (format) {
    case 'csv':
      return 'csv';
    case 'xlsx':
      return 'xlsx';
    case 'pdf':
      return 'pdf';
    case 'docx':
      return 'docx';
    case 'json':
      return 'json';
    default:
      return 'txt';
  }
}

/**
 * Get content type for format
 */
function getContentType(format: ExportFormat): string {
  switch (format) {
    case 'csv':
      return 'text/csv';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'pdf':
      return 'application/pdf';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'json':
      return 'application/json';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Get presigned URL for download
 */
export async function getDownloadUrl(config: AdminConfig, job: ExportJob): Promise<string> {
  if (!job.s3Key) {
    throw new Error('Export not ready for download');
  }

  const s3 = getS3Client();
  const command = new GetObjectCommand({
    Bucket: config.exportsBucket,
    Key: job.s3Key,
    ResponseContentDisposition: `attachment; filename="export-${job.funnelId}-${job.jobId}.${getFileExtension(job.format)}"`,
  });

  return getSignedUrl(s3, command, {
    expiresIn: PRESIGNED_URL_EXPIRATION_SECONDS,
  });
}

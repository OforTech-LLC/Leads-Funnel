/**
 * Export job types for async lead data export (CSV, XLSX, PDF, etc.).
 */

import type { PipelineStatus } from './lead';

/**
 * Const enum-like object for export formats.
 * Use `ExportFormatEnum.CSV` instead of hardcoding `'csv'`.
 */
export const ExportFormatEnum = {
  CSV: 'csv',
  XLSX: 'xlsx',
  PDF: 'pdf',
  DOCX: 'docx',
  JSON: 'json',
} as const;

export type ExportFormat = (typeof ExportFormatEnum)[keyof typeof ExportFormatEnum];

/**
 * Const enum-like object for export statuses.
 * Use `ExportStatusEnum.PENDING` instead of hardcoding `'pending'`.
 */
export const ExportStatusEnum = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type ExportStatus = (typeof ExportStatusEnum)[keyof typeof ExportStatusEnum];

export interface ExportJob {
  exportId: string;
  requestedByHash: string;
  format: ExportFormat;
  status: ExportStatus;
  filters: Record<string, unknown>;
  s3Key?: string;
  fileSize?: number;
  recordCount?: number;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
  expiresAt: string;
  ttl: number;
}

export interface CreateExportInput {
  format: ExportFormat;
  funnelId?: string;
  status?: PipelineStatus[];
  dateFrom?: string;
  dateTo?: string;
  assignedOrgId?: string;
}

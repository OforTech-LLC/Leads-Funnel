/**
 * Export job types for async lead data export (CSV, XLSX, PDF, etc.).
 */

import type { PipelineStatus } from './lead';

export type ExportFormat = 'csv' | 'xlsx' | 'pdf' | 'docx' | 'json';
export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';

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

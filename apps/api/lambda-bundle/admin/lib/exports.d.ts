/**
 * Admin Export Operations
 *
 * Handles export creation, generation, and S3 presigned URLs.
 * Supports CSV, XLSX, PDF, DOCX, and JSON formats.
 */
import type { AdminConfig, AdminUser, ExportJob, ExportRequest } from '../types.js';
/**
 * Create a new export job
 */
export declare function createExportJob(config: AdminConfig, user: AdminUser, request: ExportRequest): Promise<ExportJob>;
/**
 * Get export job by ID
 */
export declare function getExportJob(config: AdminConfig, userId: string, jobId: string): Promise<ExportJob | null>;
/**
 * Get presigned URL for download
 */
export declare function getDownloadUrl(config: AdminConfig, job: ExportJob): Promise<string>;

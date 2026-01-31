/**
 * DynamoDB operations for Export Jobs
 *
 * Single-table access patterns:
 *   PK = EXPORT#<exportId>   SK = META
 *   GSI1PK = EXPORTS         GSI1SK = CREATED#<iso>  (list all)
 */
export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type ExportFormat = 'csv' | 'xlsx' | 'json';
export interface ExportJob {
    pk: string;
    sk: string;
    exportId: string;
    requestedBy: string;
    funnelId?: string;
    orgId?: string;
    format: ExportFormat;
    filters: Record<string, unknown>;
    status: ExportStatus;
    s3Key?: string;
    recordCount?: number;
    errorMessage?: string;
    createdAt: string;
    completedAt?: string;
    expiresAt: string;
    ttl: number;
    gsi1pk: string;
    gsi1sk: string;
}
export interface CreateExportInput {
    requestedBy: string;
    funnelId?: string;
    orgId?: string;
    format: ExportFormat;
    filters?: Record<string, unknown>;
}
export declare function createExport(input: CreateExportInput): Promise<ExportJob>;
export declare function getExport(exportId: string): Promise<ExportJob | null>;
export declare function updateExport(exportId: string, updates: {
    status?: ExportStatus;
    s3Key?: string;
    recordCount?: number;
    errorMessage?: string;
}): Promise<ExportJob>;
export interface PaginatedExports {
    items: ExportJob[];
    nextCursor?: string;
}
export declare function listExports(cursor?: string, limit?: number): Promise<PaginatedExports>;

/**
 * Admin API Types
 */
export interface AdminConfig {
    awsRegion: string;
    env: 'dev' | 'prod';
    projectName: string;
    cognitoUserPoolId: string;
    cognitoClientId: string;
    cognitoIssuer: string;
    allowedEmailsSsmPath: string;
    featureFlagSsmPath: string;
    ipAllowlistFlagPath: string;
    ipAllowlistSsmPath: string;
    exportsBucket: string;
    auditTable: string;
    exportJobsTable: string;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
}
export type AdminRole = 'Admin' | 'Viewer';
export interface AdminUser {
    sub: string;
    email: string;
    groups: AdminRole[];
    role: AdminRole;
}
export interface JwtPayload {
    sub: string;
    email?: string;
    'cognito:username': string;
    'cognito:groups'?: string[];
    iss: string;
    client_id: string;
    token_use: string;
    exp: number;
    iat: number;
}
export interface AuthResult {
    success: boolean;
    user?: AdminUser;
    error?: string;
    errorCode?: string;
}
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost' | 'dnc' | 'quarantined';
export type PipelineStatus = 'none' | 'nurturing' | 'negotiating' | 'closing' | 'closed_won' | 'closed_lost';
export interface Lead {
    pk: string;
    sk: string;
    leadId: string;
    funnelId: string;
    email: string;
    phone: string;
    name: string;
    status: LeadStatus;
    pipelineStatus: PipelineStatus;
    tags: string[];
    notes: string;
    doNotContact: boolean;
    createdAt: string;
    updatedAt: string;
    gsi1pk: string;
    gsi1sk: string;
    gsi2pk: string;
    gsi2sk: string;
}
export interface QueryLeadsRequest {
    funnelId: string;
    status?: LeadStatus;
    startDate?: string;
    endDate?: string;
    search?: string;
    pageSize?: number;
    nextToken?: string;
    sortField?: 'createdAt' | 'updatedAt' | 'status';
    sortOrder?: 'asc' | 'desc';
}
export interface QueryLeadsResponse {
    leads: Lead[];
    totalCount: number;
    nextToken?: string;
}
export interface UpdateLeadRequest {
    funnelId: string;
    leadId: string;
    status?: LeadStatus;
    pipelineStatus?: PipelineStatus;
    tags?: string[];
    notes?: string;
    doNotContact?: boolean;
}
export interface BulkUpdateRequest {
    funnelId: string;
    leadIds: string[];
    status?: LeadStatus;
    pipelineStatus?: PipelineStatus;
    tags?: string[];
    doNotContact?: boolean;
}
export type ExportFormat = 'csv' | 'xlsx' | 'pdf' | 'docx' | 'json';
export interface ExportRequest {
    funnelId: string;
    format: ExportFormat;
    status?: LeadStatus;
    startDate?: string;
    endDate?: string;
    fields?: string[];
}
export interface ExportJob {
    pk: string;
    sk: string;
    jobId: string;
    userId: string;
    userEmail: string;
    funnelId: string;
    format: ExportFormat;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    s3Key?: string;
    recordCount?: number;
    errorMessage?: string;
    createdAt: string;
    completedAt?: string;
    expiresAt: string;
    ttl: number;
}
export interface AuditLogEntry {
    pk: string;
    sk: string;
    userId: string;
    userEmail: string;
    action: AuditAction;
    resourceType: 'lead' | 'export' | 'config';
    resourceId: string;
    funnelId?: string;
    details: Record<string, unknown>;
    ipAddress: string;
    userAgent: string;
    timestamp: string;
    ttl: number;
}
export type AuditAction = 'VIEW_LEAD' | 'VIEW_LEADS' | 'UPDATE_LEAD' | 'BULK_UPDATE_LEADS' | 'CREATE_EXPORT' | 'DOWNLOAD_EXPORT' | 'VIEW_STATS' | 'flag.update';
export interface FunnelStats {
    funnelId: string;
    totalLeads: number;
    byStatus: Record<LeadStatus, number>;
    byPipelineStatus: Record<PipelineStatus, number>;
    last24Hours: number;
    last7Days: number;
    last30Days: number;
}
export interface LogEntry {
    timestamp: string;
    requestId: string;
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    userId?: string;
    action?: string;
    errorCode?: string;
    latencyMs?: number;
    [key: string]: unknown;
}

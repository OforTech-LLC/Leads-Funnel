/**
 * Admin API Client
 *
 * Type-safe API client for admin operations with timeouts and retry logic.
 *
 * LeadStatus and AdminPipelineStatus are imported from @kanjona/shared
 * to maintain a single source of truth across all apps.
 */

import { getAdminConfig } from './config';
import { getAccessToken, redirectToLogin } from './auth';
import type { LeadStatus, AdminPipelineStatus, ExportFormatValue } from '@kanjona/shared';

// Re-export shared types for convenience
export type { LeadStatus };
export type PipelineStatus = AdminPipelineStatus;
export type ExportFormat = ExportFormatValue;

// Configuration
const REQUEST_TIMEOUT_MS = 30000; // 30 seconds
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

// Types
export interface LeadAnalysis {
  urgency: 'high' | 'medium' | 'low';
  intent: 'info_gathering' | 'ready_to_buy' | 'complaint' | 'other';
  language: string;
  summary: string;
}

export interface Lead {
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
  analysis?: LeadAnalysis;
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

export interface BulkUpdateResponse {
  updated: number;
  failed: number;
}

export interface ExportRequest {
  funnelId: string;
  format: ExportFormat;
  status?: LeadStatus;
  startDate?: string;
  endDate?: string;
  fields?: string[];
}

export interface ExportJob {
  jobId: string;
  userId: string;
  userEmail: string;
  funnelId: string;
  format: ExportFormat;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  recordCount?: number;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
  expiresAt: string;
}

export interface FunnelStats {
  funnelId: string;
  totalLeads: number;
  byStatus: Record<LeadStatus, number>;
  byPipelineStatus: Record<PipelineStatus, number>;
  last24Hours: number;
  last7Days: number;
  last30Days: number;
}

export interface ApiResponse<T> {
  success?: boolean;
  ok?: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  message?: string;
}

/**
 * Delay helper for exponential backoff
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function getRetryDelay(attempt: number): number {
  const exponentialDelay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
  // Add jitter (0-25% of delay)
  const jitter = exponentialDelay * 0.25 * Math.random();
  return exponentialDelay + jitter;
}

/**
 * Check if error is retryable (5xx, network error, or timeout)
 */
function isRetryableError(response: Response | null, error: unknown): boolean {
  // 5xx server errors are retryable
  if (response && response.status >= 500 && response.status < 600) {
    return true;
  }
  // Network errors and timeouts are retryable
  if (error instanceof Error) {
    return error.name === 'AbortError' || error.message.includes('fetch');
  }
  return false;
}

/**
 * Make authenticated API request with timeout and retry logic
 */
async function apiRequest<T>(path: string, options: RequestInit = {}, retryCount = 0): Promise<T> {
  const config = getAdminConfig();
  const token = await getAccessToken();

  if (!token) {
    redirectToLogin();
    throw new Error('Not authenticated');
  }

  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response | null = null;

  try {
    response = await fetch(`${config.apiBaseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 401) {
      redirectToLogin();
      throw new Error('Session expired');
    }

    // Check for rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : getRetryDelay(retryCount);

      if (retryCount < MAX_RETRIES) {
        await delay(waitTime);
        return apiRequest<T>(path, options, retryCount + 1);
      }
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    const data: ApiResponse<T> = await response.json();
    const hasWrapper = typeof data.ok === 'boolean' || typeof data.success === 'boolean';
    const ok = data.ok ?? data.success ?? response.ok;

    if (!ok) {
      // Check if we should retry on server errors
      if (response.status >= 500 && retryCount < MAX_RETRIES) {
        const retryDelay = getRetryDelay(retryCount);
        await delay(retryDelay);
        return apiRequest<T>(path, options, retryCount + 1);
      }
      throw new Error(data.error?.message || data.message || 'API request failed');
    }

    return (hasWrapper ? data.data : (data as unknown)) as T;
  } catch (error) {
    clearTimeout(timeoutId);

    // Handle timeout
    if (error instanceof Error && error.name === 'AbortError') {
      if (retryCount < MAX_RETRIES) {
        const retryDelay = getRetryDelay(retryCount);
        await delay(retryDelay);
        return apiRequest<T>(path, options, retryCount + 1);
      }
      throw new Error('Request timed out. Please try again.');
    }

    // Retry on retryable errors
    if (isRetryableError(response, error) && retryCount < MAX_RETRIES) {
      const retryDelay = getRetryDelay(retryCount);
      await delay(retryDelay);
      return apiRequest<T>(path, options, retryCount + 1);
    }

    throw error;
  }
}

/**
 * List available funnels
 */
export async function listFunnels(): Promise<{ funnels: string[] }> {
  return apiRequest('/admin/funnels');
}

/**
 * Query leads with filters
 */
export async function queryLeads(request: QueryLeadsRequest): Promise<QueryLeadsResponse> {
  return apiRequest('/admin/query', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Update a single lead
 */
export async function updateLead(request: UpdateLeadRequest): Promise<{ lead: Lead }> {
  return apiRequest('/admin/leads/update', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Bulk update multiple leads
 */
export async function bulkUpdateLeads(request: BulkUpdateRequest): Promise<BulkUpdateResponse> {
  return apiRequest('/admin/leads/bulk-update', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Create export job
 */
export async function createExport(request: ExportRequest): Promise<{ job: ExportJob }> {
  return apiRequest('/admin/exports/create', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Get export job status
 */
export async function getExportStatus(jobId: string): Promise<{ job: ExportJob }> {
  return apiRequest(`/admin/exports/status?jobId=${encodeURIComponent(jobId)}`);
}

/**
 * Get export download URL
 */
export async function getExportDownloadUrl(
  jobId: string
): Promise<{ downloadUrl: string; expiresIn: number }> {
  return apiRequest(`/admin/exports/download?jobId=${encodeURIComponent(jobId)}`);
}

/**
 * Get funnel statistics
 */
export async function getFunnelStats(funnelId: string): Promise<{ stats: FunnelStats }> {
  return apiRequest(`/admin/stats?funnelId=${encodeURIComponent(funnelId)}`);
}

/**
 * Feature Flags
 */
export interface FeatureFlags {
  [key: string]: boolean;
}

export async function getFeatureFlags(): Promise<FeatureFlags> {
  return apiRequest('/admin/flags');
}

export async function updateFeatureFlag(flag: string, enabled: boolean): Promise<void> {
  return apiRequest('/admin/flags', {
    method: 'PATCH',
    body: JSON.stringify({ flag, enabled }),
  });
}

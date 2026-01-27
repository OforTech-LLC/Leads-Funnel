/**
 * Exports API Slice
 *
 * Handles one-time exports and scheduled recurring exports.
 */

import { api } from '../api';
import type { ExportFormat } from '@/lib/constants';

// ---------------------------------------------------------------------------
// One-time Exports
// ---------------------------------------------------------------------------

export interface ExportJob {
  jobId: string;
  funnelId: string;
  format: ExportFormat;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  recordCount?: number;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
  expiresAt: string;
  downloadUrl?: string;
}

export interface CreateExportRequest {
  funnelId: string;
  format: ExportFormat;
  status?: string;
  startDate?: string;
  endDate?: string;
  fields?: string[];
}

export interface ExportListParams {
  page?: number;
  pageSize?: number;
}

export interface ExportListResponse {
  exports: ExportJob[];
  total: number;
  nextToken?: string;
}

// ---------------------------------------------------------------------------
// Scheduled Exports
// ---------------------------------------------------------------------------

export type ScheduleFrequency = 'once' | 'daily' | 'weekly' | 'monthly';

export interface ScheduledExport {
  id: string;
  funnelId: string;
  format: ExportFormat;
  frequency: ScheduleFrequency;
  /** ISO day of week (1=Mon - 7=Sun) for weekly, or day of month for monthly */
  dayOfWeekOrMonth?: number;
  /** HH:mm in UTC */
  timeUtc: string;
  /** Email to deliver the export to */
  deliveryEmail?: string;
  enabled: boolean;
  nextRunAt: string;
  lastRunAt?: string;
  createdAt: string;
  status?: string;
  fields?: string[];
}

export interface CreateScheduledExportRequest {
  funnelId: string;
  format: ExportFormat;
  frequency: ScheduleFrequency;
  dayOfWeekOrMonth?: number;
  timeUtc: string;
  deliveryEmail?: string;
  fields?: string[];
  status?: string;
}

export interface ScheduledExportListResponse {
  schedules: ScheduledExport[];
  total: number;
}

// ---------------------------------------------------------------------------
// API Endpoints
// ---------------------------------------------------------------------------

export const exportsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // One-time exports
    listExports: builder.query<ExportListResponse, ExportListParams | void>({
      query: (params) => ({
        url: '/admin/exports',
        params: params || {},
      }),
      providesTags: ['ExportList'],
    }),

    createExport: builder.mutation<ExportJob, CreateExportRequest>({
      query: (body) => ({
        url: '/admin/exports/create',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['ExportList'],
    }),

    getExportStatus: builder.query<ExportJob, string>({
      query: (jobId) => `/admin/exports/status?jobId=${jobId}`,
      providesTags: (_result, _error, jobId) => [{ type: 'Export', id: jobId }],
    }),

    getExportDownloadUrl: builder.query<{ downloadUrl: string; expiresIn: number }, string>({
      query: (jobId) => `/admin/exports/download?jobId=${jobId}`,
    }),

    // Scheduled exports
    listScheduledExports: builder.query<ScheduledExportListResponse, void>({
      query: () => '/admin/exports/schedules',
      providesTags: ['ExportSchedule'],
    }),

    createScheduledExport: builder.mutation<ScheduledExport, CreateScheduledExportRequest>({
      query: (body) => ({
        url: '/admin/exports/schedule',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['ExportSchedule'],
    }),

    deleteScheduledExport: builder.mutation<void, string>({
      query: (id) => ({
        url: `/admin/exports/schedules/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['ExportSchedule'],
    }),
  }),
});

export const {
  useListExportsQuery,
  useCreateExportMutation,
  useGetExportStatusQuery,
  useLazyGetExportDownloadUrlQuery,
  useListScheduledExportsQuery,
  useCreateScheduledExportMutation,
  useDeleteScheduledExportMutation,
} = exportsApi;

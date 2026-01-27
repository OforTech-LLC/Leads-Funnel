/**
 * Exports API Slice
 */

import { api } from '../api';
import type { ExportFormat } from '@/lib/constants';

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

export const exportsApi = api.injectEndpoints({
  endpoints: (builder) => ({
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
  }),
});

export const {
  useListExportsQuery,
  useCreateExportMutation,
  useGetExportStatusQuery,
  useLazyGetExportDownloadUrlQuery,
} = exportsApi;

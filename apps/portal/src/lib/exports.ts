// ──────────────────────────────────────────────
// React Query hooks for lead exports
//
// Flow: create export -> poll status -> download
// ──────────────────────────────────────────────

import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { LeadStatus } from '@/lib/types';
import { API_ENDPOINTS } from '@/lib/constants';
import { getApiBaseUrl } from './runtime-config';

// ── Types ────────────────────────────────────

const API_BASE_URL = getApiBaseUrl();

export type ExportFormat = 'csv' | 'xlsx' | 'json';

export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ExportRequest {
  format: ExportFormat;
  dateFrom?: string;
  dateTo?: string;
  status?: LeadStatus;
  fields?: string[];
}

export interface ExportJob {
  id: string;
  status: ExportStatus;
  format: ExportFormat;
  totalRecords?: number;
  processedRecords?: number;
  downloadUrl?: string;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

// ── Create export ────────────────────────────

export function useCreateExport() {
  return useMutation({
    mutationFn: async (request: ExportRequest) => {
      return api.post<ExportJob>(API_ENDPOINTS.EXPORTS, request);
    },
  });
}

// ── Poll export status ───────────────────────

export function useExportStatus(exportId: string | null) {
  return useQuery<ExportJob>({
    queryKey: ['exports', 'status', exportId],
    queryFn: () => api.get<ExportJob>(API_ENDPOINTS.EXPORT_STATUS(exportId!)),
    enabled: !!exportId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 2000;
      // Stop polling when complete or failed
      if (data.status === 'completed' || data.status === 'failed') return false;
      return 2000; // Poll every 2 seconds while processing
    },
    staleTime: 0,
  });
}

// ── Download export ──────────────────────────

export function downloadExportFile(exportId: string): void {
  // Open download URL in a new tab/trigger download
  const url = `${API_BASE_URL}${API_ENDPOINTS.EXPORT_DOWNLOAD(exportId)}`;
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', '');
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ── Available export fields ──────────────────

export const EXPORT_FIELDS = [
  { key: 'firstName', label: 'First Name', default: true },
  { key: 'lastName', label: 'Last Name', default: true },
  { key: 'email', label: 'Email', default: true },
  { key: 'phone', label: 'Phone', default: true },
  { key: 'status', label: 'Status', default: true },
  { key: 'funnelName', label: 'Funnel', default: true },
  { key: 'city', label: 'City', default: false },
  { key: 'state', label: 'State', default: false },
  { key: 'zip', label: 'ZIP Code', default: false },
  { key: 'assignedName', label: 'Assigned To', default: false },
  { key: 'createdAt', label: 'Created Date', default: true },
  { key: 'updatedAt', label: 'Updated Date', default: false },
] as const;

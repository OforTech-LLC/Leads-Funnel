// ──────────────────────────────────────────────
// React Query hooks for leads
// ──────────────────────────────────────────────

import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
  type InfiniteData,
} from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  Lead,
  LeadStatus,
  LeadFilters,
  PaginatedResponse,
  DashboardMetrics,
  Note,
} from '@/lib/types';
import { API_ENDPOINTS } from '@/lib/constants';

const LEADS_PAGE_SIZE = 25;

// ── Query keys ───────────────────────────────

export const leadKeys = {
  all: ['leads'] as const,
  lists: () => [...leadKeys.all, 'list'] as const,
  list: (filters: LeadFilters) => [...leadKeys.lists(), filters] as const,
  details: () => [...leadKeys.all, 'detail'] as const,
  detail: (funnelId: string, leadId: string) => [...leadKeys.details(), funnelId, leadId] as const,
  dashboard: () => [...leadKeys.all, 'dashboard'] as const,
};

// ── Infinite lead list ───────────────────────

export function useLeads(filters: LeadFilters = {}) {
  return useInfiniteQuery<PaginatedResponse<Lead>>({
    queryKey: leadKeys.list(filters),
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      params.set('limit', String(LEADS_PAGE_SIZE));
      if (pageParam) params.set('cursor', pageParam as string);
      if (filters.search) params.set('search', filters.search);
      if (filters.status) params.set('status', filters.status);
      if (filters.funnelId) params.set('funnelId', filters.funnelId);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);

      return api.get<PaginatedResponse<Lead>>(`${API_ENDPOINTS.LEADS}?${params.toString()}`);
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    staleTime: 30_000,
  });
}

// ── Single lead detail ───────────────────────

export function useLead(funnelId: string, leadId: string) {
  return useQuery<Lead>({
    queryKey: leadKeys.detail(funnelId, leadId),
    queryFn: () => api.get<Lead>(API_ENDPOINTS.LEAD_DETAIL(funnelId, leadId)),
    staleTime: 15_000,
    enabled: !!funnelId && !!leadId,
  });
}

// ── Dashboard metrics ────────────────────────

export function useDashboardMetrics() {
  return useQuery<DashboardMetrics>({
    queryKey: leadKeys.dashboard(),
    queryFn: () => api.get<DashboardMetrics>(API_ENDPOINTS.DASHBOARD),
    staleTime: 60_000,
  });
}

// ── Update lead status (optimistic) ──────────

export function useUpdateLeadStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      funnelId,
      leadId,
      status,
    }: {
      funnelId: string;
      leadId: string;
      status: LeadStatus;
    }) => {
      return api.patch<Lead>(API_ENDPOINTS.LEAD_STATUS(funnelId, leadId), {
        status,
      });
    },

    // Optimistic update
    onMutate: async ({ funnelId, leadId, status }) => {
      // Cancel in-flight queries
      await queryClient.cancelQueries({ queryKey: leadKeys.lists() });
      await queryClient.cancelQueries({
        queryKey: leadKeys.detail(funnelId, leadId),
      });

      // Snapshot previous values
      const previousLists = queryClient.getQueriesData<InfiniteData<PaginatedResponse<Lead>>>({
        queryKey: leadKeys.lists(),
      });

      const previousDetail = queryClient.getQueryData<Lead>(leadKeys.detail(funnelId, leadId));

      // Optimistically update all lead lists
      queryClient.setQueriesData<InfiniteData<PaginatedResponse<Lead>>>(
        { queryKey: leadKeys.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              data: page.data.map((lead) => (lead.id === leadId ? { ...lead, status } : lead)),
            })),
          };
        }
      );

      // Optimistically update detail
      if (previousDetail) {
        queryClient.setQueryData<Lead>(leadKeys.detail(funnelId, leadId), {
          ...previousDetail,
          status,
        });
      }

      return { previousLists, previousDetail };
    },

    onError: (_err, { funnelId, leadId }, context) => {
      // Rollback on error
      if (context?.previousLists) {
        context.previousLists.forEach(([key, data]) => {
          if (data) queryClient.setQueryData(key, data);
        });
      }
      if (context?.previousDetail) {
        queryClient.setQueryData(leadKeys.detail(funnelId, leadId), context.previousDetail);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: leadKeys.all });
    },
  });
}

// ── Add note to lead ─────────────────────────

export function useAddNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      funnelId,
      leadId,
      content,
    }: {
      funnelId: string;
      leadId: string;
      content: string;
    }) => {
      return api.post<Note>(API_ENDPOINTS.LEAD_NOTES(funnelId, leadId), {
        content,
      });
    },
    onSuccess: (_data, { funnelId, leadId }) => {
      queryClient.invalidateQueries({
        queryKey: leadKeys.detail(funnelId, leadId),
      });
    },
  });
}

// ── Assign lead to team member ───────────────

export function useAssignLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      funnelId,
      leadId,
      assignedTo,
    }: {
      funnelId: string;
      leadId: string;
      assignedTo: string | null;
    }) => {
      return api.patch<Lead>(API_ENDPOINTS.LEAD_ASSIGN(funnelId, leadId), {
        assignedTo,
      });
    },

    onMutate: async ({ funnelId, leadId, assignedTo }) => {
      await queryClient.cancelQueries({
        queryKey: leadKeys.detail(funnelId, leadId),
      });

      const previousDetail = queryClient.getQueryData<Lead>(leadKeys.detail(funnelId, leadId));

      if (previousDetail) {
        queryClient.setQueryData<Lead>(leadKeys.detail(funnelId, leadId), {
          ...previousDetail,
          assignedTo,
        });
      }

      return { previousDetail };
    },

    onError: (_err, { funnelId, leadId }, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(leadKeys.detail(funnelId, leadId), context.previousDetail);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: leadKeys.all });
    },
  });
}

// ── Bulk status update ───────────────────────

export function useBulkUpdateStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leads,
      status,
    }: {
      leads: { leadId: string; funnelId: string }[];
      status: LeadStatus;
    }) => {
      return api.post<void>(API_ENDPOINTS.LEADS_BULK_STATUS, {
        leads,
        status,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadKeys.all });
    },
  });
}

// ── Bulk assign ──────────────────────────────

export function useBulkAssignLeads() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leads,
      assignedTo,
    }: {
      leads: { leadId: string; funnelId: string }[];
      assignedTo: string;
    }) => {
      return api.post<void>(API_ENDPOINTS.LEADS_BULK_ASSIGN, {
        leads,
        assignedTo,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadKeys.all });
    },
  });
}

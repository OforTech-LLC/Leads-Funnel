import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { LeadStatus } from '@/lib/types';

type LeadStatusFilter = LeadStatus | '';

interface LeadsUiState {
  search: string;
  debouncedSearch: string;
  statusFilter: LeadStatusFilter;
  showFilters: boolean;
  dateFrom: string;
  dateTo: string;
  showExportModal: boolean;
  selectedIds: string[];
  showBulkStatus: boolean;
  showBulkAssign: boolean;
}

interface TeamUiState {
  search: string;
}

interface PortalUiState {
  leads: LeadsUiState;
  team: TeamUiState;
}

const initialState: PortalUiState = {
  leads: {
    search: '',
    debouncedSearch: '',
    statusFilter: '',
    showFilters: false,
    dateFrom: '',
    dateTo: '',
    showExportModal: false,
    selectedIds: [],
    showBulkStatus: false,
    showBulkAssign: false,
  },
  team: {
    search: '',
  },
};

const portalUiSlice = createSlice({
  name: 'portalUi',
  initialState,
  reducers: {
    setLeadSearch(state, action: PayloadAction<string>) {
      state.leads.search = action.payload;
    },
    setLeadDebouncedSearch(state, action: PayloadAction<string>) {
      state.leads.debouncedSearch = action.payload;
    },
    setLeadStatusFilter(state, action: PayloadAction<LeadStatusFilter>) {
      state.leads.statusFilter = action.payload;
    },
    setLeadShowFilters(state, action: PayloadAction<boolean>) {
      state.leads.showFilters = action.payload;
    },
    setLeadDateFrom(state, action: PayloadAction<string>) {
      state.leads.dateFrom = action.payload;
    },
    setLeadDateTo(state, action: PayloadAction<string>) {
      state.leads.dateTo = action.payload;
    },
    setLeadShowExportModal(state, action: PayloadAction<boolean>) {
      state.leads.showExportModal = action.payload;
    },
    setLeadSelectedIds(state, action: PayloadAction<string[]>) {
      state.leads.selectedIds = action.payload;
    },
    toggleLeadSelection(state, action: PayloadAction<string>) {
      const leadId = action.payload;
      const index = state.leads.selectedIds.indexOf(leadId);
      if (index >= 0) {
        state.leads.selectedIds.splice(index, 1);
      } else {
        state.leads.selectedIds.push(leadId);
      }
    },
    clearLeadSelection(state) {
      state.leads.selectedIds = [];
      state.leads.showBulkStatus = false;
      state.leads.showBulkAssign = false;
    },
    setLeadShowBulkStatus(state, action: PayloadAction<boolean>) {
      state.leads.showBulkStatus = action.payload;
      if (action.payload) {
        state.leads.showBulkAssign = false;
      }
    },
    setLeadShowBulkAssign(state, action: PayloadAction<boolean>) {
      state.leads.showBulkAssign = action.payload;
      if (action.payload) {
        state.leads.showBulkStatus = false;
      }
    },
    resetLeadFilters(state) {
      state.leads.search = '';
      state.leads.debouncedSearch = '';
      state.leads.statusFilter = '';
      state.leads.dateFrom = '';
      state.leads.dateTo = '';
      state.leads.showFilters = false;
    },
    setTeamSearch(state, action: PayloadAction<string>) {
      state.team.search = action.payload;
    },
    clearTeamSearch(state) {
      state.team.search = '';
    },
  },
});

export const portalUiActions = portalUiSlice.actions;
export type { PortalUiState, LeadsUiState, TeamUiState };
export default portalUiSlice.reducer;

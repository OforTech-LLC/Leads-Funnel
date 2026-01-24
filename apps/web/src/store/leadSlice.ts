/**
 * Redux slice for lead form state management
 */

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { submitLeadToApi, type LeadPayload, type LeadResponse, ApiError } from '@/lib/api';

/**
 * Lead submission status
 */
export type LeadStatus = 'idle' | 'submitting' | 'success' | 'error';

/**
 * Lead slice state
 */
export interface LeadState {
  status: LeadStatus;
  leadId?: string;
  error?: string;
}

/**
 * Initial state
 */
const initialState: LeadState = {
  status: 'idle',
  leadId: undefined,
  error: undefined,
};

/**
 * Async thunk for submitting a lead
 */
export const submitLead = createAsyncThunk<
  LeadResponse,
  LeadPayload,
  { rejectValue: string }
>('lead/submit', async (payload, { rejectWithValue }) => {
  try {
    const response = await submitLeadToApi(payload);
    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      return rejectWithValue(error.message);
    }
    return rejectWithValue(
      error instanceof Error ? error.message : 'An unexpected error occurred'
    );
  }
});

/**
 * Lead slice
 */
const leadSlice = createSlice({
  name: 'lead',
  initialState,
  reducers: {
    /**
     * Reset the lead state to initial
     */
    resetLead: (state) => {
      state.status = 'idle';
      state.leadId = undefined;
      state.error = undefined;
    },

    /**
     * Clear any error
     */
    clearError: (state) => {
      state.error = undefined;
      if (state.status === 'error') {
        state.status = 'idle';
      }
    },

    /**
     * Set error manually
     */
    setError: (state, action: PayloadAction<string>) => {
      state.status = 'error';
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Handle pending state
      .addCase(submitLead.pending, (state) => {
        state.status = 'submitting';
        state.error = undefined;
      })
      // Handle successful submission
      .addCase(submitLead.fulfilled, (state, action) => {
        state.status = 'success';
        state.leadId = action.payload.leadId;
        state.error = undefined;
      })
      // Handle failed submission
      .addCase(submitLead.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.payload || 'Failed to submit lead';
      });
  },
});

// Export actions
export const { resetLead, clearError, setError } = leadSlice.actions;

// Export reducer
export default leadSlice.reducer;

// Selector helpers
export const selectLeadStatus = (state: { lead: LeadState }) => state.lead.status;
export const selectLeadId = (state: { lead: LeadState }) => state.lead.leadId;
export const selectLeadError = (state: { lead: LeadState }) => state.lead.error;
export const selectIsSubmitting = (state: { lead: LeadState }) =>
  state.lead.status === 'submitting';
export const selectIsSuccess = (state: { lead: LeadState }) =>
  state.lead.status === 'success';
export const selectIsError = (state: { lead: LeadState }) =>
  state.lead.status === 'error';

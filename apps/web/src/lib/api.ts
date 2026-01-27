/**
 * API client for lead submission
 */

import type { LeadInput, LeadUtm, LeadSubmitResponse, LeadRequestPayload } from '@kanjona/shared';

// Re-export shared types for convenience
export type { LeadInput, LeadUtm, LeadSubmitResponse, LeadRequestPayload };

/**
 * Client-side lead submission payload
 * Uses 'message' field which maps to 'notes' in the API
 */
export interface LeadPayload {
  /** Funnel ID (service slug) for routing the lead */
  funnelId?: string;
  name: string;
  email: string;
  phone?: string;
  /** Message field (maps to 'notes' in API) */
  message?: string;
  pageUrl: string;
  referrer: string;
  utm: LeadUtm;
  /** Additional custom fields */
  customFields?: Record<string, string>;
}

/**
 * Client-friendly API response
 */
export interface LeadResponse {
  success: boolean;
  leadId?: string;
  message?: string;
  error?: string;
}

/**
 * API error class
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly response?: LeadResponse;

  constructor(message: string, statusCode: number, response?: LeadResponse) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.response = response;
  }
}

/**
 * Get the API base URL from environment
 */
function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.kanjona.com';
}

/**
 * Submit a lead to the API
 */
export async function submitLeadToApi(payload: LeadPayload): Promise<LeadResponse> {
  const apiUrl = `${getApiBaseUrl()}/lead`;

  // Build API request payload (maps client fields to API fields)
  const apiPayload: LeadRequestPayload & {
    funnelId?: string;
    customFields?: Record<string, string>;
  } = {
    funnelId: payload.funnelId,
    name: payload.name.trim(),
    email: payload.email.trim().toLowerCase(),
    phone: payload.phone?.trim() || undefined,
    // Map 'message' to 'notes' for the API
    notes: payload.message?.trim() || undefined,
    utm: payload.utm,
    metadata: {
      pageUrl: payload.pageUrl,
      referrer: payload.referrer,
    },
    customFields: payload.customFields,
  };

  const body = JSON.stringify(apiPayload);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body,
    });

    // Parse response
    let apiResponse: LeadSubmitResponse;
    try {
      apiResponse = await response.json();
    } catch (parseError) {
      // Log JSON parsing failure for debugging
      console.error(
        '[API] Failed to parse response JSON:',
        parseError instanceof Error ? parseError.message : 'Parse error'
      );
      return {
        success: response.ok,
        error: response.ok ? undefined : 'Failed to parse response',
      };
    }

    // Handle non-2xx responses
    if (!response.ok) {
      const errorMsg = apiResponse.error?.message || `API error: ${response.status}`;
      console.warn('[API] Lead submission failed:', { status: response.status, error: errorMsg });
      throw new ApiError(errorMsg, response.status, {
        success: false,
        error: errorMsg,
      });
    }

    // Map API response to client response
    return {
      success: apiResponse.success,
      leadId: apiResponse.data?.id,
      message: apiResponse.data ? 'Lead submitted successfully' : undefined,
      error: apiResponse.error?.message,
    };
  } catch (error) {
    // Re-throw ApiError as-is
    if (error instanceof ApiError) {
      throw error;
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('[API] Network error during lead submission:', error.message);
      throw new ApiError('Network error. Please check your connection.', 0);
    }

    // Handle other errors
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    console.error('[API] Unexpected error during lead submission:', errorMessage);
    throw new ApiError(errorMessage, 0);
  }
}

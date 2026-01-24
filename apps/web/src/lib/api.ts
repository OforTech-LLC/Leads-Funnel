/**
 * API client for lead submission
 */

import type { UTMParams } from './utm';

/**
 * Lead submission payload
 */
export interface LeadPayload {
  name: string;
  email: string;
  phone?: string;
  message?: string;
  pageUrl: string;
  referrer: string;
  utm: UTMParams;
}

/**
 * API response for lead submission
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

  // Prepare the request body
  const body = JSON.stringify({
    name: payload.name.trim(),
    email: payload.email.trim().toLowerCase(),
    phone: payload.phone?.trim() || undefined,
    message: payload.message?.trim() || undefined,
    pageUrl: payload.pageUrl,
    referrer: payload.referrer,
    utm: payload.utm,
  });

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
    let data: LeadResponse;
    try {
      data = await response.json();
    } catch {
      // If JSON parsing fails, create a generic response
      data = {
        success: response.ok,
        error: response.ok ? undefined : 'Failed to parse response',
      };
    }

    // Handle non-2xx responses
    if (!response.ok) {
      throw new ApiError(
        data.error || data.message || `API error: ${response.status}`,
        response.status,
        data
      );
    }

    return data;
  } catch (error) {
    // Re-throw ApiError as-is
    if (error instanceof ApiError) {
      throw error;
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new ApiError('Network error. Please check your connection.', 0);
    }

    // Handle other errors
    throw new ApiError(
      error instanceof Error ? error.message : 'An unexpected error occurred',
      0
    );
  }
}

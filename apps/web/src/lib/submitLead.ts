/**
 * Lead Submission Utility
 * Handles lead form submissions to the API
 */

import { apiClient, ApiRequestError } from './api-client';
import { getBestUTMParams, type UTMParams } from './utm';

/**
 * Map UTM params from utm_source format to source format
 */
function mapUtmParams(utm: UTMParams): LeadRequestPayload['utm'] {
  return {
    source: utm.utm_source,
    medium: utm.utm_medium,
    campaign: utm.utm_campaign,
    term: utm.utm_term,
    content: utm.utm_content,
  };
}

export interface LeadRequestPayload {
  funnelId: string;
  name: string;
  email: string;
  phone?: string;
  message?: string;
  pageUrl: string;
  referrer?: string;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
  customFields?: Record<string, string>;
}

export interface LeadResponse {
  success: boolean;
  leadId?: string;
  message: string;
  errors?: Record<string, string[]>;
}

export interface SubmitLeadOptions {
  funnelId: string;
  formData: {
    name: string;
    email: string;
    phone?: string;
    message?: string;
    [key: string]: string | undefined;
  };
  customFields?: Record<string, string>;
}

/**
 * Submit a lead to the API
 */
export async function submitLead(options: SubmitLeadOptions): Promise<LeadResponse> {
  const { funnelId, formData, customFields } = options;

  // Build custom fields from form data (excluding standard fields)
  const standardFields = ['name', 'email', 'phone', 'message'];
  const extractedCustomFields: Record<string, string> = {};

  for (const [key, value] of Object.entries(formData)) {
    if (!standardFields.includes(key) && value !== undefined && value !== '') {
      extractedCustomFields[key] = value;
    }
  }

  const payload: LeadRequestPayload = {
    funnelId,
    name: formData.name.trim(),
    email: formData.email.trim().toLowerCase(),
    phone: formData.phone?.trim() || undefined,
    message: formData.message?.trim() || undefined,
    pageUrl: typeof window !== 'undefined' ? window.location.href : '',
    referrer: typeof document !== 'undefined' ? document.referrer || undefined : undefined,
    utm: mapUtmParams(getBestUTMParams()),
    customFields: {
      ...extractedCustomFields,
      ...customFields,
    },
  };

  // Remove empty customFields object
  if (payload.customFields && Object.keys(payload.customFields).length === 0) {
    delete payload.customFields;
  }

  try {
    return await apiClient.post<LeadResponse>('/lead', payload);
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return {
        success: false,
        message: error.message,
        errors: error.errors,
      };
    }

    return {
      success: false,
      message: 'An unexpected error occurred. Please try again.',
    };
  }
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone format (E.164 or common formats)
 */
export function isValidPhone(phone: string): boolean {
  if (!phone) return true; // Phone is optional
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, '');
  return phoneRegex.test(cleanPhone);
}

/**
 * Format phone number for display
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }

  return phone;
}

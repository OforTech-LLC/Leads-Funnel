/**
 * API Client
 * Handles all API communication with error handling, timeouts, retries, and CSRF protection
 */

import { csrfTokenManager } from './csrf';
import { getApiBaseUrl } from './runtime-config';

const API_BASE_URL = getApiBaseUrl();

// Configuration
const REQUEST_TIMEOUT_MS = 30000; // 30 seconds
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

interface ApiError {
  message: string;
  code?: string;
  errors?: Record<string, string[]>;
}

/**
 * Delay helper for exponential backoff
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if error is retryable (5xx or network error)
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof ApiRequestError) {
    // Retry on 5xx server errors
    return error.status >= 500 && error.status < 600;
  }
  // Retry on network errors (status 0) or AbortError from timeout
  if (error instanceof Error) {
    return error.name === 'AbortError' || error.message.includes('Network error');
  }
  return false;
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
 * Check if running in browser environment
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount = 0,
    includeCsrf = false
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add CSRF token for state-changing requests (POST, PUT, DELETE)
    if (includeCsrf && isBrowser()) {
      try {
        const csrfToken = await csrfTokenManager.getToken();
        (headers as Record<string, string>)['X-CSRF-Token'] = csrfToken;
      } catch (error) {
        console.warn('[ApiClient] Failed to get CSRF token:', error);
        // Continue without CSRF token - server will reject if required
      }
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
        credentials: 'include', // Include cookies for CSRF
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        const error = data as ApiError;
        throw new ApiRequestError(
          error.message || 'Request failed',
          response.status,
          error.code,
          error.errors
        );
      }

      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle timeout abort
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError = new ApiRequestError(
          'Request timed out. Please try again.',
          0,
          'TIMEOUT_ERROR'
        );

        // Retry on timeout
        if (retryCount < MAX_RETRIES) {
          const retryDelay = getRetryDelay(retryCount);
          await delay(retryDelay);
          return this.request<T>(endpoint, options, retryCount + 1, includeCsrf);
        }

        throw timeoutError;
      }

      // Check if we should retry
      if (isRetryableError(error) && retryCount < MAX_RETRIES) {
        const retryDelay = getRetryDelay(retryCount);
        await delay(retryDelay);
        return this.request<T>(endpoint, options, retryCount + 1, includeCsrf);
      }

      if (error instanceof ApiRequestError) {
        throw error;
      }

      // Network error or other issue
      const networkError = new ApiRequestError(
        'Network error. Please check your connection and try again.',
        0,
        'NETWORK_ERROR'
      );

      // Retry network errors
      if (retryCount < MAX_RETRIES) {
        const retryDelay = getRetryDelay(retryCount);
        await delay(retryDelay);
        return this.request<T>(endpoint, options, retryCount + 1, includeCsrf);
      }

      throw networkError;
    }
  }

  /**
   * GET request (safe - no CSRF required)
   */
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' }, 0, false);
  }

  /**
   * POST request (state-changing - CSRF required)
   */
  async post<T>(endpoint: string, body: unknown): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
      0,
      true // Include CSRF token
    );
  }

  /**
   * PUT request (state-changing - CSRF required)
   */
  async put<T>(endpoint: string, body: unknown): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'PUT',
        body: JSON.stringify(body),
      },
      0,
      true // Include CSRF token
    );
  }

  /**
   * DELETE request (state-changing - CSRF required)
   */
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(
      endpoint,
      { method: 'DELETE' },
      0,
      true // Include CSRF token
    );
  }

  /**
   * POST request without CSRF (for public endpoints like lead submission)
   * Use this for endpoints that don't require authentication
   */
  async postPublic<T>(endpoint: string, body: unknown): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
      0,
      false // No CSRF for public endpoints
    );
  }
}

export class ApiRequestError extends Error {
  status: number;
  code?: string;
  errors?: Record<string, string[]>;

  constructor(message: string, status: number, code?: string, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
    this.errors = errors;
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

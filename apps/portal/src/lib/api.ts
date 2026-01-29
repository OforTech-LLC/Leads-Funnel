// ──────────────────────────────────────────────
// Base API client with auth headers, error handling, retry, and timeout
//
// Consistent patterns with apps/web and apps/admin API clients:
// - Request timeouts (30s)
// - Exponential backoff with jitter
// - 401 redirect to /login
// - httpOnly cookie auth via credentials: 'include'
// ──────────────────────────────────────────────

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

// Configuration - aligned across all 3 apps
const REQUEST_TIMEOUT_MS = 30000; // 30 seconds
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  retries?: number;
}

/**
 * Delay helper for exponential backoff
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
 * Make an authenticated API request with automatic retry, timeout, and error handling.
 */
async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { body, retries = MAX_RETRIES, ...init } = options;

  const url = `${API_BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(init.headers as Record<string, string>),
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const config: RequestInit = {
      ...init,
      headers,
      credentials: 'include', // httpOnly cookie auth
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    };

    try {
      const response = await fetch(url, config);
      clearTimeout(timeoutId);

      // If unauthorized, redirect to login
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        throw new ApiError('Unauthorized', 401);
      }

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : getRetryDelay(attempt);

        if (attempt < retries) {
          await delay(waitTime);
          continue;
        }
        throw new ApiError('Rate limit exceeded. Please try again later.', 429);
      }

      const hasBody = response.status !== 204;
      const parsedBody = hasBody ? await response.json().catch(() => null) : null;

      if (!response.ok) {
        const apiError = new ApiError(
          parsedBody?.error?.message ||
            parsedBody?.message ||
            `Request failed with status ${response.status}`,
          response.status,
          parsedBody
        );

        // Don't retry client errors (4xx) except 429 (already handled above)
        if (response.status >= 400 && response.status < 500) {
          throw apiError;
        }

        // Retry on server errors (5xx)
        lastError = apiError;
        if (attempt < retries) {
          await delay(getRetryDelay(attempt));
          continue;
        }
        throw apiError;
      }

      if (parsedBody?.ok === false || parsedBody?.success === false) {
        throw new ApiError(
          parsedBody?.error?.message || parsedBody?.message || 'Request failed',
          response.status,
          parsedBody
        );
      }

      // Handle 204 No Content
      if (!hasBody) {
        return undefined as T;
      }

      return (parsedBody?.data ?? parsedBody) as T;
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle timeout abort
      if (error instanceof Error && error.name === 'AbortError') {
        lastError = new ApiError('Request timed out. Please try again.', 0);
        if (attempt < retries) {
          await delay(getRetryDelay(attempt));
          continue;
        }
        throw lastError;
      }

      // Don't retry client errors
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
        throw error;
      }

      lastError = error as Error;

      // Retry on network errors
      if (attempt < retries) {
        await delay(getRetryDelay(attempt));
        continue;
      }
    }
  }

  throw lastError || new Error('Request failed');
}

// ──────────────────────────────────────────────
// Convenience methods
// ──────────────────────────────────────────────

export const api = {
  get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: 'GET' });
  },

  post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: 'POST', body });
  },

  put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: 'PUT', body });
  },

  patch<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: 'PATCH', body });
  },

  delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: 'DELETE' });
  },
};

// ──────────────────────────────────────────────
// Base API client with auth headers, error handling, retry
// ──────────────────────────────────────────────

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

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
  retryDelay?: number;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Make an authenticated API request with automatic retry and error handling.
 */
async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { body, retries = 2, retryDelay = 1000, ...init } = options;

  const url = `${API_BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(init.headers as Record<string, string>),
  };

  const config: RequestInit = {
    ...init,
    headers,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, config);

      // If unauthorized, redirect to login
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        throw new ApiError('Unauthorized', 401);
      }

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new ApiError(
          errorBody?.message || `Request failed with status ${response.status}`,
          response.status,
          errorBody
        );
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return undefined as T;
      }

      return (await response.json()) as T;
    } catch (error) {
      lastError = error as Error;

      // Don't retry client errors (4xx) except 429
      if (
        error instanceof ApiError &&
        error.status >= 400 &&
        error.status < 500 &&
        error.status !== 429
      ) {
        throw error;
      }

      // Retry on network errors and 5xx/429
      if (attempt < retries) {
        await sleep(retryDelay * Math.pow(2, attempt));
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
